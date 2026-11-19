import {randomUUID} from 'node:crypto';
export function migrateDrafts(db){db.exec('CREATE TABLE IF NOT EXISTS photo_draft(id TEXT PRIMARY KEY,owner TEXT NOT NULL,updated INTEGER NOT NULL,data TEXT NOT NULL)');}
export function draftStore(db){migrateDrafts(db);return {
 list(user){return db.prepare('SELECT id,updated,data FROM photo_draft WHERE owner=? ORDER BY updated DESC').all(user.id).map(r=>({id:r.id,updated:r.updated,name:JSON.parse(r.data).fields?.name||'Новая вещь'}));},
 read(user,id){const row=db.prepare('SELECT * FROM photo_draft WHERE id=? AND owner=?').get(id,user.id);if(!row)throw Error('Черновик не найден.');return {...JSON.parse(row.data),id:row.id,jobs:db.prepare('SELECT id,kind,status,errorCode,modelGender,created,sourceImage,recipeSignature,mode,sourceKey FROM photo_job WHERE draftId=? AND owner=? ORDER BY created').all(id,user.id)};},
 save(user,id,data){if(!data||typeof data!=='object'||Array.isArray(data)||JSON.stringify(data).length>24000000)throw Error('Некорректный черновик.');if(id)this.read(user,id);else id=randomUUID();db.prepare('INSERT INTO photo_draft(id,owner,updated,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').run(id,user.id,Date.now(),JSON.stringify({fields:data.fields||{},photoSettings:data.photoSettings||{},sources:data.sources||{},selected:data.selected||{},productId:data.productId||null}));return {id};},
 remove(user,id){db.prepare('DELETE FROM photo_draft WHERE id=? AND owner=?').run(id,user.id);}
};}
