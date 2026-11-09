import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {_electron as electron} from 'playwright';

const executable = process.argv[2];
assert(executable, 'Pass the unpacked BlockRadia executable path');
const profile = await mkdtemp(join(tmpdir(), 'blockradia-smoke-'));
// Occupy the old loopback port throughout the test. Electron should still serve
// the original app origin internally and never reach this server.
let externalConnections = 0;
const socket = createServer(connection => { externalConnections++; connection.destroy(); });
await new Promise((done, reject) => socket.once('error', reject).listen(19237, '127.0.0.1', done));

const wallet = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const peer = '1BitcoinEaterAddressDontSendf59kuE';
const hash = 'a'.repeat(64);
const transfer = {id:hash, hash, from:wallet, to:peer, amount:'1', symbol:'BTC', asset:'BTC', kind:'native'};
const tx = {hash, from:{hash:wallet}, to:{hash:peer}, value:'100000000', status:'ok'};
let app;
try {
  app = await electron.launch({
    executablePath:resolve(executable),
    chromiumSandbox:true,
    args:[`--user-data-dir=${profile}`],
  });
  // Electron serves the app origin internally. Stub provider I/O in the main
  // process, so the renderer still exercises the real desktop request handler.
  await app.evaluate((_, {tx,transfer}) => {
    const fetch = globalThis.fetch;
    globalThis.fetch = async (input,options) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.pathname !== '/api/explorer') return fetch(input,options);
      const address = url.searchParams.get('q');
      const action = url.searchParams.get('action');
      const payload = action === 'address' || action === 'balance'
        ? {data:{hash:address, coin_balance:'100000000'}, canonical_address:address, transactions:[tx], transfers:[transfer]}
        : {transactions:[], stats:{}, chart:[]};
      return Response.json(payload);
    };
  }, {tx,transfer});
  const page = await app.firstWindow();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => console.error('Renderer:',error.message));
  await page.locator('.search-box input').waitFor();
  assert.equal(new URL(page.url()).origin,'http://127.0.0.1:19237');
  assert.equal(externalConnections,0,'The app must not connect to the process on the old port');
  await page.evaluate(() => localStorage.setItem('blockradia-theme', JSON.stringify('gray')));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.theme==='light');
  const settings = page.locator('.sidebar-bottom button.nav-item');
  await settings.click();
  assert.equal(await page.locator('.theme-picker button').count(),6);
  const hex = page.getByLabel('HEX color',{exact:true});
  const applyHex = page.getByRole('button',{name:'Apply HEX theme'});
  await hex.fill('invalid');
  await applyHex.click();
  assert.equal(await hex.getAttribute('aria-invalid'),'true');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await hex.fill('#0af');
  await applyHex.click();
  await page.waitForFunction(() =>
    document.documentElement.dataset.theme==='hex'
    && document.documentElement.style.getPropertyValue('--hex-base')==='#00aaff'
  );
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.theme==='hex');
  await settings.click();
  assert.equal(await hex.inputValue(),'#00aaff');
  for(const [preset,color] of [['light','#f5f4f8'],['cream','#f5efdf'],['forest','#081511'],['ruby','#190b13'],['black','#000000'],['dark','#11131c']]){
    await page.locator('.theme-picker .swatch-'+preset).click();
    await page.waitForFunction(({preset,color}) =>
      document.documentElement.dataset.theme===preset && document.querySelector('#theme-hex')?.value===color,
      {preset,color}
    );
  }
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.theme==='dark');
  await settings.click();
  assert.equal(await hex.inputValue(),'#11131c');
  await page.keyboard.press('Escape');
  const tableTools = page.locator('.table-toolbox');
  const filters = tableTools.getByRole('button',{name:'Filters',exact:true});
  await filters.click();
  await tableTools.getByRole('button',{name:'Custom period',exact:true}).click();
  assert.equal(await tableTools.getByLabel('From',{exact:true}).evaluate(input=>input===document.activeElement),true);
  await filters.click();
  const search = page.locator('.search-box input');
  await search.fill(wallet);
  const graph = page.locator('.graph-panel');
  try {
    await page.locator('.search-submit').click();
    await graph.locator('.graph-edge').first().waitFor({state:'attached'});
    assert.equal(externalConnections,0);
  } catch (error) {
    console.error((await page.locator('body').innerText()).slice(0,2500));
    throw error;
  }
  await page.getByRole('button', {name:peer, exact:true}).first().click();
  await graph.locator('.inspector-address').filter({hasText:peer}).waitFor();
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await graph.locator('.inspector-address').filter({hasText:wallet}).waitFor();

  const fullscreen = graph.getByRole('button', {name:'Fullscreen', exact:true});
  const exitFullscreen = graph.getByRole('button', {name:'Exit fullscreen', exact:true});
  const waitForMacWindow = async (active) => {
    if (process.platform !== 'darwin') return;
    for (let i=0;i<100;i++) {
      const state=await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].isSimpleFullScreen());
      if(state===active)return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.fail('The macOS window did not '+(active?'enter':'leave')+' fullscreen');
  };
  const enterGraphFullscreen = async () => {
    await fullscreen.click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains('graph-panel'),null,{polling:100});
    await waitForMacWindow(true);
  };
  const waitForGraphExit = async () => {
    await page.waitForFunction(() => !document.fullscreenElement,null,{polling:100});
    await fullscreen.waitFor();
    await waitForMacWindow(false);
  };
  await enterGraphFullscreen();
  await exitFullscreen.click();
  try {
    await waitForGraphExit();
  } catch (error) {
    const renderer = await page.evaluate(() => ({
      element:document.fullscreenElement?.className, visibility:document.visibilityState,
      focused:document.hasFocus(),
    }));
    const native = await app.evaluate(({BrowserWindow}) => {
      const window = BrowserWindow.getAllWindows()[0];
      return {visible:window.isVisible(), nativeFullscreen:window.isFullScreen(),
        simpleFullscreen:process.platform==='darwin'?window.isSimpleFullScreen():null};
    });
    console.error('Graph fullscreen did not close:',{renderer,native});
    throw error;
  }
  if (process.platform === 'darwin') {
    await enterGraphFullscreen();
    await exitFullscreen.press('Escape');
    await waitForGraphExit();
  }
  await page.keyboard.press('Escape');
  await graph.locator('.inspector-address').filter({hasText:wallet}).waitFor();

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
  await new Promise(done => socket.close(done));
  await rm(profile, {recursive:true, force:true, maxRetries:3, retryDelay:200});
}
