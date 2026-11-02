import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNetworkSeries,networkStatistics} from '../lib/network-statistics.ts';
const now=Date.UTC(2026,10,2),day=Math.floor(Date.now()/86400000)*86400000;
const data=(value,time=1793491200000)=>({details:{timeseries:{daily:{types:['unix','value'],data:[[time,value]]}}}});
test('daily counts retain UTC dates and exclude the unfinished current day',()=>{const d=data(5888445);d.details.timeseries.daily.data.push([now,100]);assert.deepEqual(parseNetworkSeries(d,now),[{date:'2026-11-01',value:5888445}]);});
test('invalid schemas, negative counts, stale data and duplicate days are rejected',()=>{const duplicate=data(1);duplicate.details.timeseries.daily.data.push([1793491200000,2]);for(const d of [{},data(-1),data('100'),data(10,1577836800000),duplicate])assert.throws(()=>parseNetworkSeries(d,now));});
test('daily active addresses are not reported as cumulative address totals',async()=>{const d=await networkStatistics('base',async url=>data(url.includes('/txcount.')?5888445:350000,day-86400000));assert.equal(d.stats.transactions_24h,5888445);assert.equal(d.stats.total_transactions,undefined);assert.equal(d.stats.total_addresses,undefined);assert.equal(d.stats.active_addresses_24h,350000);assert.equal(d.chart.length,1);assert.equal(d.statistics_source,'growthepie');assert.deepEqual(d.warnings,[]);});
test('partial provider failure preserves successful chart and statistics',async()=>{const d=await networkStatistics('polygon',async url=>{if(url.includes('/daa.'))throw Error('source unavailable');return data(3791388,day-86400000)});assert.equal(d.stats.transactions_24h,3791388);assert.equal(d.stats.active_addresses_24h,undefined);assert.equal(d.chart.length,1);assert.equal(d.warnings.length,1);});
