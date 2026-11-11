import {analyzeAML} from '../lib/aml.ts';
import {additionalSignals,amlStatus} from '../lib/aml-status.ts';
import {csvCell} from '../lib/csv.ts';
import {largeTransfers} from '../lib/large-transfers.ts';
import {displayWalletAddress} from '../lib/wallet-address.ts';
import {networks,units,escapeHTML as esc,short,explorerLink} from './networks.mjs';

export function amlReport(network,address,bundle){
 const report=analyzeAML(network,address,bundle.transfers||[]);
 const signals=[{address,items:additionalSignals(network,address)},...report.counterparties.map(p=>({address:p.address,items:additionalSignals(network,p.address)}))].filter(p=>p.items.length);
 const rating=amlStatus(report.sanctions,report.counterparties.map(p=>p.sanctions),signals.reduce((n,p)=>n+p.items.length,0),!!bundle.partial_history||!!bundle.history_error||!!bundle.warnings?.length||!report.transferCount);
 return {report,signals,rating};
}

export function walletText(network,address,bundle,price,label){
 const chain=networks[network],balance=units(bundle.data?.coin_balance,chain.decimals);
 const value=Number(balance)*Number(price);
 const usd=balance!=='—'&&price!=null&&Number.isFinite(value)?' ≈ $'+value.toLocaleString('en-US',{maximumFractionDigits:2}):'';
 const aml=amlReport(network,address,bundle);
 const status={green:'🟢',yellow:'🟡',red:'🔴'}[aml.rating.color];
 const warnings=[...(bundle.warnings||[]),...(bundle.history_error?[bundle.history_error]:[])];
 const text=[
  '<b>'+esc(chain.name)+(label?' · '+esc(label):'')+'</b>',
  '<code>'+esc(address)+'</code>',
  '<b>'+esc(balance)+' '+chain.symbol+'</b>'+esc(usd),
  bundle.data?.is_contract===true?'Contract':'Account',
  'Transactions in sample: '+(bundle.transactions?.length||0),
  'Transfers: '+(bundle.transfers?.length||0),
  status+' AML · '+esc(aml.rating.reason.replaceAll('_',' ')),
  'Source: '+esc(bundle.source_name||'—'),
  'Checked: '+new Date().toISOString()+' (UTC)',
  ...warnings.slice(0,3).map(w=>'⚠ '+esc(String(w).slice(0,220))),
  '<a href="'+esc(explorerLink(network,address))+'">Explorer</a>',
 ];
 return text.join('\n');
}

export function transactionRows(network,bundle,{status='all',query='',from,to,address}={}){
 let rows=[...new Map((bundle.transactions||[]).filter(t=>t.hash).map(t=>[t.hash,t])).values()];
 if(status==='large')rows=largeTransfers(network,rows);
 else if(status==='pending')rows=rows.filter(t=>t.status==='pending');
 else if(status==='confirmed')rows=rows.filter(t=>t.status==='ok');
 else if(['incoming','outgoing'].includes(status)&&address){
  const key=value=>network==='ton'?displayWalletAddress(network,value||''):['ethereum','base','arbitrum','polygon','optimism'].includes(network)?String(value||'').toLowerCase():value;
  rows=rows.filter(t=>key(status==='incoming'?t.to?.hash:t.from?.hash)===key(address));
 }
 if(query)rows=rows.filter(t=>JSON.stringify(t).toLowerCase().includes(query.toLowerCase()));
 if(from||to)rows=rows.filter(t=>{
  const time=Date.parse(t.timestamp);
  return Number.isFinite(time)&&(!from||time>=from)&&(!to||time<=to);
 });
 return rows.slice(0,100);
}

export function historyText(network,rows,page=0,timeZone='UTC'){
 const chain=networks[network],start=page*10;
 return ['<b>'+chain.name+' · transactions '+(start+1)+'–'+Math.min(start+10,rows.length)+' / '+rows.length+'</b>',
  timeZone+' · loaded sample',
  ...rows.slice(start,start+10).map(t=>{
   const amount=t.token_amount!=null?t.token_amount+' '+(t.token_symbol||'token'):units(t.value,chain.decimals)+' '+chain.symbol;
   const date=Number.isFinite(Date.parse(t.timestamp))?new Intl.DateTimeFormat('en-GB',{timeZone,dateStyle:'short',timeStyle:'medium'}).format(new Date(t.timestamp)):'Time unavailable';
   return '<a href="'+esc(explorerLink(network,t.hash,true))+'">'+esc(short(t.hash))+'</a> · '+esc(String(t.status||'unknown'))+
    '\n'+esc(date)+' · '+esc(amount)+'\n'+esc(short(t.from?.hash))+' → '+esc(short(t.to?.hash))+' · #'+esc(t.block_number??'—');
  }),
 ].join('\n\n');
}

