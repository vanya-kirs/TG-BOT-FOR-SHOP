import {money} from './store.js?v=partners-3';
import {matchesBrand,findBrand,searchKey} from './brands.js?v=partners-3';
export function searchProducts(products,query,brands){
 return products.filter(p=>!query||searchKey(p.name).includes(searchKey(query))||matchesBrand(findBrand(brands,p.brandId)||{name:p.brandName||'',aliases:[]},query));
}
export function assertProductAccess(product,supplier){
 if(product&&supplier&&product.supplier!==supplier)throw Error('Товар другого поставщика недоступен.');
}
export function partnerProduct(previous,next,supplier){
 assertProductAccess(previous,supplier);
 if(!supplier)return {...next,approval:'approved'};
 return {...next,supplier,price:previous?.price||0,originalPrice:previous?.originalPrice,discount:previous?.discount,approval:'pending'};
}
export function paymentHistory(state,id,esc,admin=false){
 const rows=state.payouts.filter(p=>p.supplier===id);
 return `<section class="payment-history"><h3>История выплат</h3>${rows.length?rows.map(p=>`<article class="order-card"><div class="line-item"><span>${new Date(p.date).toLocaleDateString('ru-RU')}</span><strong>${money(p.amount)}</strong></div>${p.receipt?`<a class="text-link" download="${esc(p.receipt.name)}" href="${esc(p.receipt.data)}">Скачать чек · ${esc(p.receipt.name)}</a>`:'<span class="small muted">Чек не прикреплён</span>'}${admin?`<button class="table-btn" data-action="receipt" data-id="${esc(p.id)}">${p.receipt?'Заменить чек':'Прикрепить чек'}</button>`:''}</article>`).join(''):'<p class="small muted">Выплат пока нет.</p>'}</section>`;
}
export function supplierNotifications(state,id,esc){
 const rows=state.payouts.filter(p=>p.supplier===id&&!p.readAt);
 return `<section class="supplier-notifications"><div class="section-head"><h3>Уведомления · ${rows.length}</h3>${rows.length?'<button class="text-link" data-action="read-notifications">Отметить прочитанными</button>':''}</div>${rows.map(p=>`<p class="notice">Записана выплата ${money(p.amount)}. ${p.receipt?'Чек прикреплён.':'Чек пока не прикреплён.'} <a href="#/supplier/payments">Посмотреть</a></p>`).join('')||'<p class="small muted">Новых уведомлений нет.</p>'}</section>`;
}
export async function readReceipt(file){
 if(!file?.size)return null;
 if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw Error('Чек: PDF, JPEG, PNG или WebP, до 2 МБ.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Не удалось прочитать чек.'));reader.readAsDataURL(file);});
 return {name:file.name,data};
}
