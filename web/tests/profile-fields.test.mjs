import test from 'node:test';
import assert from 'node:assert/strict';
import {yandexProfile} from '../server/profile.mjs';
test('Yandex profile only keeps identity data needed for login',()=>{
 const user=yandexProfile({id:1,default_email:'a@yandex.ru',first_name:'Анна',sex:'female',birthday:'2000-02-29',default_phone:{number:'123'}});
 assert.deepEqual(user,{id:'1',email:'a@yandex.ru',emailVerified:false,name:'Анна'});
});
