export const TRANSACTION_LIMIT=100;
export const TRANSACTIONS_PER_PAGE=10;
export function transactionSample<T extends {hash:string;timestamp?:string;status?:string}>(rows:T[]):T[]{
 return [...new Map(rows.filter(t=>t.hash).map(t=>[t.hash,t])).values()].sort((a,b)=>Number(b.status==='pending')-Number(a.status==='pending')||(Date.parse(b.timestamp||'')||0)-(Date.parse(a.timestamp||'')||0)).slice(0,TRANSACTION_LIMIT);
}
