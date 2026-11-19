// Explicit paid probe. Reruns resume saved IDs; ambiguous submissions never retry.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createFashnTransport} from './fashn-transport.mjs';
import {photoPlan} from '../dist/photo-recipes.js';import {photoPrompt} from './photo-prompts.mjs';
const cases=[['bags','Сумки'],['shoes','Кроссовки'],['headwear','Шапки'],['glasses','Очки'],['jewelry','Ожерелья'],['watches','Часы'],['belts','Ремни'],['scarves','Шарфы']];
const dir=new URL('../data/accessory-check/',import.meta.url),assets=new URL('../dist/assets/accessory-tests/',import.meta.url);await mkdir(dir,{recursive:true});
const transport=createFashnTransport(process.argv.includes('--direct')?{...process.env,FASHN_PROXY_URL:''}:process.env);
const uri=async path=>'data:image/png;base64,'+(await readFile(path)).toString('base64');
async function api(path,body){const r=await transport.fetch('https://api.fashn.ai/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.FASHN_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok||body&&d.error)throw Error('FASHN '+r.status+' '+(d.error?.name||'RequestError'));return d;}
try{
 console.log({balanceBefore:(await api('credits')).credits?.total});
 const model=await uri(new URL('../dist/assets/model-references/woman-front-v1.png',import.meta.url));
 for(const [recipe,category] of (process.argv.includes('--refine')?cases.slice(0,2):cases))for(const kind of (process.argv.includes('--refine')?['front']:['cover','front'])){
 const name=recipe+'-'+kind+(process.argv.includes('--refine')?'-v2':''),path=new URL(name+'.json',dir);let record;try{record=JSON.parse(await readFile(path));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(['completed','failed','submitting'].includes(record?.status)){console.log({name,status:record.status,cached:true});continue;}
 if(!record){const plan=photoPlan(category,'women'),slot=plan.slots.find(s=>s.key===kind),image=await uri(new URL(recipe+'-source.png',assets));record={name,recipe,category,kind,status:'submitting',created:new Date().toISOString()};await writeFile(path,JSON.stringify(record));
 try{const d=await api('run',{model_name:kind==='cover'?'background-remove':'edit',inputs:kind==='cover'?{image,return_base64:true}:{image,image_context:model,prompt:photoPrompt(kind,'',plan,slot),return_base64:true,output_format:'jpeg',resolution:'1k',generation_mode:'balanced',num_images:1}});if(!d.id)throw Error('Missing prediction ID');record.id=d.id;record.status='processing';await writeFile(path,JSON.stringify(record));}catch(e){console.log({name,error:e.message});continue;}}
 console.log({name,id:record.id,status:record.status});
 for(let i=0;i<120;i++){let d;try{d=await api('status/'+record.id);}catch(e){console.log({name,pollError:e.message});break;}
 if(d.status==='completed'){const output=d.output?.[0];if(!/^data:image\/(png|jpeg|webp);base64,/.test(output||''))throw Error('Unexpected output format');const ext=output.startsWith('data:image/png')?'png':output.startsWith('data:image/webp')?'webp':'jpg';record.file=name+'.'+ext;await writeFile(new URL(record.file,assets),Buffer.from(output.split(',')[1],'base64'));record.status='completed';await writeFile(path,JSON.stringify(record));console.log({name,status:record.status});break;}
 if(['failed','canceled','cancelled'].includes(d.status)){record.status='failed';record.error=d.error?.name||'ProviderError';await writeFile(path,JSON.stringify(record));console.log({name,status:record.status,error:record.error});break;}await new Promise(r=>setTimeout(r,3000));}
 }
 console.log({balanceAfter:(await api('credits')).credits?.total});
}finally{await transport.close();}
