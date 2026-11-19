import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migratePhotos,resolvePhotoSet,photoUsage} from '../server/photo-records.mjs';
function setup(t){const db=new DatabaseSync(':memory:');migratePhotos(db);t.after(()=>db.close());for(const kind of ['cover','front','back'])db.prepare('INSERT INTO photo_job(id,owner,kind,created,status,image,sourceImage,creditsUsed,creditEstimated) VALUES(?,?,?,?,?,?,?,?,?)').run(kind,'one',kind,Date.now(),'completed','data:image/png;base64,Yg==','data:image/png;base64,YQ==',kind==='cover'?1:2,0);return db;}
const jobs={cover:'cover',front:'front',back:'back'};
test('only three completed correctly typed authorized jobs become the public gallery',t=>{
 const db=setup(t);const set=resolvePhotoSet(db,{id:'one',role:'supplier'},jobs);
 assert.deepEqual(set.images,['/api/photos/assets/cover','/api/photos/assets/front','/api/photos/assets/back']);
 assert.ok(!JSON.stringify(set.images).includes('base64'));assert.equal(set.photoStudio.sources.front,'data:image/png;base64,YQ==');
 assert.throws(()=>resolvePhotoSet(db,{id:'two',role:'supplier'},jobs),/доступ/);
 assert.throws(()=>resolvePhotoSet(db,{id:'one',role:'supplier'},{...jobs,front:'cover'}),/кадр/);
 assert.throws(()=>resolvePhotoSet(db,{id:'one',role:'supplier'},{front:'front'}),/три/);
 db.prepare("UPDATE photo_job SET status='processing' WHERE id='back'").run();assert.throws(()=>resolvePhotoSet(db,{id:'one',role:'supplier'},jobs),/готов/);
});
test('admin approves supplier frames; previous set is editable by authorized product editor',t=>{
 const db=setup(t);assert.equal(resolvePhotoSet(db,{id:'admin',role:'admin'},jobs).images.length,3);
 assert.equal(resolvePhotoSet(db,{id:'two',role:'supplier'},jobs,{photoJobs:jobs}).images.length,3);
});
test('usage separates confirmed costs, estimates, historic unknowns and supplier scope',t=>{
 const db=setup(t);db.prepare("UPDATE photo_job SET creditEstimated=1 WHERE id='back'").run();
 db.prepare("INSERT INTO photo_job(id,owner,kind,created,status,image) VALUES('old','other','front',0,'completed','x')").run();
 assert.deepEqual(photoUsage(db,{id:'one',role:'supplier'}),{scope:'personal',confirmed:3,estimated:2,unknown:0});
 assert.deepEqual(photoUsage(db,{id:'a',role:'admin'}),{scope:'shop',confirmed:3,estimated:2,unknown:1});
});

test('publication rejects mixed or mismatching model genders',t=>{
 const db=setup(t),user={id:'one',role:'supplier'};
 assert.throws(()=>resolvePhotoSet(db,user,jobs,null,'male'),/Пересоздайте/);
 db.prepare("UPDATE photo_job SET modelGender='male' WHERE kind='front'").run();
 assert.throws(()=>resolvePhotoSet(db,user,jobs,null,'male'),/Пересоздайте/);
 db.prepare("UPDATE photo_job SET modelGender='male' WHERE kind='back'").run();
 assert.equal(resolvePhotoSet(db,user,jobs,null,'male').images.length,3);
});

test('saved products retain all generated versions, allowing authorized editor to select an older one',t=>{
 const db=setup(t);db.prepare("UPDATE photo_job SET draftId='draft' WHERE kind='front'").run();
 db.prepare("INSERT INTO photo_job(id,owner,kind,created,status,image,sourceImage,modelGender,draftId) VALUES('front2','one','front',1,'completed','data:image/png;base64,Yg==','data:image/png;base64,YQ==','female','draft')").run();
 const set=resolvePhotoSet(db,{id:'one',role:'supplier'},{...jobs,front:'front2'},null,'female');
 assert.ok(set.photoStudio.versions.some(v=>v.id==='front'));assert.ok(set.photoStudio.versions.some(v=>v.id==='front2'));
 assert.equal(resolvePhotoSet(db,{id:'other',role:'supplier'},jobs,set,'female').photoJobs.front,'front');
});
