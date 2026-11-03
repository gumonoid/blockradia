import test from 'node:test';
import assert from 'node:assert/strict';
import {largeTransferRules,largeTransfers} from '../lib/large-transfers.ts';
for(const [network,rule] of Object.entries(largeTransferRules)){
 test(network+' uses a strict native-currency threshold without rounding',()=>{
  const threshold=BigInt(rule.minimum.replace('.',''))*10n**BigInt(rule.decimals-(rule.minimum.split('.')[1]?.length||0));
  const rows=[{value:String(threshold-1n)},{value:String(threshold)},{value:String(threshold+1n)},{value:String(threshold*2n)}];
  assert.deepEqual(largeTransfers(network,rows),[rows[3],rows[2]]);
  assert.deepEqual(largeTransfers(network,[{value:String(threshold*2n),token_amount:'999999999999',token_symbol:'USDT'}]),[]);
 });
}
test('unknown amounts are excluded and TON follows its configured threshold',()=>{
 assert.deepEqual(largeTransfers('bitcoin',[{}, {value:'invalid'},{value:-1}]),[]);
 assert.equal(largeTransfers('ton',[{value:'1'},{value:'500000000000'}]).length,0);
 assert.equal(largeTransfers('ton',[{value:'500000000001'}]).length,1);
});
