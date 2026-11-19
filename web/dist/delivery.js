import {accountData,saveAddress} from './account.js?v=checkout-6';
export const deliveryMethods={dostavista:'Достависта',yandex:'Яндекс Доставка',cdek:'СДЭК — доставка до адреса',post:'Почта России',courier:'Другой курьер — по согласованию',pickup:'Самовывоз — метро Примерная'};
export const addressFields=[['city','Город'],['street','Улица'],['house','Дом'],['building','Корпус'],['entrance','Подъезд'],['floor','Этаж'],['apartment','Квартира'],['intercom','Домофон']];
const clean=(v,max=180)=>{if(v!=null&&typeof v!=='string')throw Error('Проверьте данные доставки.');const s=(v||'').trim();if(s.length>max)throw Error('Слишком длинное значение поля.');return s;};
export function prepareDelivery(state,b={}){
 if(!Object.hasOwn(deliveryMethods,b.method||''))throw Error('Выберите способ доставки.');
 const recipient=clean(b.recipient,100),phone=normalizePhone(clean(b.phone,30));
 if(!recipient)throw Error('Укажите имя получателя.');
 let address=null;
 if(b.method!=='pickup'){
 const source=b.addressId?accountData(state).addresses.find(a=>a.id===b.addressId):b.address;
 if(!source||typeof source!=='object')throw Error('Адрес не найден. Выберите сохранённый или введите новый.');
 address=Object.fromEntries(['label',...addressFields.map(([key])=>key)].map(key=>[key,clean(source[key])]));
 if(!address.city||!address.street||!address.house)throw Error('Укажите город, улицу и дом.');
 }
 return {method:b.method,recipient,phone,address,cost:null};
}
const addressKey=a=>addressFields.map(([key])=>String(a[key]||'').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g,' ')).join('|');
export function rememberAddress(state,address){
 const found=accountData(state).addresses.find(a=>addressKey(a)===addressKey(address));
 if(found)return found;
 saveAddress(state,address);return accountData(state).addresses.at(-1);
}
export function deliverySummary(delivery,esc){if(!delivery)return '';return `<div class="purchase-policy"><strong>${esc(deliveryMethods[delivery.method]||delivery.method)}</strong><p>${esc(delivery.recipient)} · ${esc(formatPhone(delivery.phone))}</p><p>${delivery.address?addressFields.map(([key,label])=>delivery.address[key]?esc(label+': '+delivery.address[key]):'').filter(Boolean).join(', '):'Москва, метро Примерная, улица Примерная; точный адрес и время по согласованию.'}</p><p class="small muted">Стоимость доставки согласовывается отдельно.</p></div>`;}

export function normalizePhone(value){
 if(!/^[+\d\s()-]+$/.test(value))throw Error('Проверьте телефон: нужно 10 цифр номера, можно с +7 или 8.');
 let digits=value.replace(/\D/g,'');if(digits.length===11&&/^[78]/.test(digits))digits=digits.slice(1);
 if(digits.length!==10)throw Error('Проверьте телефон: нужно 10 цифр номера, можно с +7 или 8.');
 return '+7'+digits;
}
export function formatPhone(value){
 let digits=String(value||'').replace(/\D/g,'');if(!digits)return '';if(/^[78]$/.test(String(value)))return '+7';
 if((digits.length>10&&/^[78]/.test(digits))||String(value).startsWith('+7'))digits=digits.slice(1);
 digits=digits.slice(0,10);if(!digits)return '+7';
 return '+7 ('+digits.slice(0,3)+(digits.length>=3?')':'')+(digits.length>3?' '+digits.slice(3,6):'')+(digits.length>6?'-'+digits.slice(6,8):'')+(digits.length>8?'-'+digits.slice(8,10):'');
}
