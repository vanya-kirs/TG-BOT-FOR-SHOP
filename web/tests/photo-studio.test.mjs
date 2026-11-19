import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createPhotoService} from '../server/photo-studio.mjs';
import sharp from 'sharp';
import {catalogPhoto,photoData} from '../server/photo-format.mjs';
const img='data:image/png;base64,'+(await sharp({create:{width:120,height:160,channels:3,background:'#b5a594'}}).png().toBuffer()).toString('base64');
const formatted=photoData(await catalogPhoto(img));
const admin={id:'a',role:'admin'};
function fixture(t,env={},fetcher){const db=new DatabaseSync(':memory:');t.after(()=>db.close());return createPhotoService(db,{APP_URL:'https://shop.example',FASHN_API_KEY:'secret',PHOTO_MODEL_FRONT:'https://example.com/front.jpg',PHOTO_MODEL_BACK:'https://example.com/back.jpg',...env},fetcher);}
test('disabled service rejects generation; back requires a real uploaded source',async t=>{
 const s=fixture(t,{FASHN_API_KEY:''});assert.equal(s.config().enabled,false);
 await assert.rejects(()=>s.start(admin,{kind:'cover',image:img}),/настро/);
 const enabled=fixture(t);await assert.rejects(()=>enabled.start(admin,{kind:'back'}),/фото/);
 await assert.rejects(()=>enabled.start({id:'x',role:'customer'},{kind:'cover',image:img}),/доступ/i);
 await assert.rejects(()=>enabled.start(admin,{kind:'cover',image:'http://127.0.0.1'}),/фото/);
});
test('jobs retain ownership and survive service recreation; completed output is durable',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());const requests=[];
 const fetcher=async(url,options)=>{requests.push({url,...options});return Response.json(url.endsWith('/run')?{id:'prediction-1'}:{status:'completed',output:[img]});};
 const env={APP_URL:'https://shop.example',FASHN_API_KEY:'key',PHOTO_MODEL_BACK:'https://example.com/back.jpg'};
 const s=createPhotoService(db,env,fetcher);const job=await s.start(admin,{kind:'back',image:img});
 const payload=JSON.parse(requests[0].body);assert.match(payload.inputs.product_image,/^https:\/\/shop\.example\/api\/photos\/inputs\/[a-f0-9]{64}$/);
 const token=payload.inputs.product_image.split('/').at(-1);assert.deepEqual(s.input(token).data,Buffer.from(img.split(',')[1],'base64'));assert.equal(payload.inputs.model_image,env.PHOTO_MODEL_BACK);assert.equal(payload.inputs.return_base64,true);
 await assert.rejects(()=>s.status({id:'b',role:'admin'},job.id),/найден/);
 const restarted=createPhotoService(db,env,fetcher);assert.equal((await restarted.status(admin,job.id)).image,formatted);
 assert.equal((await restarted.status(admin,job.id)).image,formatted);assert.equal(requests.length,2);
});
test('provider errors are redacted and charged requests cannot be repeated without limit',async t=>{
 const s=fixture(t,{PHOTO_DAILY_LIMIT:'1'},async()=>{throw Error('secret provider payload');});
 await assert.rejects(()=>s.start(admin,{kind:'cover',image:img}),e=>!e.message.includes('secret'));
 await assert.rejects(()=>s.start(admin,{kind:'cover',image:img}),/лимит/);
});
import {studioGallery} from '../dist/photo-studio.js';
test('gallery orders cover/front/back/detail, retains originals and skips missing back',()=>{
 const f=studioGallery(['original-front','original-back','tag'],{cover:'cover',front:'model-front',back:'model-back'},'tag');
 assert.deepEqual(f.map(x=>x.src),['cover','model-front','model-back','tag','original-front','original-back']);
 assert.match(f[1].label,/ИИ/);
 assert.deepEqual(studioGallery(['original'],{cover:'cover',front:'front'}).map(x=>x.src),['cover','front','original']);
 assert.throws(()=>studioGallery(Array.from({length:8},(_,i)=>String(i)),{cover:'cover'}),/8/);
});
import express from 'express';
import {photoRoutes} from '../server/photo-studio.mjs';
import {migrateCommerce,writeCommerce} from '../server/commerce.mjs';
test('HTTP photo endpoints reject guests, customers, removed suppliers and foreign job access',async t=>{
 const db=new DatabaseSync(':memory:');migrateCommerce(db);writeCommerce(db,{products:[],suppliers:[{id:'s',name:'S'}],orders:[],payouts:[]});
 const users={admin,other:{id:'b',role:'admin'},buyer:{id:'c',role:'customer'},supplier:{id:'s-user',role:'supplier',supplierId:'s'},removed:{id:'r',role:'supplier',supplierId:'deleted'}};
 const identity={database:db,auth:{api:{getSession:async({headers})=>{const user=users[headers.get('x-user')];return user?{user}:null;}}}};
 let sent;const app=express();app.use('/api/photos',photoRoutes(identity,{APP_URL:'https://shop.example',FASHN_API_KEY:'private'},async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({id:'provider-id'});}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
 const request=(path,user,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/photos'+path,{method:body?'POST':'GET',headers:{'x-user':user||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('/config')).status,401);assert.equal((await request('/config','buyer')).status,403);assert.equal((await request('/config','removed')).status,403);
 assert.deepEqual(await(await request('/config','supplier')).json(),{enabled:true,front:false,back:false});
 const r=await request('','admin',{kind:'cover',image:img});assert.equal(r.status,202);const job=await r.json();
 assert.equal((await request('/'+job.id,'other')).status,400);
 const imagePath=new URL(sent.inputs.image).pathname.replace('/api/photos','');
 const imageResponse=await request(imagePath);assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get('content-type'),'image/jpeg');assert.match(imageResponse.headers.get('cache-control'),/no-store/);assert.equal((await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata()).width,1200);
 assert.equal((await request('/inputs/'+'0'.repeat(64))).status,404);
 db.prepare('UPDATE photo_input SET expiresAt=0').run();assert.equal((await request(imagePath)).status,404);
 const tag=await(await request('','supplier',{kind:'tag',image:img})).json();
 assert.equal((await request('/assets/'+tag.id)).status,404);
 assert.equal((await request('/assets/'+tag.id,'buyer')).status,404);
 assert.equal((await request('/assets/'+tag.id,'supplier')).status,200);
 assert.equal((await request('/assets/'+tag.id,'removed')).status,404);
 assert.equal((await request('/assets/'+tag.id,'admin')).status,200);
 writeCommerce(db,{products:[{id:'p',supplier:'s',approval:'approved',photoJobs:{tag:tag.id}}],suppliers:[{id:'s'}],orders:[],payouts:[]});
 assert.deepEqual(Buffer.from(await(await request('/assets/'+tag.id)).arrayBuffer()),Buffer.from(img.split(',')[1],'base64'));
 writeCommerce(db,{products:[{id:'p',supplier:'s',approval:'approved',archivedAt:1,photoJobs:{tag:tag.id}}],suppliers:[{id:'s'}],orders:[],payouts:[]});
 assert.equal((await request('/assets/'+tag.id)).status,404);


});
import {gallery} from '../dist/merchandising.js';
test('public gallery visibly distinguishes synthetic frames from original photos',()=>{
 const html=gallery({name:'Coat',images:['https://example.com/real.jpg','https://example.com/model.jpg'],photoLabels:['Фото товара','ИИ-визуализация · спереди']},s=>s);
 assert.equal((html.match(/class="ai-photo-label"/g)||[]).length,1);
});
test('out of credits is diagnosed without leaking provider messages or credentials',async t=>{
 const s=fixture(t,{},async()=>Response.json({error:'OutOfCredits',message:'secret'}, {status:429}));
 await assert.rejects(()=>s.start(admin,{kind:'cover',image:img}),e=>/кредит/i.test(e.message)&&!e.message.includes('secret'));
});
test('runtime failure reason survives polling and releases the next generation',async t=>{
 const s=fixture(t,{},async url=>Response.json(url.endsWith('/run')?{id:'prediction'}:{status:'failed',error:{name:'ImageLoadError',message:'secret image URL'}}));
 const job=await s.start(admin,{kind:'front',image:img});
 const failed=await s.status(admin,job.id);assert.equal(failed.status,'failed');assert.equal(failed.code,'ImageLoadError');assert.match(failed.message,/фото|изображени/);assert.ok(!JSON.stringify(failed).includes('secret'));
 assert.deepEqual(await s.status(admin,job.id),failed);
 assert.equal((await s.start(admin,{kind:'cover',image:img})).status,'processing');
});
test('provider queue stage reaches the client instead of an unchanging processing label',async t=>{
 const s=fixture(t,{},async url=>Response.json(url.endsWith('/run')?{id:'prediction'}:{status:'in_queue'}));
 const job=await s.start(admin,{kind:'cover',image:img});assert.equal((await s.status(admin,job.id)).stage,'in_queue');
});
test('large valid generated PNG reaches the browser for compression; malformed output ends the job',async t=>{
 const large=img;
 let output=large;const s=fixture(t,{},async url=>Response.json(url.endsWith('/run')?{id:'prediction'}:{status:'completed',output:[output]}));
 const job=await s.start(admin,{kind:'cover',image:img});assert.equal((await s.status(admin,job.id)).image,formatted);
 output='https://untrusted.invalid/result';const bad=await s.start(admin,{kind:'cover',image:img});assert.equal((await s.status(admin,bad.id)).status,'failed');
});

test('large photo is stored privately while provider request stays small and input expires',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let body;
 const s=createPhotoService(db,{APP_URL:'https://shop.example',FASHN_API_KEY:'key'},async(_url,options)=>{body=options.body;return Response.json({id:'prediction'});});
 const image=img;
 await s.start(admin,{kind:'cover',image});assert.ok(body.length<4000);assert.ok(!body.includes('YWFh'));
 const token=JSON.parse(body).inputs.image.split('/').at(-1);
 const restarted=createPhotoService(db,{APP_URL:'https://shop.example',FASHN_API_KEY:'key'});
 assert.equal((await sharp(restarted.input(token).data).metadata()).width,1200);
 assert.equal(db.prepare('SELECT tokenHash FROM photo_input').get().tokenHash.includes(token),false);
 db.prepare('UPDATE photo_input SET expiresAt=0').run();assert.equal(s.input(token),null);
 assert.equal(db.prepare('SELECT count(*) AS n FROM photo_input').get().n,0);
});
test('proxy mode sends product bytes instead of Russian VPS URLs and does not create public inputs',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let options;
 const s=createPhotoService(db,{FASHN_API_KEY:'key',FASHN_PROXY_URL:'http://test:password@localhost:8888',PHOTO_MODEL_FRONT:'https://example.com/front.jpg'},async(_url,o)=>{options=o;return Response.json({id:'prediction'});});
 await s.start(admin,{kind:'front',image:img});
 const body=JSON.parse(options.body);assert.equal(body.inputs.product_image,img);assert.ok(options.dispatcher);assert.equal(db.prepare('SELECT count(*) AS n FROM photo_input').get().n,0);
});
test('proxy mode embeds the configured local model reference so FASHN never fetches the shop',async t=>{
 let body;const s=fixture(t,{APP_URL:'https://shop.example',FASHN_PROXY_URL:'http://localhost:8888',PHOTO_MODEL_FRONT:'https://shop.example/assets/model-references/woman-front-v1.png'},async(_url,o)=>{body=JSON.parse(o.body);return Response.json({id:'prediction'});});
 await s.start(admin,{kind:'front',image:img});assert.ok(body.inputs.model_image.startsWith('data:image/jpeg;base64,'));
});

