import test from 'node:test';import assert from 'node:assert/strict';
import {categoriesForAudience,categoryAllowed} from '../dist/categories.js';
import {childTestGallery} from '../dist/child-test-gallery.js';
test('audience category lists exclude mismatched types without removing shared categories',()=>{
 const men=categoriesForAudience('men').flatMap(g=>g.children);
 for(const c of ['Платья','Юбки','Блузки','Балетки','Ботильоны','Купальники','Колготки'])assert.ok(!men.includes(c));
 for(const c of ['Брюки','Кроссовки','Куртки','Плавки','Легинсы'])assert.ok(men.includes(c));
 assert.ok(categoryAllowed('Платья','women'));assert.ok(categoryAllowed('Юбки','kids'));assert.ok(!categoryAllowed('Запонки','women'));
});
test('child results are visible in kids catalog with eight image views and no purchase controls',()=>{
 const html=childTestGallery({audience:'kids'},'','');assert.equal((html.match(/<img /g)||[]).length,8);assert.match(html,/не продаётся/);assert.doesNotMatch(html,/data-action="add"/);assert.equal(childTestGallery({audience:'men'},'',''),'');
});
