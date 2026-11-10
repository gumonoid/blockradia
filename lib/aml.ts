import {screenSanctions} from './sanctions.ts';
import {getExchangeLabel} from './exchanges.ts';
import {displayWalletAddress} from './wallet-address.ts';

type Transfer={id:string;hash:string;from:string;to:string;amount:string;asset:string;symbol:string};
const key=(network:string,address:string)=>['ethereum','base','arbitrum','polygon','optimism'].includes(network)?address.toLowerCase():displayWalletAddress(network,address);
/** Evidence-only screening of the supplied sample, not an ownership or risk inference. */
export function analyzeAML(network:string,address:string,transfers:Transfer[]=[]){
 const root=key(network,address),seen=new Set<string>();
 const peers=new Map<string,{address:string;incoming:number;outgoing:number;hashes:string[];exchange:ReturnType<typeof getExchangeLabel>}>();
 let count=0;
 for(const t of transfers){
  if(!t||!t.id||!t.hash||typeof t.from!=='string'||typeof t.to!=='string'||seen.has(t.id))continue;
  const from=key(network,t.from),to=key(network,t.to);
  if(from!==root&&to!==root)continue;
  seen.add(t.id);count++;
  if(from===to)continue;
  const incoming=to===root,peer=incoming?t.from:t.to,k=key(network,peer);
  const row=peers.get(k)||{address:peer,incoming:0,outgoing:0,hashes:[],exchange:getExchangeLabel(network,peer)};
  row[incoming?'incoming':'outgoing']++;
  if(!row.hashes.includes(t.hash))row.hashes.push(t.hash);
  peers.set(k,row);
 }
 return {network,address,generatedAt:new Date().toISOString(),sanctions:screenSanctions(network,address),riskScore:null,coverage:'loaded_transfers_only',transferCount:count,attribution:getExchangeLabel(network,address),counterparties:[...peers.values()].map(p=>({...p,sanctions:screenSanctions(network,p.address)}))};
}
