import {walletIdentity} from './wallet-address.ts';
export function coverage(bundle:any){
 const rows=bundle.transactions||[];
 const dates=rows.map((r:any)=>Date.parse(r.timestamp)).filter(Number.isFinite);
 const warnings=[...(bundle.warnings||[]),...(bundle.history_error?[bundle.history_error]:[])];
 return {rows:rows.length,transfers:bundle.transfers?.length||0,partial:!!bundle.partial_history||!!bundle.history_error||warnings.length>0,from:dates.length?new Date(Math.min(...dates)).toISOString():null,to:dates.length?new Date(Math.max(...dates)).toISOString():null,source:bundle.source_name||'Unknown',warnings};
}
export function researchSnapshot(bundle:any,aml:any){
 return {at:new Date().toISOString(),hashes:[...new Set<string>((bundle.transactions||[]).map((r:any)=>r.hash).filter(Boolean))],labels:JSON.stringify([(aml.sanctions?.matches||[]).map((m:any)=>[m.uid,m.address,m.scope]),aml.attribution?.label||'',(aml.additionalSignals||[]).flatMap((s:any)=>(s.signals||s.items||[]).map((i:any)=>[s.address,i.name,i.kind,i.scope]))])};
}
export function changesSince(previous:any,next:any){
 if(!previous)return {baseline:true,newHashes:[],labelsChanged:false,since:null};
 const seen=new Set(previous.hashes);
 return {baseline:false,newHashes:next.hashes.filter((hash:string)=>!seen.has(hash)),labelsChanged:previous.labels!==next.labels,since:previous.at};
}
export function compareWallets(network:string,left:string,right:string,a:any,b:any){
 const key=(s:string)=>walletIdentity(network,s);
 const peers=(root:string,bundle:any)=>new Set<string>((bundle.transfers||[]).flatMap((t:any)=>key(t.from)===key(root)?[key(t.to)]:key(t.to)===key(root)?[key(t.from)]:[]).filter((p:string)=>p!==key(root)));
 const first=peers(left,a),second=peers(right,b);
 const direct=[...new Map([...(a.transfers||[]),...(b.transfers||[])].filter((t:any)=>key(t.from)===key(left)&&key(t.to)===key(right)||key(t.from)===key(right)&&key(t.to)===key(left)).map((t:any)=>[t.id,t])).values()];
 return {common:[...first].filter(p=>second.has(p)&&p!==key(left)&&p!==key(right)),direct,coverage:[coverage(a),coverage(b)]};
}
function decimal(value:string){
 if(!/^\d+(\.\d+)?$/.test(value))return null;
 const [whole,fraction='']=value.split('.');
 if(fraction.length>36)return null;
 return BigInt(whole+fraction.padEnd(36,'0'));
}
export function matchesAlert(rule:any,address:string,transfer:any){
 const key=(s:string)=>walletIdentity(rule.network||'',String(s||''));
 if(rule.direction==='in'&&key(transfer.to)!==key(address)||rule.direction==='out'&&key(transfer.from)!==key(address))return false;
 const symbol=(v:string)=>String(v).toLowerCase().replace('gram(ton)','ton');
 if(rule.asset&&symbol(transfer.symbol)!==symbol(rule.asset)&&key(transfer.asset)!==key(rule.asset))return false;
 const amount=decimal(String(transfer.amount)),threshold=decimal(String(rule.minimum||'0'));
 return amount!==null&&threshold!==null&&amount>=threshold;
}
