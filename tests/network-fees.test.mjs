import test from 'node:test';
import assert from 'node:assert/strict';
import {networkFees} from '../lib/network-fees.ts';
import {localExplorer} from '../app/api/explorer/route.ts';
for(const network of ['ethereum','base','arbitrum','polygon','optimism'])test(network+' reports mean observed gas price in Gwei',async()=>{
 const d=await networkFees(network,async()=>({result:{number:'0x10',transactions:[{gasPrice:'0x3b9aca00'},{gasPrice:'0xb2d05e00'},{}]}}));
 assert.equal(d.metrics[0].value,2);assert.equal(d.metrics[0].unit,'Gwei');assert.equal(d.sample_count,2);assert.equal(d.block_number,16);assert(Number.isFinite(Date.parse(d.updated_at)));
});
test('zero gas remains visible and empty blocks use a labelled RPC estimate',async()=>{
 const d=await networkFees('base',async(_,body)=>({result:body.method==='eth_getBlockByNumber'?{transactions:[]}:'0x0'}));assert.equal(d.metrics[0].value,0);assert.equal(d.metrics[0].label,'Цена газа (оценка)');
});
test('Bitcoin fee rate uses provider estimate and falls back without fabricated data',async()=>{
 const d=await networkFees('bitcoin',async url=>{if(url.includes('mempool.space'))throw Error('unavailable');return {'3':1.25};});assert.equal(d.metrics[0].value,1.25);assert.equal(d.metrics[0].unit,'sat/vB');assert(d.source.includes('blockstream.info'));
 await assert.rejects(()=>networkFees('bitcoin',async()=>({halfHourFee:false,'3':null})),/unavailable/);
});
test('TRON reads both live resource tariffs without hardcoded rates',async()=>{
 const d=await networkFees('tron',async()=>({chainParameter:[{key:'getEnergyFee',value:123},{key:'getTransactionFee',value:4567}]}));assert.deepEqual(d.metrics.map(m=>[m.value,m.unit]),[[123,'SUN/Energy'],[4567,'SUN/byte']]);
});
test('TON nanoton fees become mean TON and missing fees are not zero',async()=>{
 const d=await networkFees('ton',async()=>({transactions:[{total_fees:'1000000'},{total_fees:'3000000'},{}]}));assert.equal(d.metrics[0].value,0.002);assert.equal(d.sample_count,2);await assert.rejects(()=>networkFees('ton',async()=>({transactions:[{}]})),/No fee observations/);
});
test('Solana mean uses lamports and excludes vote transactions',async()=>{
 const d=await networkFees('solana',async(_,body)=>({result:body.method==='getSlot'?123:{transactions:[{meta:{fee:5000}},{meta:{fee:15000}},{meta:{fee:1000000},transaction:{message:{instructions:[{program:'vote'}]}}}]}}));assert.equal(d.metrics[0].value,0.00001);assert.equal(d.metrics[0].unit,'SOL');assert.equal(d.sample_count,2);
});
test('fee refresh bypasses previous quote and does not require a wallet',async()=>{
 const original=globalThis.fetch;let version=1,calls=0;globalThis.fetch=async()=>{calls++;return Response.json({result:{number:'0x10',transactions:[{gasPrice:'0x'+(BigInt(version)*1000000000n).toString(16)}]}});};
 const request=(fresh=false)=>localExplorer(new Request('http://local/api/explorer?network=ethereum&action=fees'+(fresh?'&refresh=1':'')));
 try{assert.equal((await(await request()).json()).metrics[0].value,1);version=2;assert.equal((await(await request()).json()).metrics[0].value,1);assert.equal(calls,1);assert.equal((await(await request(true)).json()).metrics[0].value,2);assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
