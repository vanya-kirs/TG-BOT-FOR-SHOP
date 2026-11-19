import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {getMigrations} from 'better-auth/db/migration';
import {createIdentity} from '../server/auth.mjs';
for(const providerId of ['google','yandex'])for(const verified of [true,false])test(`${providerId} automatic merge requires local verified email (${verified})`,async t=>{
 const id=createIdentity({APP_URL:'http://localhost:4173',BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),DATABASE_PATH:':memory:',GOOGLE_CLIENT_ID:'test',GOOGLE_CLIENT_SECRET:'test',YANDEX_CLIENT_ID:'test',YANDEX_CLIENT_SECRET:'test',TELEGRAM_CLIENT_ID:'ignored',TELEGRAM_CLIENT_SECRET:'ignored'},{sendMail:async()=>{},authOptions:{rateLimit:{enabled:false}}});
 t.after(()=>id.database.close());await (await getMigrations(id.options)).runMigrations();
 const call=(path,body,cookie='')=>id.auth.handler(new Request('http://localhost:4173/api/auth/'+path,{method:body?'POST':'GET',headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify((path.endsWith('sign-up/email')||path.endsWith('sign-in/social'))?{...body,acceptPersonalData:true,consentVersion:'2026-11-19-v1'}:body)}:{})}));
 await call('sign-up/email',{email:'same@example.com',name:'Existing',password:'password1'});
 id.database.prepare('UPDATE user SET emailVerified=?').run(verified?1:0);
 const before=id.database.prepare('SELECT id FROM user').get().id;
 const ctx=await id.auth.$context;
 const providers=await ctx.socialProviders;
 const p=providers.find(p=>p.id===providerId);
 // Stub only the external identity exchange; exercise real state, callback and database linking.
 p.validateAuthorizationCode=async()=>({accessToken:'synthetic',scopes:['profile']});
 p.getUserInfo=async()=>({user:{email:'same@example.com',emailVerified:providerId==='google',name:'Provider name'},data:{id:'external-123',sub:'external-123'}});
 p.accountSubject=()=> 'external-123';
 const start=await call('sign-in/social',{provider:providerId,callbackURL:'http://localhost:4173/#/account',errorCallbackURL:'http://localhost:4173/#/auth/login'});
 const state=new URL((await start.json()).url).searchParams.get('state');
 const cookie=start.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 const result=await call(`callback/${providerId}?code=test&state=${encodeURIComponent(state)}`,null,cookie);
 assert.equal(result.status,302,await result.clone().text());
 assert.equal(id.database.prepare('SELECT count(*) n FROM user').get().n,1);
 if(verified){assert.equal(new URL(result.headers.get('location')).hash,'#/account');assert.equal(id.database.prepare('SELECT userId FROM account WHERE providerId=?').get(providerId).userId,before);assert.match(result.headers.get('set-cookie'),/session_token/);}else{assert.match(result.headers.get('location'),/account_not_linked/);assert.equal(id.database.prepare('SELECT count(*) n FROM account WHERE providerId=?').get(providerId).n,0);}
 assert.equal(id.capabilities.providers.telegram,false);
 assert.equal(providers.some(p=>p.id==='telegram'),false);
});
