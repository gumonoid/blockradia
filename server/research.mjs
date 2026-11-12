import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
import bundled from '../lib/ofac-snapshot.json' with {type:'json'};
import additional from '../lib/aml-additional.json' with {type:'json'};
import {networkUnits} from '../lib/workspace-ux.ts';
let snapshot=bundled,refreshing=null,lastAttempt=0,lastError=null;
let extra=additional;
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
async function download(url,max=60000000){
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Source HTTP '+response.status);
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>max)throw Error('Source too large');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
export function parseOFAC(bytes){
 const text=bytes.toString('utf8');
 if(/<!DOCTYPE|<!ENTITY/i.test(text)||XMLValidator.validate(text)!==true)throw Error('Invalid sanctions XML');
 const root=new XMLParser({parseTagValue:false,processEntities:true,removeNSPrefix:true}).parse(text).sdnList;
 if(!root)throw Error('Unknown sanctions format');
 const records=list(root.sdnEntry).flatMap(entry=>list(entry.idList?.id).filter(id=>String(id.idType).startsWith('Digital Currency Address - ')).map(id=>({currency:id.idType.slice('Digital Currency Address - '.length).trim(),address:String(id.idNumber||'').trim(),entity:[entry.firstName,entry.lastName].filter(Boolean).join(' '),uid:String(entry.uid),programs:list(entry.programList?.program)})));
 if(!records.length||records.some(r=>!r.address||!r.entity||!/^\d+$/.test(r.uid)))throw Error('Incomplete sanctions export');
 return {source:bundled.source,retrievedAt:new Date().toISOString(),publishedAt:root.publshInformation?.Publish_Date||null,sha256:createHash('sha256').update(bytes).digest('hex'),records};
}
export function updateAML(){
 if(refreshing||Date.now()-lastAttempt<3600000)return refreshing;
 lastAttempt=Date.now();
 refreshing=(async()=>{
  try{snapshot=parseOFAC(await download(bundled.source));lastError=null;}
  catch{lastError='Official OFAC refresh failed; last available snapshot retained.';}
  const urls=['https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/src/addresses/addresses-darklist.json','https://github.com/safe-fndn/sanctions-address-lists/releases/latest/download/uk.json'];
  for(let i=0;i<urls.length;i++){
   try{
    const bytes=await download(urls[i],8000000),data=JSON.parse(bytes.toString());
    if(!Array.isArray(data)||!data.length)throw Error('Invalid address list');
    const records=data.map(r=>({address:(typeof r==='string'?r:r.address).toLowerCase(),comment:typeof r==='string'?'':String(r.comment||''),date:typeof r==='string'?null:r.date||null}));
    if(!records.every(r=>/^0x[0-9a-f]{40}$/.test(r.address)))throw Error('Invalid address');
    extra=extra.map((s,j)=>j===i?{...s,records,retrievedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex')}:s);
   }catch{lastError=[lastError,'An additional source could not be refreshed.'].filter(Boolean).join(' ');}
  }
 })().finally(()=>{refreshing=null;});
 return refreshing;
}
export const amlFeed=()=>({ofac:snapshot,additional:extra,updateInProgress:!!refreshing,error:lastError});

async function json(url,body){
 const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Token source unavailable');
 const data=await response.json();if(data.error)throw Error('Token source rejected request');return data;
}
const hosts={ethereum:'eth',base:'base',arbitrum:'arbitrum',polygon:'polygon',optimism:'optimism'};
const alchemy={ethereum:'eth',base:'base',arbitrum:'arb',polygon:'polygon',optimism:'opt'};
function amount(raw,decimals){
 if(decimals==null||decimals===''||typeof raw==='number'&&!Number.isSafeInteger(raw)||!Number.isInteger(Number(decimals))||Number(decimals)<0||Number(decimals)>36||!/^\d+$/.test(String(raw)))throw Error('Unknown token precision');
 const d=Number(decimals),digits=String(raw).padStart(d+1,'0');
 return d?digits.slice(0,-d)+'.'+digits.slice(-d):digits;
}
async function tokenBalances(network,address){
 const q=encodeURIComponent(address);
 let rows=[],partial=false,source='';
 const convert=(values,build)=>values.flatMap(value=>{try{const row=build(value);if(typeof row.asset!=='string'||!row.asset)throw Error('Unknown asset');return [row];}catch{partial=true;return [];}});
 if(hosts[network]){
  source='Blockscout token balances';
  try{
   const data=await json('https://'+hosts[network]+'.blockscout.com/api/v2/addresses/'+q+'/token-balances');
   if(!Array.isArray(data))throw Error('Unknown token response');
   partial=data.length>100;
   rows=convert(data.slice(0,100),r=>({asset:r.token.address_hash,symbol:r.token.symbol||r.token.address_hash,balance:amount(r.value,r.token.decimals),price:r.token.exchange_rate}));
  }catch(error){
   const key=process.env.ALCHEMY_API_KEY;
   if(!key)throw error;
   source='Alchemy token balances';
   const endpoint='https://'+alchemy[network]+'-mainnet.g.alchemy.com/v2/'+encodeURIComponent(key);
   const rpc=async(method,params)=>(await json(endpoint,{jsonrpc:'2.0',id:1,method,params})).result;
   const data=await rpc('alchemy_getTokenBalances',[address,'erc20',{maxCount:100}]);
   if(!Array.isArray(data?.tokenBalances))throw Error('Token balances unavailable');
   const tokens=data.tokenBalances.filter(t=>!t.error&&/^0x[0-9a-f]+$/i.test(t.tokenBalance)&&BigInt(t.tokenBalance)>0n);
   partial=!!data.pageKey||tokens.length>10;
   await Promise.all(tokens.slice(0,10).map(async token=>{
    try{const meta=await rpc('alchemy_getTokenMetadata',[token.contractAddress]);rows.push({asset:token.contractAddress,symbol:meta.symbol||token.contractAddress,balance:amount(BigInt(token.tokenBalance).toString(),meta.decimals)});}
    catch{partial=true;}
   }));
  }
 }else if(network==='solana'){
  source='Solana token accounts';
  let succeeded=0;
  for(const programId of ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']){
   try{const data=await json('https://solana-rpc.publicnode.com',{jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[address,{programId},{encoding:'jsonParsed'}]});
   if(!Array.isArray(data.result?.value))throw Error('Solana token accounts unavailable');
   succeeded++;
   rows.push(...convert(data.result.value,r=>{const t=r.account.data.parsed.info;return {asset:t.mint,symbol:t.mint,balance:amount(t.tokenAmount.amount,t.tokenAmount.decimals)};}));
   }catch{partial=true;}
  }
  if(!succeeded)throw Error('Solana token sources unavailable');
 }else if(network==='ton'){
  source='TonAPI Jetton balances';
  const data=await json('https://tonapi.io/v2/accounts/'+q+'/jettons');
  if(!Array.isArray(data.balances))throw Error('Jetton balances unavailable');
  rows=convert(data.balances,t=>({asset:t.jetton.address,symbol:t.jetton.symbol||t.jetton.address,balance:amount(t.balance,t.jetton.decimals),price:t.price?.prices?.USD}));
 }else if(network==='tron'){
  source='TRONSCAN token balances';
  const data=await json('https://apilist.tronscanapi.com/api/account?address='+q);
  if(!Array.isArray(data.trc20token_balances))throw Error('TRC-20 balances unavailable');
  rows=convert(data.trc20token_balances,t=>({asset:t.tokenId,symbol:t.tokenAbbr||t.tokenId,balance:amount(t.balance,t.tokenDecimal)}));
 }
 rows=rows.filter(r=>Number(r.balance)>0);
 const assets=new Map();
 for(const r of rows){const old=assets.get(r.asset);if(old){const scale=36;const parse=v=>{const [a,b='']=v.split('.');return BigInt(a+b.padEnd(scale,'0'));};const sum=(parse(old.balance)+parse(r.balance)).toString().padStart(scale+1,'0');old.balance=(sum.slice(0,-scale)+'.'+sum.slice(-scale)).replace(/\.?0+$/,'');}else assets.set(r.asset,r);}
 return {tokens:[...assets.values()],partial,source};
}
export async function portfolio(network,address,explorer){
 if(!Object.hasOwn(networkUnits,network))return Response.json({error:'Unknown network'},{status:400});
 const [native,market,tokens]=await Promise.allSettled([
  explorer(network,'balance',address),explorer(network,'market',''),tokenBalances(network,address),
 ]);
 const unit=networkUnits[network],raw=native.status==='fulfilled'?native.value.data?.coin_balance:null;
 const price=market.status==='fulfilled'?market.value.price:null;
 const nativeBalance=raw==null?null:amount(raw,unit.decimals);
 const assets=[{asset:'native',symbol:unit.symbol,balance:nativeBalance,price},...(tokens.status==='fulfilled'?tokens.value.tokens:[])].map(r=>{const value=r.balance!=null&&r.price!=null&&String(r.price).trim()!==''&&Number.isFinite(Number(r.price))&&Number(r.price)>=0?Number(r.balance)*Number(r.price):null;return {...r,usd:value!=null&&Number.isFinite(value)?value:null};});
 return Response.json({network,address,assets,knownUSD:assets.reduce((s,r)=>s+(r.usd||0),0),unpriced:assets.filter(r=>r.usd==null).length,partial:raw==null||tokens.status==='rejected'||tokens.value.partial,source:tokens.status==='fulfilled'?tokens.value.source:'Token source unavailable',at:new Date().toISOString()});
}
