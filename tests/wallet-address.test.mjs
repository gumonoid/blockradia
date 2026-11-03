import test from 'node:test';
import assert from 'node:assert/strict';
import {displayWalletAddress,shortWalletAddress} from '../lib/wallet-address.ts';
import {exchangeAddresses,getExchangeLabel} from '../lib/exchanges.ts';

test('raw TON addresses match the published TEP-2 wallet example',()=>{
  const raw='0:ca6e321c7cce9ecedf0a8ca2492ec8592494aa5fb5ce0387dff96ef6af982a3e';
  assert.equal(displayWalletAddress('ton',raw),'UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwA');
  assert.equal(displayWalletAddress('ton','0:'+'0'.repeat(64)),'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ');
});

test('TON display addresses preserve workchain and all account bytes',()=>{
  for(const workchain of ['0','-1']){
    const hex='ABCDEF0123456789'.repeat(4),address=displayWalletAddress('ton',workchain+':'+hex);
    assert.match(address,/^[A-Za-z0-9_-]{48}$/);
    const bytes=Buffer.from(address,'base64url');
    assert.equal(bytes[0],0x51);
    assert.equal(bytes.readInt8(1),Number(workchain));
    assert.equal(bytes.subarray(2,34).toString('hex'),hex.toLowerCase());
  }
});

test('formatting leaves existing friendly, other-chain and invalid addresses unchanged',()=>{
  for(const address of ['EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c','invalid','0:1234','1:'+'a'.repeat(64),''])assert.equal(displayWalletAddress('ton',address),address);
  for(const network of ['bitcoin','ethereum','solana','tron'])assert.equal(displayWalletAddress(network,'0:'+'a'.repeat(64)),'0:'+'a'.repeat(64));
  assert.equal(shortWalletAddress('short'),'short');
  assert.equal(shortWalletAddress('UQ'+'a'.repeat(38)+'12345678'),'UQaaaaaaaa…12345678');
});

test('friendly TON display retains exact exchange attribution and checksum validation',()=>{
  const row=exchangeAddresses.find(row=>row.network==='ton'&&row.address.startsWith('0:'));
  const friendly=displayWalletAddress('ton',row.address);
  assert.equal(getExchangeLabel('ton',friendly)?.name,getExchangeLabel('ton',row.address)?.name);
  const corrupted=Buffer.from(friendly,'base64url');corrupted[35]^=1;
  assert.equal(getExchangeLabel('ton',corrupted.toString('base64url')),undefined);
});
