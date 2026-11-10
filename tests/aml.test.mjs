import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAML} from '../lib/aml.ts';
const root='0x1111111111111111111111111111111111111111';
const exchange='0x28c6c06298d514db089934071355e5743bf21d60';
const transfer={id:'1',hash:'tx',from:exchange,to:root,amount:'1',asset:'native',symbol:'ETH'};
test('AML counts direct transfers once without inheriting counterparty identity',()=>{
 const r=analyzeAML('ethereum',root,[transfer,transfer,{...transfer,id:'2',from:'other',to:'unrelated'}]);
 assert.equal(r.transferCount,1);assert.equal(r.counterparties.length,1);
 assert.equal(r.counterparties[0].exchange.name,'Binance');assert.equal(r.attribution,undefined);
 assert.equal(r.counterparties[0].incoming,1);assert.equal(r.riskScore,null);
});
test('AML no data is not a clean sanctions result',()=>{
 const r=analyzeAML('ethereum',root);assert.ok(r.sanctions);assert.notEqual(r.sanctions.status,'safe');assert.equal(r.riskScore,null);
});
test('AML does not propagate exchange labels between chains',()=>{
 assert.equal(analyzeAML('solana',root,[transfer]).counterparties[0].exchange,undefined);
});
test('AML normalizes EVM casing and excludes self transfers from counterparties',()=>{
 const r=analyzeAML('ethereum',exchange.toUpperCase(),[{...transfer,from:root,to:exchange},{...transfer,id:'2',from:exchange,to:exchange}]);
 assert.equal(r.transferCount,2);assert.equal(r.counterparties.length,1);assert.equal(r.counterparties[0].incoming,1);
});
