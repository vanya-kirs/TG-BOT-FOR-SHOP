import {money} from './store.js?v=partners-3';

export function accountData(state) {
  if (!state.customer) state.customer = {name:'',email:'',addresses:[]};
  for(const field of ['phone','birthday','gender'])delete state.customer[field];
  return state.customer;
}

export function updateProfile(state, values) {
  const name=String(values.name||'').trim(), email=String(values.email||'').trim();
  if(name.length>80 || email.length>150) throw Error('Проверьте длину введённых данных.');
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Проверьте адрес электронной почты.');
  Object.assign(accountData(state),{name,email});
}

export function saveAddress(state, values, id) {
  const customer=accountData(state);
  const address={id:id||crypto.randomUUID()};
  for(const key of ['label','city','street','house','building','entrance','floor','apartment','intercom']) address[key]=String(values[key]||'').trim();
  if(!address.city||!address.street||!address.house) throw Error('Укажите город, улицу и дом.');
  if(Object.values(address).some(v=>v.length>180)) throw Error('Слишком длинное значение поля.');
  const index=customer.addresses.findIndex(a=>a.id===id);
  address.primary=index>=0?customer.addresses[index].primary:customer.addresses.length===0;
  if(id&&index<0)throw Error('Адрес не найден.');
  if(index>=0)customer.addresses[index]=address;else customer.addresses.push(address);
}

export function removeAddress(state,id) {
  const c=accountData(state);c.addresses=c.addresses.filter(a=>a.id!==id);
  if(c.addresses.length&&!c.addresses.some(a=>a.primary))c.addresses[0].primary=true;
}
export function primaryAddress(state,id) {
  const c=accountData(state);if(!c.addresses.some(a=>a.id===id))throw Error('Адрес не найден.');
  c.addresses.forEach(a=>a.primary=a.id===id);
}

export function accountView(state,{esc,productCard,orderCard,empty,settings=''},section='overview') {
  const c=accountData(state), favorites=state.products.filter(p=>!p.archivedAt&&state.favorites.includes(p.id));
  const active=state.orders.filter(o=>o.status==='pending').length;
  const sections=[['overview','Обзор'],['orders','Мои заказы'],['favorites','Избранное'],['profile','Личные данные'],['addresses','Адреса доставки'],['settings','Настройки']];
  const nav=sections.map(([id,title])=>`<a class="${section===id?'active':''}" ${section===id?'aria-current="page"':''} href="#/account/${id}">${title}<span>${id==='orders'?state.orders.length:id==='favorites'?favorites.length:'↗'}</span></a>`).join('');
  const orders=state.orders.map(o=>`<div>${orderCard(o)}<button class="text-link order-detail-link" data-action="order-details" data-id="${o.id}">Состав и статус заказа ⟶</button></div>`).join('');
  let content='';
  if(section==='orders')content=`<div class="section-head"><h2>Мои заказы</h2><span class="small muted">${state.orders.length} всего</span></div>${orders||empty('Ваша история начинается здесь','Сохраните понравившиеся вещи или оформите первый демо-заказ.')}`;
  else if(section==='favorites')content=`<div class="section-head"><h2>Избранное</h2><span class="small muted">${favorites.length} вещей</span></div>${favorites.length?`<div class="product-grid account-products">${favorites.map(productCard).join('')}</div>`:empty('То, что вам по душе','Нажмите на сердечко в каталоге — вещь останется здесь.')}`;
  else if(section==='settings')content=`<h2>Настройки аккаунта</h2>${settings||'<p class="muted">Настройки входа доступны после авторизации.</p>'}`;
  else if(section==='profile')content=`<h2>Личные данные</h2><p class="small legal-links"><a href="/legal/privacy.html">Как используются ваши данные</a> · <a href="mailto:info@shop.example.com?subject=Персональные%20данные">Отозвать согласие или запросить удаление</a></p><p class="muted small account-intro">Используйте вымышленные данные для проверки интерфейса. Они сохраняются только в этом браузере.</p><form id="profile-form" class="account-form"><label>Имя<input name="name" maxlength="80" value="${esc(c.name)}" placeholder="Например, Анна" autocomplete="off"></label><div class="form-grid"><label>Электронная почта<input name="email" type="email" maxlength="150" value="${esc(c.email)}" placeholder="anna@example.com" autocomplete="off"></label></div><p class="form-error" role="alert"></p><button class="btn">Сохранить изменения ⟶</button></form><div class="account-help"><h3>Ваше пространство</h3><p>Регистрация и вход будут подключены к серверу магазина. Сейчас это демо-профиль, доступный только на этом устройстве.</p></div>`;
  else if(section==='addresses')content=`<div class="section-head"><h2>Адреса доставки</h2><button class="btn light" data-action="address-new">+ Добавить</button></div><p class="small muted account-intro">Для примерки сценария используйте вымышленный адрес. Доставка в демо не оформляется.</p>${c.addresses.length?`<div class="address-grid">${c.addresses.map(a=>`<article class="address-card"><div class="order-top"><h3>${esc(a.label||'Мой адрес')}</h3>${a.primary?'<span class="badge">Основной</span>':''}</div><p>${esc(a.city)}</p><p>${esc(a.street)}${a.house?", д. "+esc(a.house):""}${a.building?", корп. "+esc(a.building):""}</p><p class="small muted">${[a.entrance?"Подъезд "+esc(a.entrance):"",a.floor?"Этаж "+esc(a.floor):"",a.apartment?"Кв. "+esc(a.apartment):"",a.intercom?"Домофон "+esc(a.intercom):""].filter(Boolean).join(" · ")}</p><div class="address-actions"><button class="text-link" data-action="address-edit" data-id="${a.id}">Изменить</button>${!a.primary?`<button class="text-link" data-action="address-primary" data-id="${a.id}">Сделать основным</button>`:''}<button class="text-link" data-action="address-delete" data-id="${a.id}">Удалить</button></div></article>`).join('')}</div>`:'<div class="empty"><h3>Куда доставить ваши находки?</h3><p class="muted small">Сохранённые адреса будут доступны здесь.</p><button class="btn" data-action="address-new">Добавить демо-адрес →</button></div>'}`;
  else content=`<section class="account-welcome"><div><p class="eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</p><h2>${c.name?'Здравствуйте, '+esc(c.name)+'.':'Рады видеть вас.'}</h2><p>Любимые вещи, ваши заказы и важные детали — всё в одном месте.</p><a class="text-link" href="#/catalog">Найти что-то особенное ⟶</a></div><span class="account-monogram" aria-hidden="true">VP</span></section><div class="account-shortcuts"><a href="#/account/orders"><span class="eyebrow">МОИ ЗАКАЗЫ</span><strong>${state.orders.length}</strong><span>${active} ожидают подтверждения ⟶</span></a><a href="#/account/favorites"><span class="eyebrow">ИЗБРАННОЕ</span><strong>${favorites.length}</strong><span>Ваш личный выбор ⟶</span></a><a href="#/account/addresses"><span class="eyebrow">АДРЕСА</span><strong>${c.addresses.length}</strong><span>Детали доставки ⟶</span></a></div><div class="section-head"><h3>Последний заказ</h3><a class="text-link" href="#/account/orders">Все заказы ⟶</a></div>${state.orders.length?orderCard(state.orders[0])+`<button class="text-link order-detail-link" data-action="order-details" data-id="${state.orders[0].id}">Подробнее о заказе ⟶</button>`:empty('Впереди — ваши любимые находки','Выберите вещи в каталоге, а мы сохраним историю здесь.')}<div class="account-help"><div><h3>Помочь с выбором?</h3><p>Информация о связи с магазином и подборе вещей.</p></div><a class="text-link" href="#/contact">Связаться с нами ↗</a></div>`;
  return `<div class="wrap"><div class="page-head"><p class="eyebrow">VERA PRIVÉ / ЛИЧНЫЙ КАБИНЕТ</p><h1>Моё пространство</h1></div><div class="customer-layout"><aside class="customer-sidebar"><div class="customer-identity"><span class="avatar">${esc((c.name||'V').slice(0,1).toUpperCase())}</span><div><strong>${esc(c.name||'Гость Vera Privé')}</strong><p class="small muted">Демонстрационный профиль</p></div></div><nav aria-label="Личный кабинет">${nav}</nav><a class="back-shop" href="#/catalog">← Вернуться к покупкам</a></aside><section class="customer-content" id="account-content"><div class="notice">Демо-кабинет · без регистрации и реальной оплаты. Данные хранятся в этом браузере.</div>${content}</section></div></div>`;
}

