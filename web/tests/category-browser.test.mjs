import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryGroups,matchingCategories} from '../dist/category-browser.js';
import {categoryTree} from '../dist/categories.js';
test('clothing groups preserve every persisted category exactly once',()=>{
 const names=categoryGroups('Одежда').flatMap(g=>g.children);
 assert.equal(new Set(names).size,names.length);
 assert.deepEqual(names.sort(),[...categoryTree[0].children].sort());
 assert.deepEqual(categoryGroups('Джинсы'),categoryGroups('Одежда'));
});
test('category search supports partial names and existing synonyms',()=>{
 const groups=categoryGroups('Одежда');
 assert.deepEqual(matchingCategories(groups,'джинс').flatMap(g=>g.children),['Джинсы']);
 assert.deepEqual(matchingCategories(groups,'штаны').flatMap(g=>g.children),['Брюки']);
 assert.equal(matchingCategories(groups,'несуществующее').length,0);
 assert.equal(matchingCategories(groups,'').flatMap(g=>g.children).length,25);
});
test('other sections are alphabetical without changing category keys',()=>{
 const names=categoryGroups('Обувь')[0].children;
 assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'ru')));
});
test('every section keeps its subcategories exactly once in open groups',()=>{
 for(const section of categoryTree){
  const names=categoryGroups(section.name).flatMap(g=>g.children);
  assert.equal(new Set(names).size,names.length,section.name);
  assert.deepEqual(names.filter(n=>n!==section.name).sort(),section.children.filter(n=>n!==section.name).slice().sort(),section.name);
 }
});
