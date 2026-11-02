const chains:Record<string,string>={base:'base',polygon:'polygon_pos'};
export function parseNetworkSeries(data:any,now=Date.now()){
 const daily=data?.details?.timeseries?.daily;if(!Array.isArray(daily?.types)||!Array.isArray(daily?.data))throw Error('Неверный формат сетевой статистики');
 const dateIndex=daily.types.indexOf('unix'),valueIndex=daily.types.indexOf('value');if(dateIndex<0||valueIndex<0)throw Error('Неизвестные поля статистики');
 const today=Math.floor(now/86400000)*86400000,rows=new Map<string,{date:string;value:number}>();
 for(const row of daily.data){const time=row?.[dateIndex],value=row?.[valueIndex];if(value===null)continue;if(typeof time!=='number'||typeof value!=='number'||!Number.isSafeInteger(value)||value<0||!Number.isFinite(time)||time<0)throw Error('Некорректная дата или сумма статистики');if(time>=today)continue;const date=new Date(time).toISOString().slice(0,10);if(rows.has(date))throw Error('Повторная дата сетевой статистики');rows.set(date,{date,value});}
 const series=[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)),last=series.at(-1);if(!last||now-Date.parse(last.date+'T00:00:00Z')>3*86400000)throw Error('Сетевая статистика устарела');return series;
}
export async function networkStatistics(network:string,load:(url:string)=>Promise<any>){
 const chain=chains[network];if(!chain)throw Error('Unsupported statistics network');const origin='https://api.growthepie.com/v1/metrics/chains/'+chain;
 const [tx,addresses]=await Promise.allSettled([load(origin+'/txcount.json').then(d=>parseNetworkSeries(d)),load(origin+'/daa.json').then(d=>parseNetworkSeries(d))]);
 const latestTx=tx.status==='fulfilled'?tx.value.at(-1):undefined,latestAddresses=addresses.status==='fulfilled'?addresses.value.at(-1):undefined;
 return {stats:{...(latestTx?{transactions_24h:latestTx.value}:{}),...(latestAddresses?{active_addresses_24h:latestAddresses.value}:{})},chart:tx.status==='fulfilled'?tx.value.slice(-30).map(row=>({date:row.date,transactions_count:row.value})):undefined,stats_date:latestTx?.date,addresses_date:latestAddresses?.date,statistics_source:'growthepie',statistics_url:'https://www.growthepie.com/chains/'+chain,warnings:[...(latestTx?[]:['Дневная статистика транзакций временно недоступна.']),...(latestAddresses?[]:['Статистика адресов временно недоступна.'])]};
}