test('tag keeps original bytes, costs zero and does not call FASHN',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let calls=0;
 const service=createPhotoService(db,{},async()=>{calls++;throw Error('unexpected');});
 const user={id:'u',role:'supplier'},image='data:image/png;base64,YQ==';
 const job=await service.start(user,{kind:'tag',image});assert.equal(job.status,'completed');
 assert.equal((await service.status(user,job.id)).image,image);assert.equal(calls,0);
 assert.equal(db.prepare('SELECT creditsUsed FROM photo_job WHERE id=?').get(job.id).creditsUsed,0);
});
test('regeneration passes comment and records provider credits once',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let inputs;
 const service=createPhotoService(db,{FASHN_API_KEY:'test',APP_URL:'https://shop.example',PHOTO_MODEL_FRONT:'https://example.com/front.png'},async(url,options)=>{
  if(url.endsWith('/run')){inputs=JSON.parse(options.body).inputs;return new Response(JSON.stringify({id:'provider'}));}
  if(url.endsWith('/credits'))return new Response(JSON.stringify({credits:{total:98}}));
  return new Response(JSON.stringify({status:'completed',output:['data:image/png;base64,YQ==']}),{headers:{'x-fashn-credits-used':'2'}});
 });
 const user={id:'u',role:'supplier'},job=await service.start(user,{kind:'front',image:'data:image/png;base64,YQ==',comment:'Preserve the hem'});
 assert.match(inputs.prompt,/Preserve the hem/);assert.ok(Number.isInteger(inputs.seed));
 await service.status(user,job.id);await service.status(user,job.id);
 assert.deepEqual(await service.credits(user),{balance:98,usage:{scope:'personal',confirmed:2,estimated:0,unknown:0}});
});

