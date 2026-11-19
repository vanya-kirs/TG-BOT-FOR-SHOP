import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDelivery,rememberAddress,formatPhone,normalizePhone} from '../dist/delivery.js';
const address={label:'Дом',city:'Москва',street:'Тестовая',house:'1',apartment:'2'};
const input={method:'cdek',recipient:'Анна Тестовая',phone:'+7 (999) 123-45-67',address};
test('delivery validates method, recipient and required address',()=>{
 for(const body of [{},{...input,method:'unknown'},{...input,phone:'abc'},{...input,address:{city:'Москва'}}])assert.throws(()=>prepareDelivery({},body));
 assert.equal(prepareDelivery({},input).phone,'+79991234567');
 const pickup=prepareDelivery({},{method:'pickup',recipient:'Анна',phone:'+79991234567',address});assert.equal(pickup.address,null);
});
test('saved address belongs to customer and order receives independent snapshot',()=>{
 const state={customer:{addresses:[{...address,id:'own'}]}};
 assert.throws(()=>prepareDelivery(state,{...input,addressId:'foreign'}),/Адрес/);
 const delivery=prepareDelivery(state,{...input,addressId:'own'});state.customer.addresses[0].house='20';assert.equal(delivery.address.house,'1');
});
test('remember multiple named addresses without duplicates',()=>{
 const state={customer:{addresses:[]}};rememberAddress(state,address);rememberAddress(state,{...address,label:'Ещё дом',city:' МОСКВА '});assert.equal(state.customer.addresses.length,1);
 rememberAddress(state,{...address,label:'Работа',house:'8'});assert.equal(state.customer.addresses.length,2);assert.equal(state.customer.addresses[1].label,'Работа');
});

test('Russian phone accepts local, +7 and 8 prefixes and formats consistently',()=>{
 for(const value of ['9991234567','79991234567','89991234567','+7 (999) 123-45-67']){assert.equal(normalizePhone(value),'+79991234567');assert.equal(formatPhone(value),'+7 (999) 123-45-67');}
 for(const value of ['abc','123','+19991234567','799912345678'])assert.throws(()=>normalizePhone(value));
 assert.equal(prepareDelivery({},{...input,method:'post'}).address.postalCode,undefined);
});
test('courier details including intercom survive checkout and saved address',()=>{
 const state={customer:{addresses:[]}};
 const delivery=prepareDelivery(state,{...input,address:{...address,entrance:'2',floor:'5',intercom:'12К'}});
 rememberAddress(state,delivery.address);
 assert.equal(delivery.address.intercom,'12К');assert.equal(state.customer.addresses[0].intercom,'12К');
 assert.equal(prepareDelivery(state,{...input,addressId:state.customer.addresses[0].id}).address.floor,'5');
});
