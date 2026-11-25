import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BotStore} from '../bot/store.mjs';
import {createBot} from '../bot/handler.mjs';
import {telegramClient} from '../bot/telegram.mjs';
import {candidates,extractAddresses,units} from '../bot/networks.mjs';
import {csvReport,graphSVG} from '../bot/reports.mjs';

const wallet='1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const peer='1BitcoinEaterAddressDontSendf59kuE';
const eth='0x'+'1'.repeat(40);
const bundle=()=>({
 data:{coin_balance:'100000000'},
 transactions:[{hash:'a'.repeat(64),from:{hash:wallet},to:{hash:peer},timestamp:new Date().toISOString(),value:'100000000',status:'ok',block_number:1}],
 transfers:[{id:'a',hash:'a'.repeat(64),from:wallet,to:peer,amount:'1',symbol:'BTC',asset:'native',kind:'native'}],
 warnings:[],
});
function harness(adminIds=''){
 const store=new BotStore(':memory:'),calls=[],reads=[];
 let data=bundle();
 const api=async(method,body,file)=>{
  calls.push({method,body,file});
  if(method==='getChatMember')return {status:'administrator'};
  return {message_id:calls.length};
 };
 const explorer=async(network,action,address)=>{
  reads.push({network,action,address});
  if(action==='market')return {price:100};
  if(action==='balance')return {data:{coin_balance:'0'}};
  if(action==='portfolio')return {assets:[{asset:'native',symbol:'BTC',balance:'1',usd:100}],knownUSD:100,unpriced:0,source:'fixture'};
  return data;
 };
 const bot=createBot({api,store,explorer,username:'BlockRadiaTestBot',adminIds});
 const message=(text,{id=1,chat=1,type='private'}={})=>({update_id:1,message:{text,from:{id},chat:{id:chat,type}}});
 return {store,calls,reads,bot,message,setData:value=>{data=value;}};
}

test('address detection checks checksums and preserves EVM ambiguity',()=>{
 assert.deepEqual(candidates(wallet),['bitcoin']);
 assert.deepEqual(candidates(wallet.slice(0,-1)+'U'),[]);
 assert.equal(candidates(eth).length,5);
 assert.deepEqual(candidates('TEPSrSYPDSQ7yXpMFPq91Fb1QEWpMkRGfn'),['tron']);
 assert.deepEqual(candidates('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),['ton']);
 assert.deepEqual(candidates('So11111111111111111111111111111111111111112'),['solana']);
 assert.deepEqual(extractAddresses('Wallet '+wallet+'; '+wallet),[wallet]);
 assert.equal(extractAddresses('0x'+'1'.repeat(41)).length,0);
 assert.equal(units('9007199254740993',18),'0.009007199254740993');
});

test('group address triggers the real wallet report, without a web_app button',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('Проверь '+wallet,{chat:-10,type:'supergroup'}));
  assert(h.reads.some(r=>r.action==='address'));
  const sent=h.calls.find(c=>c.body.reply_markup?.inline_keyboard.some(row=>row.some(b=>b.text==='AML')));
  assert(sent);
  assert(!JSON.stringify(sent.body).includes('web_app'));
  assert(sent.body.text.includes('Bitcoin'));
 }finally{h.store.close();}
});

test('ambiguous EVM wallet offers all chains and does not guess one',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message(eth));
  assert.equal(h.reads.filter(r=>r.action==='balance').length,5);
  assert.equal(h.reads.filter(r=>r.action==='address').length,0);
  assert.equal(h.calls.at(-1).body.reply_markup.inline_keyboard.length,5);
 }finally{h.store.close();}
});

test('callbacks cannot disclose another user session',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message(wallet));
  const card=h.calls.find(c=>c.body.reply_markup?.inline_keyboard[0]?.[0]?.callback_data);
  const data=card.body.reply_markup.inline_keyboard[0][0].callback_data;
  const count=h.reads.length;
  await h.bot.handle({callback_query:{id:'q',from:{id:2},message:{chat:{id:1,type:'private'}},data}});
  assert.equal(h.reads.length,count);
  assert.match(h.calls.at(-1).body.text,/another user/);
 }finally{h.store.close();}
});

test('group settings require administrator rights and can stop automatic replies',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('/autodetect off',{chat:-10,type:'group'}));
  const count=h.calls.length;
  await h.bot.handle(h.message(wallet,{chat:-10,type:'group'}));
  assert.equal(h.calls.length,count);
  await h.bot.handle(h.message('/watches',{chat:-10,type:'group'}));
  assert.match(h.calls.at(-1).body.text,/private chat/);
 }finally{h.store.close();}
});

test('wallet history, AML, graph and exports are reachable through callback buttons',async()=>{
 for(const action of ['history','confirmed','pending','large','aml','graph','export','refresh']){
  const h=harness();
  try{
   await h.bot.handle(h.message(wallet));
   const id=h.store.get('user:1:last');
   await h.bot.handle({callback_query:{id:'q',from:{id:1},message:{chat:{id:1,type:'private'}},data:'br:'+id+':'+action+':'}});
   assert(h.calls.length>1,action);
   if(action==='export')assert.equal(h.calls.filter(c=>c.method==='sendDocument').length,2);
   if(action==='graph')assert(h.calls.some(c=>c.method==='sendPhoto'&&c.file?.name.endsWith('.png')&&Buffer.from(c.file.content).subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))));
  }finally{h.store.close();}
 }
});

