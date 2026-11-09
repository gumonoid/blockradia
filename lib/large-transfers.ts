type Transaction={value?:string|number;token_amount?:string;token_symbol?:string};
export const largeTransferRules:Record<string,{symbol:string;decimals:number;minimum:string}>={
 bitcoin:{symbol:'BTC',decimals:8,minimum:'0.1'},
 ethereum:{symbol:'ETH',decimals:18,minimum:'10'},
 base:{symbol:'ETH',decimals:18,minimum:'10'},
 arbitrum:{symbol:'ETH',decimals:18,minimum:'10'},
 optimism:{symbol:'ETH',decimals:18,minimum:'10'},
 tron:{symbol:'TRX',decimals:6,minimum:'10000'},
 solana:{symbol:'SOL',decimals:9,minimum:'20'},
 ton:{symbol:'TON',decimals:9,minimum:'500'},
 polygon:{symbol:'POL',decimals:18,minimum:'10000'}
};
function units(value:string,decimals:number){if(!/^\d+(\.\d+)?$/.test(value))return null;const [whole,fraction='']=value.split('.');if(fraction.length>decimals)return null;return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0')||'0');}
function nativeValue(tx:Transaction){
 if(tx.token_amount!==undefined)return null;
 if(typeof tx.value==='number'&&!Number.isSafeInteger(tx.value))return null;
 const raw=String(tx.value??'');return /^\d+$/.test(raw)?BigInt(raw):null;
}
export function largeTransfers<T extends Transaction>(network:string,rows:T[]):T[]{
 const rule=largeTransferRules[network];
 // Networks without a configured rule retain the existing unbounded selection.
 const values=rows.map(tx=>({tx,value:nativeValue(tx)}));
 const minimum=rule?units(rule.minimum,rule.decimals)!:null;
 return values.filter(row=>minimum===null||(row.value!==null&&row.value>minimum)).sort((a,b)=>{const av=a.value??0n,bv=b.value??0n;return av===bv?0:av>bv?-1:1}).map(row=>row.tx);
}
