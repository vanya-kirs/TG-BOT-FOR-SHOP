import {prepareDelivery,rememberAddress} from '../dist/delivery.js';
import {photoPlan} from '../dist/photo-recipes.js';
import {photoModelGender} from '../dist/photo-models.js';
import {migratePhotos,resolvePhotoSet} from './photo-records.mjs';
import {supplierEmail,archiveSupplier} from '../dist/supplier-tools.js';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {fromNodeHeaders} from 'better-auth/node';
import {allCategories} from '../dist/categories.js';
import {checkout,finishOrder,payout,summary,addToCart} from '../dist/store.js';
import {saveAddress,removeAddress,primaryAddress} from '../dist/account.js';
const empty=()=>({version:1,products:[],suppliers:[],orders:[],payouts:[]});
const personal=()=>({cart:[],favorites:[],customer:{addresses:[]}});
export function migrateCommerce(db){migratePhotos(db);db.exec(`CREATE TABLE IF NOT EXISTS commerce (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);CREATE TABLE IF NOT EXISTS customer_store(userId TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,data TEXT NOT NULL);`);db.prepare('INSERT OR IGNORE INTO commerce VALUES(1,?)').run(JSON.stringify(empty()));}
export const readCommerce=db=>JSON.parse(db.prepare('SELECT data FROM commerce WHERE id=1').get().data);
export const writeCommerce=(db,s)=>db.prepare('UPDATE commerce SET data=? WHERE id=1').run(JSON.stringify(s));
function readPersonal(db,user){const row=user&&db.prepare('SELECT data FROM customer_store WHERE userId=?').get(user.id);return row?JSON.parse(row.data):personal();}
export function commerceView(db,user){const s=readCommerce(db),p=readPersonal(db,user);
 if(user?.role==='admin')return {...s,...p};
 if(user?.role==='supplier'){const id=user.supplierId;if(!s.suppliers.some(x=>x.id===id&&!x.deletedAt))throw Error('Доступ поставщика закрыт.');return {...s,...p,products:s.products.filter(x=>x.supplier===id),suppliers:s.suppliers.filter(x=>x.id===id),orders:s.orders.filter(o=>o.items.some(i=>i.supplier===id)).map(o=>({id:o.id,date:o.date,confirmedAt:o.confirmedAt,status:o.status,items:o.items.filter(i=>i.supplier===id),total:o.items.filter(i=>i.supplier===id).reduce((a,i)=>a+i.quantity*i.price,0)})),payouts:s.payouts.filter(x=>x.supplier===id)};}
 return {...s,...p,products:s.products.filter(x=>x.approval==='approved'&&!x.archivedAt).map(({supplier,photoStudio,photoJobs,...x})=>x),suppliers:[],payouts:[],orders:user?s.orders.filter(x=>x.userId===user.id).map(({userId,...o})=>({...o,items:o.items.map(({supplier,supplierName,commission,due,...i})=>i)})):[]};
}
const fail=message=>{throw Error(message);};
const text=(v,max=200)=>typeof v==='string'&&v.trim().length<=max?v.trim():fail('Некорректный текст.');
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max?v:fail('Некорректное число.');
function receipt(value){if(!value||typeof value.name!=='string'||value.name.length>200||typeof value.data!=='string'||value.data.length>2800000||!/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/.test(value.data))fail('Чек: PDF или изображение до 2 МБ.');return {name:value.name,data:value.data};}
function product(db,s,user,b){const previous=b.id?s.products.find(x=>x.id===b.id):null;if(b.id&&!previous)fail('Товар не найден.');if(previous?.archivedAt)fail('Товар находится в архиве.');if(user.role==='supplier'&&previous?.supplier!==user.supplierId&&previous)fail('Товар другого поставщика недоступен.');
 const supplier=user.role==='supplier'?user.supplierId:b.supplier;if(!s.suppliers.some(x=>x.id===supplier&&!x.deletedAt))fail('Поставщик не найден.');
 const plan=b.photoJobs?photoPlan(b.category,b.audience??previous?.audience??'women',b.photoSettings??previous?.photoSettings):null;
 const gender=plan?.needsModel?photoModelGender(b.audience??previous?.audience??'women',b.modelGender??previous?.modelGender,plan?.settings):null;
 const set=b.photoJobs?resolvePhotoSet(db,user,b.photoJobs,previous,gender,plan):previous&&!previous.photoJobs&&JSON.stringify(b.images)===JSON.stringify(previous.images)?{images:previous.images,photoStudio:previous.photoStudio,photoLabels:previous.photoLabels}:null;
 if(!set)fail('Подготовьте три фото: вещь без модели, модель спереди и сзади.');
 const images=set.images;
 if(!allCategories.includes(b.category)||!Array.isArray(b.sizes)||!b.sizes.length||b.sizes.length>50||b.sizes.some(x=>typeof x!=='string'||!x||x.length>30))fail('Проверьте категорию и размеры.');
 const name=text(b.name,160),description=text(b.description,10000),color=text(b.color,100);if(!name||!description)fail('Заполните название и описание.');
 if(b.audience!==undefined&&!['women','men','unisex','kids'].includes(b.audience))fail('Выберите раздел: женское, мужское, унисекс или детское.');
 if(b.newWithTags!==undefined&&typeof b.newWithTags!=='boolean')fail('Проверьте состояние товара.');
 const p={audience:b.audience??previous?.audience??null,newWithTags:b.newWithTags??previous?.newWithTags??false,id:previous?.id||'p'+randomUUID(),name,description,color,category:b.category,sizes:[...new Set(b.sizes)],images,image:images[0],supplier,stock:integer(b.stock,0,100000),brandId:text(b.brandId,150),price:0,approval:'pending'};
 Object.assign(p,set);if(gender)p.modelGender=gender;if(plan)p.photoSettings=plan.settings;
 if(user.role==='admin'){p.price=integer(b.price,1,1e9);p.approval='approved';if(previous?.discount){p.originalPrice=p.price;p.discount=previous.discount;p.price=Math.round(p.price*(100-p.discount)/100);}}
 else{p.price=previous?.price||0;if(previous?.discount){p.discount=previous.discount;p.originalPrice=previous.originalPrice;}}
 return p;
}
export function commerceCommand(db,user,action,b={}){
 if(!user)fail('Войдите в аккаунт.');
 if(user.role==='supplier'&&!readCommerce(db).suppliers.some(x=>x.id===user.supplierId&&!x.deletedAt))fail('Доступ поставщика закрыт.');
 const admin=()=>{if(user.role!=='admin')fail('Доступно только администратору.');};
 db.exec('BEGIN IMMEDIATE');
 try{const s=readCommerce(db),p=readPersonal(db,user);let result;
 switch(action){
 case 'product':{if(!['admin','supplier'].includes(user.role)||user.role==='supplier'&&!user.supplierId)fail('Нет доступа.');const item=product(db,s,user,b);const brand=db.prepare('SELECT name FROM brand WHERE id=? AND deleted=0').get(item.brandId);if(!brand)fail('Выберите бренд.');item.brandName=brand.name;const i=s.products.findIndex(x=>x.id===item.id);if(i<0)s.products.unshift(item);else s.products[i]=item;result={id:item.id};break;}
 case 'supplier':{admin();const name=text(b.name,100),email=supplierEmail(b.email);if(!name||s.suppliers.some(x=>x.name.toLowerCase()===name.toLowerCase()))fail('Укажите уникальное название поставщика.');if(s.suppliers.some(x=>!x.deletedAt&&x.email===email))fail('Этот email уже указан у другого поставщика.');const item={id:'s'+randomUUID(),name,email};s.suppliers.push(item);result=item;break;}
 case 'supplier-delete':{admin();archiveSupplier(s,b.id);
 db.prepare('DELETE FROM session WHERE userId IN (SELECT id FROM user WHERE supplierId=?)').run(b.id);
 db.prepare("UPDATE user SET role='customer',supplierId=NULL WHERE supplierId=?").run(b.id);
 db.prepare('UPDATE supplier_invite SET revokedAt=? WHERE supplierId=? AND usedAt IS NULL AND revokedAt IS NULL').run(Date.now(),b.id);
 break;}
 case 'discount':{admin();const item=s.products.find(x=>x.id===b.id);if(!item||item.archivedAt)fail('Товар недоступен или находится в архиве.');const percent=integer(b.percent,0,90),base=item.originalPrice||item.price;item.price=Math.round(base*(100-percent)/100);if(percent){item.originalPrice=base;item.discount=percent;}else{delete item.originalPrice;delete item.discount;}break;}
 case 'cart':{const merged={...s,cart:p.cart};addToCart(merged,b.id,text(b.size,30),integer(b.delta,-100000,100000));p.cart=merged.cart;break;}
 case 'cart-remove':p.cart=p.cart.filter(x=>!(x.id===b.id&&x.size===b.size));break;
 case 'favorite':{if(!s.products.some(x=>x.id===b.id&&x.approval==='approved'&&!x.archivedAt))fail('Товар недоступен.');p.favorites=p.favorites.includes(b.id)?p.favorites.filter(x=>x!==b.id):[...p.favorites,b.id];break;}
 case 'checkout':{if(p.cart.some(r=>s.products.find(x=>x.id===r.id)?.demo))fail('Демонстрационные товары не продаются.');const merged={...s,cart:p.cart};const delivery=prepareDelivery(p,b);const order=checkout(merged);order.delivery=delivery;if(b.remember===true&&delivery.address)rememberAddress(p,delivery.address);order.id='VP-'+randomUUID();order.userId=user.id;order.buyer={name:user.name,email:user.email};p.cart=[];result={id:order.id};break;}
 case 'order':admin();if(typeof b.confirm!=='boolean')fail('Некорректное действие.');finishOrder(s,b.id,b.confirm);break;
 case 'payout':admin();payout(s,b.supplier,integer(b.amount,1,1e12));Object.assign(s.payouts[0],{id:'pay-'+randomUUID(),actorId:user.id,actorName:user.name,supplierName:s.suppliers.find(x=>x.id===b.supplier)?.name,receipt:b.receipt?receipt(b.receipt):null});break;
 case 'receipt':{admin();const pay=s.payouts.find(x=>x.id===b.id);if(!pay)fail('Выплата не найдена.');pay.receipt=receipt(b.receipt);delete pay.readAt;break;}
 case 'read-notifications':if(user.role!=='supplier')fail('Нет доступа.');s.payouts.filter(x=>x.supplier===user.supplierId).forEach(x=>x.readAt=new Date().toISOString());break;
 case 'address':saveAddress(p,b,b.id);break;
 case 'address-primary':primaryAddress(p,b.id);break;
 case 'address-delete':removeAddress(p,b.id);break;
 default:fail('Неизвестное действие.');
 }
 writeCommerce(db,s);db.prepare('INSERT INTO customer_store VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET data=excluded.data').run(user.id,JSON.stringify(p));db.exec('COMMIT');return {result,state:commerceView(db,user)};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function commerceRoutes(identity){const router=express.Router();router.use(async(req,res,next)=>{try{req.user=(await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)}))?.user;next();}catch{res.status(503).json({message:'Не удалось проверить вход.'});}});router.get('/',(req,res)=>res.json(commerceView(identity.database,req.user)));router.post('/:action',express.json({limit:'25mb'}),(req,res)=>{if(!req.user)return res.status(401).json({message:'Войдите в аккаунт.'});try{res.json(commerceCommand(identity.database,req.user,req.params.action,req.body));}catch(e){res.status(400).json({message:e.message});}});return router;}
