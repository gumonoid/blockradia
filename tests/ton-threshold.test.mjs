import test from 'node:test';
import assert from 'node:assert/strict';
import {localExplorer} from '../app/api/explorer/route.ts';
import {largeTransfers} from '../lib/large-transfers.ts';
test('TON external wallet sends expose the largest real message amount and counterparty',async()=>{
 const original=globalThis.fetch,from='0:'+'1'.repeat(64),to='0:'+'2'.repeat(64),hash='a'.repeat(64);
 globalThis.fetch=async()=>Response.json({transactions:[{hash,account:from,now:1793730000,description:{aborted:false},in_msg:{destination:from,value:'0'},out_msgs:[{hash:'out-small',source:from,destination:to,value:'10000000000'},{hash:'out-large',source:from,destination:to,value:'600000000000'}]}]});
 try{const response=await localExplorer(new Request('http://local/api/explorer?network=ton&action=transaction&q='+hash));const data=await response.json();assert.equal(response.status,200);assert.equal(data.transactions[0].value,'600000000000');assert.equal(data.transactions[0].from.hash,from);assert.equal(data.transactions[0].to.hash,to);assert.equal(largeTransfers('ton',data.transactions).length,1);assert.equal(largeTransfers('ton',[{value:'500000000000'}]).length,0);}finally{globalThis.fetch=original;}
});
