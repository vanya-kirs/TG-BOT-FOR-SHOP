import test from 'node:test';
import assert from 'node:assert/strict';
import {bindIdentity} from '../dist/auth-client.js';

test('password confirmation blocks mismatches before any auth request', async()=>{
  const originals={document:globalThis.document,FormData:globalThis.FormData,fetch:globalThis.fetch,location:globalThis.location,sessionStorage:globalThis.sessionStorage};
  try{
    for(const mode of ['register','reset','change']){
      for(const confirmation of ['', 'different-password']){
        let handler,requests=0,focused=false;
        const error={textContent:''},feedback={textContent:''},button={disabled:false};
        const field={setAttribute(){},removeAttribute(){},focus(){focused=true;}};
        const form={dataset:{mode},querySelector:s=>s==='button'?button:s==='.form-error'?error:s==='.auth-feedback'?feedback:field,addEventListener:(_,fn)=>handler=fn,reset(){}};
        globalThis.document={querySelector:s=>s==='#auth-form'?form:null,querySelectorAll:()=>[]};
        globalThis.FormData=class{*[Symbol.iterator](){yield ['password','a-long-password'];yield ['passwordConfirmation',confirmation];}};
        globalThis.fetch=async()=>{requests++;throw Error('unexpected request');};
        bindIdentity();
        await handler({preventDefault(){},stopImmediatePropagation(){},currentTarget:form});
        assert.equal(requests,0);
        assert.match(error.textContent,/Пароли не совпадают/);
        assert.equal(focused,true);
        assert.equal(button.disabled,false);
      }
    }
    let handler,body;
    globalThis.sessionStorage={setItem(){},getItem(){return null;}};
    const button={},error={},feedback={};
    const form={dataset:{mode:'register'},querySelector:s=>s==='button'?button:s==='.form-error'?error:s==='.auth-feedback'?feedback:{removeAttribute(){}},addEventListener:(_,fn)=>handler=fn,reset(){}};
    globalThis.document={querySelector:s=>s==='#auth-form'?form:null,querySelectorAll:()=>[]};
    globalThis.FormData=class{*[Symbol.iterator](){yield ['password','a-long-password'];yield ['passwordConfirmation','a-long-password'];yield ['personalDataConsent','on'];yield ['name','Test'];yield ['email','test@example.com'];}};
    globalThis.location={origin:'https://example.com'};
    globalThis.fetch=async(url,options)=>{if(url.endsWith("sign-up/email"))body=JSON.parse(options.body);return {ok:true,json:async()=>({})};};
    bindIdentity();
    await handler({preventDefault(){},stopImmediatePropagation(){},currentTarget:form});
    assert.equal(body.password,'a-long-password');
    assert.equal('passwordConfirmation' in body,false);
    assert.equal(globalThis.location.hash,'/auth/verify');
  }finally{Object.assign(globalThis,originals);}
});
