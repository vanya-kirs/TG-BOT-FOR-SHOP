// Two paid submissions maximum; saved records prevent resubmission.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createFashnTransport} from './fashn-transport.mjs';
import {generationCanvas,catalogPhoto} from './photo-format.mjs';
import {photoPrompt} from './photo-prompts.mjs';
import {photoPlan} from '../dist/photo-recipes.js';
const folder=new URL('../data/card-format/',import.meta.url),assets=new URL('../dist/assets/accessory-tests/',import.meta.url);await mkdir(folder,{recursive:true});
const transport=createFashnTransport({...process.env,...(process.argv.includes('--direct')?{FASHN_PROXY_URL:''}:{})});
async function api(path,body){const r=await transport.fetch('https://api.fashn.ai/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.FASHN_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok||d.error)throw Error('FASHN '+r.status+' '+(d.error?.name||'Error'));return d;}
try{
 console.log({balanceBefore:(await api('credits')).credits?.total});
 for(const [name,category] of [['scarves','Шарфы'],['belts','Ремни']]){
  const path=new URL(name+'.json',folder);let record;try{record=JSON.parse(await readFile(path));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(record&&record.status!=='processing'){console.log({name,status:record.status,cached:true});continue;}
  if(!record){
   record={status:'submitting'};await writeFile(path,JSON.stringify(record));
   const plan=photoPlan(category,'women'),slot=plan.slots.find(s=>s.key==='front');
   const image=await generationCanvas(await readFile(new URL(name+'-front.jpg',assets)));
   const d=await api('run',{model_name:'edit',inputs:{image,prompt:photoPrompt('front','Preserve this exact existing person and item. Recompose this photograph into the full portrait canvas, replacing all padding with a continuous studio scene.',plan,slot),return_base64:true,output_format:'jpeg',resolution:'1k',generation_mode:'balanced',num_images:1}});
   record={id:d.id,status:'processing'};await writeFile(path,JSON.stringify(record));
  }
  for(let i=0;i<120;i++){
   const d=await api('status/'+record.id);
   if(d.status==='completed'){
    await writeFile(new URL(name+'-format-raw.jpg',assets),Buffer.from(d.output[0].split(',')[1],'base64'));
    try{await writeFile(new URL(name+'-portrait.jpg',assets),await catalogPhoto(d.output[0]));record.status='completed';}catch(e){record.status='invalid';record.message=e.message;}
    await writeFile(path,JSON.stringify(record));console.log({name,...record});break;
   }
   if(['failed','canceled'].includes(d.status)){record.status='failed';await writeFile(path,JSON.stringify(record));console.log({name,status:record.status});break;}
   await new Promise(r=>setTimeout(r,3000));
  }
 }
 console.log({balanceAfter:(await api('credits')).credits?.total});
}finally{await transport.close();}
