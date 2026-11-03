import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCandles} from '../lib/chart-series.ts';
import {transactionSample,TRANSACTIONS_PER_PAGE} from '../lib/transaction-sample.ts';
import {largeTransfers} from '../lib/large-transfers.ts';
test('daily candles use chronological real samples for OHLC and keep UTC days separate',()=>{
 const rows=[{date:'2026-11-02T06:00:00Z',value:8},{date:'2026-11-02T00:00:00Z',value:10},{date:'2026-11-02T02:00:00Z',value:15},{date:'2026-11-03T00:00:00Z',value:20},{date:'invalid',value:100},{date:'2026-11-02',value:NaN}];
 const candles=makeCandles(rows,true);assert.equal(candles.length,2);assert.deepEqual(candles[0],{date:'2026-11-02T00:00:00.000Z',open:10,high:15,low:8,close:8,count:3});assert.equal(candles[1].open,candles[1].close);
});
test('sample is limited to 100 unique latest transactions, paged by ten, then large transfers are selected',()=>{
 const rows=Array.from({length:120},(_,i)=>({hash:String(i),timestamp:new Date(1793630000000-i*1000).toISOString(),value:i===110?'999999999999':'20000000'}));
 const sample=transactionSample([...rows,rows[0]]);assert.equal(sample.length,100);assert.equal(sample[0].hash,'0');assert.equal(sample.at(-1).hash,'99');assert.equal(TRANSACTIONS_PER_PAGE,10);assert.equal(sample.slice(90,100).length,10);assert.equal(largeTransfers('bitcoin',sample).length,100);assert(!largeTransfers('bitcoin',sample).some(tx=>tx.hash==='110'));
});
test('activity candles preserve actual extrema and empty or malformed input produces no candles',()=>{assert.deepEqual(makeCandles([],false),[]);assert.deepEqual(makeCandles([{date:'bad',value:1}],false),[]);const c=makeCandles([{date:'2026-11-02T00:00:00Z',value:1},{date:'2026-11-02T00:00:01Z',value:9}],false);assert.equal(c[0].high,9);assert.equal(c[0].low,1);});
