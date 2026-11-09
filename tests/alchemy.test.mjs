import test from 'node:test';
import assert from 'node:assert/strict';
import {alchemyAddress} from '../lib/alchemy.ts';
const q='0x'+'1'.repeat(40),peer='0x'+'2'.repeat(40);
const item=(id,value='0x5',decimal='0x0')=>({uniqueId:id,hash:'0xhash',from:q,to:peer,blockNum:'0x20',category:'erc20',asset:'TEST',rawContract:{value,decimal,address:'0xtoken'},metadata:{blockTimestamp:'2026-11-02T12:00:00Z'}});
const reader=history=>async(url,body)=>({result:body.method==='eth_getBalance'?'0x10':body.method==='eth_getCode'?'0x':await history(body.params[0])});
test('Alchemy merges self transfers once, preserves token precision and dates, and hides credentials',async()=>{
 const raw='0x20000000000001';const calls=[];const read=reader(async params=>{calls.push(params);return {transfers:[item('same',raw,'0x12')],pageKey:'more'}});
 const d=await alchemyAddress('base',q,'secret',read);assert.equal(d.transfers.length,1);assert.equal(d.transfers[0].amount,'0.009007199254740993');assert.equal(d.transfers[0].timestamp,'2026-11-02T12:00:00.000Z');assert.equal(d.data.coin_balance,'16');assert.equal(d.data.is_contract,false);assert(calls.some(p=>p.fromAddress===q));assert(calls.some(p=>p.toAddress===q));assert(!JSON.stringify(d).includes('secret'));assert.equal(d.transactions.length,1);
});
test('Alchemy zero token decimals are respected and unknown precision is skipped',async()=>{
 const d=await alchemyAddress('polygon',q,'secret',reader(async()=>({transfers:[item('whole'),item('unknown','0x10',null)]})));assert.equal(d.transfers[0].amount,'5');assert.equal(d.transfers.length,1);assert(d.warnings.some(w=>w.includes('точностью')));
});
test('one failed direction retains real transfers and marks history incomplete',async()=>{
 const d=await alchemyAddress('base',q,'secret',reader(async p=>{if(p.toAddress)throw Error('rate limit');return {transfers:[item('out')]}}));assert.equal(d.transfers.length,1);assert.equal(d.partial_history,true);assert.equal(d.history_error,undefined);
});
test('both failed directions are not presented as an empty successful history',async()=>{
 const d=await alchemyAddress('base',q,'secret',reader(async()=>{throw Error('unavailable')}));assert.equal(d.partial_history,true);assert(d.history_error);assert.equal(d.data.coin_balance,'16');
});
test('Arbitrum fallback asks Alchemy only for transfer types it supports',async()=>{
 const data=await alchemyAddress('arbitrum',q,'secret',async(url,body)=>{
  assert.equal(new URL(url).hostname,'arb-mainnet.g.alchemy.com');
  if(body.method==='alchemy_getAssetTransfers')assert.deepEqual(body.params[0].category,['external','erc20']);
  return reader(async()=>({transfers:[item('external')]}))(url,body);
 });
 assert.equal(data.transactions.length,1);
 assert.match(data.coverage,/Internal transfers are unavailable/);
});
