import test from 'node:test';import assert from 'node:assert/strict';
import {bitcoinDateHistory,localExplorer} from '../app/api/explorer/route.ts';
const time=1700000000;
const tx=(id,height)=>({txid:id,vin:[{prevout:{scriptpubkey_address:'sender'}}],vout:[{scriptpubkey_address:'receiver',value:12345}],status:{confirmed:true,block_time:time+height*600,block_height:height}});
test('archival overview locates old blocks by time and returns at most 100 transactions with real block numbers',async()=>{
 const calls=[];const data=await bitcoinDateHistory((time+40*600)*1000,(time+45*600)*1000,'',async url=>{const path=new URL(url).pathname.replace('/api','');calls.push(path);if(path==='/blocks/tip/height')return 100;const m=path.match(/^\/blocks\/(\d+)$/);if(m){const h=Number(m[1]);return Array.from({length:Math.min(10,h+1)},(_,i)=>({height:h-i,id:'block'+(h-i),timestamp:time+(h-i)*600,tx_count:150}))}const p=path.match(/^\/block\/block(\d+)\/txs(?:\/(\d+))?$/);if(p)return Array.from({length:25},(_,i)=>tx('hash'+p[1]+'-'+(Number(p[2]||0)+i),Number(p[1])));throw Error(path);});
 assert.equal(data.transactions.length,100);assert(data.transactions.every(row=>row.block_number===45&&row.status==='ok'));assert(calls.includes('/blocks/50'));assert.equal(data.partial_history,false);
});
test('wallet archive paginates past recent transactions and excludes dates outside the range',async()=>{
 const paths=[];const data=await bitcoinDateHistory((time+40*600)*1000,(time+45*600)*1000,'wallet',async url=>{paths.push(url);if(url.endsWith('/chain'))return [tx('new',90)];if(url.endsWith('/new'))return [tx('in',42),tx('old',30)];throw Error(url)});assert.deepEqual(data.transactions.map(row=>row.hash),['in']);assert.equal(paths.length,2);
});
test('invalid history dates are rejected before providers are called',async()=>{let called=false;await assert.rejects(bitcoinDateHistory(20,10,'',async()=>{called=true}),/Invalid/);assert.equal(called,false);const r=await localExplorer(new Request('http://local/api/explorer?network=bitcoin&action=history&start=abc&end=10'));assert.equal(r.status,400)});