test('watch notifications baseline old rows and deduplicate new activity',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('/watch bitcoin '+wallet));
  await h.bot.monitor();
  assert.equal(h.calls.filter(c=>c.body.text?.includes('Wallet activity')).length,0);
  h.setData({...bundle(),transactions:[{...bundle().transactions[0],hash:'b'.repeat(64),timestamp:new Date(Date.now()+1000).toISOString()}]});
  await h.bot.monitor();
  await h.bot.monitor();
  assert.equal(h.calls.filter(c=>c.body.text?.includes('Wallet activity')).length,1);
 }finally{h.store.close();}
});

test('CSV neutralizes formulas and SVG escapes hostile token labels',()=>{
 const data=bundle();
 data.transactions[0].token_amount='1';data.transactions[0].token_symbol='=IMPORTDATA("bad")';
 assert(csvReport('bitcoin',data.transactions).includes('IMPORTDATA'));
 const svg=graphSVG('bitcoin','<script>bad</script>',data);
 assert(!svg.includes('<script>'));
});

test('saved state survives restart and is partitioned by user',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'blockradia-bot-'));
 try{
  let store=new BotStore(join(dir,'bot.sqlite'));
  store.set('user:1:cases',[{name:'test'}]);store.close();
  store=new BotStore(join(dir,'bot.sqlite'));
  assert.equal(store.get('user:1:cases')[0].name,'test');
  assert.equal(store.get('user:2:cases'),null);store.close();
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Telegram errors do not expose the token',async()=>{
 const token='123456:'+ 'x'.repeat(32);
 const call=telegramClient(token,async()=>{throw Error('https://api.telegram.org/bot'+token)});
 await assert.rejects(call('getMe'),error=>!error.message.includes(token));
});

test('PNG is uploaded as a Telegram photo rather than a document',async()=>{
 let payload;
 const call=telegramClient('123456:'+ 'x'.repeat(32),async(url,options)=>{payload=options.body;return Response.json({ok:true,result:{}});});
 await call('sendPhoto',{chat_id:1},{name:'graph.png',content:new Uint8Array([137,80,78,71]),type:'image/png'});
 assert(payload.get('photo'));
 assert.equal(payload.get('document'),null);
});

test('commands to another bot and malformed addresses are ignored',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('/wallet@OtherBot bitcoin '+wallet));
  await h.bot.handle(h.message('0x'+'g'.repeat(40)));
  assert.equal(h.calls.length,0);
 }finally{h.store.close();}
});

test('session cleanup retains current data and deletes only the requested user',()=>{
 const store=new BotStore(':memory:');
 try{
  store.set('session:expired',{owner:1,created:0});
  store.set('session:mine',{owner:1,created:Date.now()});
  store.set('session:other',{owner:2,created:Date.now()});
  store.pruneSessions(Date.now());
  assert.equal(store.get('session:expired'),null);
  store.deleteUserSessions(1);
  assert.equal(store.get('session:mine'),null);
  assert.equal(store.get('session:other').owner,2);
 }finally{store.close();}
});

test('wallet retains real balance when its history provider fails',async()=>{
 const store=new BotStore(':memory:'),messages=[];
 const bot=createBot({store,username:'TestBot',api:async(method,body)=>{messages.push(body);return {};},explorer:async(network,action)=>{
  if(action==='address')throw Error('Provider unavailable');
  if(action==='market')return {price:100};
  return {data:{coin_balance:'100000000'}};
 }});
 try{
  await bot.handle({message:{text:wallet,from:{id:1},chat:{id:1,type:'private'}}});
  assert(messages.at(-1).text.includes('<b>1 BTC</b>'));
  assert(messages.at(-1).text.includes('History unavailable'));
 }finally{store.close();}
});

test('portfolio, comparison, changes and alert rules use the bot command entry point',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('/portfolio add bitcoin '+wallet));
  await h.bot.handle(h.message('/portfolio'));
  assert(h.calls.some(c=>c.body.text?.includes('Known USD total: $100.00')));
  await h.bot.handle(h.message('/compare bitcoin '+wallet+' '+peer));
  assert(h.calls.some(c=>c.body.text?.includes('Direct transfers: 1')));
  await h.bot.handle(h.message('/watch bitcoin '+wallet));
  await h.bot.handle(h.message('/rule 1 USDT 100 in'));
  assert.equal(h.store.get('user:1:watches')[0].rule.minimum,'100');
 }finally{h.store.close();}
 const second=harness();
 try{
  await second.bot.handle(second.message(wallet));
  await second.bot.handle(second.message('/changes'));
  assert(second.calls.at(-1).body.text.includes('baseline'));
 }finally{second.store.close();}
});

