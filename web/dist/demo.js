export const demoProductId='vera-test-coat-v1';
export function addDemoProduct(state){
  // Repair only the known obsolete demo URL; preserve all custom product photos.
  for(const p of state.products){
    if(p.image?.includes('photo-1548624149-f322f9a6d1ca'))p.image=p.image.replace('photo-1548624149-f322f9a6d1ca','photo-1483985988355-763728e1935b');
    if(p.images)p.images=p.images.map(src=>src.replace('photo-1548624149-f322f9a6d1ca','photo-1483985988355-763728e1935b'));
  }
  if(state.products.some(p=>p.id===demoProductId))return state;
  const supplier=state.suppliers[0];
  if(!supplier)return state;
  state.products.unshift({id:demoProductId,name:'Пальто «Тихое утро» · тестовое',category:'Верхняя одежда',price:2490000,stock:6,supplier:supplier.id,
    image:'/assets/test-coat.png',images:['/assets/test-coat.png#front','/assets/test-coat.png#back','/assets/test-coat.png#detail'],
    photoPanels:true,photoLabels:['Вид спереди','Вид сзади','Ткань и детали'],
    description:'Тестовое объявление для проверки галереи. Перелистывайте фото стрелками, перетаскивайте мышью или свайпайте пальцем. Изображения сгенерированы; товар не продаётся.',sizes:['S','M','L'],color:'Песочный'});
  return state;
}
