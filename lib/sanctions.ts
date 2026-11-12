import snapshot from './ofac-snapshot.json' with {type:'json'};
import {currentAMLSnapshot} from './aml-refresh.ts';
type RecordEntry={currency:string;address:string;entity:string;uid:string;programs:(string|null)[]};
export type SanctionsSnapshot={source:string;retrievedAt:string;publishedAt:string|null;sha256:string;records:RecordEntry[]};
const currencies:Record<string,string[]>={bitcoin:['XBT','BTC'],ethereum:['ETH'],tron:['TRX'],solana:['SOL'],ton:['TON'],polygon:['MATIC','POL'],base:[],arbitrum:['ARB'],optimism:[]};
const normalize=(s:string)=>/^0x[0-9a-f]{40}$/i.test(s)?s.toLowerCase():s;
export function screenSanctions(network:string,address:string,data:SanctionsSnapshot=currentAMLSnapshot(),now=Date.now()){
 const age=now-Date.parse(data.retrievedAt);
 const fresh=Number.isFinite(age)&&age>=0&&age<=24*60*60*1000;
 const matches=data.records.filter(r=>normalize(r.address)===normalize(address)).map(r=>({...r,scope:currencies[network]?.includes(r.currency)?'network_match':'network_unconfirmed',source:`https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${encodeURIComponent(r.uid)}`}));
 return {status:matches.length?'match':!fresh?'stale':!data.records.some(r=>currencies[network]?.includes(r.currency))?'network_unconfirmed':'no_match',fresh,matches,source:data.source,retrievedAt:data.retrievedAt,publishedAt:data.publishedAt,sha256:data.sha256,recordCount:data.records.length};
}