test('audience selects male references and unisex requires an explicit choice',async t=>{
 const calls=[];const s=fixture(t,{},async(url,options)=>{if(url.endsWith('/run')){calls.push(JSON.parse(options.body));return Response.json({id:'p'+calls.length});}return Response.json({status:'completed',output:[img]});});
 await assert.rejects(()=>s.start(admin,{kind:'front',image:img,audience:'unisex'}),/Выберите модель/);
 for(const [audience,modelGender,kind,expected] of [['men','female','front','man-front-v1.png'],['men',undefined,'back','man-back-v1.png'],['women','male','front','front.jpg'],['unisex','male','front','man-front-v1.png'],['unisex','female','back','back.jpg']]){
  const job=await s.start(admin,{kind,image:img,audience,modelGender});assert.ok(expected.startsWith('man-')?calls.at(-1).inputs.model_image.startsWith('data:image/jpeg;base64,'):calls.at(-1).inputs.model_image.endsWith(expected));await s.status(admin,job.id);
 }
 await assert.rejects(()=>s.start(admin,{kind:'front',image:img,audience:'kids'}),/детских/);
});

test('reopening the same active source resumes its job without another paid request',async t=>{
 let calls=0;const s=fixture(t,{},async()=>{calls++;return Response.json({id:'provider'});});
 const args={kind:'front',image:img};const first=await s.start(admin,args),second=await s.start(admin,args);
 assert.equal(second.id,first.id);assert.equal(second.resumed,true);assert.equal(calls,1);
});
test('different source discovers active job; completed orphan no longer blocks new work',async t=>{
 let runs=0,done=false;const s=fixture(t,{},async url=>url.endsWith('/run')?Response.json({id:'p'+(++runs)}):Response.json(done?{status:'completed',output:[img]}:{status:'processing'}));
 const first=await s.start(admin,{kind:'front',image:img});
 await assert.rejects(()=>s.start(admin,{kind:'front',image:img,comment:'change'}),e=>e.code==='ActiveJob'&&e.activeJob.id===first.id);
 assert.equal(runs,1);done=true;
 const next=await s.start(admin,{kind:'front',image:img,comment:'change'});assert.notEqual(next.id,first.id);assert.equal(runs,2);
});

