import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {coverage,compareWallets,researchSnapshot,changesSince,matchesAlert} from '../lib/research.ts';
import {parseOFAC,portfolio} from '../server/research.mjs';
test('comparison reports only observed direct and common counterparties',()=>{
 const a={transfers:[{id:'1',from:'A',to:'B'},{id:'2',from:'A',to:'C'}],transactions:[]};
 const b={transfers:[{id:'1',from:'A',to:'B'},{id:'3',from:'B',to:'C'}],transactions:[],partial_history:true};
 const r=compareWallets('solana','A','B',a,b);assert.equal(r.direct.length,1);assert.deepEqual(r.common,['C']);assert(r.coverage[1].partial);
});
test('change tracking establishes a baseline and detects new hashes without claiming completeness',()=>{
 const first=researchSnapshot({transactions:[{hash:'old'}]},{sanctions:{matches:[]}});
 const second=researchSnapshot({transactions:[{hash:'new'},{hash:'old'}]},{sanctions:{matches:[]}});
 assert(changesSince(null,first).baseline);assert.deepEqual(changesSince(first,second).newHashes,['new']);
 assert.equal(coverage({history_error:'unavailable'}).partial,true);
});
test('token alert rules use exact decimal comparisons and direction',()=>{
 const rule={network:'solana',asset:'USDT',minimum:'100.000000000000000001',direction:'in'};
 const t={to:'wallet',from:'peer',symbol:'USDT',amount:'100.000000000000000000'};
 assert.equal(matchesAlert(rule,'wallet',t),false);assert(matchesAlert(rule,'wallet',{...t,amount:'100.000000000000000001'}));
 assert.equal(matchesAlert(rule,'Wallet',{...t,amount:'101'}),false);
});
test('official XML parser extracts address identifiers and rejects entity declarations',()=>{
 const xml='<sdnList><publshInformation><Publish_Date>11/12/2026</Publish_Date></publshInformation><sdnEntry><uid>1</uid><lastName>Test</lastName><idList><id><idType>Digital Currency Address - ETH</idType><idNumber>0x123</idNumber></id></idList></sdnEntry></sdnList>';
 assert.equal(parseOFAC(Buffer.from(xml)).records[0].uid,'1');
 assert.throws(()=>parseOFAC(Buffer.from('<!DOCTYPE x [<!ENTITY a SYSTEM "file:///secret">]>'+xml)));
 assert.throws(()=>parseOFAC(Buffer.from('<sdnList/>')));
 assert.throws(()=>parseOFAC(Buffer.from(xml.replace('</idList>',''))));
});

test('large sanctions exports fit a 128 MB heap without building the entire SDN tree',()=>{
 const moduleURL=new URL('../server/research.mjs',import.meta.url).href;
 const script=`import {parseOFAC} from ${JSON.stringify(moduleURL)};
 const ordinary='<sdnEntry><uid>2</uid><lastName>Other entity</lastName><remarks>'+ 'x'.repeat(1000)+'</remarks></sdnEntry>';
 const digital='<sdnEntry><uid>1</uid><lastName>Test</lastName><idList><id><idType>Digital Currency Address - ETH</idType><idNumber>0x123</idNumber></id></idList></sdnEntry>';
 const data=parseOFAC(Buffer.from('<sdnList>'+ordinary.repeat(25000)+digital+'</sdnList>'));
 if(data.records.length!==1||data.records[0].uid!=='1')throw Error('Missing sanctions record');`;
 execFileSync(process.execPath,['--max-old-space-size=128','--experimental-strip-types','--input-type=module','--eval',script],{timeout:20000,stdio:'pipe'});
});

test('portfolio keeps exact token quantities and explicitly counts unpriced assets',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json([{value:'9007199254740993',token:{address_hash:'0xcontract',symbol:'TOKEN',decimals:18,exchange_rate:null}}]);
 try{
  const response=await portfolio('ethereum','0xwallet',async(n,action)=>action==='balance'?{data:{coin_balance:'1000000000000000000'}}:{price:2000});
  const data=await response.json();
  assert.equal(data.assets[1].balance,'0.009007199254740993');
  assert.equal(data.assets[1].usd,null);assert.equal(data.knownUSD,2000);assert.equal(data.unpriced,1);
 }finally{globalThis.fetch=original;}
});