test('group wallet cards keep personal nicknames and previous lookups private',async()=>{
 const {bot,store,message,calls}=harness();
 await bot.handle(message('/label bitcoin '+wallet+' PrivateAlias'));
 await bot.handle(message('/wallet bitcoin '+wallet));
 assert.match(calls.at(-1).body.text,/PrivateAlias/);
 const previous=store.get('user:1:last');
 await bot.handle(message('/wallet bitcoin '+wallet,{chat:-42,type:'supergroup'}));
 assert.doesNotMatch(calls.at(-1).body.text,/PrivateAlias|First check|New in sample/);
 assert.equal(store.get('user:1:last'),previous);
 store.close();
});

test('independent chats progress while earlier updates keep their offset',async()=>{
 const {processBatch}=await import('../bot/batch.mjs');
 const done=[],offsets=[];
 let release;
 const waiting=new Promise(resolve=>{release=resolve});
 const updates=[10,11,12].map((update_id,i)=>({update_id,message:{chat:{id:i===1?2:1}}}));
 const pending=processBatch(updates,async u=>{
   if(u.update_id===10)await waiting;
   done.push(u.update_id);
 },offset=>offsets.push(offset));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(done,[11]);assert.deepEqual(offsets,[]);
 release();await pending;
 assert.deepEqual(done,[11,10,12]);assert.deepEqual(offsets,[12,13]);
});

test('admin commands and callbacks require a configured owner in their private chat',async()=>{
 const {bot,store,message,calls}=harness('1, 3');
 store.set('user:2:watches',[{address:'private-wallet'}]);
 store.set('session:old',{created:0});
 await bot.handle(message('/admin',{id:2,chat:2}));
 assert.match(calls.at(-1).body.text,/ограничен/);
 await bot.handle(message('/admin'));
 assert.match(calls.at(-1).body.text,/Отслеживаемые адреса: 1/);
 assert.doesNotMatch(calls.at(-1).body.text,/private-wallet/);
 for(const [id,chat,type] of [[2,2,'private'],[1,-10,'group'],[1,2,'private'],[1,1,'private']]){
  await bot.handle({callback_query:{id:'x',data:'admin:prune',from:{id},message:{chat:{id:chat,type}}}});
  assert.equal(store.get('session:old')===null,id===1&&chat===1);
 }
 store.close();
});

test('admin directory paginates, excludes wallet data, and enforces saved request limits',async()=>{
 const {bot,store,calls,message}=harness('1');
 const click=(action,id=1)=>bot.handle({callback_query:{id:'click',data:'admin:'+action,from:{id},message:{message_id:55,chat:{id,type:'private'}}}});
 for(let id=2;id<=11;id++)store.set('user:'+id+':recent',[{address:'sensitive-address'}]);
 store.set('group:-42:auto',false);
 await click('users:0');
 assert.equal(calls.at(-1).method,'editMessageText');
 assert.doesNotMatch(calls.at(-1).body.text,/sensitive-address|ID 11/);
 await click('users:1');assert.match(calls.at(-1).body.text,/ID 11/);
 await click('groups:0');assert.match(calls.at(-1).body.text,/ID -42 · автопоиск выключен/);
 await click('limit:3',2);assert.equal(store.get('admin:limit'),null);
 await click('limit:3');assert.equal(store.get('admin:limit'),3);
 for(let i=0;i<4;i++)await bot.handle(message('/myid',{id:2,chat:2}));
 assert.equal(calls.filter(c=>c.method==='sendMessage'&&c.body.chat_id===2).length,3);
 await click('health');assert.match(calls.at(-1).body.text,/сверх лимита: 1/);
 await click('aml');assert.match(calls.at(-1).body.text,/записей/);
 store.close();
});

test('group timezone commands cannot expose or modify a personal setting',async()=>{
 const h=harness();
 try{
  await h.bot.handle(h.message('/timezone Europe/Kyiv'));
  for(const command of ['/timezone','/timezone America/New_York']){
   await h.bot.handle(h.message(command,{chat:-12,type:'supergroup'}));
   assert.match(h.calls.at(-1).body.text,/Group history uses UTC/);
   assert.equal(h.store.get('user:1:timezone'),'Europe/Kyiv');
  }
 }finally{h.store.close();}
});

test('deleting the account while an AML notice is in flight cannot restore watches',async()=>{
 const store=new BotStore(':memory:');
 const started=Promise.withResolvers(),sent=Promise.withResolvers();
 const bot=createBot({
  store,username:'test',explorer:async()=>bundle(),
  api:async(method,body)=>{
   if(body.text?.startsWith('AML attribution changed')){
    started.resolve();await sent.promise;
   }
   return {message_id:1};
  }
 });
 try{
  store.set('user:1:watches',[{network:'bitcoin',address:wallet,createdAt:1,seen:[],
   amlSnapshot:{labels:'old',hashes:[]}}]);
  const monitor=bot.monitor();
  await started.promise;
  await bot.handle({message:{chat:{id:1,type:'private'},from:{id:1},text:'/delete_me'}});
  sent.resolve();
  await monitor;
  assert.deepEqual(store.entries('user:1:'),[]);
 }finally{sent.resolve();store.close();}
});
