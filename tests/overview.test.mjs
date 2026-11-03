import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/explorer/route.ts';
const original=globalThis.fetch,realNow=Date.now;
const json=x=>new Response(JSON.stringify(x));
const request=(network,action='overview',q='')=>GET(new Request('http://local/api/explorer?'+new URLSearchParams({network,action,q})));
const rpcBlock={number:'0x64',timestamp:'0x64',transactions:[{hash:'0xabc',from:'0x1',to:'0x2',value:'0x1',blockNumber:'0x64',input:'0x'}]};
test('indexer transaction failure preserves successful network statistics and charts',async()=>{
 globalThis.fetch=async(url,init)=>{url=String(url);if(url.endsWith('/stats'))return json({total_transactions:'12345',total_addresses:'42'});if(url.endsWith('/stats/charts/transactions'))return json({chart_data:[{date:'2026-11-01',transactions_count:50}]});if(url.endsWith('/transactions'))return new Response('{}',{status:503});assert.equal(JSON.parse(init.body).method,'eth_getBlockByNumber');return json({result:rpcBlock});};
 const r=await request('base'),d=await r.json();assert.equal(r.status,200);assert.equal(d.stats.total_transactions,'12345');assert.equal(d.stats.total_addresses,'42');assert.equal(d.stats.total_blocks,100);assert.equal(d.chart[0].transactions_count,50);assert.equal(d.transactions.length,1);assert(!d.warnings.some(w=>w.includes('без общей статистики')));
});
test('temporary stats failure retains timestamped last-success snapshot, then expires it',async()=>{
 let fail=false;globalThis.fetch=async url=>{url=String(url);if(url.endsWith('/stats'))return fail?new Response('{}',{status:503}):json({total_transactions:'888'});if(url.endsWith('/transactions'))return json({items:[]});return json({chart_data:[]});};
 const first=await (await request('optimism')).json();assert.equal(first.stats.total_transactions,'888');const now=realNow();fail=true;Date.now=()=>now+21000;
 try{const d=await (await request('optimism')).json();assert.equal(d.stats.total_transactions,'888');assert.equal(d.stats_stale,true);assert.equal(d.stats_fetched_at,first.stats_fetched_at);Date.now=()=>now+330000;const expired=await (await request('optimism')).json();assert.equal(expired.stats.total_transactions,undefined);assert(expired.warnings.some(w=>w.includes('статистика источника')));}finally{Date.now=realNow;}
});
test('ERC20 decimals zero is respected for whole-unit tokens',async()=>{
 const q='0x'+'1'.repeat(40);globalThis.fetch=async url=>{url=String(url);if(url.endsWith('/addresses/'+q))return json({hash:q,coin_balance:'0',is_contract:false});if(url.includes('token-transfers'))return json({items:[{transaction_hash:'0xabc',from:{hash:q},to:{hash:'0x'+'2'.repeat(40)},total:{value:'5'},token:{decimals:0,symbol:'WHOLE',address_hash:'0x'+'3'.repeat(40)}}]});return json({items:[]});};
 const d=await (await request('arbitrum','address',q)).json();assert.equal(d.transfers[0].amount,'5');
});
test('network stats survive even when both transaction feed and fallback RPC fail',async()=>{globalThis.fetch=async(url)=>{url=String(url);if(url.endsWith('/stats'))return json({total_transactions:'77'});if(url.includes('/charts/'))return json({chart_data:[]});return new Response('{}',{status:503});};const r=await request('polygon'),d=await r.json();assert.equal(r.status,200);assert.equal(d.stats.total_transactions,'77');assert.deepEqual(d.transactions,[]);assert(d.warnings.some(w=>w.includes('Другие доступные данные сохранены')));});

test('unknown ERC20 precision is not guessed as 18 decimals',async()=>{const q='0x'+'4'.repeat(40);globalThis.fetch=async url=>{url=String(url);if(url.endsWith('/addresses/'+q))return json({hash:q,coin_balance:'0'});if(url.includes('token-transfers'))return json({items:[{transaction_hash:'0xdef',from:{hash:q},to:{hash:'0x'+'5'.repeat(40)},total:{value:'1000000'},token:{decimals:null,symbol:'UNKNOWN'}}]});return json({items:[]});};const d=await (await request('base','address',q)).json();assert.deepEqual(d.transfers,[]);assert(d.warnings.some(w=>w.includes('неизвестной точностью')));});

test('explicit refresh replaces cached transaction feed after the shared minimum interval',async()=>{
 let version=1;const start=realNow()+1000000;Date.now=()=>start;
 globalThis.fetch=async url=>String(url).endsWith('/mempool/recent')?json([]):String(url).endsWith('/blocks')?json([{id:'block',height:version,timestamp:100,tx_count:1}]):json([{txid:'tx'+version,vin:[],vout:[],status:{confirmed:true,block_time:100+version}}]);
 try{const first=await (await request('bitcoin')).json();assert.equal(first.transactions[0].hash,'tx1');version=2;Date.now=()=>start+6000;const cached=await (await request('bitcoin')).json();assert.equal(cached.transactions[0].hash,'tx1');const fresh=await (await GET(new Request('http://local/api/explorer?network=bitcoin&refresh=1'))).json();assert.equal(fresh.transactions[0].hash,'tx2');}finally{Date.now=realNow;}
});
test('Bitcoin pending rows include real sender and recipient without invented confirmation time',async()=>{
 Date.now=()=>realNow()+2000000;
 const pending={txid:'pending',vin:[{prevout:{scriptpubkey_address:'sender'}}],vout:[{scriptpubkey_address:'recipient',value:123}],status:{confirmed:false}};
 globalThis.fetch=async url=>{const path=new URL(url).pathname;if(path.endsWith('/blocks'))return json([{id:'block',height:1,timestamp:100,tx_count:0}]);if(path.endsWith('/mempool/recent'))return json([{txid:'pending',value:123}]);if(path.endsWith('/tx/pending'))return json(pending);return json([]);};
 try{const d=await (await GET(new Request('http://local/api/explorer?network=bitcoin&refresh=1'))).json();const row=d.transactions[0];assert.equal(row.from.hash,'sender');assert.equal(row.to.hash,'recipient');assert.equal(row.status,'pending');assert.equal(row.timestamp,undefined);assert.equal(row.block_number,undefined);}finally{Date.now=realNow;}
});
test.after(()=>{globalThis.fetch=original;Date.now=realNow});
