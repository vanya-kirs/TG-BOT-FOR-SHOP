import {addressSuggestionRoutes} from './address-suggestions.mjs';
import {photoRoutes} from './photo-studio.mjs';
import {commerceRoutes,migrateCommerce} from './commerce.mjs';
import {invitationRoutes,migrateInvitations} from './invitations.mjs';
import express from 'express';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {fileURLToPath} from 'node:url';
import {brandRoutes} from './brands.mjs';

export function createApp(identity){
  migrateCommerce(identity.database);migrateInvitations(identity.database);
  const app=express();
  app.disable('x-powered-by');
  if(identity.trustedProxy)app.set('trust proxy',identity.trustedProxy.split(',').map(value=>value.trim()));
  app.use((req,res,next)=>{
    // Always overwrite client-supplied values; proxy trust is configured explicitly.
    req.headers['x-vera-client-ip']=req.ip;
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    if(req.path.startsWith('/api/'))res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin!==new URL(identity.baseURL).origin)return res.status(403).json({message:'Недопустимый источник запроса.'});
    next();
  });
  app.get('/api/shop-auth',(_req,res)=>res.json(identity.capabilities));
  app.all('/api/auth/*splat',toNodeHandler(identity.auth));
  app.use('/api/address-suggestions',addressSuggestionRoutes(identity));
  app.use('/api/commerce',commerceRoutes(identity));
  app.use('/api/photos',photoRoutes(identity));
  app.use('/api/invitations',invitationRoutes(identity));
  app.use('/api/brands',brandRoutes(identity));
  app.get('/api/me',async(req,res)=>{
    const session=await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)});
    if(!session)return res.status(401).json({message:'Войдите в аккаунт.'});
    const {id,name,email,emailVerified,role,supplierId}=session.user;
    const linkedProviders=identity.database.prepare('SELECT providerId FROM account WHERE userId=?').all(id).map(a=>a.providerId).filter(p=>['google','yandex','telegram'].includes(p));
    res.json({user:{linkedProviders,id,name,email:email.endsWith('@telegram.invalid')?'':email,emailVerified,role,supplierId}});
  });
  app.get('/api/access/:role',async(req,res)=>{
    const session=await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)});
    if(!session)return res.sendStatus(401);
    if(!['admin','supplier'].includes(req.params.role)||session.user.role!==req.params.role)return res.sendStatus(403);
    res.json({allowed:true});
  });
  app.use('/api',(_req,res)=>res.status(404).json({message:'Метод не найден.'}));
  app.use(express.static(fileURLToPath(new URL('../dist/',import.meta.url)),{dotfiles:'deny',index:'index.html'}));
  app.use((error,_req,res,_next)=>{console.error('Request failed:',error.name);res.status(500).json({message:'Не удалось выполнить запрос. Попробуйте позже.'});});
  return app;
}
