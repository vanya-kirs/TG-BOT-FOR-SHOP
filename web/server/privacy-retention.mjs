import {backup} from 'node:sqlite';
import {mkdirSync,readdirSync,lstatSync,unlinkSync,chmodSync,renameSync} from 'node:fs';
import {join} from 'node:path';
const day=86400000;
const exists=(db,name)=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
const column=(db,table,name)=>exists(db,table)&&db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name);
export function privacySchema(db){db.exec('CREATE TABLE IF NOT EXISTS privacy_security_event(id INTEGER PRIMARY KEY,createdAt INTEGER NOT NULL,event TEXT NOT NULL);');}
function eligible(db,id){
 const user=db.prepare('SELECT id,role FROM user WHERE id=?').get(id);if(!user)return false;
 if(user.role!=='customer')throw Error('Удаление служебного аккаунта требует отдельной проверки.');
 if(exists(db,'commerce')){const s=JSON.parse(db.prepare('SELECT data FROM commerce WHERE id=1').get()?.data||'{}');if(s.orders?.some(o=>o.userId===id))throw Error('Есть история заказов: сначала определить обязательные сроки и объём сохраняемых данных.');}
 if(column(db,'user','supplierId')&&db.prepare('SELECT supplierId FROM user WHERE id=?').get(id)?.supplierId)throw Error('Есть связь со служебным аккаунтом.');
 return true;
}
export function eraseUnusedAccount(db,id){
 db.exec('PRAGMA secure_delete=ON; BEGIN IMMEDIATE');try{
  if(!eligible(db,id)){db.exec('ROLLBACK');return false;}
  for(const table of ['customer_store','session','account'])if(column(db,table,'userId'))db.prepare(`DELETE FROM ${table} WHERE userId=?`).run(id);
  db.prepare('DELETE FROM user WHERE id=?').run(id);db.exec('COMMIT');return true;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function runRetention(db,now=Date.now()){
 privacySchema(db);db.exec('PRAGMA secure_delete=ON');
 for(const table of ['session','verification'])if(column(db,table,'expiresAt'))db.prepare(`DELETE FROM ${table} WHERE expiresAt<=?`).run(now);
 for(const table of ['otp_cooldown','reset_cooldown'])if(exists(db,table))db.prepare(`DELETE FROM ${table} WHERE next_at<=?`).run(now);
 db.prepare('DELETE FROM privacy_security_event WHERE createdAt<=?').run(now-90*day);
 if(exists(db,'supplier_invite'))db.prepare('DELETE FROM supplier_invite WHERE expiresAt<=?').run(now-90*day);
 // Unverified unused registrations are not financial records. Orders and staff are protected.
 if(column(db,'user','emailVerified'))for(const user of db.prepare("SELECT id FROM user WHERE emailVerified=0 AND role='customer' AND createdAt<?").all(now-7*day)){
  const providers=column(db,'account','providerId')?db.prepare('SELECT providerId FROM account WHERE userId=?').all(user.id).map(r=>r.providerId):[];
  const active=column(db,'session','userId')&&db.prepare('SELECT 1 FROM session WHERE userId=? LIMIT 1').get(user.id);
  if(providers.length&&providers.every(p=>p==='credential')&&!active&&eligibleWithoutHistory(db,user.id))eraseUnusedAccount(db,user.id);
 }
 db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 return {completedAt:now};
}
function eligibleWithoutHistory(db,id){try{return eligible(db,id);}catch{return false;}}
export async function maintainBackups(db,directory,now=Date.now()){
 mkdirSync(directory,{recursive:true,mode:0o700});
 for(const name of readdirSync(directory)){const match=/^accounts-(\d{13})\.sqlite\.tmp$/.exec(name);if(match&&Number(match[1])<=now-day&&lstatSync(join(directory,name)).isFile())unlinkSync(join(directory,name));}
 const copies=readdirSync(directory).flatMap(name=>{const match=/^accounts-(\d{13})\.sqlite$/.exec(name);return match&&lstatSync(join(directory,name)).isFile()?[{name,at:Number(match[1])}]:[];});
 for(const file of copies)if(file.at<=now-30*day)unlinkSync(join(directory,file.name));
 if(copies.some(f=>f.at<=now&&f.at>now-day))return;
 const target=join(directory,`accounts-${now}.sqlite`),temporary=target+'.tmp';
 try{await backup(db,temporary);chmodSync(temporary,0o600);renameSync(temporary,target);}catch(e){try{unlinkSync(temporary);}catch{}throw e;}
}
export function startPrivacyMaintenance(db,directory){
 let busy=false;
 const tick=async()=>{if(busy)return;busy=true;try{runRetention(db);await maintainBackups(db,directory);}catch(error){console.error('Privacy maintenance failed:',error.name);}finally{busy=false;}};
 void tick();const timer=setInterval(tick,60*60*1000);timer.unref();return ()=>clearInterval(timer);
}
