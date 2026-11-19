import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runRetention,maintainBackups,eraseUnusedAccount} from '../server/privacy-retention.mjs';
const day=86400000;
function fixture(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE user(id TEXT PRIMARY KEY,emailVerified INTEGER,role TEXT,createdAt INTEGER);CREATE TABLE session(id TEXT,expiresAt INTEGER);CREATE TABLE verification(id TEXT,expiresAt INTEGER);CREATE TABLE otp_cooldown(email TEXT,next_at INTEGER);CREATE TABLE reset_cooldown(email TEXT,next_at INTEGER);CREATE TABLE commerce(id INTEGER,data TEXT);CREATE TABLE customer_store(userId TEXT,data TEXT);CREATE TABLE account(userId TEXT,providerId TEXT);');db.prepare('INSERT INTO commerce VALUES(1,?)').run(JSON.stringify({orders:[],suppliers:[]}));return db;}
test('retention purges expired technical records, preserving active sessions and accounts with orders',()=>{
 const db=fixture(),now=Date.now();
 try{db.prepare('INSERT INTO session VALUES(?,?)').run('expired',now-1);db.prepare('INSERT INTO session VALUES(?,?)').run('active',now+day);db.prepare('INSERT INTO verification VALUES(?,?)').run('expired',now-1);db.prepare('INSERT INTO user VALUES(?,?,?,?)').run('old',0,'customer',now-8*day);db.prepare('INSERT INTO user VALUES(?,?,?,?)').run('ordered',0,'customer',now-8*day);db.prepare('UPDATE commerce SET data=?').run(JSON.stringify({orders:[{userId:'ordered'}],suppliers:[]}));
 db.exec("INSERT INTO account VALUES('old','credential'),('ordered','credential')");db.prepare('INSERT INTO user VALUES(?,?,?,?)').run('oauth',0,'customer',now-8*day);db.exec("INSERT INTO account VALUES('oauth','yandex')");runRetention(db,now);assert.deepEqual(db.prepare('SELECT id FROM session').all().map(r=>r.id),['active']);assert.equal(db.prepare('SELECT count(*) n FROM verification').get().n,0);assert.deepEqual(db.prepare('SELECT id FROM user').all().map(r=>r.id),['oauth','ordered']);
 db.prepare('INSERT INTO privacy_security_event(createdAt,event) VALUES(?,?)').run(now-91*day,'login');runRetention(db,now);assert.equal(db.prepare('SELECT count(*) n FROM privacy_security_event').get().n,0);
 }finally{db.close();}
});
test('backups expire after 30 days, unrelated files survive, and newest SQLite copy is usable',async()=>{
 const db=fixture(),dir=mkdtempSync(join(tmpdir(),'vera-backup-')),now=Date.now();
 try{const old=`accounts-${now-31*day}.sqlite`;writeFileSync(join(dir,old),'old');writeFileSync(join(dir,'keep.txt'),'unrelated');await maintainBackups(db,dir,now);const files=readdirSync(dir);assert.equal(files.includes(old),false);assert.ok(files.includes('keep.txt'));const copy=new DatabaseSync(join(dir,files.find(f=>f.endsWith('.sqlite'))));assert.equal(copy.prepare('SELECT count(*) n FROM user').get().n,0);copy.close();await maintainBackups(db,dir,now);assert.equal(readdirSync(dir).filter(f=>f.endsWith('.sqlite')).length,1);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('erasure refuses financial history and service roles, removes unused customer data',()=>{
 const db=fixture();try{
 db.exec("INSERT INTO user VALUES('free',1,'customer',0),('ordered',1,'customer',0),('admin',1,'admin',0)");db.prepare('UPDATE commerce SET data=?').run(JSON.stringify({orders:[{userId:'ordered'}],suppliers:[]}));
 assert.throws(()=>eraseUnusedAccount(db,'ordered'),/заказ/);assert.throws(()=>eraseUnusedAccount(db,'admin'),/служебн/);
 eraseUnusedAccount(db,'free');assert.equal(db.prepare("SELECT id FROM user WHERE id='free'").get(),undefined);
 }finally{db.close();}
});
