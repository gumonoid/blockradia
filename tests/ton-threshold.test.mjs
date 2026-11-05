import test from 'node:test';
import assert from 'node:assert/strict';
import {localExplorer} from '../app/api/explorer/route.ts';
import {largeTransfers} from '../lib/large-transfers.ts';
test('TON external wallet sends expose the largest real message amount and counterparty',async()=>{
 const original=globalThis.fetch,from='0:'+'1'.repeat(64),to='0:'+'2'.repeat(64),hash='a'.repeat(64);
 globalThis.fetch=async()=>Response.json({transactions:[{hash,account:from,now:1793730000,description:{aborted:false},in_msg:{destination:from,value:'0'},out_msgs:[{hash:'out-small',source:from,destination:to,value:'10000000000'},{hash:'out-large',source:from,destination:to,value:'600000000000'}]}]});
 try{const response=await localExplorer(new Request('http://local/api/explorer?network=ton&action=transaction&q='+hash));const data=await response.json();assert.equal(response.status,200);assert.equal(data.transactions[0].value,'600000000000');assert.equal(data.transactions[0].from.hash,from);assert.equal(data.transactions[0].to.hash,to);assert.equal(largeTransfers('ton',data.transactions).length,1);assert.equal(largeTransfers('ton',[{value:'500000000000'}]).length,0);}finally{globalThis.fetch=original;}
});
test('TON wallet history includes indexed Jettons without guessing decimals',async()=>{
 const original=globalThis.fetch;
 const from='0:'+'3'.repeat(64),to='0:'+'4'.repeat(64),master='0:'+'5'.repeat(64);
 globalThis.fetch=async input=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/accountStates'))return Response.json({accounts:[{balance:'1'}]});
  if(url.pathname.endsWith('/transactions'))return Response.json({transactions:[]});
  assert.equal(url.pathname,'/api/v3/jetton/transfers');
  assert.equal(url.searchParams.get('owner_address'),from);
  const row={source:from,destination:to,jetton_master:master,amount:'1250000',transaction_aborted:false,transaction_now:1793730000};
  return Response.json({metadata:{[master]:{token_info:[{type:'jetton_masters',symbol:'USDT',extra:{decimals:'6'}}]}},jetton_transfers:[
   {...row,transaction_hash:'a'.repeat(64)},
   {...row,transaction_hash:'b'.repeat(64),transaction_aborted:true},
   {...row,transaction_hash:'c'.repeat(64),jetton_master:'0:'+'6'.repeat(64)}
  ]});
 };
 try{
  const response=await localExplorer(new Request('http://local/api/explorer?network=ton&action=address&q='+from));
  const data=await response.json();
  assert.equal(response.status,200);
  assert.deepEqual(data.transfers.map(({amount,symbol,from,to,kind})=>({amount,symbol,from,to,kind})),[{amount:'1.250000',symbol:'USDT',from,to,kind:'token'}]);
  assert.equal(data.transactions[0].token_amount,'1.250000');
  assert.equal(data.partial_history,true);
 }finally{globalThis.fetch=original;}
});
