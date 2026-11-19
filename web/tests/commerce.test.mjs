import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {getMigrations} from 'better-auth/db/migration';
import {createIdentity} from '../server/auth.mjs';
import {migrateBrands,databaseBrands} from '../server/brands.mjs';
import {migrateCommerce,commerceCommand as command,commerceView,readCommerce} from '../server/commerce.mjs';
import {migrateInvitations,makeInvitation,acceptInvitation} from '../server/invitations.mjs';
import {accountHome} from '../dist/commerce-client.js';
const pickup={method:'pickup',recipient:'Покупатель',phone:'+79991234567'};
async function setup(t){const identity=createIdentity({APP_URL:'http://localhost:4173',BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),DATABASE_PATH:':memory:'},{sendMail:async()=>{}});await(await getMigrations(identity.options)).runMigrations();const db=identity.database;migrateBrands(db);migrateCommerce(db);migrateInvitations(db);t.after(()=>db.close());const users=[];for(const name of ['admin','one','two','buyer']){const r=await identity.auth.api.signUpEmail({body:{acceptPersonalData:true,consentVersion:'2026-11-19-v1',name,email:name+'@example.com',password:'testing-password-42'}});db.prepare('UPDATE user SET emailVerified=1 WHERE id=?').run(r.user.id);users.push({...r.user,emailVerified:true,role:name==='admin'?'admin':'customer'});}db.prepare("UPDATE user SET role='admin' WHERE id=?").run(users[0].id);const [admin,one,two,buyer]=users;const a=command(db,admin,'supplier',{name:'Первый',email:'one@example.com'}).result,b=command(db,admin,'supplier',{name:'Второй',email:'two@example.com'}).result;one.role=two.role='supplier';one.supplierId=a.id;two.supplierId=b.id;for(const u of [one,two])db.prepare('UPDATE user SET role=?,supplierId=? WHERE id=?').run(u.role,u.supplierId,u.id);for(const kind of ['cover','front','back'])db.prepare("INSERT INTO photo_job(id,owner,kind,created,status,image,sourceImage) VALUES(?,?,?,?,?,?,?)").run(kind,one.id,kind,Date.now(),'completed','data:image/png;base64,Yg==','data:image/png;base64,YQ==');const product={photoJobs:{cover:'cover',front:'front',back:'back'},name:'Пальто',description:'Описание пальто',color:'Бежевый',category:'Пальто',sizes:['S','M'],stock:2,price:10000,brandId:databaseBrands(db)[0].id,images:['https://example.com/front.jpg','https://example.com/back.jpg'],supplier:a.id};return {db,admin,one,two,buyer,product};}
test('server commerce isolates suppliers, enforces prices and approval, and does not seed browser demos',async t=>{const {db,admin,one,two,buyer,product}=await setup(t);assert.equal(readCommerce(db).products.length,0);const id=command(db,one,'product',{...product,price:1,approval:'approved',supplier:two.supplierId}).result.id;let p=readCommerce(db).products[0];assert.equal(p.supplier,one.supplierId);assert.equal(p.price,0);assert.equal(p.approval,'pending');assert.equal(commerceView(db,buyer).products.length,0);assert.throws(()=>command(db,two,'product',{...product,id}),/другого/);assert.throws(()=>command(db,buyer,'product',product),/доступа/);assert.throws(()=>command(db,one,'discount',{id,percent:50}),/администратору/);command(db,admin,'product',{...product,id});command(db,admin,'discount',{id,percent:20});command(db,one,'product',{...product,id,price:1});p=readCommerce(db).products[0];assert.equal(p.price,8000);assert.equal(p.originalPrice,10000);assert.equal(p.approval,'pending');assert.equal(commerceView(db,two).products.length,0);command(db,admin,'product',{...product,id});assert.equal(readCommerce(db).products[0].price,8000);const publicProduct=commerceView(db,null).products[0];assert.equal(publicProduct.supplier,undefined);assert.equal(publicProduct.price,8000);});
test('orders use server prices; transactions protect inventory, debt, receipts and private customer data',async t=>{const {db,admin,one,two,buyer,product}=await setup(t);const id=command(db,admin,'product',product).result.id;command(db,buyer,'cart',{id,size:'M',delta:2,price:1});command(db,buyer,'favorite',{id});command(db,buyer,'address',{city:'Москва',street:'Тестовая',house:'1'});assert.equal(commerceView(db,two).cart.length,0);assert.equal(commerceView(db,two).customer.addresses.length,0);const order=command(db,buyer,'checkout',{...pickup,price:1,total:1,userId:two.id}).result.id;assert.equal(commerceView(db,buyer).orders[0].total,20000);assert.equal(commerceView(db,buyer).orders[0].items[0].supplier,undefined);assert.throws(()=>command(db,one,'order',{id:order,confirm:true}),/администратору/);command(db,admin,'order',{id:order,confirm:true});assert.equal(readCommerce(db).products[0].stock,0);assert.throws(()=>command(db,admin,'order',{id:order,confirm:true}),/обработан/);assert.equal(commerceView(db,one).orders[0].userId,undefined);assert.equal(commerceView(db,two).orders.length,0);assert.throws(()=>command(db,admin,'payout',{supplier:one.supplierId,amount:17001}),/превышает/);assert.equal(readCommerce(db).payouts.length,0);assert.throws(()=>command(db,admin,'payout',{supplier:one.supplierId,amount:1000,receipt:{name:'x',data:'javascript:alert(1)'}}),/Чек/);assert.equal(readCommerce(db).payouts.length,0);command(db,admin,'payout',{supplier:one.supplierId,amount:17000,receipt:{name:'чек.pdf',data:'data:application/pdf;base64,YQ=='}});assert.equal(commerceView(db,one).payouts.length,1);assert.equal(commerceView(db,two).payouts.length,0);assert.equal(commerceView(db,buyer).payouts.length,0);command(db,one,'read-notifications');assert.ok(commerceView(db,one).payouts[0].readAt);assert.throws(()=>command(db,one,'receipt',{id:readCommerce(db).payouts[0].id,receipt:{}}),/администратору/);});
test('supplier invitation requires matching verified email, stores a hash, expires and cannot be reused',async t=>{const {db,admin,one,two,buyer}=await setup(t);assert.throws(()=>makeInvitation(db,buyer,one.supplierId,buyer.email),/администратор/);let invite=makeInvitation(db,admin,one.supplierId,buyer.email);assert.notEqual(db.prepare('SELECT tokenHash FROM supplier_invite WHERE id=?').get(invite.id).tokenHash,invite.token);assert.throws(()=>acceptInvitation(db,{...buyer,emailVerified:false},invite.token),/подтвердите/);assert.throws(()=>acceptInvitation(db,two,invite.token),/почтой/);db.prepare('UPDATE supplier_invite SET expiresAt=0 WHERE id=?').run(invite.id);assert.throws(()=>acceptInvitation(db,buyer,invite.token),/истекло/);invite=makeInvitation(db,admin,one.supplierId,buyer.email);assert.deepEqual(acceptInvitation(db,buyer,invite.token),{accepted:true});assert.throws(()=>acceptInvitation(db,buyer,invite.token),/использовано/);assert.equal(db.prepare('SELECT role FROM user WHERE id=?').get(buyer.id).role,'supplier');assert.equal(db.prepare('SELECT supplierId FROM user WHERE id=?').get(buyer.id).supplierId,one.supplierId);assert.equal(db.prepare('SELECT COUNT(*) n FROM session WHERE userId=?').get(buyer.id).n,0);assert.throws(()=>makeInvitation(db,admin,two.supplierId,buyer.email),/другую/);});
test('landing page is chosen by authenticated role',()=>{assert.equal(accountHome({role:'admin'}),'/admin');assert.equal(accountHome({role:'supplier'}),'/supplier');assert.equal(accountHome({role:'customer'}),'/account');assert.equal(accountHome(),'/account');});
test('supplier creation stores normalized email and requires a valid address',async t=>{const {db,admin}=await setup(t);assert.throws(()=>command(db,admin,'supplier',{name:'Нет почты'}),/email/);assert.throws(()=>command(db,admin,'supplier',{name:'Плохая почта',email:'invalid'}),/email/);const supplier=command(db,admin,'supplier',{name:'Новый',email:'  New@Example.com '}).result;assert.equal(supplier.email,'new@example.com');assert.equal(readCommerce(db).suppliers.find(x=>x.id===supplier.id).email,'new@example.com');});
test('deleting a supplier archives all products, revokes invitations and access, and preserves financial history',async t=>{
 const {db,admin,one,two,buyer,product}=await setup(t);
 const id=command(db,admin,'product',product).result.id;
 command(db,buyer,'cart',{id,size:'M',delta:1});const sold=command(db,buyer,'checkout',pickup).result.id;command(db,admin,'order',{id:sold,confirm:true});
 command(db,admin,'payout',{supplier:one.supplierId,amount:1000,receipt:{name:'receipt.pdf',data:'data:application/pdf;base64,YQ=='}});
 command(db,buyer,'cart',{id,size:'M',delta:1});const pending=command(db,buyer,'checkout',pickup).result.id;command(db,buyer,'cart',{id,size:'M',delta:1});command(db,buyer,'favorite',{id});
 const second=command(db,admin,'product',{...product,name:'Другой товар',supplier:two.supplierId}).result.id;
 const invite=makeInvitation(db,admin,one.supplierId,buyer.email);
 const before=readCommerce(db);assert.throws(()=>command(db,two,'supplier-delete',{id:one.supplierId}),/администратору/);
 command(db,admin,'supplier-delete',{id:one.supplierId});const after=readCommerce(db);
 assert.deepEqual(after.orders,before.orders);assert.deepEqual(after.payouts,before.payouts);
 assert.ok(after.suppliers.find(x=>x.id===one.supplierId).deletedAt);assert.ok(after.products.find(x=>x.id===id).archivedAt);
 assert.equal(commerceView(db,null).products.some(x=>x.id===id),false);assert.equal(commerceView(db,buyer).products.some(x=>x.id===id),false);assert.equal(commerceView(db,null).products.some(x=>x.id===second),true);
 assert.throws(()=>command(db,buyer,'cart',{id,size:'M',delta:1}),/опубликованного/);assert.throws(()=>command(db,buyer,'checkout',pickup),/статус/);
 assert.throws(()=>command(db,admin,'order',{id:pending,confirm:true}),/Недостаточно/);
 assert.throws(()=>command(db,admin,'product',{...product,id}),/архиве/);
 assert.throws(()=>command(db,admin,'product',product),/Поставщик/);
 assert.throws(()=>makeInvitation(db,admin,one.supplierId,buyer.email),/Поставщик/);
 assert.throws(()=>acceptInvitation(db,buyer,invite.token),/отозвано/);
 assert.equal(db.prepare('SELECT role FROM user WHERE id=?').get(one.id).role,'customer');assert.equal(db.prepare('SELECT supplierId FROM user WHERE id=?').get(one.id).supplierId,null);
 assert.throws(()=>commerceView(db,one),/закрыт/);
 command(db,admin,'supplier-delete',{id:one.supplierId});assert.deepEqual(readCommerce(db),after);
 // The shop can still settle outstanding debt after removing access.
 command(db,admin,'payout',{supplier:one.supplierId,amount:7500});assert.equal(readCommerce(db).payouts.length,2);
});
test('new-with-tags state is validated and persisted through supplier review and publication',async t=>{
 const {db,admin,one,product}=await setup(t);const id=command(db,one,'product',{...product,newWithTags:true}).result.id;
 assert.equal(readCommerce(db).products[0].newWithTags,true);assert.equal(commerceView(db,null).products.length,0);
 command(db,admin,'product',{...product,id});assert.equal(commerceView(db,null).products[0].newWithTags,true);
 command(db,admin,'product',{...product,id,newWithTags:false});assert.equal(commerceView(db,null).products[0].newWithTags,false);
 assert.throws(()=>command(db,admin,'product',{...product,id,newWithTags:'true'}),/состояние/);
});
test('only authoritative generated frames publish and originals remain private',async t=>{
 const {db,admin,one,two,product}=await setup(t);
 assert.throws(()=>command(db,one,'product',{...product,photoJobs:undefined}),/три фото/);
 assert.throws(()=>command(db,two,'product',product),/доступ/);
 const id=command(db,one,'product',product).result.id;
 assert.equal(commerceView(db,one).products[0].photoStudio.sources.front,'data:image/png;base64,YQ==');
 command(db,admin,'product',{...product,id,images:['javascript:bad'],photoStudio:{sources:{front:'fake'}}});
 const item=commerceView(db,null).products[0];assert.equal(item.photoStudio,undefined);assert.equal(item.photoJobs,undefined);
 assert.deepEqual(item.images,['/api/photos/assets/cover','/api/photos/assets/front','/api/photos/assets/back']);
 assert.deepEqual(item.photoLabels,['ИИ-визуализация · Вещь без модели','ИИ-визуализация · На модели спереди','ИИ-визуализация · На модели сзади']);
});
test('supplier can save unisex and admin can approve without losing its audience',async t=>{
 const {db,admin,one,product}=await setup(t);
 const id=command(db,one,'product',{...product,audience:'unisex',modelGender:'female'}).result.id;
 command(db,admin,'product',{...product,id});
 assert.equal(commerceView(db,null).products[0].audience,'unisex');
});

