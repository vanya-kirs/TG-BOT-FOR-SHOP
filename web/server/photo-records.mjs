import {photoPlan} from '../dist/photo-recipes.js';
export function migratePhotos(db){
 db.exec('CREATE TABLE IF NOT EXISTS photo_job(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,created INTEGER NOT NULL,provider TEXT,status TEXT NOT NULL,image TEXT)');
 const columns=new Set(db.prepare('PRAGMA table_info(photo_job)').all().map(c=>c.name));
 for(const [name,type] of Object.entries({rawImage:'TEXT',formatVersion:'TEXT',recipeSignature:'TEXT',sourceKey:'TEXT',mode:'TEXT',estimatedCost:'REAL',draftId:'TEXT',modelGender:"TEXT DEFAULT 'female'",errorCode:'TEXT',sourceImage:'TEXT',comment:'TEXT',creditsUsed:'REAL',creditEstimated:'INTEGER DEFAULT 0'}))if(!columns.has(name))db.exec(`ALTER TABLE photo_job ADD COLUMN ${name} ${type}`);
}
export function resolvePhotoSet(db,user,jobs,previous,gender,plan){
 const slots=plan?.slots||photoPlan('Одежда','women').slots;
 if(!jobs||Object.keys(jobs).length!==slots.length||!slots.every(s=>typeof jobs[s.key]==='string'))throw Error('Подготовьте все три основных и выбранные дополнительные фото.');
 const sources={},images=[],versions=new Map();
 for(const slot of slots){const kind=slot.key;
  const row=db.prepare('SELECT * FROM photo_job WHERE id=?').get(jobs[kind]);
  if(!row||row.kind!==kind)throw Error('Некорректный кадр.');
  if(row.owner!==user.id&&user.role!=='admin'&&previous?.photoJobs?.[kind]!==row.id&&!previous?.photoStudio?.versions?.some(v=>v.id===row.id&&v.kind===kind))throw Error('Нет доступа к фото.');
  if(['tryon','wear'].includes(slot.mode)&&gender&&row.modelGender!==gender)throw Error('Пересоздайте оба ракурса для выбранной модели.');
  if(plan&&((row.recipeSignature&&row.recipeSignature!==plan.signature)||(!row.recipeSignature&&plan.settings.recipe!=='clothing')||(row.mode&&row.mode!==slot.mode)))throw Error('Подготовьте кадр по текущим настройкам категории.');
  if(row.status!=='completed'||!row.image)throw Error('Фото ещё не готово.');
  for(const version of (row.draftId?db.prepare("SELECT id,kind,status,modelGender,recipeSignature,mode,sourceKey FROM photo_job WHERE draftId=? AND owner=? AND status='completed'").all(row.draftId,row.owner):[{id:row.id,kind:row.kind,status:row.status,modelGender:row.modelGender,recipeSignature:row.recipeSignature,mode:row.mode,sourceKey:row.sourceKey}]))versions.set(version.id,version);
  sources[plan?slot.source:kind]=row.sourceImage;images.push('/api/photos/assets/'+row.id);
 }
 return {images,image:images[0],photoJobs:{...jobs},photoStudio:{sources,versions:[...new Map([...(previous?.photoStudio?.versions||[]),...versions.values()].map(v=>[v.id,v])).values()]},photoLabels:plan?slots.map(s=>(['tryon','wear','edit'].includes(s.mode)?'ИИ-визуализация · ':s.mode==='original'?'Оригинал · ':'')+s.label):['Товар · фон обработан','ИИ-визуализация · спереди','ИИ-визуализация · сзади']};
}
export function photoUsage(db,user){
 const rows=db.prepare('SELECT creditsUsed,creditEstimated,status,kind FROM photo_job'+(user.role==='admin'?'':' WHERE owner=?')).all(...(user.role==='admin'?[]:[user.id]));
 return rows.reduce((a,r)=>{if(r.creditsUsed!==null)a[r.creditEstimated?'estimated':'confirmed']+=r.creditsUsed;else if(r.status==='completed'&&r.kind!=='tag')a.unknown++;return a;},{scope:user.role==='admin'?'shop':'personal',confirmed:0,estimated:0,unknown:0});
}
