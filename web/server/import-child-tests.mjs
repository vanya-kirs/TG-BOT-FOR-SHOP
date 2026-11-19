import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {migratePhotos} from './photo-records.mjs';
import {migrateDrafts} from './photo-drafts.mjs';
import {photoPlan} from '../dist/photo-recipes.js';
export function importChildTests(db,directory,ownerId){
 const user=ownerId?db.prepare('SELECT id FROM user WHERE id=? AND role=?').get(ownerId,'admin'):db.prepare("SELECT id FROM user WHERE role='admin' ORDER BY createdAt,id LIMIT 1").get();
 if(!user)throw Error('Administrator account not found; no results imported.');
 migratePhotos(db);migrateDrafts(db);const prepared=[];
 for(const childGender of ['girl','boy'])for(const childAge of ['7-9','12-14']){
  const draftId=`child-check-${childGender}-${childAge}`,plan=photoPlan('Пальто','kids',{shot:'child',childGender,childAge}),selected={},jobs=[];
  for(const kind of ['front','back']){const name=`${childGender}-${childAge}-${kind}`,record=JSON.parse(readFileSync(new URL(name+'.json',directory),'utf8'));if(record.status!=='completed'||record.file!==name+'.jpg')throw Error('Incomplete child test: '+name);
   const existing=db.prepare('SELECT id,owner FROM photo_job WHERE provider=?').get(record.id);if(existing&&existing.owner!==user.id)throw Error('Provider job already belongs to another account.');
   const id=existing?.id||'child-check-'+name;selected[kind]=id;jobs.push({id,kind,provider:record.id,created:Date.parse(record.created),image:'data:image/jpeg;base64,'+readFileSync(new URL(record.file,directory)).toString('base64')});
  }
  const data={fields:{name:`Тест FASHN · ${childGender==='girl'?'девочка':'мальчик'} ${childAge} лет`,audience:'kids',category:'Пальто',description:'Тестовая генерация на синтетическом пальто. Не является товаром в продаже. Для реального товара загрузите собственные исходники.',modelGender:childGender==='girl'?'female':'male'},photoSettings:plan.settings,sources:{},selected,productId:null};prepared.push({draftId,plan,data,jobs});
 }
 let inserted=0;db.exec('BEGIN IMMEDIATE');try{for(const item of prepared){
  const prior=db.prepare('SELECT owner FROM photo_draft WHERE id=?').get(item.draftId);if(prior&&prior.owner!==user.id)throw Error('Imported draft belongs to another administrator.');
  db.prepare('INSERT OR IGNORE INTO photo_draft(id,owner,updated,data) VALUES(?,?,?,?)').run(item.draftId,user.id,Date.now(),JSON.stringify(item.data));
  for(const job of item.jobs)inserted+=Number(db.prepare("INSERT OR IGNORE INTO photo_job(id,owner,kind,created,provider,status,image,draftId,modelGender,recipeSignature,sourceKey,mode,creditsUsed,creditEstimated) VALUES(?,?,?,?,?,'completed',?,?,?,?,?,'tryon',2,1)").run(job.id,user.id,job.kind,job.created,job.provider,job.image,item.draftId,item.data.fields.modelGender,item.plan.signature,job.kind).changes);
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return {drafts:prepared.length,insertedJobs:inserted};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=process.env.DATABASE_PATH||'./data/accounts.sqlite';if(!existsSync(path))throw Error('Existing application database not found.');const db=new DatabaseSync(path);try{console.log(importChildTests(db,new URL('../deploy/child-test-results/',import.meta.url),process.env.CHILD_TEST_OWNER_ID));}finally{db.close();}}
