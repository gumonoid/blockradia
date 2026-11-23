// Server-side adapters. Provider URLs are fixed; keys never enter the report.
import {securityFlags} from './aml-scanner-types.ts';
import type {ScannerFeed,ScannerSource,ScannerFinding} from './aml-scanner-types.ts';

const chains:Record<string,string>={ethereum:'1',base:'8453',arbitrum:'42161',optimism:'10',polygon:'137',tron:'tron'};
const explorers:Record<string,string>={ethereum:'eth.blockscout.com',base:'base.blockscout.com',arbitrum:'arbitrum.blockscout.com',optimism:'optimism.blockscout.com',polygon:'polygon.blockscout.com'};
const clean=(value:unknown)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180):'';
const object=(value:any)=>value&&typeof value==='object'&&!Array.isArray(value);

async function readJSON(url:string,headers:Record<string,string>={}){
 const response=await fetch(url,{headers:{accept:'application/json',...headers},redirect:'error',signal:AbortSignal.timeout(6500)});
 if(!response.ok){await response.body?.cancel();throw Error('Source unavailable');}
 const reader=response.body?.getReader();if(!reader)throw Error('Empty response');
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>131072)throw Error('Response too large');chunks.push(value);}}
 finally{await reader.cancel();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function parseGoPlus(data:any){
 if(data?.code!==1||!object(data.result))throw Error('Invalid GoPlus response');
 const result=data.result,findings:ScannerFinding[]=[];let checks=0;
 for(const code of securityFlags){
  const value=result[code];
  if(value==='0'||value===0||value==='1'||value===1)checks++;
  if(value==='1'||value===1)findings.push({code,label:code.replaceAll('_',' '),kind:'risk',attribution:clean(result.data_source)});
 }
 const count=result.number_of_malicious_contracts_created;
 if((typeof count==='string'&&/^\d+$/.test(count)||typeof count==='number')&&Number.isSafeInteger(Number(count))&&Number(count)>=0){
  checks++;
  if(Number(count)>0)findings.push({code:'malicious_contracts_created',label:'Malicious contracts created: '+count,kind:'risk',attribution:clean(result.data_source)});
 }
 if(!checks)throw Error('No recognized GoPlus checks');
 return {findings,checks,totalChecks:securityFlags.length+1,status:checks===securityFlags.length+1?'ok':'partial'} as const;
}

export function parseBlockscout(data:any,address:string){
 if(!object(data)||typeof data.hash!=='string'||data.hash.toLowerCase()!==address.toLowerCase())throw Error('Address mismatch');
 const findings:ScannerFinding[]=[];
 if(data.is_scam===true)findings.push({code:'scam',label:'Explorer scam flag',kind:'risk'});
 // Public names are attribution only. Verification and "ok" reputation never prove safety.
 for(const label of [data.name,...(Array.isArray(data.public_tags)?data.public_tags.slice(0,15).map((t:any)=>t?.label):[])]){
  if(clean(label)&&!findings.some(f=>f.label===clean(label)))findings.push({code:'public_label',label:clean(label),kind:'label'});
 }
 const valid=typeof data.is_scam==='boolean';
 return {findings,checks:valid?1:0,totalChecks:1,status:valid?'ok':'partial'} as const;
}

export function parseTronscan(data:any){
 if(!object(data)||!['redTag','blueTag','greyTag','publicTag'].every(key=>typeof data[key]==='string'))throw Error('Invalid TRONSCAN tags');
 const findings:ScannerFinding[]=[];
 for(const key of ['redTag','blueTag','greyTag','publicTag']){
  if(clean(data[key]))findings.push({code:key==='redTag'?'risk_tag':'public_label',label:clean(data[key]),kind:key==='redTag'?'risk':'label'});
 }
 return {findings,checks:1,totalChecks:1,status:'ok'} as const;
}

export function createScannerCollector(read:typeof readJSON=readJSON,env:Record<string,string|undefined>=process.env){
 const cache=new Map<string,{expires:number;value:Promise<ScannerFeed>}>();let active=0;
 return async function collect(network:string,address:string):Promise<ScannerFeed>{
  if(!['bitcoin','solana','ton',...Object.keys(chains)].includes(network))throw Error('Invalid network');
  if(chains[network]&&(network==='tron'?!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address):!/^0x[\da-f]{40}$/i.test(address)))throw Error('Invalid address');
  const key=network+':'+(explorers[network]?address.toLowerCase():address),cached=cache.get(key);
  if(cached&&cached.expires>Date.now())return cached.value;
  const source=(id:string,name:string,url:string):ScannerSource=>({id,name,url,status:'unavailable',checkedAt:null,checks:0,totalChecks:0,findings:[]});
  const run=async()=>{
   const sources:ScannerSource[]=[];
   const tasks:Promise<void>[]=[];
   const query=(s:ScannerSource,url:string,parse:(data:any)=>Partial<ScannerSource>,headers:Record<string,string>={})=>{
    sources.push(s);
    tasks.push((async()=>{
     if(active>=8)return;
     active++;
     try{Object.assign(s,parse(await read(url,headers)),{checkedAt:new Date().toISOString()});}
     catch{s.status='unavailable';}
     finally{active--;}
    })());
   };
   if(chains[network]){
    const url='https://api.gopluslabs.io/api/v1/address_security/'+encodeURIComponent(address)+'?chain_id='+chains[network];
    query(source('goplus','GoPlus Security',url),url,parseGoPlus);
   }else{
    sources.push({...source('goplus','GoPlus Security','https://docs.gopluslabs.io/reference/addresscontractusingget_1'),status:'unsupported'});
   }
   if(explorers[network]){
    const origin='https://'+explorers[network];
    const url=env.BLOCKSCOUT_API_KEY
     ?'https://api.blockscout.com/'+chains[network]+'/api/v2/addresses/'+address+'?apikey='+encodeURIComponent(env.BLOCKSCOUT_API_KEY)
     :origin+'/api/v2/addresses/'+address;
    query(source('blockscout','Blockscout',origin+'/address/'+address),url,data=>parseBlockscout(data,address));
   }
   if(network==='tron'){
    const s=source('tronscan','TRONSCAN','https://tronscan.org/#/address/'+address);
    if(env.TRONSCAN_API_KEY)query(s,'https://apilist.tronscanapi.com/api/account/tag?address='+address,parseTronscan,{'TRON-PRO-API-KEY':env.TRONSCAN_API_KEY});
    else sources.push({...s,status:'not_configured'});
   }
   await Promise.all(tasks);
   return {network,address,checkedAt:new Date().toISOString(),sources};
  };
  const value=run();
  if(cache.size>=300)cache.delete(cache.keys().next().value!);
  const entry={expires:Date.now()+300000,value};cache.set(key,entry);
  value.then(feed=>{if(feed.sources.some(s=>s.status==='unavailable'||s.status==='partial'))entry.expires=Date.now()+30000;},()=>cache.delete(key));
  return value;
 };
}
export const collectScannerEvidence=createScannerCollector();
