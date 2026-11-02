import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/explorer/route.ts';
const original=globalThis.fetch;
const json=value=>Response.json(value);
test('paid network restriction distinguishes a connected key from a missing key',async()=>{
 const old=process.env.BLOCKSCOUT_API_KEY;process.env.BLOCKSCOUT_API_KEY='test-key';
 globalThis.fetch=async(url,init)=>String(url).includes('api.blockscout.com')?new Response('{}',{status:402}):json({result:{number:'0x10',timestamp:'0x64',transactions:[]}});
 try{const response=await GET(new Request('http://local/api/explorer?network=polygon&action=overview'));const data=await response.json();assert(data.warnings.some(w=>w.includes('тариф Builder')));assert(!data.warnings.some(w=>w.includes('нужен ключ')));}finally{globalThis.fetch=original;if(old===undefined)delete process.env.BLOCKSCOUT_API_KEY;else process.env.BLOCKSCOUT_API_KEY=old;}
});
test('restricted indexer loads distinct recent blocks and explains API access',async()=>{
 const heights=[];
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('blockscout.com'))return new Response('{}',{status:403});
  const height=JSON.parse(init.body).params[0];heights.push(height);const number=height==='latest'?'0x10':height;
  return json({result:{number,timestamp:'0x64',transactions:[{hash:'hash'+number,from:'0x1',to:'0x2',value:'0x1',input:'0x',blockNumber:number}]}});
 };
 try{const response=await GET(new Request('http://local/api/explorer?network=base&action=overview'));const data=await response.json();assert.equal(response.status,200);assert.deepEqual(heights,['latest','0xf','0xe','0xd']);assert.equal(data.transactions.length,4);assert.equal(data.sample_blocks,4);assert.equal(data.stats.total_transactions,undefined);assert(data.warnings.some(w=>w.includes('ключ Blockscout')));}finally{globalThis.fetch=original;}
});
test('configured API key routes server requests to official API without exposing the key',async()=>{
 const old=process.env.BLOCKSCOUT_API_KEY;process.env.BLOCKSCOUT_API_KEY='private-test-key';const urls=[];
 globalThis.fetch=async url=>{urls.push(new URL(url));return json({hash:'0x'+'a'.repeat(64),status:'ok'})};
 try{const response=await GET(new Request('http://local/api/explorer?network=arbitrum&action=transaction&q=0x'+'a'.repeat(64)));const body=await response.text();assert.equal(response.status,200);assert.equal(urls[0].hostname,'api.blockscout.com');assert(urls[0].pathname.startsWith('/42161/api/v2/'));assert.equal(urls[0].searchParams.get('apikey'),'private-test-key');assert(!body.includes('private-test-key'));}finally{globalThis.fetch=original;if(old===undefined)delete process.env.BLOCKSCOUT_API_KEY;else process.env.BLOCKSCOUT_API_KEY=old;}
});
