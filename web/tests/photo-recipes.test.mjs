import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPlan,recipeFor} from '../dist/photo-recipes.js';
import {allCategories} from '../dist/categories.js';
import {photoPrompt} from '../server/photo-prompts.mjs';
test('every catalog category has labelled source inputs, three baseline slots, and bounded extras',()=>{
 for(const c of allCategories){const p=photoPlan(c,'women');assert.equal(p.slots.length,3,c);assert.ok(p.inputs.every(i=>i.label.length>15));assert.deepEqual(p.slots.map(s=>s.key),['cover','front','back']);}
 assert.equal(photoPlan('Сумки','unisex',{extraCount:5}).slots.length,8);assert.throws(()=>photoPlan('Сумки','women',{extraCount:6}),/5/);
});
test('perfume, kids and default intimate photos never invent details or use adult tryon',()=>{
 for(const [c,a] of [['Духи','unisex'],['Куртки','kids'],['Купальники','women']]){const p=photoPlan(c,a);assert.ok(p.slots.every(s=>s.mode==='original'));assert.equal(p.needsModel,false);}
 assert.equal(photoPlan('Купальники','women',{shot:'adult'}).slots[1].mode,'tryon');
});
test('accessory placement and factual detail shots differ from clothing',()=>{
 for(const [c,r] of [['Сумки','bags'],['Кеды','shoes'],['Шапки','headwear'],['Очки','glasses'],['Кольца','jewelry'],['Часы','watches'],['Ремни','belts'],['Платки','scarves']]){const p=photoPlan(c,'women');assert.equal(recipeFor(c,'women'),r);assert.equal(p.slots[1].mode,'wear');assert.equal(p.slots[2].mode,'original');assert.equal(p.slots[0].mode,'background');assert.doesNotMatch(photoPrompt('front','',p,p.slots[1]),/storage creases/);}
 assert.equal(photoPlan('Рюкзаки','men').settings.shot,'backpack');assert.equal(photoPlan('Кольца','women').settings.shot,'finger');assert.equal(photoPlan('Винтаж','women',{itemType:'bags'}).settings.recipe,'bags');
});
test('sets and delicate materials retain all components and material structure',()=>{const p=photoPlan('Костюмы','women',{material:'delicate'});const text=photoPrompt('front','',p,p.slots[1]);assert.match(text,/every piece/);assert.match(text,/lace, transparency/);});

test('all audiences and supported accessory placements preserve original details',()=>{
 const cases=[['Сумки',['shoulder','crossbody','hand','product']],['Кроссовки',['feet','feetSide','product']],['Шапки',['head','headSide','product']],['Очки',['face','product']],['Кольца',['finger','product']],['Часы',['wrist','product']],['Ремни',['waist','product']],['Шарфы',['neck','shoulders','product']]];
 for(const audience of ['women','men','unisex','kids'])for(const [category,shots] of cases)for(const shot of shots)for(const material of ['normal','delicate','shiny','fur']){
 const p=photoPlan(category,audience,{shot,material,extraCount:2});assert.equal(p.slots.length,5);assert.ok(p.slots.slice(2).every(s=>s.mode==='original'));assert.ok(p.inputs.every(i=>i.label));if(audience==='kids')assert.ok(p.slots.every(s=>s.mode==='original'));else if(shot==='product')assert.equal(p.needsModel,false);else assert.equal(p.slots[1].mode,'wear');
 }
 const bag=photoPlan('Сумки','women');assert.match(photoPrompt('front','',bag,bag.slots[1]),/NOT crossbody/);
 const shoes=photoPlan('Кеды','women');assert.match(photoPrompt('front','',shoes,shoes.slots[1]),/knees to the floor/);
});
