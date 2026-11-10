import test from 'node:test';import assert from 'node:assert/strict';
import {additionalSignals,amlStatus} from '../lib/aml-status.ts';
const clean={fresh:true,status:'no_match',matches:[]};
test('fresh direct sanctions match is red',()=>assert.equal(amlStatus({...clean,matches:[{scope:'network_match'}]},[],0,false).color,'red'));
test('counterparty and community reports are yellow, not inherited guilt',()=>{assert.equal(amlStatus(clean,[{...clean,matches:[{scope:'network_match'}]}],0,false).color,'yellow');assert.equal(amlStatus(clean,[],1,false).color,'yellow')});
test('stale or incomplete checks cannot be green',()=>{assert.equal(amlStatus({...clean,fresh:false},[],0,false).color,'yellow');assert.equal(amlStatus(clean,[],0,true).color,'yellow')});
test('green only describes the checked sample',()=>assert.deepEqual(amlStatus(clean,[],0,false),{color:'green',reason:'no_signals_in_checked_sample'}));
test('community address is matched exactly and scoped',()=>{const a='0x09750ad360fdb7a2ee23669c4503c974d86d8694';assert.ok(additionalSignals('ethereum',a).length);assert.equal(additionalSignals('bitcoin',a).length,0);assert.equal(additionalSignals('base',a)[0].scope,'network_unconfirmed')});
