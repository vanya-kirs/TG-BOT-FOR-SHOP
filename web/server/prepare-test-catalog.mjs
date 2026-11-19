import {readFile,writeFile,access} from 'node:fs/promises';
import {catalogPhoto} from './photo-format.mjs';
import {testProducts} from '../dist/test-catalog.js';
const root=new URL('../dist/',import.meta.url);
for(const p of testProducts){
 const images=[],labels=[];
 if(p.id.startsWith('test-accessory-')){
  const recipe=p.id.replace('test-accessory-',''),base='assets/accessory-tests/'+recipe;
  const cover='/'+base+'-catalog.jpg';
  await writeFile(new URL(cover.slice(1),root),await catalogPhoto(await readFile(new URL(base+'-cover.png',root)),{cutout:true}));images.push(cover);labels.push('Товар · 3:4');
  try{await access(new URL(base+'-portrait.jpg',root));images.push('/'+base+'-portrait.jpg');labels.push('На модели · 3:4');}catch{}
 }else{
  for(const src of p.images){try{const prepared=await catalogPhoto(await readFile(new URL(src.slice(1),root)));const path=src.replace('.jpg','-catalog.jpg');await writeFile(new URL(path.slice(1),root),prepared);images.push(path);labels.push('На модели · 3:4');}catch{}}
 }
 if(images.length){p.images=images;p.image=images[0];p.photoLabels=labels;p.description='Тест генерации. Готовые изображения в формате 3:4; пример не продаётся.';}
 else p.formatPending=true;
}
await writeFile(new URL('test-catalog.js',root),'export const testProducts='+JSON.stringify(testProducts,null,2)+';\n');
console.log(testProducts.map(p=>({id:p.id,images:p.images.length,pending:!!p.formatPending})));
