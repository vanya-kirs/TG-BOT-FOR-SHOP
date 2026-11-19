import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createFashnTransport} from '../server/fashn-transport.mjs';

test('transport refuses other destinations and keeps direct fetch free of proxy credentials',async()=>{
 const calls=[];const direct=createFashnTransport({},async(url,options)=>{calls.push({url,options});return Response.json({});});
 await direct.fetch('https://api.fashn.ai/v1/credits',{headers:{Authorization:'Bearer key'}});
 assert.equal(calls[0].options.dispatcher,undefined);
 await assert.rejects(()=>direct.fetch('https://another.example'),/адрес/);assert.equal(calls.length,1);
 const bad=createFashnTransport({FASHN_PROXY_URL:'ftp://secret:private@localhost'},async()=>assert.fail('must not send'));
 await assert.rejects(()=>bad.fetch('https://api.fashn.ai/v1/credits'),e=>!e.message.includes('secret')&&!e.message.includes('private'));
});

test('HTTP proxy uses CONNECT with proxy authentication and never exposes FASHN key to the proxy headers or falls back',async t=>{
 const connections=[];const proxy=http.createServer();
 proxy.on('connect',(req,socket)=>{connections.push({url:req.url,headers:req.headers});socket.end('HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');});
 proxy.listen(0,'127.0.0.1');await new Promise(r=>proxy.once('listening',r));
 const transport=createFashnTransport({FASHN_PROXY_URL:`http://test:password@127.0.0.1:${proxy.address().port}`});
 t.after(async()=>{await transport.close();await new Promise(r=>proxy.close(r));});
 await assert.rejects(()=>transport.fetch('https://api.fashn.ai/v1/run',{method:'POST',headers:{Authorization:'Bearer fashn-secret'},body:'{}',signal:AbortSignal.timeout(3000)}));
 assert.equal(connections.length,1);assert.equal(connections[0].url,'api.fashn.ai:443');assert.equal(connections[0].headers['proxy-authorization'],'Basic '+Buffer.from('test:password').toString('base64'));
 assert.ok(!JSON.stringify(connections).includes('fashn-secret'));
});
