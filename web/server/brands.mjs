import {readCommerce} from './commerce.mjs';
import {initialBrands,normalizeBrand,validateBrand,sortBrands} from '../dist/brands.js';
import {mainCategories} from '../dist/categories.js';
import {fromNodeHeaders} from 'better-auth/node';
import express from 'express';
export function migrateBrands(db){
 db.exec('CREATE TABLE IF NOT EXISTS brand (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE, aliases TEXT NOT NULL, categories TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)');
 const insert=db.prepare('INSERT OR IGNORE INTO brand (id,name,normalized,aliases,categories) VALUES (?,?,?,?,?)');
 db.exec('BEGIN');
 try{for(const b of initialBrands())insert.run(b.id,b.name,normalizeBrand(b.name),JSON.stringify(b.aliases),JSON.stringify(b.categories));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
export const databaseBrands=db=>sortBrands(db.prepare('SELECT id,name,aliases,categories FROM brand WHERE deleted=0').all().map(b=>({...b,aliases:JSON.parse(b.aliases),categories:JSON.parse(b.categories)})));
export function brandRoutes(identity){
 const router=express.Router();
 router.get('/',(_req,res)=>res.json(databaseBrands(identity.database)));
 router.use(async(req,res,next)=>{
  const session=await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session)return res.status(401).json({message:'Войдите в аккаунт.'});
  if(session.user.role!=='admin')return res.status(403).json({message:'Управление брендами доступно администратору.'});
  next();
 });
 router.use(express.json({limit:'16kb'}));
 const save=(req,res)=>{
  try{
   const db=identity.database,id=req.params.id;
   if(id&&!db.prepare('SELECT id FROM brand WHERE id=? AND deleted=0').get(id))return res.status(404).json({message:'Бренд не найден.'});
   const b=validateBrand(databaseBrands(db),req.body,id);
   if(b.categories.some(c=>!mainCategories.includes(c)))throw Error('Выберите категории из списка.');
   if(id)db.prepare('UPDATE brand SET name=?,normalized=?,aliases=?,categories=? WHERE id=?').run(b.name,normalizeBrand(b.name),JSON.stringify(b.aliases),JSON.stringify(b.categories),id);
   else{const removed=db.prepare('SELECT id FROM brand WHERE normalized=? AND deleted=1').get(normalizeBrand(b.name));if(removed){b.id=removed.id;db.prepare('UPDATE brand SET name=?,aliases=?,categories=?,deleted=0 WHERE id=?').run(b.name,JSON.stringify(b.aliases),JSON.stringify(b.categories),b.id);}else db.prepare('INSERT INTO brand(id,name,normalized,aliases,categories) VALUES(?,?,?,?,?)').run(b.id,b.name,normalizeBrand(b.name),JSON.stringify(b.aliases),JSON.stringify(b.categories));}
   res.status(id?200:201).json(b);
  }catch(error){res.status(400).json({message:error.message});}
 };
 router.post('/',save);router.put('/:id',save);
 router.delete('/:id',(req,res)=>{if(readCommerce(identity.database).products.some(p=>p.brandId===req.params.id))return res.status(409).json({message:'Бренд используется в товарах.'});const result=identity.database.prepare('UPDATE brand SET deleted=1 WHERE id=? AND deleted=0').run(req.params.id);res.status(result.changes?200:404).json({deleted:!!result.changes});});
 return router;
}
