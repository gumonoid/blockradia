import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {createRequire} from 'node:module';
import {localExplorer} from '../app/api/explorer/route.ts';
import {csvCell} from '../lib/csv.ts';
import {importInvestigation} from '../lib/investigation-import.ts';
const require=createRequire(import.meta.url),security=require('../desktop/security.cjs');
function desktopHandler(){
 let calls=0;
 const handler=security.createAppHandler(path.resolve('desktop/ui-dist'),async()=>{calls++;return Response.json({ok:true});});
 return {handler,calls:()=>calls};
}
async function send(instance,url,headers={},method='GET'){
 return (await instance.handler(new Request(new URL(url,security.APP_ORIGIN),{method,headers}))).status;
}
test('desktop protocol blocks foreign origins, cross-site requests and unmarked API requests',async()=>{
 const instance=desktopHandler();
 for(const headers of [{origin:'https://attacker.invalid'},{origin:'null'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'same-site'}]){
  assert.equal(await send(instance,'/api/explorer',{'x-blockradia-client':'1',...headers}),403);
 }
 assert.equal(await send(instance,'http://127.0.0.1:19238/api/explorer',{'x-blockradia-client':'1'}),403);
 assert.equal(await send(instance,'/api/explorer',{},'POST'),405);
 assert.equal(await send(instance,'/api/explorer'),403);
 assert.equal(instance.calls(),0);
 assert.equal(await send(instance,'/api/explorer',{'sec-fetch-site':'same-origin','x-blockradia-client':'1'}),200);
 assert.equal(instance.calls(),1);
});
test('desktop protocol traversal attempts cannot read outside the UI directory',async()=>{
 const instance=desktopHandler();
 for(const url of ['/%2e%2e%5c.env.local','/%2e%2e%2f%2e%2e%5cpackage.json','/..%2fpackage.json','/%00'])assert.equal(await send(instance,url),403);
 assert.equal(instance.calls(),0);
});
test('IPC requires the known main frame as well as the trusted origin',()=>{const mainFrame={url:security.APP_ORIGIN+'/'},contents={mainFrame};assert(security.trustedIPC({sender:contents,senderFrame:mainFrame},contents));assert(!security.trustedIPC({sender:contents,senderFrame:{url:mainFrame.url}},contents));mainFrame.url='https://attacker.invalid/';assert(!security.trustedIPC({sender:contents,senderFrame:mainFrame},contents));});
test('camera, microphone, geolocation and clipboard read stay denied; expected app features remain allowed',()=>{const wc={};for(const permission of ['media','geolocation','clipboard-read','fileSystem','usb'])assert(!security.allowPermission(wc,wc,permission,security.APP_ORIGIN));for(const permission of ['notifications','fullscreen','clipboard-sanitized-write']){assert(security.allowPermission(wc,wc,permission,security.APP_ORIGIN));assert(!security.allowPermission(wc,wc,permission,'https://attacker.invalid'));}});
test('external links cannot launch non-HTTPS or credential/UNC URLs',()=>{for(const url of ['file:///C:/Windows','javascript:alert(1)','ms-settings:','https://user:password@example.com','https://example.com\\evil','https://example.com\n'])assert.equal(security.externalURL(url),null);assert.equal(security.externalURL('https://tonviewer.com/'),'https://tonviewer.com/');});
test('inherited JavaScript property names are rejected as networks without contacting providers',async()=>{const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected provider call')};try{for(const network of ['__proto__','constructor','toString'])for(const action of ['overview','history']){const r=await localExplorer(new Request('http://local/api/explorer?'+new URLSearchParams({network,action,start:'1',end:'2'})));assert.equal(r.status,400)}assert.equal(calls,0)}finally{globalThis.fetch=old}});
test('CSV formula payloads in token metadata stay text when exported',()=>{for(const payload of ['=1+1','+1+1','-1+1','@SUM(1,2)','  =1+1','\t=1+1','\r=1+1'])assert(csvCell(payload).startsWith('"\''));assert.equal(csvCell('USDT'),'"USDT"');assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell(123),'"123"');});


test('market requests that differ only in unused query parameters share a cache entry',async()=>{
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async url=>{
  calls.push(url);
  const day=Math.floor(Date.now()/86400000)*86400;
  const rows=Array.from({length:12},(_,i)=>[day-i*86400,5,6,4,5,0,0,2]);
  return Response.json({error:[],result:{XXBTZUSD:rows}});
 };
 try{
  const url='http://local/api/explorer?action=market&network=bitcoin';
  const first=await localExplorer(new Request(url+'&q=unused'));
  const second=await localExplorer(new Request(url+'&q=other&before=unused&refresh=1'));
  assert.equal(first.status,200);
  assert.equal(second.status,200);
  assert.deepEqual((await first.json()).chart,(await second.json()).chart);
  assert.equal(calls.length,1);
 }finally{globalThis.fetch=original;}
});

test('cancelling one explorer caller preserves shared work until the last caller leaves',async()=>{
 const original=globalThis.fetch;
 let calls=0, started;
 const upstream=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async (_url,{signal})=>{
  if(++calls>1)return Response.json({result:'0x1'});
  started(signal);
  return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 };
 try{
  const url='http://local/api/explorer?network=ethereum&action=balance&q=0x'+'4'.repeat(40);
  const firstController=new AbortController(),secondController=new AbortController();
  const first=localExplorer(new Request(url,{signal:firstController.signal}));
  const second=localExplorer(new Request(url,{signal:secondController.signal}));
  const signal=await upstream;
  firstController.abort();
  await first;
  assert.equal(signal.aborted,false);
  secondController.abort();
  await second;
  assert.equal(signal.aborted,true);
  const replacement=await localExplorer(new Request(url));
  assert.equal(replacement.status,200);
  assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

test('imported investigation nicknames are limited to wallets present in its graph',()=>{
 const root='0x'+'A'.repeat(40),wallet='0x'+'b'.repeat(40),other='0x'+'c'.repeat(40);
 const names={['ethereum:'+root.toLowerCase()]:'Root', ['ethereum:'+wallet]:'Related', ['ethereum:'+other]:'Fake exchange', ['base:'+wallet]:'Other network'};
 const project=importInvestigation(JSON.stringify({network:'ethereum',root,name:'Case',notes:'',nodes:{[wallet]:{id:wallet,address:wallet,x:0,y:0}},transfers:[],names}),'test');
 assert.deepEqual(project.names,{['ethereum:'+root.toLowerCase()]:'Root',['ethereum:'+wallet]:'Related'});
});