test('sales and payouts retain historical names and payout author without exposing supplier names to buyers',async t=>{
 const {db,admin,one,buyer,product}=await setup(t);const id=command(db,admin,'product',product).result.id;
 command(db,buyer,'cart',{id,size:'M',delta:1});const order=command(db,buyer,'checkout',pickup).result.id;command(db,admin,'order',{id:order,confirm:true});command(db,admin,'payout',{supplier:one.supplierId,amount:1000});
 const s=readCommerce(db),row=s.orders.find(o=>o.id===order).items[0],pay=s.payouts[0];assert.equal(row.category,product.category);assert.equal(row.supplierName,s.suppliers.find(x=>x.id===one.supplierId).name);assert.equal(pay.actorId,admin.id);assert.equal(pay.actorName,admin.name);assert.equal(pay.supplierName,row.supplierName);assert.equal(commerceView(db,buyer).orders[0].items[0].supplierName,undefined);
});

test('checkout keeps delivery private, snapshots saved address and rolls back invalid requests',async t=>{
 const {db,admin,one,buyer,product}=await setup(t);const id=command(db,admin,'product',product).result.id;
 command(db,buyer,'cart',{id,size:'M',delta:1});
 assert.throws(()=>command(db,buyer,'checkout',{}),/способ доставки/);assert.equal(commerceView(db,buyer).cart.length,1);
 command(db,buyer,'address',{label:'Дом',city:'Москва',street:'Тестовая',house:'1'});
 const saved=commerceView(db,buyer).customer.addresses[0];
 assert.throws(()=>command(db,buyer,'checkout',{...pickup,method:'cdek',addressId:'other-user'}),/Адрес/);
 command(db,buyer,'checkout',{...pickup,method:'cdek',addressId:saved.id});
 command(db,buyer,'address',{...saved,house:'99'});
 assert.equal(commerceView(db,buyer).orders[0].delivery.address.house,'1');
 assert.equal(commerceView(db,admin).orders[0].delivery.phone,pickup.phone);
 assert.equal(commerceView(db,one).orders[0].delivery,undefined);
 assert.equal(commerceView(db,null).orders.length,0);
});
