import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNetworkCSV,networkStatistics} from '../lib/network-statistics.ts';
const now=Date.UTC(2026,10,2),header='"Date(UTC)","UnixTimeStamp","Value"\r\n';
const csv=value=>header+'"11/1/2026","1793491200","'+value+'"\r\n';
test('official CSV produces exact daily counts with UTC dates',()=>{assert.deepEqual(parseNetworkCSV(csv(5888445),now),[{date:'2026-11-01',value:5888445}]);});
test('HTML challenges, malformed rows, stale data and duplicate days are rejected',()=>{for(const text of ['<html>challenge</html>',header, csv('1,000'),csv('-1'),csv(1)+'"11/1/2026","1793491200","2"',header+'"1/1/2020","1577836800","99"'])assert.throws(()=>parseNetworkCSV(text,now));});
test('overview distinguishes daily transactions from cumulative addresses and includes provenance',async()=>{const d=await networkStatistics('base',async url=>parseNetworkCSV(csv(url.includes('/tx?')?5888445:722501378),now));assert.equal(d.stats.transactions_24h,5888445);assert.equal(d.stats.total_transactions,undefined);assert.equal(d.stats.total_addresses,722501378);assert.equal(d.chart[0].transactions_count,5888445);assert.equal(d.stats_date,'2026-11-01');assert.equal(d.statistics_source,'BaseScan');assert.deepEqual(d.warnings,[]);});
test('one missing statistic does not discard the other statistic or daily chart',async()=>{const d=await networkStatistics('polygon',async url=>{if(url.includes('/address?'))throw Error('source unavailable');return parseNetworkCSV(csv(3791388),now)});assert.equal(d.stats.transactions_24h,3791388);assert.equal(d.stats.total_addresses,undefined);assert.equal(d.chart.length,1);assert.equal(d.warnings.length,1);});
