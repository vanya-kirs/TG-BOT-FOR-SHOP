import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterProducts,filterView} from '../dist/merchandising.js';
test('multiple sizes match any choice and combine with price, category and brand',()=>{
 const products=[
  {id:1,stock:1,sizes:['S','M'],category:'Платья',price:10000,brandId:'a'},
  {id:2,stock:1,sizes:['L'],category:'Платья',price:20000,brandId:'a'},
  {id:3,stock:1,sizes:['38'],category:'Кеды',price:15000,brandId:'b'},
  {id:4,stock:0,sizes:['S'],category:'Платья',price:10000,brandId:'a'}
 ];
 assert.deepEqual(filterProducts(products,{sizes:['S','L']}).map(p=>p.id),[1,2]);
 assert.deepEqual(filterProducts(products,{sizes:['M','38'],category:'Одежда',brands:['a'],max:100}).map(p=>p.id),[1]);
 assert.equal(filterProducts(products,{sizes:['XXL']}).length,0);
 assert.equal(filterProducts(products,{sizes:[]}).length,3);
 const html=filterView(products,{category:'Обувь',sizes:['38']},s=>s);
 assert.match(html,/name="sizes" value="38" checked/);
 assert.doesNotMatch(html,/name="color"|value="S"/);
});