export function addressForm(address={},esc) {
  const fields=[['city','Город',true],['street','Улица',true],['house','Дом',true],['building','Корпус',false],['entrance','Подъезд',false],['floor','Этаж',false],['apartment','Квартира',false],['intercom','Домофон',false]];
  return '<form id="address-form" data-id="'+esc(address.id||'')+'"><p class="small muted account-intro">Укажите вымышленные данные для проверки.</p><label>Название адреса<input name="label" maxlength="80" placeholder="Например, Дом" value="'+esc(address.label||'')+'"></label><div class="form-grid">'+fields.map(([key,label,required])=>'<label>'+label+(required?'':' · необязательно')+'<input name="'+key+'" '+(required?'required':'')+' maxlength="180" value="'+esc(address[key]||'')+'"></label>').join('')+'</div><p class="form-error" role="alert"></p><button class="btn wide">Сохранить адрес</button></form>';
}

export function orderDetails(order,esc) {
  const sold=order.status==='sold',cancelled=order.status==='cancelled';
  return `<p class="small muted">${new Date(order.date).toLocaleDateString('ru-RU')} · демонстрационный заказ</p><ol class="order-timeline"><li class="complete">Заявка создана</li><li class="${sold?'complete':''}">${cancelled?'Заявка отменена':sold?'Продажа подтверждена':'Ожидает подтверждения'}</li><li>Доставка не оформлялась</li></ol>${order.items.map(i=>`<div class="order-detail-item"><img src="${esc(i.image)}" alt="${esc(i.name)}"><div><strong>${esc(i.name)}</strong><p class="small muted">Размер ${esc(i.size)} · ${i.quantity} шт.</p><p>${money(i.price*i.quantity)}</p></div></div>`).join('')}<div class="line-item total"><span>Стоимость товаров</span><strong>${money(order.total)}</strong></div><p class="small muted">Оплата не проводилась. Подтверждение продажи в демо не означает банковский платёж или отправку товара.</p>`;
}
