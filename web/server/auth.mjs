import {privacySchema} from './privacy-retention.mjs';
import {consentBefore,consentForUser} from './legal-consent.mjs';
import {removeRetiredProfileData,yandexProfile} from './profile.mjs';
import {createAuthMiddleware,APIError,getSessionFromCtx} from 'better-auth/api';
import {verificationMail,resetMail} from './mail.mjs';
import {betterAuth} from 'better-auth';
import {genericOAuth,emailOTP} from 'better-auth/plugins';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import nodemailer from 'nodemailer';

export function createIdentity(env=process.env, overrides={}) {
  const baseURL=env.APP_URL||'http://localhost:4173';
  if(!env.BETTER_AUTH_SECRET||env.BETTER_AUTH_SECRET.length<32)throw Error('Set BETTER_AUTH_SECRET to a random value of at least 32 characters.');
  if(env.NODE_ENV==='production'&&!baseURL.startsWith('https://'))throw Error('Production APP_URL must use HTTPS.');
  const path=env.DATABASE_PATH||'./data/accounts.sqlite';
  if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
  const database=new DatabaseSync(path);
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  removeRetiredProfileData(database);
  privacySchema(database);
  const emailEnabled=!!overrides.sendMail||!!(env.SMTP_HOST&&env.MAIL_FROM&&env.SMTP_USER&&env.SMTP_PASS);
  const transport=emailEnabled&&!overrides.sendMail?nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||465),secure:env.SMTP_SECURE!=='false',requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS}}):null;
  const sendMail=overrides.sendMail||((message)=>transport.sendMail({...message,from:env.MAIL_FROM}));
  database.exec('CREATE TABLE IF NOT EXISTS otp_cooldown (email TEXT PRIMARY KEY, next_at INTEGER NOT NULL)');
  database.exec('CREATE TABLE IF NOT EXISTS reset_cooldown (email TEXT PRIMARY KEY, next_at INTEGER NOT NULL)');
  const deliver=async(user,url)=>{if(!user.email.endsWith('@telegram.invalid'))await sendMail({to:user.email,...resetMail(url)});};
  const enabled=id=>!!(env[id+'_CLIENT_ID']&&env[id+'_CLIENT_SECRET']);
  const config=[];
  if(enabled('YANDEX'))config.push({
    providerId:'yandex',clientId:env.YANDEX_CLIENT_ID,clientSecret:env.YANDEX_CLIENT_SECRET,
    authorizationUrl:'https://oauth.yandex.ru/authorize',tokenUrl:'https://oauth.yandex.ru/token',scopes:['login:email','login:info'],pkce:true,
    getUserInfo:async(tokens)=>{
      const response=await fetch('https://login.yandex.ru/info?format=json',{headers:{Authorization:`OAuth ${tokens.accessToken}`},signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Yandex profile unavailable');
      const user=await response.json();
      if(!user.id||!user.default_email)return null;
      return yandexProfile(user);
    },
  });
  const options={
    logger:{disabled:true},
    appName:'Vera Privé',baseURL,secret:env.BETTER_AUTH_SECRET,database,trustedOrigins:[new URL(baseURL).origin],
    emailAndPassword:{enabled:emailEnabled,minPasswordLength:8,maxPasswordLength:128,requireEmailVerification:true,revokeSessionsOnPasswordReset:true,sendResetPassword:({user,url})=>deliver(user,url,true)},
    emailVerification:{sendOnSignUp:false,sendOnSignIn:false,autoSignInAfterVerification:true},
    socialProviders:enabled('GOOGLE')?{google:{clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET}}:{},
    plugins:[emailOTP({expiresIn:300,otpLength:6,allowedAttempts:5,storeOTP:'hashed',disableSignUp:true,changeEmail:{enabled:true},sendVerificationOTP:async({email,otp})=>sendMail({to:email,...verificationMail(otp)})}),...(config.length?[genericOAuth({config})]:[])],
    hooks:{before:createAuthMiddleware(async ctx=>{
      const path=ctx.path;
      await consentBefore(ctx,baseURL.startsWith('https://'));
      if(path==='/link-social')throw new APIError('FORBIDDEN',{message:'Use social sign-in.'});
      if(path==='/request-password-reset'){
        const email=String(ctx.body?.email||'').trim().toLowerCase();
        if(!emailEnabled||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new APIError('BAD_REQUEST',{message:'Invalid reset request.'});
        ctx.body.email=email;
        const now=Date.now();
        const accepted=database.prepare('INSERT INTO reset_cooldown(email,next_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET next_at=excluded.next_at WHERE reset_cooldown.next_at<=? RETURNING next_at').get(email,now+60000,now);
        if(!accepted)return ctx.json({status:true,message:'If this email exists in our system, check your email for the reset link'});
        return;
      }
      if(path==='/send-verification-email'||path==='/verify-email'||path==='/sign-in/email-otp'||(path.startsWith('/email-otp/')&&!['/email-otp/send-verification-otp','/email-otp/verify-email','/email-otp/request-email-change','/email-otp/change-email'].includes(path)))throw new APIError('FORBIDDEN',{message:'Use email verification code.'});
      if(['/update-user','/sign-up/email'].includes(path)&&['birthday','gender','phone'].some(field=>Object.hasOwn(ctx.body||{},field))){
        throw new APIError('BAD_REQUEST',{message:'These profile fields are no longer collected.'});
      }
      if(path==='/email-otp/request-email-change'){
        const session=await getSessionFromCtx(ctx);
        if(!session)throw new APIError('UNAUTHORIZED',{message:'Sign in first.'});
        const email=String(ctx.body.newEmail||'').trim().toLowerCase();
        if(!emailEnabled||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new APIError('BAD_REQUEST',{message:'Invalid email.'});
        ctx.body.newEmail=email;
        const key='change:'+session.user.id,now=Date.now();
        const accepted=database.prepare('INSERT INTO otp_cooldown(email,next_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET next_at=excluded.next_at WHERE otp_cooldown.next_at<=? RETURNING next_at').get(key,now+60000,now);
        if(!accepted){ctx.setHeader('Retry-After',String(Math.ceil((database.prepare('SELECT next_at FROM otp_cooldown WHERE email=?').get(key).next_at-now)/1000)));throw new APIError('TOO_MANY_REQUESTS',{code:'OTP_RESEND_TOO_SOON',message:'Wait before requesting a new code.'});}
        await ctx.context.internalAdapter.deleteVerificationByIdentifier('change-email-otp-'+session.user.id+':'+email);
        return;
      }
      if(path!=='/email-otp/send-verification-otp')return;
      if(!emailEnabled||ctx.body?.type!=='email-verification')throw new APIError('BAD_REQUEST',{message:'Invalid verification request.'});
      const email=String(ctx.body.email||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new APIError('BAD_REQUEST',{message:'Invalid email.'});
      const now=Date.now();
      const row=database.prepare('INSERT INTO otp_cooldown(email,next_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET next_at=excluded.next_at WHERE otp_cooldown.next_at<=? RETURNING next_at').get(email,now+60000,now);
      if(!row){ctx.setHeader('Retry-After',String(Math.ceil((database.prepare('SELECT next_at FROM otp_cooldown WHERE email=?').get(email).next_at-now)/1000)));throw new APIError('TOO_MANY_REQUESTS',{code:'OTP_RESEND_TOO_SOON',message:'Please wait before requesting another code.'});}
      // Remove the previous code only after accepting a resend.
      await ctx.context.internalAdapter.deleteVerificationByIdentifier('email-verification-otp-'+email);
    }),after:createAuthMiddleware(async ctx=>{if(['/sign-in/email','/sign-up/email','/sign-out','/reset-password'].includes(ctx.path))database.prepare('INSERT INTO privacy_security_event(createdAt,event) VALUES(?,?)').run(Date.now(),ctx.path);})},
    account:{accountLinking:{enabled:true,disableImplicitLinking:false,requireLocalEmailVerified:true,trustedProviders:['yandex'],allowDifferentEmails:false}},
    databaseHooks:{user:{create:{before:consentForUser}}},
    user:{additionalFields:{consentEvidence:{type:'string',required:false,input:false,returned:false},role:{type:'string',defaultValue:'customer',input:false},supplierId:{type:'string',required:false,input:false}}},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
    rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:3},'/request-password-reset':{window:60,max:3}}},
    advanced:{useSecureCookies:baseURL.startsWith('https://'),ipAddress:{ipAddressHeaders:['x-vera-client-ip']}},
    ...overrides.authOptions,
  };
  return {sendMail,auth:betterAuth(options),options,database,baseURL,trustedProxy:env.TRUSTED_PROXY||'',capabilities:{server:true,email:emailEnabled,providers:{google:enabled('GOOGLE'),yandex:enabled('YANDEX'),telegram:false}}};
}
