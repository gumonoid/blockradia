import http from 'node:http';
import {resolve} from 'node:path';
import {BotStore} from './store.mjs';
import {telegramClient} from './telegram.mjs';
import {createBot} from './handler.mjs';
import {serviceURL} from '../lib/remote-explorer.ts';

const api=telegramClient(process.env.TELEGRAM_BOT_TOKEN);
const origin=serviceURL(process.env.BLOCKRADIA_API_URL||'https://blockradia-api.onrender.com');
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const store=new BotStore(resolve(process.env.BOT_DATA_PATH||'work/telegram-bot.sqlite'));
let running=true,lastPoll=Date.now(),monitoring=false;
const server=http.createServer((request,response)=>{
 const valid=request.method==='GET'&&request.url==='/healthz';
 const healthy=Date.now()-lastPoll<120000;
 response.writeHead(valid?(healthy?200:503):404,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 response.end(JSON.stringify(valid?{status:healthy?'ok':'polling_unavailable',mode:'telegram-chat-bot'}:{error:'Not found'}));
});

async function explorer(network,action,address='',options={}){
 lastPoll=Date.now();
 const query=new URLSearchParams({network,action,...(address?{q:address}:{})});
 for(const [key,value] of Object.entries(options))if(value!==undefined)query.set(key,String(value));
 const response=await fetch(origin+'/api/explorer?'+query,{redirect:'error',signal:AbortSignal.timeout(70000)});
 const data=await response.json().catch(()=>null);
 lastPoll=Date.now();
 if(!response.ok||!data||data.error)throw Error('Blockchain data source temporarily unavailable.');
 return data;
}

const commands=[
 ['start','Открыть меню бота'],['help','Все команды'],
 ['wallet','Баланс и проверка кошелька'],['tx','Проверить транзакцию'],
 ['network','Обзор сети'],['history','История и фильтры'],
 ['aml','AML и источники'],['graph','Связи кошелька'],
 ['price','Цена и график'],['fees','Комиссии сети'],
 ['activity','График активности сети'],
 ['exchange','Известные адреса биржи'],
 ['watch','Уведомления по адресу'],['watches','Мои наблюдения'],['unwatch','Удалить наблюдение'],
 ['recent','Последние кошельки'],['label','Назвать кошелёк'],['labels','Мои названия'],
 ['save','Сохранить расследование'],['cases','Мои расследования'],['case','Открыть расследование'],['note','Заметка к расследованию'],
 ['dates','История за даты'],['export','CSV и JSON отчёты'],['columns','Столбцы CSV'],
 ['timezone','Часовой пояс'],['autodetect','Автопроверка в группе'],
 ['privacy','Данные и источники'],['delete_me','Удалить мои данные'],
].map(([command,description])=>({command,description}));

try{
 const me=await api('getMe');
 const webhook=await api('getWebhookInfo');
 if(webhook.url){
  if(process.env.TELEGRAM_REPLACE_WEBHOOK!=='true')throw Error('An existing webhook is configured. Set TELEGRAM_REPLACE_WEBHOOK=true to switch this bot to polling.');
  await api('deleteWebhook',{drop_pending_updates:false});
 }
 await api('setMyCommands',{commands});
 await api('setChatMenuButton',{menu_button:{type:'commands'}});
 const bot=createBot({api,store,explorer,username:me.username});
 await new Promise((done,reject)=>server.once('error',reject).listen(port,'0.0.0.0',done));
 console.log('BlockRadia chat bot started: @'+me.username);
 const monitor=setInterval(async()=>{
  if(monitoring||!running)return;
  monitoring=true;
  try{await bot.monitor();}catch{console.error('Watch cycle failed');}
  finally{monitoring=false;}
 },120000);
 monitor.unref();
 const stop=()=>{
  running=false;
  clearInterval(monitor);
  server.close();
  setTimeout(()=>process.exit(0),10000).unref();
 };
 process.once('SIGINT',stop);
 process.once('SIGTERM',stop);
 while(running){
  try{
   const offset=store.get('poll-offset',0);
   const updates=await api('getUpdates',{offset,timeout:25,limit:10,allowed_updates:['message','callback_query']});
   lastPoll=Date.now();
   for(const update of updates){
    if(!running)break;
    try{await bot.handle(update);}
    catch(error){
     const chat=update.message?.chat||update.callback_query?.message?.chat;
     if(chat){
      try{await bot.say(chat,'Источник временно недоступен. Повторите запрос позже. / The data source is temporarily unavailable.');}catch{}
     }
     console.error('Update failed: '+(error.status||'data or transport'));
    }
    // Advance only after processing. An interrupted send can be delivered again.
    store.set('poll-offset',update.update_id+1);
    lastPoll=Date.now();
   }
  }catch(error){
   if(error.status===409)throw Error('Another bot process or webhook is receiving updates. Run only one polling instance.');
   if(error.status===401)throw Error('Telegram token was rejected. Update the server secret.');
   console.error('Polling interrupted. Retrying.');
   await new Promise(resolve=>setTimeout(resolve,Math.max(3000,(error.retryAfter||0)*1000)));
  }
 }
 store.close();
}catch(error){
 console.error(error.message);
 server.close();
 store.close();
 process.exitCode=1;
}
