import {generationCanvas,catalogPhoto,photoData} from './photo-format.mjs';
import {photoPlan} from '../dist/photo-recipes.js';
import {photoPrompt} from './photo-prompts.mjs';
import {draftStore} from './photo-drafts.mjs';
import {photoModelGender,childReferencePath} from '../dist/photo-models.js';
import {migratePhotos,photoUsage} from './photo-records.mjs';
import {createFashnTransport} from './fashn-transport.mjs';
import {readFileSync} from 'node:fs';
import express from 'express';
import {randomUUID,randomBytes,randomInt,createHash} from 'node:crypto';
import {fromNodeHeaders} from 'better-auth/node';
import {readCommerce} from './commerce.mjs';
const imageOK=(v,limit=3000000)=>typeof v==='string'&&v.length<=limit&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
const fail=message=>{throw Error(message);};
const errorMessages={
 UnauthorizedAccess:'FASHN отклонил API-ключ. Проверьте ключ на сервере и перезапустите приложение.',
 OutOfCredits:'На счёте FASHN закончились API-кредиты. Пополните баланс FASHN API.',
 RateLimitExceeded:'FASHN ограничил частоту запросов. Подождите и попробуйте позже.',
 ConcurrencyLimitExceeded:'FASHN уже обрабатывает другие фото. Дождитесь их завершения.',
 ImageLoadError:'FASHN не смог загрузить фото товара или референс модели. Проверьте файл и доступность ссылок на модель.',
 InputValidationError:'FASHN отклонил параметры или исходное фото. Проверьте формат и размеры изображения.',
 BadRequest:'FASHN отклонил запрос. Проверьте настройки обработки и исходное фото.',
 ContentModerationError:'FASHN отклонил изображение при проверке содержимого. Выберите другое фото.',
 ThirdPartyError:'Сервис обработки FASHN сообщил о сбое внешнего провайдера.',
 UnavailableError:'Сервис FASHN временно недоступен. Попробуйте позже.',
 PipelineError:'Ошибка обработки изображения внутри FASHN. Попробуйте другое фото или повторите позже.',
 InternalServerError:'Внутренняя ошибка FASHN. Попробуйте позже.',
 Forbidden:'FASHN запретил доступ. Проверьте разрешения API-ключа и доступность сервиса с сервера.',
 NotFound:'FASHN не нашёл задание или метод обработки.',
 NetworkError:'Не удалось связаться с FASHN с сервера магазина. Проверьте соединение; запрос мог быть принят, не запускайте его повторно без проверки.',
 Timeout:'FASHN не ответил вовремя. Запрос мог быть принят; проверьте его в кабинете FASHN перед повторным запуском.',
 InvalidComposition:'FASHN вернул кадр другого формата. Он не опубликован. Переделайте только этот кадр; повторный запуск расходует кредиты.',
 InvalidOutput:'FASHN вернул слишком большой результат или неподдерживаемый формат. Уменьшите исходное фото.',
 Expired:'Время ожидания обработки истекло. Проверьте задание в кабинете FASHN.',
 ProviderError:'FASHN не смог обработать запрос. Проверьте задание в кабинете сервиса.'
};
class PhotoError extends Error{constructor(code){super(errorMessages[code]||errorMessages.ProviderError);this.code=errorMessages[code]?code:'ProviderError';}}
const providerCode=(data,status)=>{
 const code=typeof data?.error==='string'?data.error:data?.error?.name;
 return errorMessages[code]?code:({401:'UnauthorizedAccess',402:'OutOfCredits',403:'Forbidden',404:'NotFound',429:'RateLimitExceeded',400:'BadRequest',422:'InputValidationError',500:'InternalServerError',502:'UnavailableError',503:'UnavailableError'}[status]||'ProviderError');
};
export function createPhotoService(db,env=process.env,fetcher){
 const transport=createFashnTransport(env,fetcher);
 migratePhotos(db);const drafts=draftStore(db);
 db.exec('CREATE TABLE IF NOT EXISTS photo_input(tokenHash TEXT PRIMARY KEY,image TEXT NOT NULL,expiresAt INTEGER NOT NULL)');
 const pruneInputs=()=>db.prepare('DELETE FROM photo_input WHERE expiresAt<=?').run(Date.now());
 const tokenHash=token=>createHash('sha256').update(token).digest('hex');
 const input=token=>{
  pruneInputs();if(typeof token!=='string'||!(/^[a-f0-9]{64}$/.test(token)))return null;
  const row=db.prepare('SELECT image FROM photo_input WHERE tokenHash=? AND expiresAt>?').get(tokenHash(token),Date.now());
  if(!row)return null;
  const [header,base64]=row.image.split(',');return {mime:header.slice(5,header.indexOf(';')),data:Buffer.from(base64,'base64')};
 };
 const failJob=(id,code)=>{db.prepare("UPDATE photo_job SET status='failed',errorCode=? WHERE id=?").run(code,id);return {id,status:'failed',code,message:errorMessages[code]||errorMessages.ProviderError};};
 const allowed=user=>{if(!user||!['admin','supplier'].includes(user.role))fail('Нет доступа.');};
 const reference=(kind,gender='female',settings)=>settings?.recipe==='kids'?new URL(childReferencePath(settings,kind),env.APP_URL||'https://shop.example.com').href:gender==='male'?(env[kind==='front'?'PHOTO_MODEL_MALE_FRONT':'PHOTO_MODEL_MALE_BACK']||(env.APP_URL?new URL('/assets/model-references/man-'+kind+'-v1.png',env.APP_URL).href:'')):env[kind==='front'?'PHOTO_MODEL_FRONT':'PHOTO_MODEL_BACK'];
 const modelImage=async(kind,gender,settings)=>{
  const value=reference(kind,gender,settings);if(settings?.recipe==='kids'){const bytes=readFileSync(new URL('../dist'+childReferencePath(settings,kind),import.meta.url));return generationCanvas('data:image/png;base64,'+bytes.toString('base64'));}
  const url=new URL(value);
  if(env.APP_URL&&url.origin===new URL(env.APP_URL).origin){
   if(!/^\/assets\/model-references\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(url.pathname))fail('Локальный референс должен находиться в assets/model-references.');
   try{const bytes=readFileSync(new URL('../dist'+url.pathname,import.meta.url));if(bytes.length>5*1024*1024)throw Error();const extension=url.pathname.split('.').at(-1);return generationCanvas('data:image/'+(extension==='jpg'?'jpeg':extension)+';base64,'+bytes.toString('base64'));}
   catch{fail('Не удалось прочитать локальный референс модели. Загрузите файл на сервер.');}
  }
  return value;
 };
 const config=()=>({enabled:!!env.FASHN_API_KEY,front:!!reference('front'),back:!!reference('back')});
 async function api(path,body){
  try{
   const r=await transport.fetch('https://api.fashn.ai/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.FASHN_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(body?90000:25000),...(body?{body:JSON.stringify(body)}:{})});
   const data=await r.json().catch(()=>null);
   if(!r.ok)throw new PhotoError(providerCode(data,r.status));
   if(!data)throw new PhotoError('ProviderError');const cost=r.headers?.get('x-fashn-credits-used');if(cost!==null&&cost!==undefined&&cost!==''&&Number.isFinite(Number(cost))&&Number(cost)>=0)data.creditsUsed=Number(cost);return data;
  }catch(e){if(e instanceof PhotoError)throw e;throw new PhotoError(e.name==='TimeoutError'||e.name==='AbortError'?'Timeout':'NetworkError');}
 }
 const service={config,input,close:()=>transport.close(),async credits(user){allowed(user);const result=await api('credits');return {balance:result.credits?.total??null,usage:photoUsage(db,user)};},async start(user,{kind,image,comment='',audience='women',modelGender,draftId,category,photoSettings}={}){
  allowed(user);if(draftId)drafts.read(user,draftId);const plan=category?photoPlan(category,audience,photoSettings):null,slot=plan?.slots.find(s=>s.key===kind);if(plan&&!slot)fail('Этот кадр не предусмотрен категорией.');if(plan?.settings.recipe==='kids'&&plan.needsModel)photoModelGender(audience,modelGender,plan.settings);const mode=slot?.mode||(kind==='cover'?'edit':'tryon');if(mode==='original'){if(!imageOK(image,2800000))fail('Оригинал: JPEG, PNG или WebP до 2 МБ.');const id=randomUUID();db.prepare("INSERT INTO photo_job(id,owner,kind,created,status,image,sourceImage,creditsUsed,draftId,recipeSignature,sourceKey,mode,modelGender) VALUES(?,?,?,?,?,?,?,0,?,?,?,?,NULL)").run(id,user.id,kind,Date.now(),'completed',image,image,draftId||null,plan.signature,slot.source,mode);return {id,status:'completed'};}if(kind==='tag'){if(!imageOK(image,28000000))fail('Бирка: JPEG, PNG или WebP до 20 МБ.');const id=randomUUID();db.prepare("INSERT INTO photo_job(id,owner,kind,created,status,image,sourceImage,creditsUsed) VALUES(?,?,?,?,?,?,?,0)").run(id,user.id,kind,Date.now(),'completed',image,image);return {id,status:'completed',image};}if(typeof comment!=='string'||comment.length>500)fail('Комментарий — до 500 символов.');if(!config().enabled)fail('Обработка фото ещё не настроена.');
  if((!slot&&!['cover','front','back'].includes(kind))||!imageOK(image))fail('Загрузите исходное фото JPEG, PNG или WebP.');
  const needsModel=['tryon','wear'].includes(mode);const gender=needsModel?photoModelGender(audience,modelGender,plan?.settings):null;
  if(needsModel&&!/^https:\/\/\S+$/.test(reference(kind==='back'||slot?.view==='backpack'?'back':'front',gender,plan?.settings)||''))fail('Референс модели для этого ракурса не настроен.');
  let origin;try{if(!transport.proxied){const url=new URL(env.APP_URL);if(url.protocol!=='https:'||url.username||url.password)throw Error();origin=url.origin;}}catch{fail('Для обработки фото укажите публичный HTTPS-адрес магазина в APP_URL.');}
  const referenceKind=kind==='back'||slot?.view==='backpack'?'back':'front';const model=needsModel?await modelImage(referenceKind,gender,plan?.settings):null;
  const now=Date.now(),raw=Number(env.PHOTO_DAILY_LIMIT||30),limit=Number.isInteger(raw)&&raw>0?raw:30;
  const findActive=()=>db.prepare("SELECT * FROM photo_job WHERE owner=? AND kind=? AND status IN ('starting','processing') AND created>? ORDER BY created DESC LIMIT 1").get(user.id,kind,now-600000);
  const conflict=row=>{const e=Error('Предыдущая обработка ещё выполняется. Проверяем её состояние.');e.code='ActiveJob';e.activeJob={id:row.id,kind:row.kind};throw e;};
  const active=findActive();
  if(active){
   const same=active.recipeSignature===(plan?.signature||null)&&active.draftId===(draftId||null)&&active.kind===kind&&active.sourceImage===image&&active.modelGender===gender&&(active.comment||'')===comment;
   if(same)return {id:active.id,status:'processing',resumed:true};
   let state;try{state=await service.status(user,active.id);}catch{conflict(active);}
   if(state.status==='processing')conflict(active);
   // Recheck after the await: a concurrent request may already have reserved another job.
   const next=findActive();if(next)conflict(next);
  }
  if(db.prepare("SELECT count(*) AS n FROM photo_job WHERE kind<>'tag' AND created>?").get(now-86400000).n>=limit)fail('Достигнут суточный лимит обработки фото.');
  // Reserve before awaiting the provider; ambiguous network errors are never retried automatically.
  const id=randomUUID();db.prepare('INSERT INTO photo_job(id,owner,kind,created,provider,status,image) VALUES(?,?,?,?,NULL,?,NULL)').run(id,user.id,kind,now,'starting');db.prepare('UPDATE photo_job SET sourceImage=?,comment=?,modelGender=?,draftId=?,estimatedCost=?,recipeSignature=?,sourceKey=?,mode=? WHERE id=?').run(image,comment,gender,draftId||null,mode==='background'?1:2,plan?.signature||null,slot?.source||kind,mode,id);
  try{
   let imageUrl=['edit','wear'].includes(mode)?await generationCanvas(image):image;
   if(!transport.proxied){
    // Direct mode uses a short-lived capability URL to keep POST bodies small.
    pruneInputs();const token=randomBytes(32).toString('hex');
    db.prepare('INSERT INTO photo_input(tokenHash,image,expiresAt) VALUES(?,?,?)').run(tokenHash(token),imageUrl,now+20*60*1000);
    imageUrl=origin+'/api/photos/inputs/'+token;
   }
   const common={return_base64:true,output_format:'jpeg',resolution:'1k',generation_mode:'balanced',num_images:1,seed:randomInt(4294967296),prompt:photoPrompt(kind,comment,plan,slot)};
   const inputs=mode==='background'?{image:imageUrl,return_base64:true}:mode==='tryon'?{...common,product_image:imageUrl,model_image:model}:{...common,image:imageUrl,...(mode==='wear'?{image_context:model}:{})};
   const result=await api('run',{model_name:mode==='background'?'background-remove':mode==='tryon'?'tryon-max':'edit',inputs});
   if(result.error)throw new PhotoError(providerCode(result));
   if(typeof result.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(result.id))throw new PhotoError('ProviderError');
   db.prepare('UPDATE photo_job SET provider=?,status=? WHERE id=?').run(result.id,'processing',id);return {id,status:'processing'};
  }catch(e){const error=e instanceof PhotoError?e:new PhotoError('ProviderError');failJob(id,error.code);throw error;}
 },async status(user,id){
  allowed(user);const row=db.prepare('SELECT * FROM photo_job WHERE id=? AND owner=?').get(id,user.id);if(!row)fail('Задание не найдено.');
  if(row.status==='completed')return {id,status:row.status,image:row.image};
  if(row.status==='failed')return {id,status:'failed',code:row.errorCode||'ProviderError',message:errorMessages[row.errorCode]||errorMessages.ProviderError};
  if(!row.provider&&Date.now()-row.created>600000)return failJob(id,'Expired');
  if(!row.provider)return {id,status:'processing'};
  const result=await api('status/'+row.provider);
  if(result.status==='completed'){
   db.prepare('UPDATE photo_job SET creditsUsed=?,creditEstimated=? WHERE id=?').run(result.creditsUsed??row.estimatedCost??(row.kind==='cover'?1:2),result.creditsUsed===undefined?1:0,id);
   const output=result.output?.[0];if(!imageOK(output,20000000))return failJob(id,'InvalidOutput');
   db.prepare('UPDATE photo_job SET rawImage=? WHERE id=?').run(output,id);
   let prepared;try{prepared=photoData(await catalogPhoto(output,{cutout:row.mode==='background'}));}catch{return failJob(id,'InvalidComposition');}
   db.prepare("UPDATE photo_job SET status='completed',formatVersion='catalog-3x4-v1',image=? WHERE id=?").run(prepared,id);return {id,status:'completed',image:prepared};
  }
  if(result.error||['failed','canceled','cancelled'].includes(result.status))return failJob(id,providerCode(result));
  if(Date.now()-row.created>3600000)return failJob(id,'Expired');
  return {id,status:'processing',stage:['starting','in_queue','processing'].includes(result.status)?result.status:'processing'};
 }};
 return service;
}
export function photoRoutes(identity,env=process.env,fetcher){
 const router=express.Router(),service=createPhotoService(identity.database,{...env,APP_URL:env.APP_URL||identity.baseURL},fetcher);
 // Only an unguessable, expiring token grants access; no account data or listing is exposed.
 router.get('/inputs/:token',(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const source=service.input(req.params.token);if(!source)return res.sendStatus(404);
  res.setHeader('Content-Type',source.mime);res.send(source.data);
 });
 router.get('/assets/:id',async(req,res)=>{try{
  const row=identity.database.prepare("SELECT * FROM photo_job WHERE id=? AND status='completed'").get(req.params.id);if(!row?.image)return res.sendStatus(404);
  const products=readCommerce(identity.database).products.filter(p=>Object.values(p.photoJobs||{}).includes(row.id)||p.photoStudio?.versions?.some(v=>v.id===row.id));
  if(!products.some(p=>p.approval==='approved'&&!p.archivedAt&&Object.values(p.photoJobs||{}).includes(row.id))){
   const user=(await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)}))?.user;
   if(!user||!['admin','supplier'].includes(user.role)||user.role==='supplier'&&(!readCommerce(identity.database).suppliers.some(s=>s.id===user.supplierId&&!s.deletedAt)||row.owner!==user.id&&!products.some(p=>p.supplier===user.supplierId)))return res.sendStatus(404);
  }
  const [header,base64]=row.image.split(',');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(header.slice(5,header.indexOf(';'))).send(Buffer.from(base64,'base64'));
 }catch{res.sendStatus(503);}});
 router.use(async(req,res,next)=>{try{
  req.user=(await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)}))?.user;
  if(!req.user)return res.status(401).json({message:'Войдите в аккаунт.'});
  if(!['admin','supplier'].includes(req.user.role))return res.status(403).json({message:'Нет доступа.'});
  if(req.user.role==='supplier'&&!readCommerce(identity.database).suppliers.some(s=>s.id===req.user.supplierId&&!s.deletedAt))return res.status(403).json({message:'Доступ поставщика закрыт.'});
  next();
 }catch{res.status(503).json({message:'Не удалось проверить вход.'});}});
 // Persist provider results even if every browser tab has been closed.
 let checking=false;const worker=setInterval(async()=>{if(checking)return;checking=true;try{const rows=identity.database.prepare("SELECT id,owner FROM photo_job WHERE status IN ('starting','processing') AND provider IS NOT NULL ORDER BY created LIMIT 6").all();await Promise.allSettled(rows.map(row=>service.status({id:row.owner,role:'admin'},row.id)));}catch{}finally{checking=false;}},5000);worker.unref();
 const drafts=draftStore(identity.database);
 router.get('/drafts',(req,res)=>res.json(drafts.list(req.user)));
 router.get('/drafts/:id',(req,res)=>{try{res.json(drafts.read(req.user,req.params.id));}catch(e){res.status(404).json({message:e.message});}});
 router.put('/drafts/:id',express.json({limit:'26mb'}),(req,res)=>{try{res.json(drafts.save(req.user,req.params.id==='new'?null:req.params.id,req.body));}catch(e){res.status(400).json({message:e.message});}});
 router.delete('/drafts/:id',(req,res)=>{drafts.remove(req.user,req.params.id);res.json({ok:true});});
 router.get('/config' ,(_req,res)=>res.json(service.config()));
 router.post('/',express.json({limit:'28mb'}),async(req,res)=>{try{res.status(202).json(await service.start(req.user,req.body));}catch(e){res.status(400).json({message:e.message,...(e.code?{code:e.code}:{}),...(e.activeJob?{activeJob:e.activeJob}:{})});}});
 router.get('/credits',async(req,res)=>{try{res.json(await service.credits(req.user));}catch(e){res.status(503).json({message:e.message});}});
 router.get('/:id',async(req,res)=>{try{res.json(await service.status(req.user,req.params.id));}catch(e){res.status(400).json({message:e.message,...(e.code?{code:e.code}:{}),...(e.activeJob?{activeJob:e.activeJob}:{})});}});
 return router;
}
