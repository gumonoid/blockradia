import http from 'node:http';
import {isIP} from 'node:net';

export function createGateway(handler,{limit=60,maxActive=16,maxActivePerClient=4,globalLimit=600,trustProxy=false,webApp}={}){
 const clients=new Map(),activeClients=new Map();let active=0,remaining=globalLimit,resetAt=0;
 const cleanup=setInterval(()=>{const now=Date.now();for(const [ip,item] of clients)if(item.reset<=now)clients.delete(ip);},60000);cleanup.unref();
 const server=http.createServer(async(req,res)=>{
  const send=(status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body));};
  if(req.method!=='GET'){send(405,{error:'Method not allowed'},{Allow:'GET'});return;}
  let url;try{url=new URL(req.url,'http://gateway');}catch{send(400,{error:'Invalid URL'});return;}
  if(url.pathname==='/healthz'){send(200,{status:'ok'});return;}
  if(url.pathname!=='/api/explorer'){
   if(webApp?.(url.pathname,res))return;
   send(404,{error:'Not found'});return;
  }
  if(req.url.length>4096){send(414,{error:'Request too long'});return;}
  // The desktop and development proxy call this API from Node, not a web origin.
  if(req.headers.origin!==undefined||['cross-site','same-site'].includes(req.headers['sec-fetch-site'])){
   send(403,{error:'Cross-origin requests are not allowed'});return;
  }
  // Enable only behind a proxy that overwrites the forwarded address.
  const forwarded=trustProxy?String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim():'';
  const ip=isIP(forwarded)?forwarded:req.socket.remoteAddress;
  const now=Date.now();let client=clients.get(ip);if(!client||client.reset<=now){if(clients.size>=10000){send(503,{error:'Сервер занят. Повторите позже.'});return;}client={count:0,reset:now+60000};clients.set(ip,client);}
  const clientActive=activeClients.get(ip)||0;
  if(++client.count>limit||clientActive>=maxActivePerClient||active>=maxActive){send(429,{error:'Сервер занят. Повторите запрос через минуту.'},{'Retry-After':'60'});return;}
  if(now>=resetAt){remaining=globalLimit;resetAt=now+60000;}
  if(remaining<=0){
   send(429,{error:'The shared API has reached its request limit. Try again shortly.'},{'Retry-After':String(Math.ceil((resetAt-now)/1000))});
   return;
  }
  remaining--;
  active++;
  activeClients.set(ip,clientActive+1);
  const controller=new AbortController();
  const disconnect=()=>{if(!res.writableFinished)controller.abort();};
  res.once('close',disconnect);
  if(res.destroyed)disconnect();
  try{const response=await handler(new Request(url,{signal:controller.signal}));const body=await response.text();if(!res.destroyed){res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}}
  catch{if(!res.destroyed)send(502,{error:'Источник данных временно недоступен.'});}finally{
   res.off('close',disconnect);
   active--;
   const count=activeClients.get(ip)-1;
   if(count)activeClients.set(ip,count);else activeClients.delete(ip);
  }
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.on('close',()=>clearInterval(cleanup));return server;
}
