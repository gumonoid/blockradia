type Read=(url:string,body?:unknown,options?:{timeoutMs?:number;retries?:number})=>Promise<any>;
type Dependencies={read:Read;evm:Record<string,{rpc:string;api:string;symbol:string}>;alchemy:(network:string,address:string,from:number,to:number)=>Promise<any>;tronNode:(path:string,body:any)=>Promise<any>;tronTx:(tx:any,block?:any)=>Promise<any>;tonRaw:(address:string)=>string;tonBundle:(data:any)=>any};
const stamp=(seconds:number)=>new Date(seconds*1000).toISOString();
export async function blockAtTime(tip:number,target:number,getTime:(height:number)=>Promise<number>):Promise<number>{
 let lo=0,hi=tip,result=-1;
 while(lo<=hi){const mid=Math.floor((lo+hi)/2),time=await getTime(mid);if(!Number.isFinite(time))throw Error('Archive returned an invalid block timestamp');if(time<=target){result=mid;lo=mid+1}else hi=mid-1;}
 return result;
}
export async function archiveHistory(network:string,start:number,end:number,address:string,d:Dependencies){
 const from=Math.floor(start/1000),to=end/1000,began=Date.now();
 const inRange=(tx:any)=>{const t=Date.parse(tx.timestamp||'');return Number.isFinite(t)&&t>=start&&t<=end};
 const done=(rows:any[],source:string,name:string,partial=false,warnings:string[]=[])=>({transactions:[...new Map(rows.filter(inRange).map(tx=>[tx.hash,tx])).values()].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)||(b.block_number||0)-(a.block_number||0)).slice(0,100),source,source_name:name,partial_history:partial,warnings,range:{start,end},fetched_at:new Date().toISOString()});
 if(network==='ton'){
  const query=new URLSearchParams({limit:'100',sort:'desc',start_utime:String(from),end_utime:String(Math.floor(to)),...(address?{account:d.tonRaw(address)}:{workchain:'0'})});
  const url='https://toncenter.com/api/v3/transactions?'+query,data=await d.read(url);
  if(!Array.isArray(data.transactions))throw Error('TON archive did not return transactions');
  return done(d.tonBundle(data).transactions,url,'TON Center archive');
 }
 if(network==='tron'){
  if(address){
   const query=new URLSearchParams({limit:'100',only_confirmed:'true',min_timestamp:String(start),max_timestamp:String(end),order_by:'block_timestamp,desc'});
   const base='https://api.trongrid.io/v1/accounts/'+encodeURIComponent(address)+'/transactions';
   const results=await Promise.allSettled([d.read(base+'?'+query),d.read(base+'/trc20?'+query)]);const rows:any[]=[];
   if(results.every(r=>r.status==='rejected'))throw Error('TRON archive is unavailable');
   if(results[0].status==='fulfilled'){if(!Array.isArray(results[0].value.data))throw Error('Invalid TRON archive response');rows.push(...await Promise.all(results[0].value.data.map((tx:any)=>d.tronTx(tx))))}
   if(results[1].status==='fulfilled'){if(!Array.isArray(results[1].value.data))throw Error('Invalid TRC-20 archive response');for(const tx of results[1].value.data){const decimals=Number(tx.token_info?.decimals);if(tx.token_info?.decimals==null||!Number.isInteger(decimals)||decimals<0||decimals>36||!/^\d+$/.test(tx.value))continue;const value=tx.value.padStart(decimals+1,'0');rows.push({hash:tx.transaction_id,from:{hash:tx.from},to:{hash:tx.to},timestamp:stamp(tx.block_timestamp/1000),token_amount:decimals?value.slice(0,-decimals)+'.'+value.slice(-decimals):value,token_symbol:tx.token_info.symbol,status:'ok',method:'TRC20 Transfer'})}}
   const partial=results.some(r=>r.status==='rejected');return done(rows,base,'TronGrid archive',partial,partial?['Some TRON archive sources did not respond.']:[]);
  }
  const latest=await d.tronNode('/wallet/getnowblock',{}),tip=latest.block_header.raw_data.number,cache=new Map<number,any>([[tip,latest]]);
  const block=async(height:number)=>{if(!cache.has(height))cache.set(height,await d.tronNode('/wallet/getblockbynum',{num:height}));return cache.get(height)};
  let height=await blockAtTime(tip,to,async n=>(await block(n)).block_header.raw_data.timestamp/1000);const rows:any[]=[];
  for(let count=0;height>=0&&count<128&&rows.length<100;count++,height--){const b=await block(height),time=b.block_header.raw_data.timestamp/1000;if(time<from)break;rows.push(...await Promise.all((b.transactions||[]).map((tx:any)=>d.tronTx(tx,b))));if(Date.now()-began>50000)break;}
  const partial=height>=0&&rows.length<100&&(await block(height)).block_header.raw_data.timestamp/1000>=from;
  return done(rows,'https://tron-rpc.publicnode.com','TRON block archive',partial);
 }
 const evm=d.evm[network];
 if(evm){
  const backups:Record<string,string>={arbitrum:'https://arbitrum-one-rpc.publicnode.com',base:'https://base-rpc.publicnode.com',optimism:'https://optimism-rpc.publicnode.com'};
  let endpoint=network==='arbitrum'?backups.arbitrum:evm.rpc;
  const rpc=async(method:string,params:any[])=>{let error:unknown;for(const url of [...new Set([endpoint,evm.rpc,backups[network]].filter(Boolean))]){try{const response=await d.read(url,{jsonrpc:'2.0',id:1,method,params},{timeoutMs:4500,retries:0});if(response.result==null)throw Error('EVM archive returned no data');endpoint=url;return response.result}catch(e){error=e}}throw error};
  const tip=parseInt(await rpc('eth_blockNumber',[]),16),cache=new Map<number,any>();
  const block=async(height:number,full=false)=>{const old=cache.get(height);if(old&&(!full||!old.transactions.length||typeof old.transactions[0]==='object'))return old;const value=await rpc('eth_getBlockByNumber',['0x'+height.toString(16),full]);cache.set(height,value);return value};
  const time=async(height:number)=>parseInt((await block(height)).timestamp,16);
  const last=await blockAtTime(tip,to,time);if(last<0)return done([],evm.rpc,'EVM archive');
  let first=0;
  if(address){first=(await blockAtTime(last,from-1,time))+1;if(first>last)return done([],evm.rpc,'EVM archive');
   if(process.env.ALCHEMY_API_KEY){try{const data=await d.alchemy(network,address,first,last);if(data.history_error)throw Error(data.history_error);return done(data.transactions||[],data.source,'Alchemy archive',!!data.partial_history,data.warnings||[]);}catch{/* Use Blockscout when this network is not enabled on the Alchemy key. */}}
   const url=evm.api+'/api?'+new URLSearchParams({module:'account',action:'txlist',address,startblock:String(first),endblock:String(last),sort:'desc',page:'1',offset:'100'});
   try{const response=await d.read(url);if(!Array.isArray(response.result))throw Error('Indexer archive unavailable');return done(response.result.map((tx:any)=>({hash:tx.hash,from:{hash:tx.from},to:{hash:tx.to},value:tx.value,block_number:Number(tx.blockNumber),timestamp:stamp(Number(tx.timeStamp)),status:tx.isError==='1'?'error':'ok',method:tx.input==='0x'?'Transfer':'Contract call'})),evm.api,'Blockscout archive')}catch{/* Bounded RPC fallback below exposes incomplete address coverage. */}
  }
  const rows:any[]=[];let height=last;
  for(let scanned=0;height>=first&&scanned<256&&rows.length<100;){const heights=Array.from({length:Math.min(4,height-first+1)},(_,i)=>height-i);const blocks=await Promise.all(heights.map(h=>block(h,true)));height-=heights.length;scanned+=heights.length;let reached=false;
   for(const b of blocks){const seconds=parseInt(b.timestamp,16);if(seconds<from){reached=true;continue;}for(const tx of b.transactions||[]){if(address&&tx.from?.toLowerCase()!==address.toLowerCase()&&tx.to?.toLowerCase()!==address.toLowerCase())continue;rows.push({hash:tx.hash,from:{hash:tx.from},to:{hash:tx.to},value:BigInt(tx.value||'0x0').toString(),block_number:parseInt(b.number,16),timestamp:stamp(seconds),status:'confirmed',method:tx.input==='0x'?'Transfer':'Contract call'});}}
   if(reached){height=-1;break;}if(Date.now()-began>50000)break;
  }
  const partial=rows.length<100&&height>=first;
  return done(rows,endpoint,'EVM block archive',partial,address?['RPC address history covers direct transactions; token-only and internal transfers require the indexer.']:[]);
 }
 if(network==='solana')return solanaArchive(start,end,address,d.read,began);
 throw Error('Unknown archive network');
}

