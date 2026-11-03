export const MARKET_PERIODS:Record<string,{seconds:number;step:string;stepSeconds:number;candleMs:number;stepLabel:string;candleLabel:string}>={
 '1Ч':{seconds:3600,step:'1m',stepSeconds:60,candleMs:300000,stepLabel:'1 мин',candleLabel:'5 мин'},
 '4Ч':{seconds:14400,step:'1m',stepSeconds:60,candleMs:900000,stepLabel:'1 мин',candleLabel:'15 мин'},
 '24Ч':{seconds:86400,step:'5m',stepSeconds:300,candleMs:3600000,stepLabel:'5 мин',candleLabel:'1 час'},
 '7Д':{seconds:604800,step:'30m',stepSeconds:1800,candleMs:21600000,stepLabel:'30 мин',candleLabel:'6 часов'},
 '14Д':{seconds:1209600,step:'1h',stepSeconds:3600,candleMs:43200000,stepLabel:'1 час',candleLabel:'12 часов'},
 '30Д':{seconds:2592000,step:'2h',stepSeconds:7200,candleMs:86400000,stepLabel:'2 часа',candleLabel:'1 день'},
 '90Д':{seconds:7776000,step:'6h',stepSeconds:21600,candleMs:259200000,stepLabel:'6 часов',candleLabel:'3 дня'},
 '1Г':{seconds:31536000,step:'1d',stepSeconds:86400,candleMs:604800000,stepLabel:'1 день',candleLabel:'1 неделя'}
};
export function priceChange(rows:{date:string;value:number}[],current:unknown){
 if(current!=null&&(!['number','string'].includes(typeof current)||String(current).trim()===''))return null;
 const points=rows.filter(p=>Number.isFinite(Date.parse(p.date))&&Number.isFinite(Number(p.value))&&Number(p.value)>=0).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const start=Number(points[0]?.value),last=current==null?Number(points.at(-1)?.value):Number(current);
 if(!points.length||!Number.isFinite(start)||start<=0||!Number.isFinite(last)||last<0)return null;
 const change=(last/start-1)*100;return Number.isFinite(change)?change:null;
}
export function balanceInUSD(raw:unknown,decimals:number,price:unknown){
 if(raw==null||price==null||!['number','string'].includes(typeof price)||String(price).trim()===''||!Number.isInteger(decimals)||decimals<0||decimals>36||!Number.isFinite(Number(price))||Number(price)<0)return null;
 if(typeof raw==='number'&&!Number.isSafeInteger(raw))return null;
 if(!/^\d+$/.test(String(raw)))return null;
 const amount=BigInt(String(raw)),scale=10n**BigInt(decimals);
 const value=(Number(amount/scale)+Number(amount%scale)/Number(scale))*Number(price);
 return Number.isFinite(value)?value:null;
}
