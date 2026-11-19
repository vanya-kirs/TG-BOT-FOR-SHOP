export function creditCache(load,ttl=60000,now=Date.now){
 let key,entry,pending,expires=0;
 return (owner,force=false)=>{
  if(owner!==key){key=owner;entry=undefined;pending=undefined;expires=0;}
  if(pending)return pending;
  if(!force&&now()<expires)return entry?.error?Promise.reject(entry.error):Promise.resolve(entry.value);
  const current=key;
  const job=Promise.resolve().then(load).then(value=>{if(key===current){entry={value};expires=now()+ttl;}return value;},error=>{if(key===current){entry={error};expires=now()+ttl;}throw error;}).finally(()=>{if(pending===job)pending=undefined;});
  pending=job;return job;
 };
}
