import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryTree,allCategories,canonicalCategory,categoryMatches,parentCategory,categoryOptions} from '../dist/categories.js';
import {filterProducts,filterView} from '../dist/merchandising.js';
test('ten extensible sections contain unique category names and preserve legacy categories',()=>{
 assert.equal(categoryTree.length,10);
 assert.equal(new Set(allCategories).size,allCategories.length);
 for(const name of ['Верхняя одежда','Трикотаж','Платья','Аксессуары'])assert.ok(allCategories.includes(name));
 assert.equal(canonicalCategory('штаны'),'Брюки');
 assert.equal(parentCategory('Зип-худи').name,'Одежда');
});
test('parent filtering includes children and synonyms without leaking other sections',()=>{
 assert.ok(categoryMatches('Клатчи','Сумки'));
 assert.ok(categoryMatches('штаны','Одежда'));
 assert.ok(categoryMatches('Брюки','штаны'));
 assert.ok(!categoryMatches('Пальто','Одежда'));
 const products=['Платья','Брюки','Пальто'].map((category,i)=>({id:i,category,name:category,color:'Белый',price:10000,stock:1,sizes:['S']}));
 assert.deepEqual(filterProducts(products,{category:'Одежда'}).map(p=>p.id),[0,1]);
 assert.deepEqual(filterProducts(products,{search:'штаны'}).map(p=>p.id),[1]);
 assert.equal(filterProducts(products,{category:'Одежда',max:99}).length,0);
});
test('filters start collapsed and category options expose all sections',()=>{
 const html=filterView([],{category:'Платья'},s=>s);
 assert.match(html,/<details class="filter-disclosure">/);
 assert.ok(!html.includes('<details open'));
 const options=categoryOptions('Платья',s=>s);
 assert.equal((options.match(/<optgroup /g)||[]).length,10);
 assert.match(options,/<option value="Платья" selected>/);
});
