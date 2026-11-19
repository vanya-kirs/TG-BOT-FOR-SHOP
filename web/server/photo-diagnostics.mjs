import {createFashnTransport} from './fashn-transport.mjs';
// Read-only diagnosis. Never prints keys, user records or image payloads.
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
const env=process.env;
const transport=createFashnTransport(env);
console.log('FASHN proxy enabled:',transport.proxied);
console.log('photo config',Object.fromEntries(['FASHN_API_KEY','PHOTO_MODEL_FRONT','PHOTO_MODEL_BACK'].map(k=>[k,!!env[k]?.trim()])));
if(env.FASHN_API_KEY){
 try{
  const r=await transport.fetch('https://api.fashn.ai/v1/credits',{headers:{Authorization:'Bearer '+env.FASHN_API_KEY},signal:AbortSignal.timeout(15000)});
  const d=await r.json().catch(()=>({}));
  const name=typeof d.error==='string'?d.error:d.error?.name;
  console.log('FASHN',{http:r.status,credits:Number.isFinite(d.credits?.total)?d.credits.total:null,error:typeof name==='string'&&/^[A-Za-z]{1,50}$/.test(name)?name:null});
 }catch(e){console.log('FASHN connection',{error:e.name,code:e.cause?.code});}
}
const path=env.DATABASE_PATH||'./data/accounts.sqlite';
if(existsSync(path)){
 const db=new DatabaseSync(path,{readOnly:true});
 try{
  const cols=db.prepare('PRAGMA table_info(photo_job)').all().map(c=>c.name);
  if(cols.length){
   const rows=db.prepare(`SELECT kind,status,created,${cols.includes('errorCode')?'errorCode':'NULL AS errorCode'} FROM photo_job ORDER BY created DESC LIMIT 10`).all();
   console.log('recent jobs',rows.map(({created,...r})=>({...r,time:new Date(created).toISOString()})));
  }else console.log('No photo jobs table: update the application.');
 }finally{db.close();}
}

if(process.argv.includes('--probe')&&env.FASHN_API_KEY){
 // Invalid model: probe request transport without creating a paid prediction.
 for(const size of [350000,3000000]){
  const started=Date.now();
  try{
   const r=await transport.fetch('https://api.fashn.ai/v1/run',{method:'POST',headers:{Authorization:'Bearer '+env.FASHN_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model_name:'diagnostic-invalid-model',inputs:{image:'x'.repeat(size)}}),signal:AbortSignal.timeout(25000)});
   console.log('upload probe',{size,http:r.status,ms:Date.now()-started});await r.body?.cancel();
  }catch(e){console.log('upload probe',{size,error:e.name,code:e.cause?.code,ms:Date.now()-started});}
 }
}
await transport.close();
