type Read=(url:string,body?:unknown,options?:{timeoutMs?:number;retries?:number})=>Promise<any>;
export const alchemyNetworks:Record<string,string>={base:'base-mainnet',polygon:'polygon-mainnet'};
export async function alchemyAddress(network:string,address:string,key:string,read:Read,range?:{from:number;to:number}){
 const archiveNetworks:Record<string,string>={ethereum:'eth-mainnet',arbitrum:'arb-mainnet',optimism:'opt-mainnet'};
 const chain=alchemyNetworks[network]||(range?archiveNetworks[network]:undefined);if(!chain)throw Error('Unsupported Alchemy network');
 const endpoint='https://'+chain+'.g.alchemy.com/v2/'+encodeURIComponent(key);
 const rpc=async(method:string,params:unknown[])=>{const data=await read(endpoint,{jsonrpc:'2.0',id:1,method,params},{timeoutMs:6500,retries:1});if(data.result==null)throw Error('Alchemy не вернул данные');return data.result;};
 const options={fromBlock:range?'0x'+range.from.toString(16):'0x0',toBlock:range?'0x'+range.to.toString(16):'latest',category:['external','internal','erc20'],excludeZeroValue:true,withMetadata:true,order:'desc',maxCount:'0x64'};
 const pageTransfers=async(direction:{fromAddress:string}|{toAddress:string})=>{let page=await rpc('alchemy_getAssetTransfers',[{...options,...direction}]);if(!range)return page;const rows=[...(page.transfers||[])];for(let count=0;page.pageKey&&new Set(rows.map((t:any)=>t.hash)).size<100&&count<9;count++){page=await rpc('alchemy_getAssetTransfers',[{...options,...direction,pageKey:page.pageKey}]);rows.push(...(page.transfers||[]));}return {...page,transfers:rows,archive_partial:!!page.pageKey&&new Set(rows.map((t:any)=>t.hash)).size<100};};
 const results=await Promise.allSettled([rpc('eth_getBalance',[address,'latest']),rpc('eth_getCode',[address,'latest']),pageTransfers({fromAddress:address}),pageTransfers({toAddress:address})]);
 const transfers=new Map<string,any>(),transactions=new Map<string,any>();let skipped=0;
 for(const result of results.slice(2)){if(result.status!=='fulfilled')continue;if(!Array.isArray(result.value.transfers))throw Error('Alchemy не вернул список переводов');for(const item of result.value.transfers){
  const raw=item.rawContract,dec=typeof raw?.decimal==='string'&&/^0x[\da-f]+$/i.test(raw.decimal)?parseInt(raw.decimal,16):NaN;
  if(!item.hash||!item.from||!item.to||!Number.isInteger(dec)||dec<0||dec>36||!/^0x[\da-f]+$/i.test(raw?.value||'')){skipped++;continue;}
  const value=BigInt(raw.value);if(value<=0n)continue;
  const digits=value.toString().padStart(dec+1,'0'),amount=dec?digits.slice(0,-dec)+'.'+digits.slice(-dec):digits;
  const date=new Date(item.metadata?.blockTimestamp),timestamp=Number.isFinite(date.getTime())?date.toISOString():undefined;
  const id=item.uniqueId;if(!id){skipped++;continue;}
  const transfer={id,hash:item.hash,from:item.from,to:item.to,amount,symbol:item.asset||(network==='polygon'?'POL':'ETH'),asset:raw.address||'native',kind:item.category==='erc20'?'token':item.category==='internal'?'internal':'native',timestamp};
  transfers.set(id,transfer);
  if(!transactions.has(item.hash))transactions.set(item.hash,{hash:item.hash,from:{hash:item.from},to:{hash:item.to},block_number:parseInt(item.blockNum,16),timestamp,status:'ok',method:item.category==='erc20'?'Token transfer':item.category==='internal'?'Internal transfer':'Transfer',...(item.category==='erc20'?{token_amount:amount,token_symbol:transfer.symbol}:{value:value.toString()})});
 }}
 const failed=results.slice(2).filter(r=>r.status==='rejected').length;
 const archivePartial=results.slice(2).some(r=>r.status==='fulfilled'&&r.value.archive_partial);
 const balance=results[0].status==='fulfilled'&&/^0x[\da-f]+$/i.test(results[0].value)?BigInt(results[0].value).toString():null;
 const code=results[1].status==='fulfilled'?results[1].value:undefined;
 return {data:{hash:address,coin_balance:balance,...(typeof code==='string'?{is_contract:code!=='0x'}:{})},canonical_address:address,transactions:[...transactions.values()].sort((a,b)=>b.block_number-a.block_number),transfers:[...transfers.values()],source:'https://www.alchemy.com',source_name:'Alchemy Transfers API',partial_history:failed>0||archivePartial,history_error:failed===2?'История Alchemy временно недоступна. Повторите загрузку.':undefined,coverage:'Alchemy: до 100 входящих и 100 исходящих переводов, включая внутренние операции и ERC-20. Не полная история.',warnings:[...(failed?['Часть истории Alchemy не загружена. Повторите запрос.']:[]),...(skipped?['Переводы с неизвестной точностью или структурой пропущены.']:[]),...(balance===null?['Баланс временно недоступен.']:[])]};
}
