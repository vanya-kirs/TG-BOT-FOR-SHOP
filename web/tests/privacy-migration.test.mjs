import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getMigrations} from 'better-auth/db/migration';
import {createIdentity} from '../server/auth.mjs';
test('startup removes retired data from existing accounts and customer store, and is repeatable',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vera-privacy-'));
 const env={APP_URL:'http://localhost:4173',BETTER_AUTH_SECRET:'test-secret-'.repeat(5),DATABASE_PATH:join(dir,'accounts.sqlite')};
 let id;
 try{
 id=createIdentity(env);await(await getMigrations(id.options)).runMigrations();
 for(const field of ['birthday','gender'])if(!id.database.prepare('PRAGMA table_info(user)').all().some(c=>c.name===field))id.database.exec(`ALTER TABLE user ADD COLUMN ${field} TEXT`);
 id.database.exec("CREATE TABLE customer_store (userId TEXT PRIMARY KEY, data TEXT NOT NULL)");
 id.database.prepare('INSERT INTO customer_store VALUES(?,?)').run('test',JSON.stringify({customer:{name:'Anna',birthday:'1995-07-12',gender:'female',addresses:[{city:'Москва'}]},cart:[]}));
 id.database.close();id=createIdentity(env);
 assert.equal(id.database.prepare('PRAGMA table_info(user)').all().some(c=>['birthday','gender'].includes(c.name)),false);
 assert.deepEqual(JSON.parse(id.database.prepare('SELECT data FROM customer_store').get().data),{customer:{name:'Anna',addresses:[{city:'Москва'}]},cart:[]});
 id.database.close();id=createIdentity(env);
 }finally{id?.database.close();rmSync(dir,{recursive:true,force:true});}
});
