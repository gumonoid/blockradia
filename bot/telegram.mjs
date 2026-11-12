export class TelegramError extends Error{
 constructor(method,status,retryAfter){
  super('Telegram '+method+' failed ('+status+')');
  this.status=status;
  this.retryAfter=retryAfter;
 }
}

export function telegramClient(token,transport=fetch){
 if(!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token||''))throw Error('Set TELEGRAM_BOT_TOKEN in the server environment.');
 return async(method,body={},document)=>{
  const controller=AbortSignal.timeout(method==='getUpdates'?40000:25000);
  let payload,headers;
  if(document){
   payload=new FormData();
   for(const [key,value] of Object.entries(body))payload.append(key,typeof value==='object'?JSON.stringify(value):String(value));
   payload.append(method==='sendPhoto'?'photo':'document',new Blob([document.content],{type:document.type||'application/json'}),document.name);
  }else{
   payload=JSON.stringify(body);
   headers={'Content-Type':'application/json'};
  }
  let response;
  try{
   response=await transport('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',body:payload,headers,redirect:'error',signal:controller});
  }catch{throw new TelegramError(method,'transport');}
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new TelegramError(method,data?.error_code||response.status,Math.min(60,Number(data?.parameters?.retry_after)||0));
  return data.result;
 };
}
