import {randomBytes} from 'node:crypto';
import {networks,candidates,extractAddresses,units,escapeHTML as esc,short,explorerLink} from './networks.mjs';
import {walletText,transactionRows,historyText,amlText,amlReport,csvReport,graphSVG,priceSVG} from './reports.mjs';
import {exchangeAddresses,getExchangeLabel} from '../lib/exchanges.ts';
import {renderPNG} from './png.mjs';
import {coverage,compareWallets,researchSnapshot,changesSince,matchesAlert} from '../lib/research.ts';
import {refreshAML} from '../lib/aml-refresh.ts';

const help=[
 '<b>BlockRadia</b>',
 'Send a wallet address. EVM addresses may belong to several networks.',
 '/wallet [network] address — balance, history, AML',
 '/tx network hash — transaction details',
 '/network [network] — network overview',
 '/price network [1h|4h|24h|7d|14d|30d|90d|1y] [candles]',
 '/activity network — activity chart for the loaded sample',
 '/fees network — live network fees',
 '/portfolio add network address · /portfolio · /portfolio remove number',
 '/compare network first_address second_address',
 '/changes — changes since the previous lookup',
 '/rule watch_number asset_or_all minimum in|out|all',
 '/aml_update — refresh AML sources',
 '/exchange name — known exchange wallets and sources',
 '/history network address [all|confirmed|pending|large|incoming|outgoing] [search]',
 '/dates network address YYYY-MM-DD YYYY-MM-DD',
 '/aml network address — evidence and source links',
 '/graph network address — connections and SVG',
 '/watch network address — notifications in private chat',
 '/watches · /unwatch number',
 '/label network address nickname · /labels',
 '/recent — previously checked wallets',
 '/save name — save the last wallet investigation',
 '/cases · /case number · /note number text',
 '/export network address — CSV and AML JSON',
 '/columns hash timestamp from to amount block status — CSV columns',
 '/timezone Europe/Kyiv — display timezone',
 '/autodetect on|off — group administrators',
 '/privacy — storage and sources · /delete_me — erase personal saved data',
 'BTC / ETH / TRX / SOL / TON / Base / Arbitrum / POL / Optimism',
 'В группе отправьте адрес кошелька. Для получения всех сообщений включите доступ через BotFather → /setprivacy → Disable.',
].join('\n');
const aliases={btc:'bitcoin',eth:'ethereum',trx:'tron',sol:'solana',gram:'ton',pol:'polygon',arb:'arbitrum',op:'optimism'};
const networkName=value=>aliases[value?.toLowerCase()]||value?.toLowerCase();
const group=chat=>chat.type==='group'||chat.type==='supergroup';
const safeRows=bundle=>(bundle.transactions||[]).slice(0,200);

