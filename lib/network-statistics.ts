const sources:Record<string,string>={base:'https://basescan.org',polygon:'https://polygonscan.com'};
export function parseNetworkCSV(text:string,now=Date.now()){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.shift()?.trim()!=='"Date(UTC)","UnixTimeStamp","Value"')throw Error('Неверный формат сетевой статистики');
 const rows=new Map<string,{date:string;value:number}>();
 for(const line of lines){const match=line.match(/^"[^"]+","(\d+)","(\d+)"$/);if(!match)throw Error('Некорректная строка сетевой статистики');const time=Number(match[1])*1000,value=Number(match[2]);if(!Number.isSafeInteger(value)||!Number.isFinite(time)||time>now||time<0)throw Error('Некорректная дата или сумма статистики');const date=new Date(time).toISOString().slice(0,10);if(rows.has(date))throw Error('Повторная дата сетевой статистики');rows.set(date,{date,value});}
 const series=[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date));const last=series.at(-1);if(!last||now-Date.parse(last.date+'T00:00:00Z')>3*86400000)throw Error('Сетевая статистика устарела');return series;
}
export async function networkStatistics(network:string,load:(url:string)=>Promise<ReturnType<typeof parseNetworkCSV>>){
 const origin=sources[network];if(!origin)throw Error('Unsupported statistics network');
 const [tx,addresses]=await Promise.allSettled([load(origin+'/chart/tx?output=csv'),load(origin+'/chart/address?output=csv')]);
 const latestTx=tx.status==='fulfilled'?tx.value.at(-1):undefined,latestAddresses=addresses.status==='fulfilled'?addresses.value.at(-1):undefined;
 return {stats:{...(latestTx?{transactions_24h:latestTx.value}:{}),...(latestAddresses?{total_addresses:latestAddresses.value}:{})},chart:tx.status==='fulfilled'?tx.value.slice(-30).map(row=>({date:row.date,transactions_count:row.value})):undefined,stats_date:latestTx?.date,addresses_date:latestAddresses?.date,statistics_source:network==='base'?'BaseScan':'PolygonScan',statistics_url:origin+'/charts',warnings:[...(latestTx?[]:['Дневная статистика транзакций временно недоступна.']),...(latestAddresses?[]:['Статистика адресов временно недоступна.'])]};
}
