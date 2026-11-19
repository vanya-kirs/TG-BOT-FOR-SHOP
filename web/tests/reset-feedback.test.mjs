import test from 'node:test';
import assert from 'node:assert/strict';
import {bindIdentity,authView} from '../dist/auth-client.js';
test('reset only redirects on success, removes reset token and shows confirmation at login',async()=>{
 const keys=['document','FormData','fetch','location','history','window'];const originals=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 try{
 let handler,route='',events=0,resets=0,ok=false;
 const button={},error={},feedback={};
 const form={dataset:{mode:'reset'},querySelector:s=>s==='button'?button:s==='.form-error'?error:s==='.auth-feedback'?feedback:{removeAttribute(){}},addEventListener:(_,f)=>handler=f,reset(){resets++;}};
 globalThis.document={querySelector:s=>s==='#auth-form'?form:null,querySelectorAll:()=>[]};
 globalThis.FormData=class{*[Symbol.iterator](){yield ['password','new-password'];yield ['passwordConfirmation','new-password'];}};
 globalThis.location={search:'?auth=reset&token=test-token',hash:'#/auth/reset'};
 globalThis.history={replaceState:(_,__,url)=>{route=url;location.search='';location.hash='#/auth/login';}};
 globalThis.window={dispatchEvent:event=>{assert.equal(event.type,'hashchange');events++;}};
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/auth/reset-password');assert.deepEqual(JSON.parse(opts.body),{token:'test-token',newPassword:'new-password'});return {ok,status:ok?200:400,headers:{get(){return null;}},json:async()=>ok?{status:true}:{code:'INVALID_TOKEN'}};};
 bindIdentity();const submit=()=>handler({currentTarget:form,preventDefault(){},stopImmediatePropagation(){}});
 await submit();assert.equal(route,'');assert.equal(events,0);assert.match(error.textContent,/Ссылка/);
 ok=true;await submit();assert.equal(route,'/#/auth/login');assert.equal(events,1);assert.equal(resets,1);
 assert.match(authView('login'),/Пароль успешно изменён\. Войдите с новым паролем/);
 assert.equal(location.search,'');
 }finally{Object.assign(globalThis,originals);}
});
