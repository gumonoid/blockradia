import {cleanSeries,cleanCandles,makeCandles,type SeriesPoint,type Candle} from '../../lib/chart-series';
import {t,getLocale} from '../../lib/i18n';
export default function SeriesPlot({rows,price,candles,candleIntervalMs,ohlc}:{rows:SeriesPoint[];price:boolean;candles:boolean;candleIntervalMs?:number;ohlc?:Candle[]}){
 candles=price&&candles;
 const points=cleanSeries(rows),supplied=price&&ohlc?.length?cleanCandles(ohlc):[],bars=supplied.length?supplied:makeCandles(points,price,candleIntervalMs);if(!points.length)return null;
 const intraday=Date.parse(points.at(-1)!.date)-Date.parse(points[0].date)<172800000;
 const values=candles?bars.flatMap(c=>[c.low,c.high]):points.map(p=>p.value),minimum=Math.min(...values),maximum=Math.max(...values),padding=(maximum-minimum||Math.max(maximum*.0001,.000001))*.08,low=Math.max(0,minimum-padding),high=maximum+padding,range=high-low;
 const y=(value:number)=>145-(value-low)/range*125;
 const precision=price?Math.min(10,Math.max(maximum<1?6:maximum<100?4:2,Math.ceil(-Math.log10(range/8)))):0;
 const number=(v:number)=>v.toLocaleString(getLocale(),{maximumFractionDigits:precision});
 const coords=points.map((p,i)=>(points.length===1?360:i/(points.length-1)*720)+','+y(p.value)).join(' ');
 const labels=candles?bars:points;
 return <div className="chart"><div className="y-axis">{[1,.66,.33,0].map(v=><span key={v}>{price?'$':''}{number(low+(high-low)*v)}</span>)}</div><div className="plot"><div className="gridlines"><i/><i/><i/><i/></div><svg className={candles?'candlestick-plot':''} viewBox="0 0 720 165" preserveAspectRatio="none" role="img" aria-label={t(candles?'Японские свечи':'Линейный график')}>
 {candles?bars.map((bar,i)=>{const x=(i+.5)*720/bars.length,width=Math.min(16,720/bars.length*.72),color=bar.close>=bar.open?'#279c79':'#d85c72';return <g key={bar.date}><title>{new Date(bar.date).toLocaleString(getLocale(),{timeZoneName:'short'})+' · O '+number(bar.open)+' · H '+number(bar.high)+' · L '+number(bar.low)+' · C '+number(bar.close)+' · '+bar.count+' '+t(bar.basis==='trades'?'сделок':'точек')+(bar.complete===false?' · '+t('Текущая свеча'):'')}</title><line x1={x} x2={x} y1={y(bar.high)} y2={y(bar.low)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"/><rect x={x-width/2} y={Math.min(y(bar.open),y(bar.close))} width={width} height={Math.max(1.5,Math.abs(y(bar.open)-y(bar.close)))} fill={color}/></g>}):<><polygon points={'0,165 '+coords+' 720,165'}/><polyline points={coords} fill="none" stroke="var(--purple)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>{points.length===1&&<circle cx="360" cy={y(points[0].value)} r="3" fill="var(--purple)"/>}</>}
 </svg><div className="x-axis">{labels.filter((_,i)=>i===0||i===Math.floor(labels.length/2)||i===labels.length-1).map(p=><span key={p.date}>{new Date(p.date).toLocaleString(getLocale(),price&&!intraday?{day:'2-digit',month:'2-digit'}:{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>)}</div></div></div>;
}
