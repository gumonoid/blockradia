import {localExplorer} from '../app/api/explorer/route.ts';
import {createGateway} from './http.mjs';
import {updateAML,amlFeed,portfolio} from './research.mjs';
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const globalLimit=Number(process.env.API_REQUESTS_PER_MINUTE||600);
if(!Number.isSafeInteger(globalLimit)||globalLimit<1)throw Error('Invalid API_REQUESTS_PER_MINUTE');
const holdingsCache=new Map();
const handler=async request=>{
 const u=new URL(request.url),action=u.searchParams.get('action');
 if(action==='aml'){void updateAML();return Response.json(amlFeed());}
 if(action==='portfolio'){
  const network=u.searchParams.get('network'),address=u.searchParams.get('q')||'';
  if(address.length>128||!/^[a-zA-Z0-9_+/:=-]+$/.test(address))return Response.json({error:'Invalid address'},{status:400});
  const key=network+':'+address,cached=holdingsCache.get(key);
  if(cached&&Date.now()-cached.at<60000)return (await cached.value).clone();
  const value=portfolio(network,address,async(n,a,q)=>{
   const r=await localExplorer(new Request('http://api/api/explorer?'+new URLSearchParams({network:n,action:a,q,period:'24Ч'})));
   const d=await r.json();if(!r.ok)throw Error('Source unavailable');return d;
  });
  if(holdingsCache.size>=100)holdingsCache.delete(holdingsCache.keys().next().value);
  holdingsCache.set(key,{at:Date.now(),value});
  return (await value).clone();
 }
 return localExplorer(request);
};
const server=createGateway(handler,{globalLimit,trustProxy:process.env.TRUST_PROXY==='true'});
void updateAML();
setInterval(()=>void updateAML(),3600000).unref();
server.listen(port,'0.0.0.0',()=>console.log('BlockRadia API listening on port '+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
