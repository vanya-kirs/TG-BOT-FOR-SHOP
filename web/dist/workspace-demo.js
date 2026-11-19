import {findBrand} from './brands.js?v=partners-3';
export function addWorkspaceDemo(state,brands,now=new Date()){
 if(state.workspaceDemoV2)return state;
 if(!state.suppliers.length)return state;
 const supplier1=state.suppliers[0].id,supplier2=state.suppliers[1]?.id||supplier1;
 const examples=[['maxmara','Max Mara',4900000,supplier1,'Песочный'],['burberry','Burberry',6200000,supplier2,'Бежевый'],['loropiana','Loro Piana',8500000,supplier1,'Молочный']];
 for(const [key,brandName,price,supplier,color] of examples){
  const id='demo-workspace-'+key;if(state.products.some(p=>p.id===id))continue;
  const brand=findBrand(brands,brandName);if(!brand)continue;
  state.products.push({id,name:`Пальто · ${brandName} · демо`,brandId:brand.id,brandName:brand.name,category:'Пальто',supplier,stock:3,price:key==='maxmara'?Math.round(price*.8):price,...(key==='maxmara'?{originalPrice:price,discount:20}:{}),sizes:['S','M','L'],color,
   image:'/assets/test-coat.png',images:['/assets/test-coat.png#front','/assets/test-coat.png#back','/assets/test-coat.png#detail'],photoPanels:true,photoLabels:['Спереди','Сзади','Детали'],description:'Демонстрационная карточка для проверки брендов, скидок и кабинета поставщика. Изображение сгенерировано и не является фотографией изделия указанного бренда. Этот товар не продаётся.'});
 }
 const products=state.products.filter(p=>p.id.startsWith('demo-workspace-'));
 if(!products.length)return state;
 for(let month=0;month<6;month++){
  const id='DEMO-SALE-'+month;if(state.orders.some(o=>o.id===id))continue;
  const p=products[month%products.length],date=new Date(Date.UTC(now.getFullYear(),now.getMonth()-month,5,12)).toISOString();
  const commission=Math.round(p.price*.15),due=p.price-commission;
  state.orders.push({id,date,confirmedAt:date,status:'sold',total:p.price,demo:true,items:[{id:p.id,name:p.name,brandId:p.brandId,supplier:p.supplier,image:p.image,size:'M',quantity:1,price:p.price,commission,due}]});
  if(month>=3&&!state.payouts.some(x=>x.id==='DEMO-PAYOUT-'+month))state.payouts.push({id:'DEMO-PAYOUT-'+month,supplier:p.supplier,date,amount:Math.floor(due*.6),demo:true});
 }
 state.workspaceDemoV2=true;return state;
}
