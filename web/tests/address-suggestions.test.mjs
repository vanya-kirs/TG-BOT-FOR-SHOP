import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {addressSuggestionRoutes,mapAddressSuggestion} from '../server/address-suggestions.mjs';
test('address mapping retains region and settlement without postal index',()=>{
 const result=mapAddressSuggestion({value:'Тест',data:{region_with_type:'Московская обл',city_with_type:'г Химки',settlement_with_type:'мкр Подрезково',street_with_type:'ул Тестовая',house:'2',block_type:'к',block:'1',postal_code:'123456',flat:'12',floor:'3',entrance:'2'}});
 assert.match(result.address.city,/Московская обл, г Химки, мкр Подрезково/);assert.equal(result.address.house,'2');assert.equal(result.address.building,'к 1');assert.equal(result.address.postalCode,undefined);assert.equal(result.address.apartment,'12');assert.equal(result.address.floor,'3');assert.equal(result.address.entrance,'2');
});
test('suggestion proxy authenticates, limits requests and keeps key and customer details private',async t=>{
 let session=null,calls=[];
 const app=express();app.use(addressSuggestionRoutes({auth:{api:{getSession:async()=>session}}},{key:'private-key',fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({suggestions:[{value:'г Москва, ул Тестовая, д 1',data:{city_with_type:'г Москва',street_with_type:'ул Тестовая',house:'1'}}]})};}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());const url='http://127.0.0.1:'+server.address().port;
 const request=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await request({query:'Москва'})).status,401);session={user:{id:'buyer'}};
 assert.equal((await request({query:'a'})).status,400);const response=await request({query:'Москва Тестовая',phone:'secret-phone',recipient:'private-name'});const result=await response.json();assert.equal(result.suggestions.length,1);assert.equal(JSON.stringify(result).includes('private-key'),false);assert.equal(calls[0].options.headers.Authorization,'Token private-key');assert.equal(calls[0].options.body.includes('private-name'),false);assert.equal(calls[0].options.body.includes('secret-phone'),false);
 await request({query:'Москва Твер',field:'street'});assert.deepEqual(JSON.parse(calls.at(-1).options.body).from_bound,{value:'street'});
 await request({query:'1',field:'house'});assert.deepEqual(JSON.parse(calls.at(-1).options.body).to_bound,{value:'house'});
 await request({query:'Мос',field:'city'});assert.deepEqual(JSON.parse(calls.at(-1).options.body).to_bound,{value:'settlement'});
 assert.equal((await request({query:'Москва',field:'unknown'})).status,400);
 for(let i=4;i<30;i++)assert.equal((await request({query:'Москва'})).status,200);
 assert.equal((await request({query:'Москва'})).status,429);assert.equal(calls.length,30);
});
test('missing address key gives manual-entry fallback without upstream request',async t=>{
 const app=express();app.use(addressSuggestionRoutes({auth:{api:{getSession:async()=>({user:{id:'buyer'}})}}},{key:'',fetchImpl:()=>assert.fail('upstream must not run')}));const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());const response=await fetch('http://127.0.0.1:'+server.address().port,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'Москва'})});assert.equal(response.status,503);
});