export function amlText(network,address,bundle){
 const {report,signals,rating}=amlReport(network,address,bundle);
 const findings=[
  ...report.sanctions.matches.map(m=>'<a href="'+esc(m.source)+'">'+esc(m.entity)+'</a> · '+esc(m.currency)+' · '+esc(m.scope)),
  ...report.counterparties.filter(p=>p.sanctions.matches.length).slice(0,5).map(p=>'Counterparty <code>'+esc(p.address)+'</code> · '+p.sanctions.matches.map(m=>esc(m.entity)).join(', ')),
  ...signals.slice(0,5).flatMap(p=>p.items.slice(0,2).map(s=>'<code>'+esc(p.address)+'</code>\n<a href="'+esc(s.source)+'">'+esc(s.name)+'</a> · '+esc(s.date||'undated')+' · '+esc(s.scope))),
 ];
 return ['<b>'+({red:'🔴',yellow:'🟡',green:'🟢'}[rating.color])+' AML · '+esc(rating.reason.replaceAll('_',' '))+'</b>',
  '<code>'+esc(address)+'</code>',
  'OFAC retrieved: '+esc(report.sanctions.retrievedAt),
  'Snapshot: '+(report.sanctions.fresh?'fresh':'STALE'),
  'Coverage: '+esc(report.sanctions.status)+' · '+report.transferCount+' loaded transfers',
  ...findings,
  'The result covers loaded data and the named snapshots. Green means no signals in this sample. Historical community reports and counterparty matches require review.',
 ].join('\n\n');
}

export function csvReport(network,rows,columns=['hash','timestamp','from','to','amount','block','status']){
 const chain=networks[network];
 const header=['hash','timestamp','from','to','amount','block','status'].filter(c=>columns.includes(c));
 return [header.map(csvCell).join(','),...rows.map(t=>{
  const values={hash:t.hash,timestamp:t.timestamp,from:t.from?.hash,to:t.to?.hash,amount:t.token_amount!=null?t.token_amount+' '+(t.token_symbol||''):units(t.value,chain.decimals)+' '+chain.symbol,block:t.block_number,status:t.status};
  return header.map(c=>csvCell(values[c])).join(',');
 })].join('\r\n');
}

export function graphSVG(network,address,bundle){
 const {counterparties}=analyzeAML(network,address,bundle.transfers||[]);
 const peers=counterparties.slice(0,24);
 const height=Math.max(240,peers.length*48+100);
 const rootY=Math.round(height/2);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+height+'" role="img" aria-label="Direct counterparties in loaded sample">'+
  '<rect width="100%" height="100%" fill="#171522"/><g fill="#eee9fa" font-family="monospace" font-size="12">'+
  '<text x="24" y="28">'+esc(network)+' · '+peers.length+' / '+counterparties.length+' counterparties · loaded sample</text>'+
  '<circle cx="180" cy="'+rootY+'" r="14" fill="#9873df"/><text x="24" y="'+(rootY+36)+'">'+esc(short(address))+'</text>'+
  peers.map((p,i)=>{
   const y=70+i*48;
   return '<path d="M194 '+rootY+' L580 '+y+'" fill="none" stroke="#75628d"/><circle cx="580" cy="'+y+'" r="7" fill="#80c3a5"/>'+
    '<text x="600" y="'+(y+4)+'">'+esc(p.address)+'</text>'+
    '<text x="600" y="'+(y+20)+'">↓ '+p.incoming+' ↑ '+p.outgoing+'</text>';
  }).join('')+'</g></svg>';
}

export function priceSVG(network,data,{candles=false,activity=false}={}){
 const points=(data.chart||[]).filter(p=>Number.isFinite(Number(p.value))&&Number.isFinite(Date.parse(p.date)));
 if(points.length<2)return null;
 const bars=(data.ohlc||[]).filter(p=>[p.open,p.high,p.low,p.close].every(v=>Number.isFinite(Number(v)))&&Number.isFinite(Date.parse(p.date)));
 const useCandles=candles&&data.candle_kind==='exchange'&&bars.length>1;
 const values=useCandles?bars.flatMap(p=>[Number(p.low),Number(p.high)]):points.map(p=>Number(p.value));
 const min=Math.min(...values),max=Math.max(...values);
 const start=Date.parse(points[0].date),end=Date.parse(points.at(-1).date);
 if(end<=start)return null;
 const line=points.map(p=>(70+(Date.parse(p.date)-start)/(end-start)*850).toFixed(1)+','+(340-(Number(p.value)-min)/(max-min||1)*250).toFixed(1)).join(' ');
 const y=value=>340-(Number(value)-min)/(max-min||1)*250;
 const width=Math.max(1,Math.min(12,650/bars.length));
 const marks=useCandles?bars.map(p=>{
  const x=70+(Date.parse(p.date)-start)/(end-start)*850,color=Number(p.close)>=Number(p.open)?'#60d4a0':'#ff879a';
  return '<line x1="'+x+'" x2="'+x+'" y1="'+y(p.high)+'" y2="'+y(p.low)+'" stroke="'+color+'"/>'+
   '<rect x="'+(x-width/2)+'" y="'+Math.min(y(p.open),y(p.close))+'" width="'+width+'" height="'+Math.max(1,Math.abs(y(p.open)-y(p.close)))+'" fill="'+color+'"/>';
 }).join(''):'<polyline points="'+line+'" fill="none" stroke="#ad88f0" stroke-width="3"/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="440"><rect width="100%" height="100%" fill="#171522"/><g fill="#eee9fa" font-family="sans-serif" font-size="16">'+
  '<text x="40" y="38">'+esc(networks[network].name)+(activity?' · Activity':' / USD')+' · '+esc(data.source_name)+'</text>'+
  '<text x="40" y="75">'+esc(max.toFixed(4))+'</text><text x="40" y="375">'+esc(min.toFixed(4))+'</text>'+
  '<text x="70" y="410">'+esc(points[0].date)+'</text><text x="660" y="410">'+esc(points.at(-1).date)+'</text></g>'+
  marks+'</svg>';
}
