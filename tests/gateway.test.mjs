import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createGateway} from '../server/http.mjs';
import {serviceURL,remoteExplorer} from '../lib/remote-explorer.ts';
test('service configuration accepts HTTPS and local development only',()=>{
 assert.equal(serviceURL('https://api.example.com'),'https://api.example.com');
 assert.equal(serviceURL('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
 for(const value of ['http://example.com','https://key:secret@example.com','https://example.com/path','https://example.com?key=secret'])assert.throws(()=>serviceURL(value));
});
test('gateway and desktop proxy forward queries, enforce limits and do not forward provider credentials',async()=>{
 const seen=[];const server=createGateway(async request=>{seen.push(request);return Response.json({network:new URL(request.url).searchParams.get('network'),transactions:[{hash:'real-fixture'}]});},{limit:2});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(origin+'/healthz')).status,200);
  const result=await remoteExplorer(new Request('http://desktop/api/explorer?network=solana&action=address&q=wallet',{headers:{authorization:'secret-key'}}),origin);
  const data=await result.json();assert.equal(data.network,'solana');assert.equal(data.transactions[0].hash,'real-fixture');assert.equal(seen[0].headers.get('authorization'),null);
  assert.equal((await fetch(origin+'/api/explorer')).status,200);
  const limited=await fetch(origin+'/api/explorer');assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
  assert.equal((await fetch(origin+'/api/explorer',{method:'POST'})).status,405);
  assert.equal((await fetch(origin+'/.env.local')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('remote failures become a generic error without provider secrets',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('secret-provider-key')};
 try{const result=await remoteExplorer(new Request('http://desktop/api/explorer'),'https://api.example.com');assert.equal(result.status,503);assert(!(await result.text()).includes('secret-provider-key'));}finally{globalThis.fetch=original;}
});
test('foreign web origins and invalid forwarding headers cannot evade the shared API client quota',async()=>{
 let calls=0;
 const server=createGateway(async()=>{calls++;return Response.json({ok:true})},{limit:1,trustProxy:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/explorer';
 try{
  for(const headers of [{origin:'https://attacker.invalid'},{origin:'null'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'same-site'}]){
   assert.equal((await fetch(url,{headers})).status,403);
  }
  assert.equal(calls,0);
  assert.equal((await fetch(url,{headers:{'x-forwarded-for':'malformed'}})).status,200);
  assert.equal((await fetch(url,{headers:{'x-forwarded-for':'another-malformed'}})).status,429);
  assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('concurrency overload is rejected while existing work completes',async()=>{
 let started,finish;const entered=new Promise(resolve=>started=resolve),pending=new Promise(resolve=>finish=resolve);
 const server=createGateway(async()=>{started();await pending;return Response.json({ok:true})},{maxActive:1});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/api/explorer';
 try{const first=fetch(url);await entered;assert.equal((await fetch(url)).status,429);finish();assert.equal((await first).status,200);}finally{finish();await new Promise(resolve=>server.close(resolve));}
});
test('global quota also limits requests from different client IP addresses',async()=>{
 const server=createGateway(async()=>Response.json({ok:true}),{globalLimit:1,trustProxy:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(origin+'/api/explorer',{headers:{'x-forwarded-for':'192.0.2.1'}})).status,200);
  const limited=await fetch(origin+'/api/explorer',{headers:{'x-forwarded-for':'192.0.2.2'}});
  assert.equal(limited.status,429);
  assert.ok(Number(limited.headers.get('retry-after'))>0);
  assert.equal((await fetch(origin+'/healthz')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});


test('a single client cannot consume all slots, and disconnecting cancels its work',async()=>{
 let enter, markCancelled;
 const entered=new Promise(resolve=>{enter=resolve;});
 const cancelled=new Promise(resolve=>{markCancelled=resolve;});
 const server=createGateway(async request=>{
  if(new URL(request.url).searchParams.has('slow')){
   enter();
   await new Promise(resolve=>{
    const abort=()=>{markCancelled();resolve();};
    if(request.signal.aborted)abort();
    else request.signal.addEventListener('abort',abort,{once:true});
   });
  }
  return Response.json({ok:true});
 },{maxActive:2,maxActivePerClient:1,trustProxy:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/explorer';
 const firstClient={'x-forwarded-for':'192.0.2.1'},secondClient={'x-forwarded-for':'192.0.2.2'};
 const slow=http.get(url+'?slow=1',{headers:firstClient});
 slow.on('error',()=>{});
 try{
  await entered;
  assert.equal((await fetch(url,{headers:firstClient})).status,429);
  assert.equal((await fetch(url,{headers:secondClient})).status,200);
  slow.destroy();
  await cancelled;
  assert.equal((await fetch(url,{headers:firstClient})).status,200);
 }finally{
  slow.destroy();
  await new Promise(resolve=>server.close(resolve));
 }
});
