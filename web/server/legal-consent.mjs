import {createHash} from 'node:crypto';
import {APIError} from 'better-auth/api';
import {CONSENT_VERSION,CONSENT_TEXT} from '../dist/legal-content.js';
const cookieName='vera_consent',maxAge=600;
const reject=()=>{throw new APIError('BAD_REQUEST',{code:'CONSENT_REQUIRED',message:'Подтвердите отдельное согласие на обработку данных.'});};
export function requireConsent(body){if(body?.acceptPersonalData!==true||body?.consentVersion!==CONSENT_VERSION)reject();}
export async function consentBefore(ctx,secure){
 if(!['/sign-up/email','/sign-in/social','/sign-in/oauth2'].includes(ctx.path))return;
 requireConsent(ctx.body);
 if(ctx.path!=='/sign-up/email'){
  if(ctx.body.idToken)reject();
  await ctx.setSignedCookie(cookieName,JSON.stringify({version:CONSENT_VERSION,at:Date.now(),provider:ctx.body.provider||ctx.body.providerId}),ctx.context.secret,{path:'/api/auth',httpOnly:true,secure,sameSite:'lax',maxAge});
 }
}
export async function consentForUser(user,ctx){
 let method='email',acceptedAt=Date.now();
 if(ctx?.path==='/sign-up/email')requireConsent(ctx.body);
 else{
  let proof;try{proof=JSON.parse(await ctx?.getSignedCookie(cookieName,ctx.context.secret));}catch{reject();}
  if(!proof||proof.version!==CONSENT_VERSION||!Number.isFinite(proof.at)||proof.at>Date.now()||Date.now()-proof.at>maxAge*1000||!['google','yandex'].includes(proof.provider)||!['/callback/:id','/oauth2/callback/:providerId'].includes(ctx.path)||(ctx.params?.id||ctx.params?.providerId)!==proof.provider)reject();
  method=proof.provider;acceptedAt=proof.at;
 }
 const evidence={version:CONSENT_VERSION,acceptedAt,method,text:CONSENT_TEXT,sha256:createHash('sha256').update(CONSENT_TEXT).digest('hex')};
 return {data:{...user,consentEvidence:JSON.stringify(evidence)}};
}
