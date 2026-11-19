// Build public, non-purchasable catalog examples only from completed local probes.
import {readFile,writeFile,readdir} from 'node:fs/promises';
const products=[];
for(const gender of ['girl','boy'])for(const age of ['7-9','12-14']){const images=['front','back'].map(side=>`/assets/child-tests/${gender}-${age}-${side}.jpg`);products.push({id:`test-child-${gender}-${age}`,name:`Тест · ${gender==='girl'?'девочка':'мальчик'} ${age} лет`,category:'Пальто',audience:'kids',images,photoLabels:['FASHN · спереди','FASHN · сзади'],description:'Результаты реальной проверки FASHN на вымышленной детской модели и синтетическом пальто. Это пример генерации, не товар в продаже.'});}
const names={bags:'Сумка',shoes:'Кроссовки',headwear:'Шапка',glasses:'Очки',jewelry:'Ожерелье',watches:'Часы',belts:'Ремень',scarves:'Шарф'};
const records=[];for(const f of await readdir(new URL('../data/accessory-check/',import.meta.url))){if(f.endsWith('.json'))records.push(JSON.parse(await readFile(new URL('../data/accessory-check/'+f,import.meta.url))));}
for(const [recipe,label] of Object.entries(names)){const cover=records.find(r=>r.recipe===recipe&&r.kind==='cover'&&r.status==='completed'),front=records.find(r=>r.recipe===recipe&&r.name.endsWith('-v2')&&r.status==='completed')||records.find(r=>r.recipe===recipe&&r.kind==='front'&&r.status==='completed');if(!cover||!front)continue;
 const images=[cover.file,front.file,recipe+'-source.png'].map(f=>'/assets/accessory-tests/'+f);
 products.push({id:'test-accessory-'+recipe,name:'Тест · '+label,category:front.category,audience:'unisex',images,photoLabels:['FASHN · чистый фон','FASHN · на модели','Исходник для сравнения'],description:'Синтетический предмет для проверки FASHN. Сравните исходник и результат. Генерация может менять мелкие детали и посадку; пример не продаётся.'});}
const result=products.map(p=>({...p,image:p.images[0],demo:true,approval:'approved',stock:1,price:0,sizes:[],color:'Тест генерации',brandId:''}));
await writeFile(new URL('../dist/test-catalog.js',import.meta.url),'export const testProducts='+JSON.stringify(result,null,2)+';\n');console.log({examples:result.length});

await import('./prepare-test-catalog.mjs');
