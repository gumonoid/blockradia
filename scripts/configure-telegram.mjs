const token=process.env.TELEGRAM_BOT_TOKEN;
if(!/^\d+:[A-Za-z0-9_-]+$/.test(token||'')){
 console.error('Set TELEGRAM_BOT_TOKEN in your local environment.');
 process.exit(1);
}

try{
 const url=new URL(process.env.BLOCKRADIA_MINI_APP_URL);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash){
  throw new Error('Use a public HTTPS Mini App URL without credentials, query or fragment.');
 }
 const ready=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(90000)});
 if(!ready.ok||!(await ready.text()).includes('/telegram-init.js')){
  throw new Error('The URL is not serving the BlockRadia Mini App.');
 }
 const call=async(method,body={})=>{
  let response;
  try{
   response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
    redirect:'error',signal:AbortSignal.timeout(15000),
   });
  }catch{
   throw new Error('Could not reach the Telegram Bot API.');
  }
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result?.ok)throw new Error('Telegram rejected '+method+' (HTTP '+response.status+').');
  return result.result;
 };
 const bot=await call('getMe');
 await call('setChatMenuButton',{menu_button:{type:'web_app',text:'Open BlockRadia',web_app:{url:url.href}}});
 console.log('Mini App menu configured: https://t.me/'+bot.username);
}catch(error){
 console.error(error instanceof TypeError?'Check the public HTTPS URL and network connection.':error.message);
 process.exitCode=1;
}
