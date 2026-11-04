type Filters={text:string;status:string;from:string;to:string;direction:string;minimum:string;asset:string};
export function filterTransactions(rows:any[],f:Filters,{wallet='',decimals=18,symbol='',identity=(a:string)=>a,normalize=(a:string)=>a}:{wallet?:string;decimals?:number;symbol?:string;identity?:(a:string)=>string;normalize?:(a:string)=>string}){
 const start=f.from?new Date(f.from+'T00:00:00').getTime():null,end=f.to?new Date(f.to+'T23:59:59.999').getTime():null;
 return rows.filter(tx=>{
 const pending=tx.status==='pending',confirmed=tx.block_number!=null||['ok','SUCCESS','confirmed'].includes(tx.status);
 if(f.status==='pending'&&!pending||f.status==='confirmed'&&(pending||!confirmed))return false;
 const date=Date.parse(tx.timestamp||'');if(start!==null&&(!Number.isFinite(date)||date<start)||end!==null&&(!Number.isFinite(date)||date>end))return false;
 const from=tx.from?.hash||'',to=tx.to?.hash||'';
 if(f.direction!=='all'&&(!wallet||normalize(f.direction==='in'?to:from)!==normalize(wallet)))return false;
 const asset=tx.token_symbol||symbol,amount=tx.token_amount!==undefined?Number(tx.token_amount):tx.value!=null?Number(tx.value)/10**decimals:NaN;
 if(f.asset&&!asset.toLowerCase().includes(f.asset.trim().toLowerCase()))return false;
 if(f.minimum!==''&&(!Number.isFinite(amount)||amount<Number(f.minimum)))return false;
 return !f.text||[tx.hash,from,to,identity(from),identity(to),tx.method,asset].join(' ').toLowerCase().includes(f.text.trim().toLowerCase());
 });
}
