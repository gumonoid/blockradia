import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET_PERIODS,priceChange,balanceInUSD} from '../lib/market-data.ts';
import {makeCandles} from '../lib/chart-series.ts';
import {localExplorer} from '../app/api/explorer/route.ts';
test('all price periods stay within the provider limit and have suitable candle intervals',()=>{
 assert.equal(Object.keys(MARKET_PERIODS).length,8);
 for(const range of Object.values(MARKET_PERIODS)){assert(Math.floor(range.seconds/range.stepSeconds)+1<=500);assert(range.candleMs>=range.stepSeconds*1000);assert(range.seconds*1000>=range.candleMs);}
});
test('percentage shows gains and losses against the first valid chronological quote',()=>{
 const rows=[{date:'2026-11-03T01:00:00Z',value:200},{date:'2026-11-03T00:00:00Z',value:100}];assert.equal(priceChange(rows,125),25);assert.equal(priceChange(rows,75),-25);assert.equal(priceChange(rows,100),0);assert.equal(priceChange([],100),null);assert.equal(priceChange([{date:'2026-11-03',value:0}],100),null);assert.equal(priceChange(rows,false),null);
});
test('native balance conversion respects chain decimals, zero and unavailable quotes',()=>{
 assert.equal(balanceInUSD('150000000',8,80000),120000);
 assert.equal(balanceInUSD('2000000000000000000',18,3000),6000);
 assert.equal(balanceInUSD('1234567',6,0.3),0.3703701);
 assert.equal(balanceInUSD('0',9,100),0);
 for(const raw of [null,undefined,'bad',-1])assert.equal(balanceInUSD(raw,9,100),null);
 for(const quote of [null,undefined,'',false,NaN,Infinity,-1])assert.equal(balanceInUSD('1000000000',9,quote),null);
});
test('short-range price candles use the selected interval rather than daily buckets',()=>{
 const points=[{date:'2026-11-03T00:00:00Z',value:100},{date:'2026-11-03T00:04:00Z',value:110},{date:'2026-11-03T00:05:00Z',value:105}];const candles=makeCandles(points,true,MARKET_PERIODS['1Ч'].candleMs);assert.equal(candles.length,2);assert.equal(candles[0].open,100);assert.equal(candles[0].close,110);
});
test('market requests use independent period caches and reject unapproved periods',async()=>{
 const original=globalThis.fetch,requests=[];globalThis.fetch=async input=>{const url=new URL(String(input));requests.push(url);return Response.json({coins:{'coingecko:bitcoin':url.pathname.includes('/current/')?{price:100,timestamp:1793730000}:{prices:[{price:90,timestamp:1793726400},{price:100,timestamp:1793730000}]}}});};
 const request=period=>localExplorer(new Request('http://local/api/explorer?network=bitcoin&action=market&period='+encodeURIComponent(period)));
 try{const one=await(await request('1Ч')).json();const year=await(await request('1Г')).json();assert.equal(one.period,'1Ч');assert.equal(year.period,'1Г');const charts=requests.filter(u=>u.pathname.includes('/chart/'));assert.equal(charts.length,2);assert.equal(charts[0].searchParams.get('period'),'1m');assert.equal(charts[1].searchParams.get('period'),'1d');assert.equal((await request('bad')).status,400);assert.equal(requests.length,4);}finally{globalThis.fetch=original;}
});
