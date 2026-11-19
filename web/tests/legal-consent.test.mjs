import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdentity} from '../server/auth.mjs';
import {getMigrations} from 'better-auth/db/migration';
test('registration requires explicit current consent and stores server evidence',async t=>{
 const id=createIdentity({APP_URL:'http://localhost:4173',BETTER_AUTH_SECRET:'secret-'.repeat(8),DATABASE_PATH:':memory:'},{sendMail:async()=>{},authOptions:{rateLimit:{enabled:false}}});t.after(()=>id.database.close());await(await getMigrations(id.options)).runMigrations();
 const call=body=>id.auth.handler(new Request('http://localhost:4173/api/auth/sign-up/email',{method:'POST',headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},body:JSON.stringify(body)}));
 const data={name:'Test',email:'legal@example.com',password:'password-123'};
 for(const extra of [{},{acceptPersonalData:false,consentVersion:'2026-11-19-v1'},{acceptPersonalData:'true',consentVersion:'2026-11-19-v1'},{acceptPersonalData:true,consentVersion:'old'}])assert.equal((await call({...data,...extra})).status,400);
 assert.equal(id.database.prepare('SELECT count(*) n FROM user').get().n,0);
 assert.equal((await call({...data,acceptPersonalData:true,consentVersion:'2026-11-19-v1',consentEvidence:'forged'})).status,400);
 const res=await call({...data,acceptPersonalData:true,consentVersion:'2026-11-19-v1'});assert.equal(res.status,200,await res.clone().text());
 const evidence=JSON.parse(id.database.prepare('SELECT consentEvidence FROM user').get().consentEvidence);assert.equal(evidence.version,'2026-11-19-v1');assert.equal(evidence.method,'email');assert.ok(evidence.acceptedAt);assert.match(evidence.text,/Примерова/);assert.match(evidence.sha256,/^[a-f0-9]{64}$/);assert.equal('consentEvidence' in (await res.json()).user,false);
});
test('OAuth requires consent before redirect, and account creation cannot skip it',async t=>{
 const id=createIdentity({APP_URL:'https://shop.example.com',BETTER_AUTH_SECRET:'secret-'.repeat(8),DATABASE_PATH:':memory:',GOOGLE_CLIENT_ID:'test',GOOGLE_CLIENT_SECRET:'test'});t.after(()=>id.database.close());await(await getMigrations(id.options)).runMigrations();
 const call=body=>id.auth.handler(new Request('https://shop.example.com/api/auth/sign-in/social',{method:'POST',headers:{Origin:'https://shop.example.com','Content-Type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await call({provider:'google'})).status,400);
 const res=await call({provider:'google',acceptPersonalData:true,consentVersion:'2026-11-19-v1'});assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/vera_consent/);
 await assert.rejects(()=>id.options.databaseHooks.user.create.before({email:'x@example.com'},null));
 await assert.rejects(()=>id.options.databaseHooks.user.create.before({email:'x@example.com'},{path:'/callback/google',getSignedCookie:async()=>false}));
});
for(const providerId of ['google','yandex'])test(`${providerId} callback creates a new account with browser-bound consent evidence`,async t=>{
 const id=createIdentity({APP_URL:'http://localhost:4173',BETTER_AUTH_SECRET:'secret-'.repeat(8),DATABASE_PATH:':memory:',GOOGLE_CLIENT_ID:'test',GOOGLE_CLIENT_SECRET:'test',YANDEX_CLIENT_ID:'test',YANDEX_CLIENT_SECRET:'test'});t.after(()=>id.database.close());await(await getMigrations(id.options)).runMigrations();
 const call=(path,body,cookie='')=>id.auth.handler(new Request('http://localhost:4173/api/auth/'+path,{method:body?'POST':'GET',headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}));
 const ctx=await id.auth.$context,provider=(await ctx.socialProviders).find(p=>p.id===providerId);
 provider.validateAuthorizationCode=async()=>({accessToken:'test',scopes:['profile']});provider.getUserInfo=async()=>({user:{email:'new@example.com',emailVerified:providerId==='google',name:'New'},data:{id:'test-123',sub:'test-123'}});provider.accountSubject=()=> 'test-123';
 const start=await call('sign-in/social',{provider:providerId,acceptPersonalData:true,consentVersion:'2026-11-19-v1',callbackURL:'http://localhost:4173/#/account'});const state=new URL((await start.json()).url).searchParams.get('state');const cookie=start.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 const end=await call(`callback/${providerId}?code=test&state=${encodeURIComponent(state)}`,null,cookie);assert.equal(new URL(end.headers.get('location')).hash,'#/account');
 const row=id.database.prepare('SELECT consentEvidence FROM user').get();assert.ok(row);assert.equal(JSON.parse(row.consentEvidence).method,providerId);
});
