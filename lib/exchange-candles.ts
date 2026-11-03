type Read=(url:string,body?:unknown,options?:{timeoutMs?:number;retries?:number})=>Promise<any>;
const pairs:Record<string,string>={bitcoin:'XBTUSD',ethereum:'ETHUSD',base:'ETHUSD',arbitrum:'ETHUSD',optimism:'ETHUSD',solana:'SOLUSD',tron:'TRXUSD',ton:'TONUSD',polygon:'POLUSD'};
export type ExchangeCandle={date:string;open:number;high:number;low:number;close:number;count:number;basis:'trades';complete:boolean};
export function parseExchangeCandles(rows:unknown,intervalMinutes:number,wanted:number,now=Date.now()):ExchangeCandle[]{
 if(!Number.isInteger(intervalMinutes)||intervalMinutes<=0||!Number.isInteger(wanted)||wanted<1||wanted>720)throw Error('Invalid candle interval');
 if(!Array.isArray(rows))throw Error('Missing exchange candles');
 const interval=intervalMinutes*60000,start=Math.floor(now/interval)*interval-(wanted-1)*interval;
 const candles=new Map<number,ExchangeCandle>();
 for(const row of rows){if(!Array.isArray(row))continue;const time=Number(row[0])*1000,[open,high,low,close]=row.slice(1,5).map(Number),count=Number(row[7]);
  if(!Number.isSafeInteger(time)||time%interval!==0||time<start||time>now||[open,high,low,close].some(v=>!Number.isFinite(v)||v<=0)||low>Math.min(open,close)||high<Math.max(open,close)||row[7]==null||row[7]===''||!Number.isSafeInteger(count)||count<0)continue;
  candles.set(time,{date:new Date(time).toISOString(),open,high,low,close,count,basis:'trades',complete:time+interval<=now});
 }
 const result=[...candles.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(-wanted);
 if(result.length<Math.min(10,wanted))throw Error('Insufficient exchange candles');
 return result;
}
export async function exchangeMarket(network:string,period:string,read:Read){
 const windows:Record<string,{interval:number;wanted:number}>={'1Ч':{interval:1,wanted:60},'4Ч':{interval:5,wanted:48},'7Д':{interval:240,wanted:42},'14Д':{interval:240,wanted:84}};
 const pair=pairs[network],window=windows[period];
 if(!pair||!window||(['7Д','14Д'].includes(period)&&network!=='ton'))throw Error('Unsupported exchange period');
 const {interval,wanted}=window;
 const now=Date.now(),since=Math.floor(now/(interval*60000))*interval*60-(wanted-1)*interval*60-1;
 const source='https://api.kraken.com/0/public/OHLC?'+new URLSearchParams({pair,interval:String(interval),since:String(since)});
 const data=await read(source,undefined,{timeoutMs:5000,retries:0});if(data.error?.length)throw Error('Exchange candles unavailable');
 const canonical=pair==='XBTUSD'?'XXBTZUSD':pair==='ETHUSD'?'XETHZUSD':pair;
 const ohlc=parseExchangeCandles(data.result?.[pair]||data.result?.[canonical],interval,wanted,now),first=ohlc[0],last=ohlc.at(-1)!;
 return {period,price:last.close,updated_at:new Date(now).toISOString(),chart:ohlc.map(c=>({date:c.date,value:c.close})),ohlc,candle_kind:'exchange',candle_interval_ms:interval*60000,change_percent:(last.close/first.open-1)*100,quote_currency:'USD',source,source_url:source,source_name:'Kraken'};
}
