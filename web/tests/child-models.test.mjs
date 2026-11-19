import {generationCanvas} from '../server/photo-format.mjs';
import {image} from './photo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {photoPlan} from '../dist/photo-recipes.js';
import {childReferencePath,photoModelGender} from '../dist/photo-models.js';
import {createPhotoService} from '../server/photo-studio.mjs';
import {resolvePhotoSet} from '../server/photo-records.mjs';
import {draftStore} from '../server/photo-drafts.mjs';
const user={id:'child-test',role:'admin'};
for(const childAge of ['7-9','12-14'])for(const childGender of ['girl','boy'])test(`child ${childGender} ${childAge} sends correct reference for both views and rejects different age at publication`,async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());const calls=[];
 const service=createPhotoService(db,{FASHN_API_KEY:'test',APP_URL:'https://shop.example'},async(url,opts)=>{if(url.endsWith('/run')){calls.push(JSON.parse(opts.body));return Response.json({id:'child'+calls.length});}return Response.json({status:'completed',output:[image]});});t.after(()=>service.close());
 const settings={shot:'child',childAge,childGender},plan=photoPlan('Куртки','kids',settings),jobs={};assert.equal(plan.needsModel,true);
 for(const kind of ['cover','front','back']){const job=await service.start(user,{kind,image,category:'Куртки',audience:'kids',modelGender:childGender==='girl'?'male':'female',photoSettings:settings});jobs[kind]=job.id;await service.status(user,job.id);}
 for(const [i,view] of ['front','back'].entries()){const ref=readFileSync(new URL('../dist'+childReferencePath(settings,view),import.meta.url));assert.ok(ref.length>1000);assert.equal(calls[i+1].model_name,'tryon-max');assert.equal(calls[i+1].inputs.model_image,await generationCanvas(ref));assert.match(calls[i+1].inputs.prompt,/natural child proportions/);}
 const gender=photoModelGender('kids',null,settings);assert.equal(resolvePhotoSet(db,user,jobs,null,gender,plan).images.length,3);
 assert.throws(()=>resolvePhotoSet(db,user,jobs,null,gender,photoPlan('Куртки','kids',{...settings,childAge:childAge==='7-9'?'12-14':'7-9'})),/настройкам/);
 const store=draftStore(db),draft=store.save(user,null,{fields:{audience:'kids'},photoSettings:settings,selected:jobs,sources:{front:image,back:image}});assert.deepEqual(store.read(user,draft.id).photoSettings,settings);
});
test('child selection rejects unsupported ages/genders and has no adult fallback',()=>{
 for(const settings of [{},{childAge:'18',childGender:'girl'},{childAge:'7-9',childGender:'male'}]){assert.throws(()=>photoModelGender('kids','male',settings));assert.throws(()=>childReferencePath(settings,'front'));}
});
test('intimate and non-clothing child products stay originals even with child settings',()=>{
 for(const category of ['Купальники','Плавки','Боди','Нижнее бельё','Духи','Сумки']){const p=photoPlan(category,'kids',{shot:'child',childAge:'7-9',childGender:'girl'});assert.equal(p.needsModel,false);assert.ok(p.slots.every(s=>s.mode==='original'));}
});
test('incomplete child selection rejects even the paid cover before contacting FASHN',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let calls=0;const service=createPhotoService(db,{FASHN_API_KEY:'test',APP_URL:'https://shop.example'},async()=>{calls++;return Response.json({id:'bad'});});t.after(()=>service.close());
 await assert.rejects(()=>service.start(user,{kind:'cover',image,category:'Куртки',audience:'kids',photoSettings:{shot:'child',childAge:'7-9'}}),/выберите возраст/);assert.equal(calls,0);
});
