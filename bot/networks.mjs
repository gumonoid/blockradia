import {createHash} from 'node:crypto';

export const networks={
 bitcoin:{name:'Bitcoin',symbol:'BTC',decimals:8,scan:'https://mempool.space'},
 ethereum:{name:'Ethereum',symbol:'ETH',decimals:18,scan:'https://eth.blockscout.com'},
 tron:{name:'TRON',symbol:'TRX',decimals:6,scan:'https://tronscan.org/#'},
 solana:{name:'Solana',symbol:'SOL',decimals:9,scan:'https://solscan.io'},
 ton:{name:'GRAM(TON)',symbol:'GRAM(TON)',decimals:9,scan:'https://tonviewer.com'},
 base:{name:'Base',symbol:'ETH',decimals:18,scan:'https://base.blockscout.com'},
 arbitrum:{name:'Arbitrum',symbol:'ETH',decimals:18,scan:'https://arbitrum.blockscout.com'},
 polygon:{name:'Polygon',symbol:'POL',decimals:18,scan:'https://polygon.blockscout.com'},
 optimism:{name:'Optimism',symbol:'ETH',decimals:18,scan:'https://optimism.blockscout.com'},
};
export const evm=['ethereum','base','arbitrum','polygon','optimism'];
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58(value){
 let n=0n;
 for(const char of value){
  const digit=alphabet.indexOf(char);
  if(digit<0)return null;
  n=n*58n+BigInt(digit);
 }
 const hex=n.toString(16).padStart(2,'0');
 const bytes=Buffer.from(hex.length%2?'0'+hex:hex,'hex');
 const leading=value.match(/^1*/)[0].length;
 return Buffer.concat([Buffer.alloc(leading),n?bytes:Buffer.alloc(0)]);
}

function checkedBase58(value,versions){
 const bytes=base58(value);
 if(bytes?.length!==25||!versions.includes(bytes[0]))return false;
 const digest=createHash('sha256').update(createHash('sha256').update(bytes.subarray(0,21)).digest()).digest();
 return bytes.subarray(21).equals(digest.subarray(0,4));
}

function tonAddress(value){
 if(/^(0|-1):[0-9a-f]{64}$/i.test(value))return true;
 if(!/^[A-Za-z0-9_+/\-]{48}$/.test(value))return false;
 const b=Buffer.from(value,'base64url');
 if(b.length!==36||![17,81].includes(b[0])||![0,255].includes(b[1]))return false;
 let crc=0;
 for(const byte of b.subarray(0,34)){
  crc^=byte<<8;
  for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
 }
 return b.readUInt16BE(34)===crc;
}

function bitcoinSegwit(value){
 if(value!==value.toLowerCase()&&value!==value.toUpperCase())return false;
 const s=value.toLowerCase();
 if(!s.startsWith('bc1')||s.length>90)return false;
 const chars='qpzry9x8gf2tvdw0s3jn54khce6mua7l';
 const data=[...s.slice(3)].map(c=>chars.indexOf(c));
 if(data.length<7||data.some(n=>n<0)||data[0]>16)return false;
 const values=[3,3,0,2,3,...data];
 let chk=1;
 const generators=[0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];
 for(const n of values){
  const top=chk>>>25;
  chk=((chk&0x1ffffff)<<5)^n;
  for(let i=0;i<5;i++)if((top>>>i)&1)chk^=generators[i];
 }
 if((chk>>>0)!==(data[0]===0?1:0x2bc830a3))return false;
 const bits=(data.length-7)*5,bytes=Math.floor(bits/8),padding=bits%8;
 return bytes>=2&&bytes<=40&&(data[0]!==0||[20,32].includes(bytes))&&padding<5&&(data.at(-7)&((1<<padding)-1))===0;
}

export function candidates(value){
 if(/^0x[0-9a-f]{40}$/i.test(value))return evm;
 if(tonAddress(value))return ['ton'];
 if(checkedBase58(value,[65]))return ['tron'];
 if(checkedBase58(value,[0,5])||bitcoinSegwit(value))return ['bitcoin'];
 if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)&&base58(value)?.length===32)return ['solana'];
 return [];
}

export function extractAddresses(text){
 const tokens=String(text).match(/(?:-1|0):[0-9a-fA-F]{64}|0x[0-9a-fA-F]+|[A-Za-z0-9_+/\-]{48}(?![A-Za-z0-9_+/\-])|[A-Za-z0-9_-]{26,90}/g)||[];
 return [...new Set(tokens)].filter(value=>candidates(value).length).slice(0,3);
}

export function units(value,decimals){
 if(value==null||!/^\d+$/.test(String(value)))return '—';
 const digits=String(value).padStart(decimals+1,'0');
 if(!decimals)return digits;
 const fraction=digits.slice(-decimals).replace(/0+$/,'');
 return digits.slice(0,-decimals)+(fraction?'.'+fraction:'');
}

export const escapeHTML=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const short=value=>String(value||'—').length>24?String(value).slice(0,12)+'…'+String(value).slice(-8):String(value||'—');
export function explorerLink(network,value,transaction=false){
 const base=networks[network].scan;
 const path=network==='ton'?(transaction?'transaction/':''):transaction?'tx/':'address/';
 return base+'/'+path+encodeURIComponent(value);
}
