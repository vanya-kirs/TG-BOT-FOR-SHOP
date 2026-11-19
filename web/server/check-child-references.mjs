// Explicit paid integration probe; never invoked by the app or unit tests.
// Run from web: node --env-file=.env server/check-child-references.mjs [all]
// Existing prediction IDs are reused on rerun; POST failures are never retried.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createFashnTransport} from './fashn-transport.mjs';
import {childReferencePath} from '../dist/photo-models.js';
import {photoPrompt} from './photo-prompts.mjs';
import {photoPlan} from '../dist/photo-recipes.js';
if(!process.env.FASHN_API_KEY)throw Error('FASHN_API_KEY is missing');
if(!process.argv.includes('--direct')&&!process.env.FASHN_PROXY_URL)throw Error('FASHN_PROXY_URL is missing');
const dir=new URL('../data/child-reference-check/',import.meta.url);await mkdir(dir,{recursive:true});
const direct=process.argv.includes('--direct');
console.log(JSON.stringify({connection:direct?'direct':'proxy'}));
const transport=createFashnTransport(direct?{...process.env,FASHN_PROXY_URL:''}:process.env);
const dataUri=async url=>'data:image/png;base64,'+(await readFile(url)).toString('base64');
const product=await dataUri(new URL('../dist/assets/test-coat.png',import.meta.url));
async function api(path,body){const r=await transport.fetch('https://api.fashn.ai/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.FASHN_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(body?90000:25000),...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok||body&&result.error)throw Error('FASHN '+r.status+' '+(result.error?.name||'RequestError'));return result;}
let failed=false;
try{
 const credits=await api('credits');console.log(JSON.stringify({balanceBefore:credits.credits?.total}));
 const variants=process.argv.includes('all')?['girl','boy'].flatMap(childGender=>['7-9','12-14'].flatMap(childAge=>['front','back'].map(view=>({childGender,childAge,view})))):[{childGender:'girl',childAge:'7-9',view:'front'}];
 for(const settings of variants){const {childGender,childAge,view}=settings,name=`${childGender}-${childAge}-${view}`,recordUrl=new URL(name+'.json',dir);let record;
 try{record=JSON.parse(await readFile(recordUrl,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(record?.status==='completed'){console.log(JSON.stringify({name,status:'completed',cached:true}));continue;}
 if(record?.status==='failed'||record?.status==='submitting'){console.log(JSON.stringify({name,status:record.status,message:'Inspect existing request before retrying'}));failed=true;break;}
 if(!record){record={name,status:'submitting',created:new Date().toISOString()};await writeFile(recordUrl,JSON.stringify(record,null,2));const plan=photoPlan('Пальто','kids',{...settings,shot:'child'}),slot=plan.slots.find(s=>s.key===view);
 const result=await api('run',{model_name:'tryon-max',inputs:{product_image:product,model_image:await dataUri(new URL('../dist'+childReferencePath(settings,view),import.meta.url)),prompt:photoPrompt(view,'',plan,slot)+` The product reference is a three-panel catalog sheet. Transfer only the camel coat shown in the ${view==='front'?'left (front view)':'middle (back view)'} panel. Ignore the other panels. Keep the reference child fully clothed and preserve their age and proportions.`,resolution:'1k',generation_mode:'balanced',num_images:1,return_base64:true,output_format:'jpeg'}});
 if(!result.id||!/^[a-zA-Z0-9_-]+$/.test(result.id))throw Error('Invalid prediction ID');record.id=result.id;record.status='processing';await writeFile(recordUrl,JSON.stringify(record,null,2));console.log(JSON.stringify({name,id:record.id,status:'processing'}));}
 for(let i=0;i<120;i++){const result=await api('status/'+record.id);if(result.status==='completed'){const output=result.output?.[0];if(!/^data:image\/(jpeg|png);base64,/.test(output||''))throw Error('Unexpected image format');const ext=output.startsWith('data:image/png')?'png':'jpg';await writeFile(new URL(name+'.'+ext,dir),Buffer.from(output.split(',')[1],'base64'));record.status='completed';record.file=name+'.'+ext;await writeFile(recordUrl,JSON.stringify(record,null,2));console.log(JSON.stringify({name,status:record.status,file:record.file}));break;}
 if(['failed','canceled','cancelled'].includes(result.status)){record.status='failed';record.error=result.error?.name||'ProviderError';await writeFile(recordUrl,JSON.stringify(record,null,2));console.log(JSON.stringify({name,status:record.status,error:record.error}));failed=true;break;}
 await new Promise(r=>setTimeout(r,3000));}
 if(failed||record.status!=='completed'){failed=true;break;}
 }
 console.log(JSON.stringify({balanceAfter:(await api('credits')).credits?.total,completed:!failed}));
}catch(e){console.error(JSON.stringify({error:e.name,message:e.message?.startsWith('FASHN ')?e.message:'Probe stopped; existing prediction IDs retained. No automatic POST retry.',code:e.cause?.code}));process.exitCode=1;}finally{await transport.close();}
if(failed)process.exitCode=1;