export function createBot({api,store,explorer,username}){
 const quotas=new Map();
 const userKey=(id,name)=>'user:'+id+':'+name;
 const say=(chat,text,extra={})=>{
  // Telegram limits message text to 4096 characters. Fall back to plain text
  // rather than cutting an HTML tag or entity in an unusually large report.
  const long=text.length>4000;
  const content=long?text.replace(/<[^>]*>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&amp;','&').slice(0,3900)+'\n… /export':text;
  return api('sendMessage',{chat_id:chat.id,text:content,...(long?{}:{parse_mode:'HTML'}),link_preview_options:{is_disabled:true},...extra});
 };
 const sendFile=(chat,name,content,type)=>api('sendDocument',{chat_id:chat.id},{name,content,type});
 const sendChart=(chat,name,svg)=>api('sendPhoto',{chat_id:chat.id},{name,content:renderPNG(svg),type:'image/png'});

 function allow(chatId){
  const now=Date.now(),key=String(chatId),entry=quotas.get(key);
  if(quotas.size>10000)for(const [id,q] of quotas)if(q.until<now)quotas.delete(id);
  if(!entry||entry.until<now){quotas.set(key,{count:1,until:now+60000});return true;}
  return ++entry.count<=6;
 }

 function session(owner,chat,network,address,bundle){
  const id=randomBytes(8).toString('hex'),created=Date.now();
  store.set('session:'+id,{owner,chat:chat.id,network,address,bundle,created});
  store.pruneSessions(created);
  return id;
 }
 const button=(id,text,action,arg='')=>({text,callback_data:['br',id,action,arg].join(':')});
 function keyboard(id,network,address){
  return {inline_keyboard:[
   [button(id,'History','history'),button(id,'AML','aml'),button(id,'Connections','graph')],
   [button(id,'Confirmed','confirmed'),button(id,'Pending','pending'),button(id,'Large','large')],
   [button(id,'Refresh','refresh'),button(id,'Watch','watch'),button(id,'Export','export')],
   [{text:'Explorer',url:explorerLink(network,address)}],
  ]};
 }

 async function lookup(chat,owner,network,address,view='wallet',filter={}){
  if(network==='bitcoin'&&/^bc1/i.test(address))address=address.toLowerCase();
  if(!Object.hasOwn(networks,network)||!candidates(address).includes(network)){
   await say(chat,'Check the network and wallet address. Пример /wallet tron T…');return;
  }
  const [history,balance]=await Promise.allSettled([
   explorer(network,'address',address,{mode:network==='solana'?'extended':undefined}),
   explorer(network,'balance',address),
  ]);
  if(history.status==='rejected'&&balance.status==='rejected')throw Error('Wallet sources unavailable');
  const bundle=history.status==='fulfilled'?history.value:{
   ...balance.value,transactions:[],transfers:[],partial_history:true,
   history_error:'История временно недоступна. Баланс сохранён. / History unavailable; available balance retained.',
  };
  if(balance.status==='fulfilled'&&bundle.data?.coin_balance==null){
   bundle.data={...bundle.data,coin_balance:balance.value.data?.coin_balance};
  }
  await refreshAML(()=>explorer(network,'aml','')).catch(()=>{});
  const evidence=amlReport(network,address,bundle);
  const snapshots=store.get(userKey(owner,'snapshots'),{}),snapshotKey=network+':'+address;
  const nextSnapshot=researchSnapshot(bundle,{...evidence.report,additionalSignals:evidence.signals});
  const changes=changesSince(snapshots[snapshotKey],nextSnapshot);
  store.set(userKey(owner,'changes'),{network,address,...changes,coverage:coverage(bundle)});
  if(!coverage(bundle).partial){
   delete snapshots[snapshotKey];snapshots[snapshotKey]=nextSnapshot;
   store.set(userKey(owner,'snapshots'),Object.fromEntries(Object.entries(snapshots).slice(-30)));
  }
  const id=session(owner,chat,network,address,bundle);
  const item={network,address,at:new Date().toISOString()};
  const recent=store.get(userKey(owner,'recent'),[]).filter(r=>r.network!==network||r.address!==address);
  store.set(userKey(owner,'recent'),[item,...recent].slice(0,30));
  store.set(userKey(owner,'last'),id);
  if(view==='wallet'){
   const market=await explorer(network,'market','',{period:'24Ч'}).catch(()=>null);
   const labels=store.get(userKey(owner,'labels'),{});
   const labelKey=network+':'+(['ethereum','base','arbitrum','polygon','optimism'].includes(network)?address.toLowerCase():address);
   await say(chat,walletText(network,address,bundle,market?.price,labels[labelKey])+'\n'+(changes.baseline?'First check / Исходная проверка':'New in sample: '+changes.newHashes.length+' · Labels changed: '+changes.labelsChanged),{reply_markup:keyboard(id,network,address)});
  }else await render(chat,owner,{network,address,bundle},id,view,filter);
 }

 async function render(chat,owner,data,id,view,filter={}){
  const {network,address,bundle}=data;
  if(view==='aml'){
   await say(chat,amlText(network,address,bundle),{reply_markup:keyboard(id,network,address)});
   return;
  }
  if(view==='graph'){
   const {report}=amlReport(network,address,bundle);
   const peers=report.counterparties.slice(0,12);
   const text=['<b>Direct counterparties · loaded sample</b>',...peers.map(p=>'<code>'+esc(p.address)+'</code>\n↓ '+p.incoming+' ↑ '+p.outgoing+(p.exchange?' · '+esc(p.exchange.name):''))].join('\n\n');
   const rows=peers.map((p,i)=>[button(id,short(p.address),'peer',String(i))]);
   await say(chat,text,{reply_markup:{inline_keyboard:rows}});
   await sendChart(chat,'blockradia-connections.png',graphSVG(network,address,bundle));
   return;
  }
  if(view==='export'){
   const rows=transactionRows(network,bundle);
   const columns=store.get(userKey(owner,'columns'));
   await sendFile(chat,'blockradia-'+network+'.csv',csvReport(network,rows,columns||undefined),'text/csv');
   const report=amlReport(network,address,bundle);
   await sendFile(chat,'blockradia-aml.json',JSON.stringify({network,address,...report,coverage:bundle.coverage,warnings:bundle.warnings},null,2),'application/json');
   return;
  }
  const status=['confirmed','pending','large'].includes(view)?view:filter.status||'all';
  const rows=transactionRows(network,bundle,{...filter,status,address});
  const page=Math.min(Math.max(0,Number(filter.page)||0),Math.max(0,Math.ceil(rows.length/10)-1));
  // Persist the filter so subsequent pagination uses the same subset.
  store.set('session:'+id,{...data,owner,chat:chat.id,created:Date.now(),filter:{...filter,status}});
  const buttons=[];
  if(page>0)buttons.push(button(id,'←','page',String(page-1)));
  if((page+1)*10<rows.length)buttons.push(button(id,'→','page',String(page+1)));
  const warning=bundle.partial_history||bundle.history_error?'⚠ Partial history / Неполная история\n'+esc(bundle.history_error||'Some operations may be missing.')+'\n\n':'';
  await say(chat,warning+(rows.length?historyText(network,rows,page,store.get(userKey(owner,'timezone'),'UTC')):'No transactions in this loaded sample / Нет операций в этой выборке.'),{reply_markup:{inline_keyboard:[...(buttons.length?[buttons]:[]),[button(id,'Wallet','refresh'),button(id,'CSV / JSON','export')]]}});
 }

 async function detect(chat,owner,address){
  const choices=candidates(address);
  if(choices.length===1)return lookup(chat,owner,choices[0],address);
  const id=session(owner,chat,null,address,null);
  const balances=[];
  // Two simultaneous requests stay below the shared gateway's per-client limit.
  for(let i=0;i<choices.length;i+=2){
   balances.push(...await Promise.all(choices.slice(i,i+2).map(async n=>{
    const data=await explorer(n,'balance',address).catch(()=>null);
    return networks[n].name+': '+units(data?.data?.coin_balance,18)+' '+networks[n].symbol;
   })));
  }
  await say(chat,['<b>Choose network / Выберите сеть</b>','<code>'+esc(address)+'</code>','An EVM address can be used on several chains. A zero balance does not exclude historical activity.',...balances].join('\n'),{reply_markup:{inline_keyboard:choices.map(n=>[button(id,networks[n].name,'network',n)])}});
 }

 async function watch(chat,owner,network,address,bundle){
  if(network==='bitcoin'&&/^bc1/i.test(address))address=address.toLowerCase();
  if(chat.type!=='private'){await say(chat,'Open the bot in a private chat and use /watch network address.');return;}
  const key=userKey(owner,'watches'),list=store.get(key,[]);
  if(list.some(w=>w.network===network&&w.address===address)){await say(chat,'Already watching this address.');return;}
  const total=store.watches().reduce((n,[,value])=>n+value.length,0);
  if(list.length>=10||total>=100){await say(chat,'Watch limit reached (10 per person, 100 per bot).');return;}
  const data=bundle||await explorer(network,'address',address);
  if(data.history_error||data.partial_history){await say(chat,'History is incomplete. Retry before adding a watch.');return;}
  list.push({network,address,seen:safeRows(data).map(t=>t.hash),checkedAt:new Date().toISOString(),createdAt:Date.now()});
  store.set(key,list);
  await say(chat,'Watching '+esc(networks[network].name)+' <code>'+esc(address)+'</code>\nChecks run every two minutes while the bot service is running.');
 }

 async function callback(update){
  const q=update.callback_query;
  await api('answerCallbackQuery',{callback_query_id:q.id});
  const match=/^br:([0-9a-f]{16}):([a-z]+):([a-z0-9]*)$/.exec(q.data||'');
  if(!match||!q.message)return;
  const [,id,action,arg]=match,data=store.get('session:'+id),chat=q.message.chat,owner=q.from.id;
  if(!data||data.owner!==owner||data.chat!==chat.id||Date.now()-data.created>86400000){
   await say(chat,'This button expired or belongs to another user. Send the address again.');return;
  }
  if(!allow(chat.id))return;
  if(action==='network'){
   if(!candidates(data.address).includes(arg))return;
   return lookup(chat,owner,arg,data.address);
  }
  if(!data.bundle)return;
  if(action==='refresh')return lookup(chat,owner,data.network,data.address);
  if(action==='watch')return watch(chat,owner,data.network,data.address,data.bundle);
  if(action==='peer'){
   const p=amlReport(data.network,data.address,data.bundle).report.counterparties[Number(arg)];
   if(p)return lookup(chat,owner,data.network,p.address);
   return;
  }
  if(action==='page')return render(chat,owner,data,id,'history',{...data.filter,page:Number(arg)});
  if(['history','confirmed','pending','large','graph','export','aml'].includes(action))return render(chat,owner,data,id,action);
 }

 async function command(message,owner,command,args){
  const chat=message.chat;
  if(['start','help'].includes(command)){
   await say(chat,help,{reply_markup:{inline_keyboard:[[{text:'Add to group / Добавить в группу',url:'https://t.me/'+username+'?startgroup=true'}]]}});
   return;
  }
  if(command==='privacy'){
   await say(chat,'The bot sends public wallet addresses and hashes to the BlockRadia API. Saved wallets, nicknames, investigations and watch baselines are stored per Telegram user on the bot server. Group settings are stored per chat. Full group messages are not saved. Reports show source dates and loaded-history limits. /delete_me erases personal saved data. Group automatic checks require Telegram message access.');return;
  }
  if(command==='exchange'){
   const query=args.join(' ').toLowerCase();
   if(query.length<2){await say(chat,'/exchange Binance');return;}
   const rows=exchangeAddresses.filter(r=>(getExchangeLabel(r.network,r.address)?.name||'').toLowerCase().includes(query)).slice(0,12);
   await say(chat,rows.length?rows.map(r=>'<b>'+esc(getExchangeLabel(r.network,r.address)?.name)+'</b> · '+esc(r.network)+'\n<code>'+esc(r.address)+'</code>\n<a href="'+esc(r.source)+'">Source</a> · '+esc(r.checkedAt)).join('\n\n'):'No exchange labels found.');return;
  }
  if(command==='aml_update'){
   try{await refreshAML(()=>explorer('bitcoin','aml',''),true);await say(chat,'AML sources checked. Snapshot dates are shown in /aml.');}
   catch{await say(chat,'AML update unavailable. Previous snapshots retained.');}return;
  }
  if(command==='changes'){
   if(chat.type!=='private'){await say(chat,'Open changes in a private chat.');return;}
   const data=store.get(userKey(owner,'changes'));
   await say(chat,!data?'Check a wallet first.':data.baseline?'First check established a baseline.':esc(data.network)+' · '+esc(data.address)+'\nSince: '+esc(data.since)+'\nAttribution changed: '+data.labelsChanged+'\nNew hashes in sample: '+data.newHashes.length+'\n'+data.newHashes.slice(0,10).map(esc).join('\n'));return;
  }
  if(command==='compare'){
   const n=networkName(args[0]),left=args[1],right=args[2];
   if(!candidates(left||'').includes(n)||!candidates(right||'').includes(n)){await say(chat,'/compare network first_address second_address');return;}
   const [a,b]=await Promise.all([explorer(n,'address',left),explorer(n,'address',right)]);
   const comparison=compareWallets(n,left,right,a,b);
   await say(chat,'<b>Wallet comparison</b>\n'+esc(n)+'\nDirect transfers: '+comparison.direct.length+'\nCommon counterparties: '+comparison.common.length+'\n'+comparison.common.slice(0,12).map(esc).join('\n')+'\n'+(comparison.coverage.some(c=>c.partial)?'Partial history':'Loaded sample')+'\n'+comparison.direct.slice(0,10).map(t=>esc(t.amount)+' '+esc(t.symbol)+' · '+esc(t.hash)).join('\n'));return;
  }
  if(command==='portfolio'){
   if(chat.type!=='private'){await say(chat,'Use /portfolio in a private chat.');return;}
   const key=userKey(owner,'portfolio'),saved=store.get(key,[]);
   if(args[0]==='add'){
    const n=networkName(args[1]),a=args[2];
    if(!candidates(a||'').includes(n)){await say(chat,'/portfolio add network address');return;}
    if(saved.length>=20){await say(chat,'Portfolio limit: 20 wallets.');return;}
    if(!saved.some(r=>r.network===n&&r.address===a))saved.push({network:n,address:a});
    store.set(key,saved);await say(chat,'Wallet added. /portfolio');return;
   }
   if(args[0]==='remove'){
    const i=Number(args[1])-1;if(!Number.isInteger(i)||!saved[i]){await say(chat,'Use a wallet number from /portfolio.');return;}
    saved.splice(i,1);store.set(key,saved);await say(chat,'Portfolio wallet removed.');return;
   }
   if(!saved.length){await say(chat,'/portfolio add network address');return;}
   let total=0,unpriced=0,failed=0;
   for(const [i,wallet] of saved.entries()){
    try{const p=await explorer(wallet.network,'portfolio',wallet.address);total+=p.knownUSD||0;unpriced+=p.unpriced||0;
     await say(chat,(i+1)+'. <b>'+esc(wallet.network)+'</b>\n<code>'+esc(wallet.address)+'</code>\n'+(p.assets||[]).slice(0,30).map(a=>esc(a.symbol)+' '+esc(a.balance??'—')+' · '+(a.usd==null?'USD unknown':'$'+a.usd.toFixed(2))).join('\n')+'\n'+esc(p.source)+(p.partial?' · PARTIAL':''));
    }catch{failed++;await say(chat,(i+1)+'. '+esc(wallet.network)+' balances unavailable.');}
   }
   await say(chat,'Known USD total: $'+total.toFixed(2)+'\nUnpriced assets: '+unpriced+'\nUnavailable wallets: '+failed);return;
  }
  if(command==='rule'){
   if(chat.type!=='private'){await say(chat,'Configure watches in a private chat.');return;}
   const key=userKey(owner,'watches'),list=store.get(key,[]),item=list[Number(args[0])-1];
   if(!item||args.length!==4||!/^\d+(\.\d{1,36})?$/.test(args[2])||!['in','out','all'].includes(args[3])||args[1].length>128){await say(chat,'/rule watch_number asset_or_all minimum in|out|all');return;}
   item.rule={network:item.network,asset:args[1]==='all'?'':args[1],minimum:args[2],direction:args[3]};
   store.set(key,list);await say(chat,'Alert rule saved. AML label changes are also reported.');return;
  }
  if(command==='delete_me'){
   for(const [key] of store.entries('user:'+owner+':'))store.delete(key);
   store.deleteUserSessions(owner);
   await say(chat,'Saved data and watches deleted.');return;
  }
  if(command==='autodetect'){
   if(!group(chat)||!['on','off'].includes(args[0])){await say(chat,'Group administrators can use /autodetect on or /autodetect off.');return;}
   if(message.sender_chat){await say(chat,'Run this command using your personal administrator account.');return;}
   const member=await api('getChatMember',{chat_id:chat.id,user_id:owner});
   if(!['creator','administrator'].includes(member.status)){await say(chat,'Administrator access required.');return;}
   store.set('group:'+chat.id+':auto',args[0]==='on');
   await say(chat,'Automatic wallet checks '+args[0]+'.');return;
  }
  if(command==='timezone'){
   try{new Intl.DateTimeFormat('en',{timeZone:args[0]}).format();}
   catch{await say(chat,'Use an IANA timezone such as Europe/Kyiv or UTC.');return;}
   if(!args[0]){await say(chat,'Current timezone: '+esc(store.get(userKey(owner,'timezone'),'UTC')));return;}
   store.set(userKey(owner,'timezone'),args[0]);await say(chat,'Timezone: '+esc(args[0]));return;
  }
  if(command==='columns'){
   const allowed=['hash','timestamp','from','to','amount','block','status'];
   if(!args.length||args.some(c=>!allowed.includes(c))){await say(chat,'/columns '+allowed.join(' '));return;}
   store.set(userKey(owner,'columns'),[...new Set(args)]);await say(chat,'CSV columns saved.');return;
  }
  if(['recent','labels','cases','watches'].includes(command)){
   if(chat.type!=='private'){await say(chat,'Personal saved lists are available in a private chat.');return;}
   const name=command==='cases'?'cases':command==='recent'?'recent':command;
   const list=store.get(userKey(owner,name),command==='labels'?{}:[]);
   const lines=command==='labels'?Object.entries(list).map(([key,value])=>esc(key)+' · '+esc(value)):list.map((r,i)=>(i+1)+'. '+esc(r.name||r.network)+' · <code>'+esc(r.address)+'</code>');
   await say(chat,lines.length?lines.slice(0,30).join('\n'):'No saved items.');return;
  }
  if(command==='unwatch'){
   if(chat.type!=='private'){await say(chat,'Use /unwatch in a private chat.');return;}
   const list=store.get(userKey(owner,'watches'),[]),i=Number(args[0])-1;
   if(!Number.isInteger(i)||!list[i]){await say(chat,'Choose a number from /watches.');return;}
   list.splice(i,1);store.set(userKey(owner,'watches'),list);await say(chat,'Watch removed.');return;
  }
  if(command==='save'){
   if(chat.type!=='private'){await say(chat,'Save investigations in a private chat.');return;}
   const data=store.get('session:'+store.get(userKey(owner,'last')));
   if(!data?.bundle||!args.length){await say(chat,'Open a wallet first, then /save name.');return;}
   const list=store.get(userKey(owner,'cases'),[]);
   const name=args.join(' ').slice(0,100);
   store.set(userKey(owner,'cases'),[{...data,name},...list].slice(0,20));
   await say(chat,'Investigation saved: '+esc(name));return;
  }
  if(command==='case'){
   if(chat.type!=='private'){await say(chat,'Open investigations in a private chat.');return;}
   const data=store.get(userKey(owner,'cases'),[])[Number(args[0])-1];
   if(!data){await say(chat,'Choose a number from /cases.');return;}
   const id=session(owner,chat,data.network,data.address,data.bundle);
   await say(chat,'Saved snapshot: '+esc(data.name)+'\n'+walletText(data.network,data.address,data.bundle,null),{reply_markup:keyboard(id,data.network,data.address)});return;
  }
  if(command==='note'){
   if(chat.type!=='private'){await say(chat,'Edit investigation notes in a private chat.');return;}
   const list=store.get(userKey(owner,'cases'),[]);
   const item=list[Number(args[0])-1];
   if(!item||args.length<2){await say(chat,'/note investigation_number text');return;}
   item.notes=args.slice(1).join(' ').slice(0,4000);
   store.set(userKey(owner,'cases'),list);
   await say(chat,'Investigation note saved.');return;
  }
  const network=networkName(args[0]);
  if(command==='wallet'&&args.length===1)return detect(chat,owner,args[0]);
  if(command==='network'&&!args.length){await say(chat,Object.entries(networks).map(([n,c])=>'/network '+n+' · '+c.name).join('\n'));return;}
  if(!Object.hasOwn(networks,network)){await say(chat,'Choose a network with /network. Example: /wallet ethereum 0x…');return;}
  const address=network==='bitcoin'&&/^bc1/i.test(args[1]||'')?args[1].toLowerCase():args[1];
  if(['network','fees','price','activity'].includes(command)){
   const periods={'1h':'1Ч','4h':'4Ч','24h':'24Ч','7d':'7Д','14d':'14Д','30d':'30Д','90d':'90Д','1y':'1Г'};
   const action={network:'overview',activity:'overview',fees:'fees',price:'market'}[command];
   if(command==='price'&&args[1]&&!periods[args[1]]){await say(chat,'Periods: '+Object.keys(periods).join(', '));return;}
   const data=await explorer(network,action,'',{period:periods[args[1]]||'24Ч'});
   if(command==='price'){
    const change=Number.isFinite(data.change_percent)?(data.change_percent>=0?'🟢 +':'🔴 ')+data.change_percent.toFixed(2)+'%':'';
    await say(chat,'<b>'+networks[network].name+' / USD</b>\n$'+esc(data.price??'—')+' '+change+'\n'+esc(data.source_name)+'\n'+esc(data.updated_at||'')+'\n'+esc(data.warning||''));
    const chart=priceSVG(network,data,{candles:args[2]==='candles'});
    if(chart)await sendChart(chat,'blockradia-price.png',chart);
   }else if(command==='activity'){
    const chart=priceSVG(network,{...data,chart:(data.chart||[]).map(p=>({date:p.date,value:p.transactions_count}))},{activity:true});
    await say(chat,esc(data.activity_label||'Loaded transaction sample')+'\n'+esc((data.warnings||[]).join('\n')));
    if(chart)await sendChart(chat,'blockradia-activity.png',chart);
   }else if(command==='fees'){
    await say(chat,'<b>'+networks[network].name+' · fees</b>\n'+(data.metrics||[]).map(m=>esc(m.label)+' '+esc(m.value)+' '+esc(m.unit)).join('\n')+'\n'+esc(data.source_name||data.source||'')+'\n'+esc(data.updated_at||data.fetched_at||''));
   }else await say(chat,'<b>'+networks[network].name+'</b>\n'+Object.entries(data.stats||{}).map(([k,v])=>esc(k)+': '+esc(v)).join('\n')+'\nSample: '+(data.transactions?.length||0)+' transactions\n'+esc(data.source_name||'')+'\n'+esc((data.warnings||[]).join('\n')));
   return;
  }
  if(command==='tx'){
   if(!/^[A-Za-z0-9_+/=-]{40,132}$/.test(address||'')){await say(chat,'/tx network transaction_hash');return;}
   const data=await explorer(network,'transaction',address),tx=data.data;
   if(!tx){await say(chat,'Transaction details unavailable.');return;}
   await say(chat,'<b>'+networks[network].name+' · transaction</b>\n<code>'+esc(address)+'</code>\n'+
    esc(tx.status||'unknown')+' · #'+esc(tx.block_number??'—')+'\n'+esc(tx.timestamp||'Time unavailable')+'\n'+
    esc(units(tx.value,networks[network].decimals))+' '+networks[network].symbol+'\n'+
    '<code>'+esc(tx.from?.hash||'—')+'</code> → <code>'+esc(tx.to?.hash||'—')+'</code>\n'+
    '<a href="'+esc(explorerLink(network,address,true))+'">Explorer</a>');return;
  }
  if(!candidates(address||'').includes(network)){await say(chat,'Check the address for '+esc(networks[network].name)+'.');return;}
  if(command==='label'){
   if(chat.type!=='private'){await say(chat,'Personal nicknames are managed in a private chat.');return;}
   const name=args.slice(2).join(' ').slice(0,80),labels=store.get(userKey(owner,'labels'),{});
   if(!name){await say(chat,'/label network address nickname');return;}
   const labelKey=network+':'+(['ethereum','base','arbitrum','polygon','optimism'].includes(network)?address.toLowerCase():address);
   if(Object.keys(labels).length>=200&&!Object.hasOwn(labels,labelKey)){await say(chat,'Nickname limit reached.');return;}
   labels[labelKey]=name;
   store.set(userKey(owner,'labels'),labels);await say(chat,'Nickname saved.');return;
  }
  if(command==='watch')return watch(chat,owner,network,address);
  if(command==='dates'){
   const parseDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().startsWith(value);
   if(!parseDate(args[2])||!parseDate(args[3])){await say(chat,'/dates network address YYYY-MM-DD YYYY-MM-DD (UTC)');return;}
   const start=Date.parse(args[2]),end=Date.parse(args[3])+86399999;
   if(end<start||start>Date.now()){await say(chat,'Check the date range.');return;}
   const bundle=await explorer(network,'history',address,{start,end});
   const id=session(owner,chat,network,address,bundle);
   await render(chat,owner,{network,address,bundle},id,'history');return;
  }
  if(['wallet','history','aml','graph','export'].includes(command)){
   return lookup(chat,owner,network,address,command==='wallet'?'wallet':command,{status:args[2]||'all',query:args.slice(3).join(' ')});
  }
  await say(chat,help);
 }

 async function handle(update){
  if(update.callback_query)return callback(update);
  const message=update.message;
  if(!message||message.from?.is_bot||!message.from?.id||!message.chat||typeof (message.text||message.caption)!=='string')return;
  const text=(message.text||message.caption).slice(0,4096),chat=message.chat,owner=message.from.id;
  if(!['private','group','supergroup'].includes(chat.type))return;
  const match=/^\/([a-z_]+)(?:@([a-z0-9_]+))?(?:\s+([\s\S]*))?$/i.exec(text.trim());
  if(match){
   if(match[2]&&match[2].toLowerCase()!==username.toLowerCase())return;
   if(!allow(chat.id))return;
   await command(message,owner,match[1].toLowerCase(),(match[3]||'').trim().split(/\s+/).filter(Boolean));
   return;
  }
  if(group(chat)&&store.get('group:'+chat.id+':auto',true)===false)return;
  const addresses=extractAddresses(text);
  if(!addresses.length||!allow(chat.id))return;
  for(const address of addresses)await detect(chat,owner,address);
 }

 async function monitor(){
  for(const [key,list] of store.watches()){
   const owner=Number(key.split(':')[1]);
   for(const watch of [...list]){
    try{
     await refreshAML(()=>explorer(watch.network,'aml','')).catch(()=>{});
     const rootEvidence=amlReport(watch.network,watch.address,{transfers:[]});
     const rootSnapshot=researchSnapshot({}, {...rootEvidence.report,additionalSignals:rootEvidence.signals});
     const currentWatches=store.get(key,[]),currentWatch=currentWatches.find(w=>w.network===watch.network&&w.address===watch.address);
     if(!currentWatch)continue;
     if(currentWatch.amlSnapshot&&changesSince(currentWatch.amlSnapshot,rootSnapshot).labelsChanged)await say({id:owner,type:'private'},'AML attribution changed · '+esc(watch.network)+'\n<code>'+esc(watch.address)+'</code>\n'+amlText(watch.network,watch.address,{transfers:[]}));
     currentWatch.amlSnapshot=rootSnapshot;store.set(key,currentWatches);
     const data=await explorer(watch.network,'address',watch.address);
     if(data.history_error||data.partial_history)continue;
     if(!store.get(key,[]).some(w=>w.network===watch.network&&w.address===watch.address))continue;
     const rows=safeRows(data),seen=new Set(watch.seen);
     const allowed=new Set((data.transfers||[]).filter(t=>matchesAlert({...watch.rule,network:watch.network},watch.address,t)).map(t=>t.hash));
     const fresh=rows.filter(t=>!seen.has(t.hash)&&Number.isFinite(Date.parse(t.timestamp))&&Date.parse(t.timestamp)>=watch.createdAt&&(!watch.rule||allowed.has(t.hash)));
     if(fresh.length)await say({id:owner,type:'private'},'<b>Wallet activity / Активность кошелька</b>\n'+esc(watch.network)+'\n<code>'+esc(watch.address)+'</code>\n'+fresh.length+' new transactions in loaded sample.\n'+fresh.slice(0,3).map(t=>'<a href="'+esc(explorerLink(watch.network,t.hash,true))+'">'+esc(short(t.hash))+'</a>').join('\n'));
     // Re-read before saving, so /unwatch during an API call takes effect.
     const current=store.get(key,[]);
     const item=current.find(w=>w.network===watch.network&&w.address===watch.address);
     if(item){
      item.seen=[...new Set([...rows.map(t=>t.hash),...watch.seen])].slice(0,500);
      item.checkedAt=new Date().toISOString();

      store.set(key,current);
     }
    }catch(error){
     if(error.status===403)store.set(key,store.get(key,[]).filter(w=>w.network!==watch.network||w.address!==watch.address));
    }
   }
  }
 }
 return {handle,monitor,say};
}
