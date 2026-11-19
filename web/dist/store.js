import {addDemoProduct} from './demo.js?v=partners-3';
export const categories = ['Верхняя одежда', 'Трикотаж', 'Платья', 'Аксессуары'];
export const photo = (id, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
export const images = {
  coat: photo('photo-1483985988355-763728e1935b'),
  knit: photo('photo-1434389677669-e08b4cac3105'),
  dress: photo('photo-1595777457583-95e059d581b8'),
  bag: photo('photo-1548036328-c9fa89d128fa'),
  hero: photo('photo-1483985988355-763728e1935b', 1600),
};
export const money = cents => new Intl.NumberFormat('ru-RU', {style:'currency',currency:'RUB',maximumFractionDigits: cents % 100 ? 2 : 0}).format(cents/100);
export function seed() {
  return {version:1, products:[
    {id:'p1',name:'Пальто с поясом',category:categories[0],price:2990000,stock:4,supplier:'s1',image:images.coat,description:'Лаконичный силуэт, мягкие линии и спокойный песочный оттенок. Универсальная основа осеннего гардероба.',sizes:['S','M','L'],color:'Песочный'},
    {id:'p2',name:'Свитер свободного кроя',category:categories[1],price:1290000,stock:8,supplier:'s1',image:images.knit,description:'Фактурный трикотаж, свободная посадка и уютный высокий ворот. Легко сочетать с любимыми вещами.',sizes:['S','M','L'],color:'Молочный'},
    {id:'p3',name:'Платье с мягкой драпировкой',category:categories[2],price:1890000,stock:3,supplier:'s2',image:images.dress,description:'Выразительный силуэт для особенных моментов. Продуманные детали и лёгкость в каждом движении.',sizes:['XS','S','M'],color:'Винный'},
    {id:'p4',name:'Сумка на каждый день',category:categories[3],price:2490000,stock:5,supplier:'s2',image:images.bag,description:'Чистая форма и вместительное отделение. Завершающий акцент для повседневного образа.',sizes:['ONE SIZE'],color:'Карамель'},
  ],suppliers:[{id:'s1',name:'Atelier Nord'},{id:'s2',name:'Maison Collection'}],cart:[],favorites:[],orders:[],payouts:[]};
}
export function readState(storage) {
  try {
    const s=JSON.parse(storage.getItem('vera-prive-v1'));
    if(s?.version===1 && ['products','suppliers','cart','favorites','orders','payouts'].every(k=>Array.isArray(s[k]))) return addDemoProduct(s);
  } catch {}
  return addDemoProduct(seed());
}
export function persist(state, storage) { storage.setItem('vera-prive-v1',JSON.stringify(state)); }
export function addToCart(s,id,size,delta=1) {
  const p=s.products.find(p=>p.id===id);
  if(!p || (p.approval==='pending'||p.approval==='archived'||p.archivedAt) || !p.sizes.includes(size) || !Number.isInteger(delta)) throw Error('Выберите доступный размер опубликованного товара.');
  const row=s.cart.find(r=>r.id===id&&r.size===size);
  const total=s.cart.filter(r=>r.id===id).reduce((sum,r)=>sum+r.quantity,0);
  if(delta>0 && total+delta>p.stock) throw Error('В корзине уже весь доступный остаток.');
  if(row) { row.quantity+=delta; if(row.quantity<=0)s.cart=s.cart.filter(r=>r!==row); }
  else if(delta>0)s.cart.push({id,size,quantity:delta});
}
export const cartTotal = s => s.cart.reduce((sum,r)=>sum+(s.products.find(p=>p.id===r.id)?.price||0)*r.quantity,0);
export function checkout(s) {
  if(!s.cart.length) throw Error('Добавьте товары в корзину.');
  for(const r of s.cart) {
    const p=s.products.find(p=>p.id===r.id);
    const qty=s.cart.filter(x=>x.id===r.id).reduce((sum,x)=>sum+x.quantity,0);
    if(!p || (p.approval==='pending'||p.approval==='archived'||p.archivedAt) || !p.sizes.includes(r.size) || qty>p.stock || r.quantity<1)throw Error('Размер, статус или остаток изменился. Обновите корзину.');
  }
  const order={id:`VP-${String(s.orders.length+1).padStart(4,'0')}`,date:new Date().toISOString(),status:'pending',total:cartTotal(s),items:s.cart.map(r=>{const p=s.products.find(p=>p.id===r.id); return {...r,name:p.name,supplier:p.supplier,supplierName:s.suppliers.find(x=>x.id===p.supplier)?.name,category:p.category,price:p.price,image:p.image};})};
  s.orders.unshift(order);s.cart=[];return order;
}
export function finishOrder(s,id,confirm) {
  const order=s.orders.find(o=>o.id===id);
  if(!order || order.status!=='pending')throw Error('Заказ уже обработан.');
  if(confirm) {
    const quantities=new Map();
    order.items.forEach(r=>quantities.set(r.id,(quantities.get(r.id)||0)+r.quantity));
    for(const [pid,qty] of quantities){const p=s.products.find(p=>p.id===pid);if(!p || p.archivedAt || p.approval==='archived' || p.stock<qty)throw Error('Недостаточно товара для подтверждения продажи.');}
    for(const [pid,qty] of quantities)s.products.find(p=>p.id===pid).stock-=qty;
    order.items.forEach(r=>{r.commission=Math.round(r.price*r.quantity*15/100);r.due=r.price*r.quantity-r.commission;});
  }
  order.status=confirm?'sold':'cancelled';
  if(confirm)order.confirmedAt=new Date().toISOString();
}
export function summary(s,supplier) {
  const items=s.orders.filter(o=>o.status==='sold').flatMap(o=>o.items).filter(i=>!supplier||i.supplier===supplier);
  const revenue=items.reduce((a,i)=>a+i.price*i.quantity,0),commission=items.reduce((a,i)=>a+i.commission,0);
  const paid=s.payouts.filter(p=>!supplier||p.supplier===supplier).reduce((a,p)=>a+p.amount,0);
  return {revenue,commission,due:revenue-commission,paid,balance:revenue-commission-paid,sold:items.reduce((a,i)=>a+i.quantity,0)};
}
export function payout(s,supplier,amount) {
  if(!s.suppliers.some(x=>x.id===supplier)||!Number.isSafeInteger(amount)||amount<=0)throw Error('Укажите положительную сумму.');
  if(amount>summary(s,supplier).balance)throw Error('Выплата превышает остаток к выплате.');
  s.payouts.unshift({supplier,amount,date:new Date().toISOString()});
}
