import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesBrand,findBrand,validateBrand} from '../dist/brands.js';
import {searchProducts,partnerProduct,paymentHistory,supplierNotifications,readReceipt} from '../dist/partner-tools.js';
import {filterProducts} from '../dist/merchandising.js';
import {seed,addToCart,summary,payout,checkout,finishOrder} from '../dist/store.js';
test('manually added brands are searchable in Cyrillic across lookup and products',()=>{
 const brand=validateBrand([],{name:'Adidas'},'adidas');
 assert.ok(matchesBrand(brand,'адидас'));assert.equal(findBrand([brand],'АДИДАС'),brand);
 const products=[{name:'Куртка',brandId:brand.id,stock:1,sizes:['M'],price:100}];
 assert.equal(searchProducts(products,'адидас',[brand]).length,1);
 assert.equal(searchProducts(products,'куртка',[brand]).length,1);
 assert.equal(filterProducts(products,{search:'адидас',brandCatalog:[brand]}).length,1);
 assert.ok(matchesBrand({name:'Nike',aliases:['Найк']},'найк'));
});
test('supplier updates preserve price and cannot approve or edit another supplier',()=>{
 const original={supplier:'s1',price:800,originalPrice:1000,discount:20};
 const next=partnerProduct(original,{supplier:'s2',price:1,approval:'approved'},'s1');
 assert.equal(next.price,800);assert.equal(next.discount,20);assert.equal(next.supplier,'s1');assert.equal(next.approval,'pending');
 assert.throws(()=>partnerProduct(original,{},'s2'));
 assert.equal(partnerProduct(null,{price:500},'s1').price,0);
 assert.equal(partnerProduct(null,{price:500},null).approval,'approved');
 const state=seed();state.products[0].approval='pending';
 assert.throws(()=>addToCart(state,'p1','S'));
 assert.ok(!filterProducts(state.products).some(p=>p.id==='p1'));
});
test('payment history and unread notices are scoped and debt decreases after payout',()=>{
 const state=seed();addToCart(state,'p1','S');const order=checkout(state);finishOrder(state,order.id,true);
 const before=summary(state,'s1').balance;payout(state,'s1',10000);
 Object.assign(state.payouts[0],{id:'receipt1',receipt:{name:'receipt.pdf',data:'data:application/pdf;base64,AAAA'}});
 assert.equal(summary(state,'s1').balance,before-10000);
 assert.match(paymentHistory(state,'s1',s=>s),/receipt.pdf/);
 assert.doesNotMatch(paymentHistory(state,'s2',s=>s),/receipt.pdf/);
 assert.match(supplierNotifications(state,'s1',s=>s),/Уведомления · 1/);
 state.payouts[0].readAt='now';assert.match(supplierNotifications(state,'s1',s=>s),/Уведомления · 0/);
});
test('receipt validation rejects active formats and oversized files',async()=>{
 await assert.rejects(readReceipt({size:100,type:'text/html'}));
 await assert.rejects(readReceipt({size:3*1024*1024,type:'application/pdf'}));
});
