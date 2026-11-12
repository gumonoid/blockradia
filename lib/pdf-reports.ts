import {PDFDocument,rgb} from 'pdf-lib';
import type {PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

type Section={title:string;lines:string[]};
type Report={title:string;network?:string;address?:string;createdAt?:string;status?:string;sections:Section[]};
const ink=rgb(.12,.13,.18),muted=rgb(.36,.39,.45),accent=rgb(.47,.32,.76),line=rgb(.87,.89,.92);

/** A paginated, selectable-text report. The embedded font covers Latin, Cyrillic and CJK. */
export async function reportPDF(report:Report,fontBytes:Uint8Array):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();
 pdf.registerFontkit(fontkit);
 pdf.setTitle('BlockRadia - '+report.title);
 pdf.setAuthor('BlockRadia');
 const font=await pdf.embedFont(fontBytes,{subset:false});
 const supported=new Set(font.getCharacterSet());
 const clean=(value:unknown)=>Array.from(String(value??'')).filter(c=>c==='\n'||c==='\t'||Number(c.codePointAt(0))>=32).map(c=>supported.has(c.codePointAt(0)!)?c:c==='\n'?'\n':c==='\t'?' ':'?').join('');
 let page:PDFPage,y=0;
 const margin=42,width=511;
 const nextPage=()=>{
  page=pdf.addPage([595,842]);
  page.drawText('blockradia',{x:margin,y:805,size:13,font,color:accent});
  page.drawLine({start:{x:margin,y:790},end:{x:553,y:790},thickness:.6,color:line});
  y=766;
 };
 const ensure=(height:number)=>{if(y-height<52)nextPage();};
 const wrap=(text:string,size:number)=>{
  const result:string[]=[];
  for(const paragraph of clean(text).split('\n')){
   let current='';
   for(const char of paragraph){
    if(current&&font.widthOfTextAtSize(current+char,size)>width){result.push(current);current='';}
    current+=char;
   }
   result.push(current);
  }
  return result;
 };
 const text=(value:string,size=10,color=ink)=>{
  for(const row of wrap(value,size)){
   ensure(size*1.55);
   page.drawText(row,{x:margin,y,size,font,color});
   y-=size*1.55;
  }
 };
 nextPage();
 text(report.title,22);
 y-=8;
 if(report.network)text(report.network.toUpperCase(),11,accent);
 if(report.address)text(report.address,10);
 text(report.createdAt||new Date().toISOString(),9,muted);
 if(report.status){y-=8;text(report.status,12,report.status.toLowerCase().includes('red')?rgb(.65,.12,.2):report.status.toLowerCase().includes('green')?rgb(.1,.43,.3):rgb(.55,.36,.05));}
 for(const section of report.sections){
  ensure(58);
  y-=18;
  text(section.title,13,accent);
  y-=4;
  for(const row of section.lines){text(row);y-=4;}
 }
 const pages=pdf.getPages();
 pages.forEach((p,i)=>{
  p.drawLine({start:{x:margin,y:38},end:{x:553,y:38},thickness:.6,color:line});
  p.drawText('BlockRadia | '+(i+1)+' / '+pages.length,{x:margin,y:23,size:8,font,color:muted});
 });
 return pdf.save();
}

export function amlReportData(data:any):Report{
 const sanctions=data.sanctions||{};
 const findings=(sanctions.matches||[]).map((m:any)=>[m.entity,m.currency,m.scope,(m.programs||[]).join(', '),m.source].filter(Boolean).join('\n'));
 const peers=(data.counterparties||[]).flatMap((p:any)=>[
  [p.address,p.exchange?.name||p.exchange?.label,'Incoming '+p.incoming+' | Outgoing '+p.outgoing].filter(Boolean).join('\n'),
  ...(p.sanctions?.matches||[]).map((m:any)=>[m.entity,m.scope,m.source].filter(Boolean).join('\n')),
  ...(p.hashes||[]).map((hash:string)=>'TX '+hash),
 ]);
 const extra=(data.additionalSignals||[]).flatMap((p:any)=>(p.signals||p.items||[]).map((s:any)=>[p.address,s.name,s.comment,s.date,s.scope,s.source].filter(Boolean).join('\n')));
 return {title:'AML evidence report',network:data.network,address:data.address,createdAt:data.generatedAt,status:[data.rating?.color,data.rating?.reason].filter(Boolean).join(' - '),sections:[
  {title:'Coverage and source freshness',lines:[
   'Loaded transfers: '+(data.transferCount??0),
   'Coverage: '+(data.coverage||'loaded_transfers_only'),
   'Sanctions source: '+(sanctions.source||'unavailable'),
   'Retrieved: '+(sanctions.retrievedAt||'unknown')+' | Published: '+(sanctions.publishedAt||'unknown'),
   'Snapshot: '+(sanctions.fresh?'fresh':'stale or unavailable')+' | Result: '+(sanctions.status||'unknown'),
   'SHA-256: '+(sanctions.sha256||'unavailable'),
   ...(data.warnings||[]),
   'This report covers the named sources and loaded sample. No match is not a guarantee of safety. Historical and counterparty signals require review.',
  ]},
  {title:'Address attribution',lines:data.attribution?[[data.attribution.name||data.attribution.label,data.attribution.source,data.attribution.checkedAt].filter(Boolean).join('\n')]:['No attribution in the bundled registry.']},
  {title:'Direct sanctions matches',lines:findings.length?findings:['No exact matches in the checked snapshot.']},
  {title:'Additional source findings',lines:extra.length?extra:['No additional source findings in this sample.']},
  {title:'Counterparties and transaction evidence',lines:peers.length?peers:['No counterparty evidence in the loaded sample.']},
 ]};
}

export function investigationReportData(data:any):Report{
 const nodes=Array.isArray(data.nodes)?data.nodes:Object.values(data.nodes||{});
 const transfers=(data.transfers||[]).slice(0,800);
 return {title:data.name||'Wallet relationship report',network:data.network,address:data.root,createdAt:data.at||data.created_at,sections:[
  {title:'Notes and coverage',lines:[data.notes||'No notes.',data.coverage||'Loaded transfer sample.', 'Nodes: '+nodes.length+' | Transfers: '+transfers.length]},
  {title:'Wallets and labels',lines:nodes.length?nodes.map((n:any)=>[n.address,n.nickname||data.names?.[n.address],n.exchange?.name,n.exchange?.source].filter(Boolean).join('\n')):['No saved nodes.']},
  {title:'Transfers',lines:transfers.length?transfers.map((t:any)=>[t.timestamp||'Time unavailable',t.from+' -> '+t.to,t.amount+' '+t.symbol,'TX '+t.hash].join('\n')):['No saved transfers.']},
 ]};
}
