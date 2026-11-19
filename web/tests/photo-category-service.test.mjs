import {image} from './photo-fixture.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {createPhotoService} from '../server/photo-studio.mjs';import {resolvePhotoSet} from '../server/photo-records.mjs';import {photoPlan} from '../dist/photo-recipes.js';
const user={id:'u',role:'admin'};
function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());const calls=[];const service=createPhotoService(db,{FASHN_API_KEY:'test',APP_URL:'https://shop.example',PHOTO_MODEL_FRONT:'https://example.com/front.png',PHOTO_MODEL_BACK:'https://example.com/back.png'},async(url,opts)=>{if(url.endsWith('/run')){calls.push(JSON.parse(opts.body));return Response.json({id:'job'+calls.length});}return Response.json({status:'completed',output:[image]});});return {db,calls,service};}
test('perfume and five extra detail photos are exact originals with zero provider calls and correct order',async t=>{
 const {db,calls,service}=fixture(t),plan=photoPlan('Духи','unisex',{extraCount:5}),jobs={};
 for(const s of plan.slots){const j=await service.start(user,{kind:s.key,image,category:'Духи',audience:'unisex',photoSettings:plan.settings});jobs[s.key]=j.id;assert.equal((await service.status(user,j.id)).image,image);}
 assert.equal(calls.length,0);const result=resolvePhotoSet(db,user,jobs,null,null,plan);assert.equal(result.images.length,8);assert.ok(result.photoLabels.every(l=>l.startsWith('Оригинал')));assert.equal(db.prepare('SELECT SUM(creditsUsed) total FROM photo_job').get().total,0);
 assert.throws(()=>resolvePhotoSet(db,user,jobs,null,'female',photoPlan('Сумки','women',{extraCount:5})),/настройкам/);
});
test('bags use background removal, accessory placement edit and untouched detail, with server-owned modes',async t=>{
 const {db,calls,service}=fixture(t),plan=photoPlan('Сумки','women',{shot:'crossbody'}),jobs={};
 for(const s of plan.slots){const j=await service.start(user,{kind:s.key,image,category:'Сумки',audience:'women',photoSettings:plan.settings,mode:'original'});jobs[s.key]=j.id;await service.status(user,j.id);}
 assert.equal(calls.length,2);assert.equal(calls[0].model_name,'background-remove');assert.equal(calls[1].model_name,'edit');assert.equal(calls[1].inputs.image_context,'https://example.com/front.png');assert.match(calls[1].inputs.prompt,/crossbody/);assert.equal(resolvePhotoSet(db,user,jobs,null,'female',plan).images.length,3);
 assert.throws(()=>resolvePhotoSet(db,user,jobs,null,'female',photoPlan('Сумки','women',{shot:'hand'})),/настройкам/);
});
test('kids cannot switch to adult model even by requesting wearing settings',async t=>{
 const {calls,service}=fixture(t);await service.start(user,{kind:'front',category:'Купальники',audience:'kids',photoSettings:{shot:'adult'},image});assert.equal(calls.length,0);
});
