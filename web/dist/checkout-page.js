import {accountData} from './account.js?v=checkout-6';
import {deliveryMethods,addressFields,formatPhone} from './delivery.js?v=checkout-6';
import {cartTotal,money} from './store.js?v=photo-studio-2';
const descriptions={dostavista:'Курьером по городу',yandex:'Доставка курьером',cdek:'Курьером до вашего адреса',post:'Отправление по России',courier:'Обсудим удобную службу',pickup:'Москва · метро Примерная'};
export function checkoutPage(state,esc,{name='',demo=false}={}){
 if(!state.cart.length)return '<div class="wrap checkout-empty"><h1>Корзина пока пуста</h1><a class="btn" href="#/catalog">Выбрать вещи</a></div>';
 const addresses=accountData(state).addresses,primary=addresses.find(a=>a.primary);
 return `<div class="wrap checkout-page"><a class="checkout-back" href="#/cart">← Вернуться в корзину</a><div class="page-head"><p class="eyebrow">VERA PRIVÉ / ВАШ ЗАКАЗ</p><h1>Последние детали</h1><p class="muted">Выберите, как получить ваши вещи.</p></div><form id="checkout-form" class="checkout-layout"><div class="checkout-sections"><section class="checkout-section"><h2><span>01</span> Способ получения</h2><div class="delivery-options">${Object.entries(deliveryMethods).map(([key,label],i)=>`<label class="delivery-option"><input type="radio" name="method" value="${key}" ${i===0?'checked':''}><span class="delivery-choice"><strong>${label.replace(' — доставка до адреса','').replace(' — по согласованию','').replace(' — метро Примерная','')}</strong><small>${descriptions[key]}</small></span><span class="delivery-tick" aria-hidden="true">✓</span></label>`).join('')}</div><div data-pickup class="pickup-note" hidden><strong>Ждём вас у метро Примерная</strong><p>Москва, улица Примерная. Точный адрес и удобное время согласуем при подтверждении заказа.</p></div></section><section class="checkout-section"><h2><span>02</span> Получатель</h2><div class="form-grid"><label>Имя и фамилия<input name="recipient" required maxlength="100" autocomplete="name" value="${esc(name)}" placeholder="Как к вам обращаться"></label><label>Телефон<input name="phone" type="tel" inputmode="tel" required maxlength="30" autocomplete="tel" placeholder="+7 (999) 123-45-67"><small>Можно ввести номер без +7</small></label></div></section><fieldset class="checkout-section" data-delivery-address><legend><span>03</span> Адрес доставки</legend>${addresses.length?`<label>Сохранённые адреса<select name="addressId"><option value="">Новый адрес</option>${addresses.map(a=>`<option value="${esc(a.id)}" ${a.id===primary?.id?'selected':''}>${esc(a.label||'Мой адрес')} — ${esc(a.city)}, ${esc(a.street)}, ${esc(a.house)}</option>`).join('')}</select></label>`:'<input type="hidden" name="addressId" value="">'}<p data-saved-address class="saved-address"></p><div data-new-address><div class="address-search"><label for="address-search">Город, улица, дом и корпус</label><input id="address-search" type="text" autocomplete="off" required placeholder="Например, Москва, улица Примерная, дом 1" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="address-suggestions"><div id="address-suggestions" class="address-suggestions" role="listbox" hidden></div><p data-address-status class="small muted" role="status">Начните вводить адрес и выберите вариант из списка.</p></div>${['city','street','house','building'].map(key=>`<input type="hidden" name="${key}">`).join('')}<div data-address-details hidden><p data-selected-address class="selected-address"></p><h3 class="address-details-title">Детали для курьера</h3><p class="small muted">Дополните при необходимости</p><div class="form-grid address-fields">${addressFields.filter(([key])=>['entrance','floor','apartment','intercom'].includes(key)).map(([key,label])=>`<label>${label}<input name="${key}" maxlength="180" autocomplete="off"></label>`).join('')}</div></div><label class="legal-check"><input type="checkbox" name="remember"><span>Сохранить адрес для следующих заказов</span></label><label data-address-label hidden>Название адреса<input name="label" maxlength="80" placeholder="Дом, Работа, У родителей"></label></div></fieldset></div><aside class="checkout-summary"><p class="eyebrow">ВАШ ВЫБОР</p><h2>Всё готово?</h2><div class="checkout-products">${state.cart.map(row=>{const product=state.products.find(p=>p.id===row.id);return product?`<div class="checkout-product"><img src="${esc(product.image)}" alt=""><div><strong>${esc(product.name)}</strong><small>${esc(row.size)} · ${row.quantity} шт.</small><span>${money(product.price*row.quantity)}</span></div></div>`:'';}).join('')}</div><div class="line-item"><span>Товары</span><strong>${money(cartTotal(state))}</strong></div><div class="line-item"><span>Доставка</span><span>По согласованию</span></div><p class="checkout-payment-note">Подтвердим наличие, стоимость и срок доставки до оплаты. Сейчас деньги не списываются.</p>${demo?'<p class="small muted">Демо: используйте вымышленные данные.</p>':''}<p class="form-error" role="alert"></p><button type="submit" class="btn wide">${demo?'Создать демо-заказ':'Отправить заказ'} →</button><p class="checkout-privacy"><a href="/legal/privacy.html" target="_blank" rel="noopener">Как мы обрабатываем данные заказа</a></p></aside></form></div>`;
}
export function syncDeliveryForm(form,state){
 const pickup=form.elements.method.value==='pickup',selected=form.elements.addressId.value;
 const fieldset=form.querySelector('[data-delivery-address]');fieldset.hidden=pickup;fieldset.disabled=pickup;
 form.querySelector('[data-pickup]').hidden=!pickup;
 const fresh=form.querySelector('[data-new-address]');fresh.hidden=!!selected;
 fresh.querySelectorAll('input').forEach(input=>input.disabled=pickup||!!selected);
 form.querySelector('[data-address-label]').hidden=!form.elements.remember.checked;
 const saved=accountData(state).addresses.find(a=>a.id===selected);
 form.querySelector('[data-saved-address]').textContent=saved?addressFields.map(([key,label])=>saved[key]?`${label}: ${saved[key]}`:'').filter(Boolean).join(', '):'';
}
export function bindCheckout(form,state){
 if(!form)return;form.addressSelection={};syncDeliveryForm(form,state);

 const phone=form.elements.phone;
 phone.addEventListener('beforeinput',event=>{
  const pos=phone.selectionStart;if(event.inputType==='deleteContentBackward'&&pos===phone.selectionEnd&&pos>0&&/[^\d]/.test(phone.value[pos-1])){let from=pos-1;while(from>0&&/[^\d]/.test(phone.value[from]))from--;phone.setSelectionRange(from,pos);}
 });
 phone.addEventListener('input',()=>{const pos=phone.selectionStart,old=phone.value,count=old.slice(0,pos).replace(/\D/g,'').length;phone.value=formatPhone(old);let seen=0,caret=phone.value.length;for(let i=0;i<phone.value.length;i++){if(/\d/.test(phone.value[i]))seen++;if(seen===count){caret=i+1;break;}}if(pos===old.length)caret=phone.value.length;phone.setSelectionRange(caret,caret);});
 const search=form.querySelector('#address-search'),list=form.querySelector('#address-suggestions'),status=form.querySelector('[data-address-status]');
 search.setCustomValidity('Выберите адрес с домом из подсказок.');
 bindSuggestions(search,list,status,'address',form);
 form.addEventListener('change',()=>syncDeliveryForm(form,state));
}
function bindSuggestions(search,list,status,field,form){
 let timer,controller,sequence=0,items=[],active=-1;
 const close=()=>{list.hidden=true;search.setAttribute('aria-expanded','false');search.removeAttribute('aria-activedescendant');active=-1;};
 const choose=index=>{
  const item=items[index];if(!item)return;
  if(field==='city'){form.elements.city.value=item.address.city||item.value;for(const key of ['street','house','building','entrance','floor','apartment'])form.elements[key].value='';}
  else if(field==='street'){form.elements.street.value=item.address.street||item.value;for(const key of ['house','building','entrance','floor','apartment'])form.elements[key].value='';}
  else if(field==='house'){form.elements.house.value=item.address.house||'';form.elements.building.value=item.address.building||'';}
  else{for(const [key] of addressFields)form.elements[key].value=item.address[key]||'';search.value=item.value;}
  const changed=field==='address'?['city','street','house']:field==='city'?['city']:field==='street'?['city','street']:['city','street','house'];
  if(field==='street'||field==='house'){if(item.address.city)form.elements.city.value=item.address.city;if(item.address.street)form.elements.street.value=item.address.street;}
  for(const key of changed){form.addressSelection[key]=form.elements[key].value;form.elements[key].setCustomValidity(form.elements[key].value?'':'Выберите '+key+' из подсказок.');}
  if(field==='city')for(const key of ['street','house']){delete form.addressSelection[key];form.elements[key].setCustomValidity('Выберите значение из подсказок.');}
  if(field==='street'){delete form.addressSelection.house;form.elements.house.setCustomValidity('Выберите дом из подсказок.');}
  if(field!=='address')form.querySelector('#address-search').value='';
  const complete=!!(item.address.city&&item.address.street&&item.address.house);
  form.querySelector('[data-address-details]').hidden=!complete;
  form.querySelector('[data-selected-address]').textContent=complete?['city','street','house','building'].map(key=>item.address[key]).filter(Boolean).join(', '):'';
  search.setCustomValidity(complete?'':'Выберите адрес с номером дома из подсказок.');
  close();status.textContent=complete?'Адрес выбран. Дополните детали для курьера.':'Уточните номер дома и выберите полный адрес.';search.focus();
 };
 search.addEventListener('input',()=>{
  clearTimeout(timer);controller?.abort();const current=++sequence;close();
  const invalidated=field==='address'||field==='city'?['city','street','house']:field==='street'?['street','house']:['house'];
  for(const key of invalidated){delete form.addressSelection[key];form.elements[key].setCustomValidity('Выберите значение из подсказок.');}
  if(field==='address'){for(const [key]of addressFields)form.elements[key].value='';form.querySelector('[data-address-details]').hidden=true;search.setCustomValidity('Выберите адрес с домом из подсказок.');}
  if(field==='city')for(const key of ['street','house','building','entrance','floor','apartment'])form.elements[key].value='';
  if(field==='street')for(const key of ['house','building','entrance','floor','apartment'])form.elements[key].value='';
  const typed=search.value.trim();if(typed.length<(field==='house'?1:2)){status.textContent='';return;}
  if(field==='street'&&!form.addressSelection.city){status.textContent='Сначала выберите город из подсказок.';return;}
  if(field==='house'&&!form.addressSelection.street){status.textContent='Сначала выберите улицу из подсказок.';return;}
  const query=(field==='street'?[form.elements.city.value,typed]:field==='house'?[form.elements.city.value,form.elements.street.value,typed]:[typed]).filter(Boolean).join(', ');
  timer=setTimeout(async()=>{
   if(!form.isConnected)return;controller=new AbortController();status.textContent='Ищем…';
   try{
    const response=await fetch('/api/address-suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,field}),signal:controller.signal});
    const result=await response.json();if(current!==sequence||!form.isConnected)return;
    if(!response.ok)throw Error(result.message||'Подсказки недоступны.');
    items=result.suggestions||[];list.replaceChildren();items.forEach((item,index)=>{const option=document.createElement('button');option.type='button';option.id=list.id+'-'+index;option.role='option';option.textContent=item.value;option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('mousedown',event=>event.preventDefault());option.addEventListener('click',event=>{event.preventDefault();choose(index);});list.append(option);});
    list.hidden=!items.length;search.setAttribute('aria-expanded',String(!!items.length));status.textContent=items.length?'':'Ничего не найдено. Уточните запрос и выберите вариант из списка.';
   }catch(error){if(current===sequence&&error.name!=='AbortError')status.textContent='Подсказки временно недоступны. Попробуйте ещё раз или выберите сохранённый адрес.';}
  },350);
 });
 search.addEventListener('keydown',event=>{if(event.key==='Escape'){close();return;}if(list.hidden)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;[...list.children].forEach((node,i)=>node.setAttribute('aria-selected',String(i===active)));search.setAttribute('aria-activedescendant',list.id+'-'+active);list.children[active]?.scrollIntoView({block:'nearest'});}if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active);}});
 form.addEventListener('focusout',event=>{if(event.target===search&&!list.contains(event.relatedTarget)){clearTimeout(timer);controller?.abort();sequence++;close();}});
 form.addEventListener('change',()=>{if(form.elements.method.value==='pickup'||form.elements.addressId.value){clearTimeout(timer);controller?.abort();sequence++;close();}});
}

export function validateAddressSelection(form){
 if(form.elements.method.value==='pickup'||form.elements.addressId.value)return;
 for(const key of ['city','street','house'])if(!form.addressSelection?.[key]||form.addressSelection[key]!==form.elements[key].value)throw Error('Выберите город, улицу и дом из подсказок.');
}
