import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initialBrands,normalizeBrand,findBrand,matchesBrand,validateBrand,deleteBrand} from '../dist/brands.js';
import {filterProducts} from '../dist/merchandising.js';
import {migrateBrands,databaseBrands} from '../server/brands.mjs';
import {addWorkspaceDemo} from '../dist/workspace-demo.js';
import {seed,summary} from '../dist/store.js';
test('626 unique brands, aliases, punctuation and accents resolve to one record',()=>{
 const brands=initialBrands();assert.equal(brands.length,626);
 assert.equal(new Set(brands.map(b=>normalizeBrand(b.name))).size,626);
 assert.equal(findBrand(brands,'Hermes').id,findBrand(brands,'Hermès').id);
 assert.equal(findBrand(brands,'YSL').name,'Saint Laurent');
 assert.equal(findBrand(brands,'Zara Woman').name,'Zara');
 assert.equal(findBrand(brands,'Hugo Boss').name,'BOSS');
 assert.ok(matchesBrand(findBrand(brands,'Gucci'),'гуччи'));
 assert.equal(findBrand(brands,"Arc'teryx").name,'Arc’teryx');
 assert.throws(()=>validateBrand(brands,{name:'HERMES'}));
 assert.throws(()=>validateBrand(brands,{name:'My Brand',aliases:['YSL']}));
});
test('multiple brands combine with category and price filters',()=>{
 const brands=initialBrands(),max=findBrand(brands,'Max Mara'),dior=findBrand(brands,'Dior');
 const products=[{id:1,brandId:max.id,name:'Пальто',category:'Пальто',stock:1,price:100000,sizes:['M']},{id:2,brandId:dior.id,name:'Платье',category:'Платья',stock:1,price:200000,sizes:['S']}];
 assert.equal(filterProducts(products,{brands:[max.id,dior.id]}).length,2);
 assert.deepEqual(filterProducts(products,{brands:[max.id,dior.id],category:'Одежда'}).map(p=>p.id),[2]);
 assert.equal(filterProducts(products,{brands:[dior.id],max:1500}).length,0);
 assert.deepEqual(filterProducts(products,{search:'диор',brandCatalog:brands}).map(p=>p.id),[2]);
});
test('server migration preserves edits and deletions on repeated runs',()=>{
 const db=new DatabaseSync(':memory:');migrateBrands(db);const brands=databaseBrands(db);assert.equal(brands.length,626);
 db.prepare('UPDATE brand SET name=? WHERE id=?').run('Edited',brands[0].id);
 db.prepare('UPDATE brand SET deleted=1 WHERE id=?').run(brands[1].id);
 migrateBrands(db);const updated=databaseBrands(db);assert.equal(updated.length,625);assert.equal(updated.find(b=>b.id===brands[0].id).name,'Edited');db.close();
});
test('demo records are idempotent and payouts stay within supplier earnings',()=>{
 const state=seed(),brands=initialBrands();addWorkspaceDemo(state,brands,new Date('2026-11-14'));
 const before=structuredClone(state);addWorkspaceDemo(state,brands);assert.deepEqual(state,before);
 assert.equal(state.orders.length,6);assert.equal(state.products.length,7);
 assert.ok(state.products.some(p=>p.originalPrice>p.price));
 for(const supplier of state.suppliers){const s=summary(state,supplier.id);assert.ok(s.balance>=0);assert.equal(s.revenue,s.commission+s.due);}
});
test('deleting a brand used by a product is rejected',async()=>{
 const brands=initialBrands();await assert.rejects(deleteBrand(brands,brands[0].id,[{brandId:brands[0].id}],false,{setItem(){throw Error('must not save');}}));
});
