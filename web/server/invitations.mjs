import {invitationMail} from './mail.mjs';
import express from 'express';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {fromNodeHeaders} from 'better-auth/node';
import {readCommerce,writeCommerce} from './commerce.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function migrateInvitations(db){db.exec(`CREATE TABLE IF NOT EXISTS supplier_invite(id TEXT PRIMARY KEY,supplierId TEXT NOT NULL,email TEXT NOT NULL,tokenHash TEXT NOT NULL UNIQUE,expiresAt INTEGER NOT NULL,usedAt INTEGER,revokedAt INTEGER,createdBy TEXT NOT NULL,createdAt INTEGER NOT NULL);`);}
export function makeInvitation(db,admin,supplierId,email){
 if(admin?.role!=='admin')throw Error('Только администратор может приглашать поставщиков.');
 email=String(email||'').trim().toLowerCase();if(email.length>150||!/^\S+@\S+\.\S+$/.test(email))throw Error('Укажите email поставщика.');
 const state=readCommerce(db),supplier=state.suppliers.find(x=>x.id===supplierId&&!x.deletedAt);if(!supplier)throw Error('Поставщик не найден.');
 const existing=db.prepare('SELECT role,supplierId FROM user WHERE email=?').get(email);if(existing&&(existing.role==='admin'||existing.role==='supplier'&&existing.supplierId!==supplierId))throw Error('Этот аккаунт уже имеет другую служебную роль.');
 const token=randomBytes(32).toString('hex'),now=Date.now(),id=randomUUID();
 db.exec('BEGIN IMMEDIATE');try{supplier.email=email;writeCommerce(db,state);db.prepare('UPDATE supplier_invite SET revokedAt=? WHERE supplierId=? AND email=? AND usedAt IS NULL AND revokedAt IS NULL').run(now,supplierId,email);db.prepare('INSERT INTO supplier_invite VALUES(?,?,?,?,?,NULL,NULL,?,?)').run(id,supplierId,email,hash(token),now+7*86400000,admin.id,now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return {id,token,email,supplier};
}
export function acceptInvitation(db,user,token){
 if(!user?.emailVerified)throw Error('Войдите и подтвердите почту, на которую пришло приглашение.');
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Приглашение недействительно.');
 db.exec('BEGIN IMMEDIATE');try{
 const invite=db.prepare('SELECT * FROM supplier_invite WHERE tokenHash=?').get(hash(token));
 if(!invite||invite.usedAt||invite.revokedAt||invite.expiresAt<=Date.now())throw Error('Приглашение истекло, отозвано или уже использовано.');
 if(user.email.toLowerCase()!==invite.email)throw Error('Войдите с почтой, на которую отправлено приглашение.');
 const current=db.prepare('SELECT role,supplierId FROM user WHERE id=?').get(user.id);
 if(!current||current.role==='admin'||current.role==='supplier'&&current.supplierId!==invite.supplierId)throw Error('Нельзя заменить существующую служебную роль.');
 if(!readCommerce(db).suppliers.some(x=>x.id===invite.supplierId&&!x.deletedAt))throw Error('Поставщик больше не существует.');
 db.prepare("UPDATE user SET role='supplier',supplierId=? WHERE id=?").run(invite.supplierId,user.id);
 db.prepare('UPDATE supplier_invite SET usedAt=? WHERE id=?').run(Date.now(),invite.id);
 db.prepare('DELETE FROM session WHERE userId=?').run(user.id);
 db.exec('COMMIT');return {accepted:true};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function invitationRoutes(identity){const router=express.Router();router.use(express.json({limit:'4kb'}));router.use(async(req,res,next)=>{try{req.user=(await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)}))?.user;if(!req.user)return res.status(401).json({message:'Войдите в аккаунт.'});next();}catch{res.status(503).json({message:'Не удалось проверить вход.'});}});
 router.post('/accept',(req,res)=>{try{res.json(acceptInvitation(identity.database,req.user,req.body.token));}catch(e){res.status(400).json({message:e.message});}});
 router.use((req,res,next)=>req.user.role==='admin'?next():res.status(403).json({message:'Нет доступа.'}));
 router.get('/',(req,res)=>res.json(identity.database.prepare('SELECT id,supplierId,email,expiresAt,usedAt,revokedAt FROM supplier_invite ORDER BY createdAt DESC').all()));
 router.post('/',async(req,res)=>{let invite;try{if(!identity.capabilities.email)throw Error('Почта магазина не подключена.');invite=makeInvitation(identity.database,req.user,req.body.supplierId,req.body.email);const url=identity.baseURL+'/#/invite/'+invite.token;await identity.sendMail({to:invite.email,...invitationMail(url,invite.email)});res.status(201).json({sent:true});}catch(e){if(invite)identity.database.prepare('UPDATE supplier_invite SET revokedAt=? WHERE id=?').run(Date.now(),invite.id);res.status(400).json({message:invite?'Не удалось отправить письмо. Повторите позже.':e.message});}});
 router.delete('/:id',(req,res)=>{identity.database.prepare('UPDATE supplier_invite SET revokedAt=? WHERE id=? AND usedAt IS NULL').run(Date.now(),req.params.id);res.json({revoked:true});});return router;}
