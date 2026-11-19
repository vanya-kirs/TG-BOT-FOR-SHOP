import {ProxyAgent,fetch as undiciFetch} from 'undici';

// Per-service dispatcher: OAuth, mail and other outgoing traffic stay unchanged.
export function createFashnTransport(env=process.env,fetcher=undiciFetch){
 const proxy=env.FASHN_PROXY_URL?.trim();let dispatcher;
 return {
  proxied:!!proxy,
  async fetch(url,options={}){
   if(new URL(url).origin!=='https://api.fashn.ai')throw Error('Недопустимый адрес FASHN.');
   if(proxy&&!dispatcher){
    try{const parsed=new URL(proxy);if(!['http:','https:','socks5:'].includes(parsed.protocol)||!parsed.hostname||parsed.search||parsed.hash||parsed.pathname!=='/'&&parsed.pathname!=='')throw Error();dispatcher=new ProxyAgent(parsed);}
    catch{throw Error('Проверьте формат FASHN_PROXY_URL на сервере.');}
   }
   // Never disable TLS validation or fall back to a direct request on proxy failure.
   return fetcher(url,{...options,redirect:'error',...(dispatcher?{dispatcher}:{})});
  },
  async close(){await dispatcher?.close();}
 };
}
