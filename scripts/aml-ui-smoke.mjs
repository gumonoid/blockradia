// Run after npm run build. Uses isolated browser state and fixture API responses.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import ofac from '../lib/ofac-snapshot.json' with {type:'json'};
import additional from '../lib/aml-additional.json' with {type:'json'};

const root=resolve('desktop/ui-dist'),address='0x'+'1'.repeat(40),peer='0x'+'2'.repeat(40);
const now=new Date().toISOString();
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(404).end();return;}
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream'}).end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fail=false;
 await page.route('**/api/explorer?**',async route=>{
  const u=new URL(route.request().url()),action=u.searchParams.get('action'),q=u.searchParams.get('q');
  let data={transactions:[],transfers:[],stats:{},chart:[]};
  if(action==='aml')data={ofac:{...ofac,retrievedAt:now},additional:additional.map(s=>({...s,retrievedAt:now}))};
  if(action==='aml-address' && route.request().headers()['x-blockradia-client']!=='1'){
   await route.fulfill({status:403,body:''});
   return;
  }
  if(action==='aml-address')data={network:u.searchParams.get('network'),address:q,checkedAt:now,sources:[
   {id:'goplus',name:'GoPlus Security',url:'https://api.gopluslabs.io/api/v1/address_security/'+q+'?chain_id=1',checkedAt:fail?null:now,status:fail?'unavailable':'ok',checks:fail?0:18,totalChecks:18,findings:fail?[]:[{code:'phishing_activities',label:'phishing activities',kind:'risk'}]},
   {id:'blockscout',name:'Blockscout',url:'https://eth.blockscout.com/address/'+q,checkedAt:now,status:'ok',checks:1,totalChecks:1,findings:[{code:'public_label',label:'Example public label',kind:'label'}]},
  ]};
  if(action==='address'||action==='balance')data={data:{hash:q,coin_balance:'1000000000000000000'},canonical_address:q,source_name:'Fixture',warnings:[],transactions:[{hash:'a'.repeat(64),from:{hash:peer},to:{hash:q},value:'1000000000000000000',status:'ok',timestamp:now}],transfers:[{id:'a',hash:'a'.repeat(64),from:peer,to:q,amount:'1',asset:'native',symbol:'ETH',kind:'native'}]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin);
 const openWallet=async()=>{
  await page.locator('.side-chain').filter({hasText:'Ethereum'}).click();
  await page.locator('.search-box input').fill(address);
  await page.locator('.search-submit').click();
  await page.locator('.aml-source-card').first().waitFor();
 };
 await openWallet();
 const panel=page.locator('.aml-panel');
 assert.match(await panel.innerText(),/Why this result\?/);
 assert.match(await panel.innerText(),/phishing activities/);
 assert.match(await panel.locator('.aml-rating').innerText(),/Yellow/);
 await mkdir('work',{recursive:true});
 await panel.screenshot({path:'work/aml-panel-en.png'});
 fail=true;
 await panel.getByRole('button',{name:'Check again',exact:true}).click();
 await panel.getByText('Source unavailable — not a clean result',{exact:false}).waitFor();
 assert.doesNotMatch(await panel.locator('.aml-rating').innerText(),/Green/);
 fail=false;
 await page.evaluate(()=>localStorage.setItem('blockradia-language','ru'));
 await page.reload();await openWallet();
 assert.match(await panel.innerText(),/Почему такой результат/);
 assert.match(await panel.innerText(),/Фишинг/);
 await panel.screenshot({path:'work/aml-panel-ru.png'});
 await page.setViewportSize({width:560,height:900});
 const overflow=await panel.evaluate(el=>el.scrollWidth>el.clientWidth+2);
 assert.equal(overflow,false,'AML panel must fit a narrow window');
 await panel.screenshot({path:'work/aml-panel-narrow.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{localStorage.setItem('blockradia-language','zh');localStorage.setItem('blockradia-theme',JSON.stringify('dark'));});
 await page.reload();await openWallet();
 assert.match(await panel.innerText(),/为什么得出此结果/);
 assert.match(await panel.innerText(),/网络钓鱼/);
 await panel.screenshot({path:'work/aml-panel-zh-dark.png'});
 assert.deepEqual(errors,[]);
 console.log('AML UI: source cards, explanations, retry/failure, EN/RU/ZH, dark theme and narrow layout passed.');
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
