import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {_electron as electron} from 'playwright';

const executable = process.argv[2];
assert(executable, 'Pass the unpacked BlockRadia executable path');
const profile = await mkdtemp(join(tmpdir(), 'blockradia-smoke-'));
const socket = createServer();
await new Promise((done, reject) => socket.once('error', reject).listen(0, '127.0.0.1', done));
const {port} = socket.address();
await new Promise(done => socket.close(done));

const wallet = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const peer = '1BitcoinEaterAddressDontSendf59kuE';
const hash = 'a'.repeat(64);
const transfer = {id:hash, hash, from:wallet, to:peer, amount:'1', symbol:'BTC', asset:'BTC', kind:'native'};
const tx = {hash, from:{hash:wallet}, to:{hash:peer}, value:'100000000', status:'ok'};
let app;
try {
  app = await electron.launch({
    executablePath:resolve(executable),
    args:[`--user-data-dir=${profile}`, `--blockradia-port=${port}`],
  });
  await app.context().route('**/api/explorer?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    const address = params.get('q');
    const action = params.get('action');
    const payload = action === 'address' || action === 'balance'
      ? {data:{hash:address, coin_balance:'100000000'}, canonical_address:address, transactions:[tx], transfers:[transfer]}
      : {transactions:[], stats:{}, chart:[]};
    await route.fulfill({json:payload});
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await page.locator('.search-box input').waitFor();
  const search = page.locator('.search-box input');
  await search.fill(wallet);
  await search.press('Enter');
  const graph = page.locator('.graph-panel');
  await graph.locator('.graph-edge').first().waitFor();
  await page.getByRole('button', {name:peer, exact:true}).first().click();
  await graph.locator('.inspector-address').filter({hasText:peer}).waitFor();
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await graph.locator('.inspector-address').filter({hasText:wallet}).waitFor();

  const fullscreen = graph.getByRole('button', {name:'Fullscreen', exact:true});
  await fullscreen.click();
  await page.waitForFunction(() => document.fullscreenElement?.classList.contains('graph-panel'));
  await graph.getByRole('button', {name:'Exit fullscreen', exact:true}).click();
  await page.waitForFunction(() => !document.fullscreenElement);
} finally {
  await app?.close();
  await rm(profile, {recursive:true, force:true, maxRetries:3, retryDelay:200});
}
