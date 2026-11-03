import {cleanSeries,makeCandles,type SeriesPoint} from '../../lib/chart-series';
import {t,getLocale} from '../../lib/i18n';
export default function SeriesPlot({rows,price,candles}:{rows:SeriesPoint[];price:boolean;candles:boolean}){
 const points=cleanSeries(rows),bars=makeCandles(points,price);if(!points.length)return null;
 const values=points.map(p=>p.value),low=Math.min(...values),high=Math.max(...values),range=high-low||Math.max(high*.01,1);
 const y=(value:number)=>145-(value-low)/range*125;
 const number=(v:number)=>v.toLocaleString(getLocale(),{maximumFractionDigits:price?5:0});
 const coords=points.map((p,i)=>(points.length===1?360:i/(points.length-1)*720)+','+y(p.value)).join(' ');
 const labels=candles?bars:points;
 return <div className="chart"><div className="y-axis">{[1,.66,.33,0].map(v=><span key={v}>{price?'$':''}{number(low+(high-low)*v)}</span>)}</div><div className="plot"><div className="gridlines"><i/><i/><i/><i/></div><svg className={candles?'candlestick-plot':''} viewBox="0 0 720 165" preserveAspectRatio="none" role="img" aria-label={t(candles?'Японские свечи':'Линейный график')}>
 {candles?bars.map((bar,i)=>{const x=(i+.5)*720/bars.length,width=Math.min(18,720/bars.length*.55),color=bar.close>=bar.open?'#279c79':'#d85c72';return <g key={bar.date}><title>{new Date(bar.date).toLocaleString(getLocale())+' · O '+number(bar.open)+' · H '+number(bar.high)+' · L '+number(bar.low)+' · C '+number(bar.close)+' · '+bar.count+' '+t('точек')}</title><line x1={x} x2={x} y1={y(bar.high)} y2={y(bar.low)} stroke={color} strokeWidth="1.5"/><rect x={x-width/2} y={Math.min(y(bar.open),y(bar.close))} width={width} height={Math.max(1.5,Math.abs(y(bar.open)-y(bar.close)))} fill={color}/></g>}):<><polygon points={'0,165 '+coords+' 720,165'}/><polyline points={coords} fill="none" stroke="var(--purple)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>{points.length===1&&<circle cx="360" cy={y(points[0].value)} r="3" fill="var(--purple)"/>}</>}
 </svg><div className="x-axis">{labels.filter((_,i)=>i===0||i===Math.floor(labels.length/2)||i===labels.length-1).map(p=><span key={p.date}>{new Date(p.date).toLocaleString(getLocale(),price?{day:'2-digit',month:'2-digit'}:{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>)}</div></div></div>;
}
