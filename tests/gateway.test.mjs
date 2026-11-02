import test from 'node:test';
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
test('concurrency overload is rejected while existing work completes',async()=>{
 let started,finish;const entered=new Promise(resolve=>started=resolve),pending=new Promise(resolve=>finish=resolve);
 const server=createGateway(async()=>{started();await pending;return Response.json({ok:true})},{maxActive:1});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/api/explorer';
 try{const first=fetch(url);await entered;assert.equal((await fetch(url)).status,429);finish();assert.equal((await first).status,200);}finally{finish();await new Promise(resolve=>server.close(resolve));}
});
