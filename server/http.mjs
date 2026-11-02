import http from 'node:http';

export function createGateway(handler,{limit=60,maxActive=16,trustProxy=false}={}){
 const clients=new Map();let active=0;
 const cleanup=setInterval(()=>{const now=Date.now();for(const [ip,item] of clients)if(item.reset<=now)clients.delete(ip);},60000);cleanup.unref();
 const server=http.createServer(async(req,res)=>{
  const send=(status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body));};
  if(req.method!=='GET'){send(405,{error:'Method not allowed'},{Allow:'GET'});return;}
  let url;try{url=new URL(req.url,'http://gateway');}catch{send(400,{error:'Invalid URL'});return;}
  if(url.pathname==='/healthz'){send(200,{status:'ok'});return;}
  if(url.pathname!=='/api/explorer'){send(404,{error:'Not found'});return;}
  if(req.url.length>4096){send(414,{error:'Request too long'});return;}
  // Enable only behind a proxy that overwrites the forwarded address.
  const ip=trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
  const now=Date.now();let client=clients.get(ip);if(!client||client.reset<=now){if(clients.size>=10000){send(503,{error:'Сервер занят. Повторите позже.'});return;}client={count:0,reset:now+60000};clients.set(ip,client);}
  if(++client.count>limit||active>=maxActive){send(429,{error:'Сервер занят. Повторите запрос через минуту.'},{'Retry-After':'60'});return;}
  active++;
  try{const response=await handler(new Request(url));const body=await response.text();if(!res.destroyed){res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}}
  catch{if(!res.destroyed)send(502,{error:'Источник данных временно недоступен.'});}finally{active--;}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.on('close',()=>clearInterval(cleanup));return server;
}
