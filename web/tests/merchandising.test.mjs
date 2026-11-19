import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,addToCart,checkout,finishOrder,summary,payout} from '../dist/store.js';
import {setDiscount,filterProducts,validateImages,productImages,monthlySales,socials} from '../dist/merchandising.js';
test('discounts use original price, can reset, and are scoped',()=>{const s=seed();setDiscount(s,'p1',20,'s1');assert.equal(s.products[0].price,2392000);setDiscount(s,'p1',10,'s1');assert.equal(s.products[0].price,2691000);assert.throws(()=>setDiscount(s,'p1',30,'s2'));assert.throws(()=>setDiscount(s,'p1',100));setDiscount(s,'p1',0);assert.equal(s.products[0].price,2990000);assert.equal(s.products[0].originalPrice,undefined);});
test('discounted order snapshots and commissions use actual price',()=>{const s=seed();setDiscount(s,'p1',20);addToCart(s,'p1','S');const o=checkout(s);setDiscount(s,'p1',0);finishOrder(s,o.id,true);assert.equal(o.total,2392000);assert.equal(summary(s).commission,358800);assert.equal(summary(s).due,2033200);});
test('combined filters use discounted price and inclusive bounds',()=>{const s=seed();setDiscount(s,'p1',20);const found=filterProducts(s.products,{min:'23920',max:'23920',size:'S',color:'Песочный',sale:true,search:'пальто'});assert.equal(found.length,1);assert.equal(filterProducts(s.products,{size:'XXL'}).length,0);assert.equal(filterProducts(s.products,{min:'25000',sale:true}).length,0);});
test('gallery accepts 2 to 8 valid distinct photos and preserves old single photo',()=>{assert.equal(productImages(seed().products[0]).length,1);assert.throws(()=>validateImages(['https://a.test/1']));assert.throws(()=>validateImages(['https://a.test/1','javascript:alert(1)']));assert.throws(()=>validateImages(Array.from({length:9},(_,i)=>'https://a.test/'+i)));assert.equal(validateImages(['https://a.test/1','https://a.test/2']).length,2);});
test('charts aggregate actual sales and payouts with supplier isolation',()=>{const s=seed();addToCart(s,'p1','S');const o=checkout(s);finishOrder(s,o.id,true);o.date='2026-01-01T00:00:00Z';o.confirmedAt='2026-11-14T10:00:00Z';payout(s,'s1',100000);s.payouts[0].date='2026-11-14T10:00:00Z';const rows=monthlySales(s,'s1',6,new Date('2026-11-20T12:00:00Z'));assert.equal(rows.length,6);assert.equal(rows[5].revenue,2990000);assert.equal(rows[5].paid,100000);assert.equal(monthlySales(s,'s2',6,new Date('2026-11-20T12:00:00Z'))[5].revenue,0);});
test('provided social links are set and remaining links stay unset',()=>{assert.equal(socials.length,5);assert.deepEqual(socials.map(s=>s.url),['https://t.me/example_shop','https://t.me/example_shop',null,'https://example.com/marketplace','https://example.com/resale']);});
test('new-with-tags collection combines with other filters and excludes hidden and unmarked products',()=>{
 const base=seed().products[0];const products=[{...base,id:'tagged',newWithTags:true},{...base,id:'used'},{...base,id:'pending',newWithTags:true,approval:'pending'},{...base,id:'archived',newWithTags:true,archivedAt:'2026-11-15'}];
 assert.deepEqual(filterProducts(products,{newWithTags:true,size:'S'}).map(x=>x.id),['tagged']);
 assert.equal(filterProducts(products,{newWithTags:true,max:1}).length,0);
 assert.equal(filterProducts(products,{newWithTags:false}).length,2);
});

test('condition groups combine with category, query, size and price',()=>{
 const base={name:'Пальто',category:'Пальто',color:'Бежевый',stock:1,price:10000,sizes:['M']};
 const rows=[{...base,id:'new',newWithTags:true},{...base,id:'used',newWithTags:false},{...base,id:'other',category:'Кеды',newWithTags:true},{...base,id:'hidden',newWithTags:true,approval:'archived'}];
 assert.deepEqual(filterProducts(rows,{condition:'new',category:'Верхняя одежда',search:'пальто',sizes:['M'],max:100}).map(p=>p.id),['new']);
 assert.deepEqual(filterProducts(rows,{condition:'used',category:'Пальто'}).map(p=>p.id),['used']);
 assert.deepEqual(filterProducts(rows,{condition:'all',category:'Пальто'}).map(p=>p.id),['new','used']);
 assert.equal(filterProducts(rows,{condition:'new',min:101}).length,0);
});
test('multiple subcategories are ORed while other filters still intersect',()=>{
 const rows=['Брюки','Джинсы','Шорты','Кеды'].map((category,id)=>({id,name:category,category,stock:1,price:10000,sizes:['M'],newWithTags:id===1}));
 assert.deepEqual(filterProducts(rows,{category:'Одежда',categories:['Брюки','Джинсы']}).map(p=>p.id),[0,1]);
 assert.deepEqual(filterProducts(rows,{category:'Одежда',categories:['Брюки','Джинсы'],condition:'new'}).map(p=>p.id),[1]);
 assert.equal(filterProducts(rows,{category:'Одежда',categories:[]}).length,3);
});
test('audience combines with condition and subcategories; legacy items only appear in all',()=>{
 const rows=[undefined,'women','men','kids'].map((audience,id)=>({id,audience,name:'Джинсы',category:'Джинсы',stock:1,price:10000,sizes:['M'],newWithTags:true}));
 assert.equal(filterProducts(rows,{}).length,4);
 for(const [id,audience] of [[1,'women'],[2,'men'],[3,'kids']])assert.deepEqual(filterProducts(rows,{audience,condition:'new',categories:['Брюки','Джинсы']}).map(p=>p.id),[id]);
 assert.equal(filterProducts(rows,{audience:'men',condition:'used'}).length,0);
});

test('unisex products appear in both adult sections but never in kids and still obey other filters',()=>{
 const base={name:'Куртка',category:'Куртки',stock:1,price:10000,sizes:['M']};
 const rows=['women','men','unisex','kids'].map(audience=>({...base,id:audience,audience}));
 assert.deepEqual(filterProducts(rows,{audience:'women'}).map(p=>p.id),['women','unisex']);
 assert.deepEqual(filterProducts(rows,{audience:'men'}).map(p=>p.id),['men','unisex']);
 assert.deepEqual(filterProducts(rows,{audience:'kids'}).map(p=>p.id),['kids']);
 assert.equal(filterProducts(rows,{}).length,4);
 assert.equal(filterProducts(rows,{audience:'women',sizes:['XL']}).length,0);
});
