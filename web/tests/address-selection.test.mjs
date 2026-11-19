import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAddressSelection} from '../dist/checkout-page.js';
const form=()=>({elements:Object.fromEntries(Object.entries({method:'cdek',addressId:'',city:'Москва',street:'Тверская',house:'1'}).map(([k,value])=>[k,{value}])),addressSelection:{city:'Москва',street:'Тверская',house:'1'}});
test('checkout requires selection and invalidates manual address edits',()=>{
 const f=form();assert.doesNotThrow(()=>validateAddressSelection(f));f.elements.street.value='Другая';assert.throws(()=>validateAddressSelection(f),/из подсказок/);f.addressSelection={};assert.throws(()=>validateAddressSelection(f),/из подсказок/);
 f.elements.addressId.value='saved';assert.doesNotThrow(()=>validateAddressSelection(f));f.elements.addressId.value='';f.elements.method.value='pickup';assert.doesNotThrow(()=>validateAddressSelection(f));
});
