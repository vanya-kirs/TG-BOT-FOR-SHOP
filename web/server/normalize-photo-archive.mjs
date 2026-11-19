// Free, reversible migration. Never invokes FASHN or crops incompatible compositions.
import {DatabaseSync} from 'node:sqlite';
import {migratePhotos} from './photo-records.mjs';
import {catalogPhoto,photoData} from './photo-format.mjs';
const db=new DatabaseSync(process.env.DATABASE_PATH||'data/accounts.sqlite');migratePhotos(db);
const apply=process.argv.includes('--apply'),summary={apply,prepared:0,needsRecomposition:0};
try{for(const row of db.prepare("SELECT * FROM photo_job WHERE status='completed' AND image IS NOT NULL AND formatVersion IS NULL AND kind<>'tag' AND COALESCE(mode,'')<>'original'").all()){
 try{const image=photoData(await catalogPhoto(row.image,{cutout:row.mode==='background'}));if(apply)db.prepare("UPDATE photo_job SET rawImage=COALESCE(rawImage,image),image=?,formatVersion='catalog-3x4-v1' WHERE id=? AND formatVersion IS NULL").run(image,row.id);summary.prepared++;}
 catch{summary.needsRecomposition++;}
}console.log(summary);}finally{db.close();}
