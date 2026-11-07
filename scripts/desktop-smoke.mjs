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
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => console.error('Renderer:',error.message));
  await page.locator('.search-box input').waitFor();
  const search = page.locator('.search-box input');
  await search.fill(wallet);
  const addressResult = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/explorer' && url.searchParams.get('action') === 'address'
      && url.searchParams.get('q') === wallet;
  });
  const graph = page.locator('.graph-panel');
  try {
    await page.locator('.search-submit').click();
    assert.equal((await addressResult).status(), 200);
    await graph.locator('.graph-edge').first().waitFor({state:'attached'});
  } catch (error) {
    console.error((await page.locator('body').innerText()).slice(0,2500));
    throw error;
  }
  await page.getByRole('button', {name:peer, exact:true}).first().click();
  await graph.locator('.inspector-address').filter({hasText:peer}).waitFor();
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await graph.locator('.inspector-address').filter({hasText:wallet}).waitFor();

  const fullscreen = graph.getByRole('button', {name:'Fullscreen', exact:true});
  await fullscreen.click();
  await page.waitForFunction(() => document.fullscreenElement?.classList.contains('graph-panel'),null,{polling:100});
  const exitFullscreen = graph.getByRole('button', {name:'Exit fullscreen', exact:true});
  await exitFullscreen.click();
  await page.waitForFunction(() => !document.fullscreenElement,null,{polling:100});

  if (process.platform === 'win32') {
    await page.locator('.notification-bell').click();
    const keepWatching = page.getByRole('checkbox', {name:/system tray/});
    await keepWatching.click();
    await page.waitForFunction(() => document.querySelector('.background-watch input')?.checked);
    const hidden = await app.evaluate(({BrowserWindow}) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.close();
      return !window.isDestroyed() && !window.isVisible();
    });
    assert.equal(hidden,true,'Closing the window keeps the tray watcher running');
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].show());
    await keepWatching.click();
    await page.waitForFunction(() => !document.querySelector('.background-watch input')?.checked);
  }

} finally {
  await app?.close();
  await rm(profile, {recursive:true, force:true, maxRetries:3, retryDelay:200});
}