test('late reopening retrieves completed provider result before declaring expiration',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());const s=createPhotoService(db,{APP_URL:'https://shop.example',FASHN_API_KEY:'test'},async()=>Response.json({status:'completed',output:[img]}));
 db.prepare("INSERT INTO photo_job(id,owner,kind,created,provider,status) VALUES('late','a','cover',?,'provider','processing')").run(Date.now()-20*60000);
 assert.equal((await s.status(admin,'late')).status,'completed');
});

test('cover uses editable prompt and records new cost without changing historical removal estimates',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let sent;
 const s=createPhotoService(db,{APP_URL:'https://shop.example',FASHN_API_KEY:'test'},async(url,opts)=>{if(url.endsWith('/run')){sent=JSON.parse(opts.body);return Response.json({id:'cover-edit'});}return Response.json({status:'completed',output:[img]});});
 const job=await s.start(admin,{kind:'cover',image:img,comment:'Rotate upright'});assert.equal(sent.model_name,'edit');assert.equal(sent.inputs.generation_mode,'balanced');assert.match(sent.inputs.prompt,/Rotate upright/);assert.match(sent.inputs.prompt,/storage creases/);assert.ok(Number.isInteger(sent.inputs.seed));
 await s.status(admin,job.id);assert.equal(db.prepare('SELECT creditsUsed FROM photo_job WHERE id=?').get(job.id).creditsUsed,2);
 db.prepare("INSERT INTO photo_job(id,owner,kind,created,provider,status) VALUES('legacy','a','cover',?,'old','processing')").run(Date.now());await s.status(admin,'legacy');assert.equal(db.prepare("SELECT creditsUsed FROM photo_job WHERE id='legacy'").get().creditsUsed,1);
});
