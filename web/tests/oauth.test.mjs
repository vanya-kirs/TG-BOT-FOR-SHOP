import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {getMigrations} from 'better-auth/db/migration';
import {createIdentity} from '../server/auth.mjs';
test('configured Google and Yandex start secure OAuth with exact callbacks and state',async t=>{
 const id=createIdentity({APP_URL:'https://shop.example.com',BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),DATABASE_PATH:':memory:',GOOGLE_CLIENT_ID:'test-google',GOOGLE_CLIENT_SECRET:'test-secret',YANDEX_CLIENT_ID:'test-yandex',YANDEX_CLIENT_SECRET:'test-secret'});
 t.after(()=>id.database.close());await (await getMigrations(id.options)).runMigrations();
 for(const [provider,host] of [['google','accounts.google.com'],['yandex','oauth.yandex.ru']]){
 const res=await id.auth.handler(new Request('https://shop.example.com/api/auth/sign-in/social',{method:'POST',headers:{Origin:'https://shop.example.com','Content-Type':'application/json'},body:JSON.stringify({provider,acceptPersonalData:true,consentVersion:'2026-11-19-v1',callbackURL:'https://shop.example.com/#/account'})}));
 assert.equal(res.status,200,await res.clone().text());
 const url=new URL((await res.json()).url);
 assert.equal(url.hostname,host);
 assert.equal(url.searchParams.get('redirect_uri'),'https://shop.example.com/api/auth/callback/'+provider);
 assert.ok(url.searchParams.get('state'));
 assert.equal(url.searchParams.get('response_type'),'code');
 assert.equal(id.capabilities.providers[provider],true);
 }
 assert.equal(id.capabilities.providers.telegram,false);
 const forged=await id.auth.handler(new Request('https://shop.example.com/api/auth/callback/google?code=forged&state=forged'));
 assert.ok([302,400].includes(forged.status));
 assert.equal(id.database.prepare('SELECT count(*) n FROM session').get().n,0);
});