export function solanaArchiveTransaction(tx:any,slot:number,seconds:number,wallet=''){
 const instructions=[...(tx.transaction?.message?.instructions||[]),...(tx.meta?.innerInstructions||[]).flatMap((row:any)=>row.instructions||[])];
 const native=instructions.filter((i:any)=>i.program==='system'&&i.parsed?.type==='transfer'&&(!wallet||i.parsed.info.source===wallet||i.parsed.info.destination===wallet));
 const first=native[0]?.parsed.info;
 return {hash:tx.transaction?.signatures?.[0],block_number:slot,timestamp:stamp(seconds),status:tx.meta?.err?'error':'ok',method:'Solana transaction',...(native.length?{from:{hash:first.source},to:{hash:first.destination},value:native.reduce((sum:bigint,i:any)=>sum+BigInt(i.parsed.info.lamports||0),0n).toString()}:{})};
}
async function solanaArchive(start:number,end:number,address:string,read:Read,began:number){
 let source='https://solana-rpc.publicnode.com';
 const rpc=async(method:string,params:any[])=>{let error:unknown;for(const endpoint of [source,'https://api.mainnet-beta.solana.com'].filter((s,i,a)=>a.indexOf(s)===i)){try{const response=await read(endpoint,{jsonrpc:'2.0',id:1,method,params},{timeoutMs:5000,retries:0});if(response.result==null)throw Error('Solana archive returned no data');source=endpoint;return response.result}catch(e){error=e}}throw error};
 const from=start/1000,to=end/1000,tip=await rpc('getSlot',[{commitment:'finalized'}]);
 const times=new Map<number,{slot:number;time:number}>();
 const time=async(slot:number)=>{if(times.has(slot))return times.get(slot)!;try{const t=await rpc('getBlockTime',[slot]);const row={slot,time:Number(t)};times.set(slot,row);return row}catch{const slots=await rpc('getBlocks',[slot,Math.min(tip,slot+100),{commitment:'finalized'}]);if(!slots.length)throw Error('Historical Solana slots are unavailable');const row={slot:slots[0],time:Number(await rpc('getBlockTime',[slots[0]]))};times.set(slot,row);return row}};
 let lo=0,hi=tip,last=-1;
 while(lo<=hi){const mid=Math.floor((lo+hi)/2),row=await time(mid);if(!Number.isFinite(row.time))throw Error('Invalid Solana block time');if(row.time<=to){last=row.slot;lo=Math.max(mid+1,row.slot+1)}else hi=mid-1;}
 const result=(rows:any[],partial=false,warnings:string[]=[])=>({transactions:rows.filter(t=>Date.parse(t.timestamp)>=start&&Date.parse(t.timestamp)<=end).sort((a,b)=>b.block_number-a.block_number).slice(0,100),source,source_name:'Solana RPC archive',partial_history:partial,warnings,range:{start,end},fetched_at:new Date().toISOString()});
 if(last<0)return result([]);
 const getBlock=(slot:number,details='full')=>rpc('getBlock',[slot,{encoding:'jsonParsed',transactionDetails:details,rewards:false,maxSupportedTransactionVersion:1,commitment:'finalized'}]);
 if(address){
  let before:string|undefined;
  if(last<tip){const next=await rpc('getBlocks',[last+1,Math.min(tip,last+100),{commitment:'finalized'}]);if(!next.length)throw Error('Could not locate the date boundary');const boundary=await getBlock(next[0],'signatures');before=boundary.signatures?.[0];if(!before)throw Error('Could not locate the date boundary signature');}
  const signatures=await rpc('getSignaturesForAddress',[address,{limit:1000,...(before?{before}:{}),commitment:'finalized'}]);
  const chosen=signatures.filter((s:any)=>s.blockTime!=null&&s.blockTime>=from&&s.blockTime<=to).slice(0,100);
  const rows:any[]=chosen.map((s:any)=>({hash:s.signature,block_number:s.slot,timestamp:stamp(s.blockTime),status:s.err?'error':'ok',method:'Solana transaction'}));
  let partial=signatures.length===1000&&chosen.length<100&&signatures.at(-1)?.blockTime>=from,failed=0;
  const slots=[...new Set<number>(chosen.map((s:any)=>s.slot))];
  for(let i=0;i<slots.length;i+=3){if(Date.now()-began>48000){failed+=slots.length-i;break;}const group=await Promise.allSettled(slots.slice(i,i+3).map(slot=>getBlock(slot)));for(let j=0;j<group.length;j++){const entry=group[j];if(entry.status==='rejected'){failed++;continue;}const b=entry.value;for(const tx of b.transactions||[]){const index=rows.findIndex(row=>row.hash===tx.transaction?.signatures?.[0]);if(index>=0)rows[index]=solanaArchiveTransaction(tx,slots[i+j],b.blockTime??Date.parse(rows[index].timestamp)/1000,address);}}}
  partial=partial||failed>0;return result(rows,partial,failed?['Some Solana transaction details could not be decoded. Hashes, block numbers and dates are retained.']:[]);
 }
 const rows:any[]=[];let slot=last,finished=false;
 for(let page=0;slot>=0&&page<32&&rows.length<100;page++){
  const slots=await rpc('getBlocks',[Math.max(0,slot-31),slot,{commitment:'finalized'}]);
  for(const current of [...slots].reverse()){const b=await getBlock(current);if(b.blockTime<from){finished=true;break;}if(b.blockTime>to)continue;for(const tx of b.transactions||[]){if(tx.transaction?.message?.instructions?.some((i:any)=>i.program==='vote'))continue;const row=solanaArchiveTransaction(tx,current,b.blockTime);if(row.hash)rows.push(row);}if(rows.length>=100)break;}
  if(finished)break;slot-=32;if(Date.now()-began>50000)break;
 }
 return result(rows,rows.length<100&&!finished&&slot>=0);
}
