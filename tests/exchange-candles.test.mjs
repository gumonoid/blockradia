import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeMarket,parseExchangeCandles} from '../lib/exchange-candles.ts';
import {localExplorer} from '../app/api/explorer/route.ts';
const now=Date.UTC(2026,10,3,12,0,30);
const rows=(minutes,count,clock=now)=>Array.from({length:count},(_,i)=>[Math.floor(clock/(minutes*60000))*minutes*60-(count-1-i)*minutes*60,'100','120','80','110','105','1.5',3]);

for(const network of ['bitcoin','ethereum','solana','tron','ton','base','arbitrum','polygon','optimism'])for(const [period,interval,wanted] of [['24Ч',60,24],['7Д',240,42],['14Д',240,84],['30Д',1440,30],['90Д',1440,90],['1Г',1440,365]])test(network+' '+period+' loads actual Kraken OHLC across the selected period',async()=>{
 const result=await exchangeMarket(network,period,async url=>{const u=new URL(url);assert.equal(Number(u.searchParams.get('interval')),interval);assert(wanted<=720);return {error:[],result:{[u.searchParams.get('pair')]:rows(interval,wanted,Date.now())}};});
 assert.equal(result.ohlc.length,wanted);assert.equal(result.chart.length,wanted);assert.equal(result.candle_interval_ms,interval*60000);assert.equal(result.candle_kind,'exchange');assert.equal(result.source_name,'Kraken');assert.equal(Date.parse(result.ohlc.at(-1).date)-Date.parse(result.ohlc[0].date),(wanted-1)*interval*60000);
});
test('minute and five-minute candles retain exchange OHLC, trades and current-candle status',()=>{
 for(const [minutes,count] of [[1,60],[5,48]]){const candles=parseExchangeCandles(rows(minutes,count),minutes,count,now);assert.equal(candles.length,count);assert.equal(candles[0].open,100);assert.equal(candles[0].high,120);assert.equal(candles[0].low,80);assert.equal(candles[0].close,110);assert.equal(candles[0].count,3);assert.equal(candles[0].basis,'trades');assert.equal(candles[0].complete,true);assert.equal(candles.at(-1).complete,false);for(let i=1;i<count;i++)assert.equal(Date.parse(candles[i].date)-Date.parse(candles[i-1].date),minutes*60000);}
});
test('invalid, out-of-window and future rows are rejected rather than padded with invented candles',()=>{
 const valid=rows(1,60);const bad=[...valid.at(-1)];bad[2]='50';const future=[...valid.at(-1)];future[0]+=60;
 const candles=parseExchangeCandles([...valid,bad,future],1,60,now);assert.equal(candles.length,60);assert.equal(candles.at(-1).high,120);assert.throws(()=>parseExchangeCandles([valid[0]],1,60,now),/Insufficient/);assert.throws(()=>parseExchangeCandles(valid,0,60,now),/Invalid/);
});
for(const network of ['bitcoin','ethereum','solana','tron','ton','base','arbitrum','polygon','optimism'])for(const period of ['1Ч','4Ч'])test(network+' '+period+' uses a real USD pair and the correct bar interval',async()=>{
 let requested;const result=await exchangeMarket(network,period,async url=>{requested=new URL(url);const minutes=Number(requested.searchParams.get('interval')),count=period==='1Ч'?60:48,pair=requested.searchParams.get('pair');return {error:[],result:{[pair]:rows(minutes,count,Date.now()),last:123}};});
 assert.equal(result.ohlc.length,period==='1Ч'?60:48);assert.equal(result.candle_interval_ms,period==='1Ч'?60000:300000);assert.equal(result.source_name,'Kraken');assert.equal(result.quote_currency,'USD');assert.equal(result.price,110);assert(Math.abs(result.change_percent-10)<1e-10);assert(requested.searchParams.get('pair').endsWith('USD'));
});
test('empty Kraken error arrays are accepted by the real API wrapper',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>{const pair=new URL(url).searchParams.get('pair');return Response.json({error:[],result:{[pair]:rows(1,60,Date.now())}});};
 try{const response=await localExplorer(new Request('http://local/api/explorer?network=ethereum&action=market&period='+encodeURIComponent('1Ч')));const data=await response.json();assert.equal(response.status,200);assert.equal(data.source_name,'Kraken');assert.equal(data.ohlc.length,60);}finally{globalThis.fetch=original;}
});
for(const [period,wanted,interval] of [['24Ч',24,60],['7Д',42,240],['14Д',84,240]])test('TON '+period+' has a populated USD history using exchange candles',async()=>{
 const result=await exchangeMarket('ton',period,async url=>{const u=new URL(url);assert.equal(u.searchParams.get('pair'),'TONUSD');assert.equal(u.searchParams.get('interval'),String(interval));return {error:[],result:{TONUSD:rows(interval,wanted,Date.now())}};});
 assert.equal(result.chart.length,wanted);assert.equal(result.ohlc.length,wanted);assert.equal(result.candle_interval_ms,interval*60000);assert.equal(result.source_name,'Kraken');
});
test('exchange failure keeps the price and line data, with no artificial short-range candles',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>{if(String(url).includes('kraken.com'))return new Response('{}',{status:503});return Response.json({coins:{'coingecko:solana':String(url).includes('/current/')?{price:100,timestamp:now/1000}:{prices:[{price:90,timestamp:now/1000-3600},{price:100,timestamp:now/1000}]}}});};
 try{const response=await localExplorer(new Request('http://local/api/explorer?network=solana&action=market&period='+encodeURIComponent('4Ч')));const data=await response.json();assert.equal(response.status,200);assert.equal(data.source_name,'DefiLlama');assert.equal(data.price,100);assert.equal(data.ohlc,undefined);assert.match(data.warning,/Показана линия/);}finally{globalThis.fetch=original;}
});
