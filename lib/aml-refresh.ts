import bundled from './ofac-snapshot.json' with {type:'json'};
import extra from './aml-additional.json' with {type:'json'};
let current=bundled;
let additional=extra;
let pending:Promise<void>|null=null;
let checkedAt=0;
export const currentAMLSnapshot=()=>current;
export const currentAdditionalSources=()=>additional;
export async function refreshAML(fetchSnapshot:()=>Promise<any>,force=false){
 if(pending)return pending;
 if(!force&&Date.now()-checkedAt<3600000)return;
 pending=(async()=>{
  const feed=await fetchSnapshot(),value=feed.ofac||feed;
  if(value.source!==bundled.source||!Array.isArray(value.records)||!value.records.length||value.records.length>100000||!Number.isFinite(Date.parse(value.retrievedAt))||Date.parse(value.retrievedAt)>Date.now()+300000)throw Error('Invalid AML snapshot');
  if(!value.records.every((r:any)=>typeof r.address==='string'&&r.address.length<150&&typeof r.currency==='string'&&typeof r.entity==='string'&&/^\d+$/.test(r.uid)&&Array.isArray(r.programs)))throw Error('Invalid AML records');
  if(Array.isArray(feed.additional)&&feed.additional.length===extra.length&&feed.additional.every((s:any,i:number)=>s.source===extra[i].source&&Array.isArray(s.records)&&s.records.length<=100000&&s.records.every((r:any)=>/^0x[0-9a-fA-F]{40}$/.test(r.address))))additional=feed.additional;
  current=value;checkedAt=feed.updateInProgress||feed.error?Date.now()-3550000:Date.now();
 })().finally(()=>{pending=null;});
 return pending;
}
