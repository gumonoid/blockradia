export type SeriesPoint={date:string;value:number};
export type Candle={date:string;open:number;high:number;low:number;close:number;count:number;basis?:'trades'|'samples';complete?:boolean};
export function cleanCandles(rows:Candle[]){return rows.filter(c=>Number.isFinite(Date.parse(c.date))&&[c.open,c.high,c.low,c.close].every(v=>Number.isFinite(v)&&v>=0)&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));}
export function cleanSeries(rows:SeriesPoint[]){return rows.filter(p=>Number.isFinite(Date.parse(p.date))&&Number.isFinite(p.value)&&p.value>=0).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));}
export function makeCandles(rows:SeriesPoint[],price:boolean,candleIntervalMs?:number):Candle[]{
 const points=cleanSeries(rows);if(!points.length)return [];
 const span=Date.parse(points.at(-1)!.date)-Date.parse(points[0].date);
 const interval=price?(candleIntervalMs&&Number.isFinite(candleIntervalMs)&&candleIntervalMs>0?candleIntervalMs:86400000):Math.max(60000,Math.ceil((span+1)/10/60000)*60000);
 const groups=new Map<number,Candle>();
 for(const p of points){const bucket=Math.floor(Date.parse(p.date)/interval)*interval;const candle=groups.get(bucket);if(candle){candle.high=Math.max(candle.high,p.value);candle.low=Math.min(candle.low,p.value);candle.close=p.value;candle.count++;}else groups.set(bucket,{date:new Date(bucket).toISOString(),open:p.value,high:p.value,low:p.value,close:p.value,count:1});}
 return [...groups.values()];
}
