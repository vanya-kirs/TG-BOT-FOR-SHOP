import express from 'express';
import {fromNodeHeaders} from 'better-auth/node';
export function mapAddressSuggestion(item){
 const d=item.data||{};
 const city=[d.region_with_type,d.area_with_type,d.city_with_type,d.settlement_with_type].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', ');
 return {value:String(item.value||'').slice(0,500),address:{city,street:d.street_with_type||'',house:d.house||'',building:[d.block_type,d.block].filter(Boolean).join(' '),apartment:d.flat||'',entrance:d.entrance||'',floor:d.floor||''}};
}
export function addressSuggestionRoutes(identity,{key=process.env.DADATA_API_KEY,fetchImpl=fetch,now=Date.now}={}){
 const router=express.Router(),limits=new Map();
 router.post('/',express.json({limit:'2kb'}),async(req,res)=>{
  try{
   const session=await identity.auth.api.getSession({headers:fromNodeHeaders(req.headers)});
   if(!session)return res.status(401).json({message:'Войдите для поиска адреса.'});
   const query=req.body?.query;if(typeof query!=='string'||query.trim().length<(req.body?.field==='house'?1:2)||query.length>200)return res.status(400).json({message:'Введите от 3 до 200 символов адреса.'});
   const field=req.body.field||'address';if(!['address','city','street','house'].includes(field))return res.status(400).json({message:'Некорректное поле адреса.'});
   if(!key)return res.status(503).json({message:'Подсказки пока недоступны. Введите адрес вручную.'});
   const at=now();for(const [id,entry]of limits)if(entry.until<=at)limits.delete(id);
   const limit=limits.get(session.user.id)||{until:at+60000,count:0};if(limit.count>=30)return res.status(429).json({message:'Слишком много запросов. Попробуйте через минуту.'});
   limit.count++;limits.set(session.user.id,limit);
   const response=await fetchImpl('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Token '+key},body:JSON.stringify({query:query.trim(),count:6,locations:[{country_iso_code:'RU'}],...(field==='address'?{}:{from_bound:{value:field==='city'?'city':field},to_bound:{value:field==='city'?'settlement':field}})}),signal:AbortSignal.timeout(5000)});
   if(!response.ok)return res.status(502).json({message:'Поиск адреса временно недоступен.'});
   const data=await response.json();res.json({suggestions:(Array.isArray(data.suggestions)?data.suggestions:[]).slice(0,6).map(mapAddressSuggestion)});
  }catch{res.status(502).json({message:'Поиск адреса временно недоступен. Введите адрес вручную.'});}
 });return router;
}
