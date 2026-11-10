import sources from './aml-additional.json' with {type:'json'};
import {screenSanctions} from './sanctions.ts';
const evm=['ethereum','base','arbitrum','optimism','polygon'];
export function additionalSignals(network:string,address:string){
 if(!evm.includes(network))return [];
 return sources.flatMap(s=>s.records.filter(r=>r.address===address.toLowerCase()).map(r=>({...r,source:s.source,name:s.name,kind:s.kind,retrievedAt:s.retrievedAt,sha256:s.sha256,scope:s.scope==='ethereum'&&network==='ethereum'?'network_match':'network_unconfirmed'})));
}
type Screening=ReturnType<typeof screenSanctions>;
export function amlStatus(root:Screening,peers:Screening[],additionalCount:number,incomplete:boolean){
 if(root.fresh&&root.matches.some(m=>m.scope==='network_match'))return {color:'red',reason:'direct_sanctions_match'} as const;
 if(root.matches.length||peers.some(p=>p.matches.length)||additionalCount)return {color:'yellow',reason:'review_signals'} as const;
 if(incomplete||!root.fresh||root.status!=='no_match'||peers.some(p=>!p.fresh||p.status!=='no_match'))return {color:'yellow',reason:'incomplete_checks'} as const;
 return {color:'green',reason:'no_signals_in_checked_sample'} as const;
}
