/** Display raw TON accounts in the checksummed, URL-safe wallet format (TEP-2). */
export function displayWalletAddress(network:string,address:string):string {
  if(network!=='ton')return address;
  const raw=/^(0|-1):([0-9a-f]{64})$/i.exec(address);
  if(!raw)return address;
  const bytes=new Uint8Array(36);
  bytes[0]=0x51;
  bytes[1]=Number(raw[1])&255;
  for(let i=0;i<32;i++)bytes[i+2]=parseInt(raw[2].slice(i*2,i*2+2),16);
  let crc=0;
  for(const byte of bytes.subarray(0,34)){
    crc^=byte<<8;
    for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
  }
  bytes[34]=crc>>8;bytes[35]=crc&255;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_');
}

export function shortWalletAddress(address:string):string {
  return address.length>23?address.slice(0,10)+'…'+address.slice(-8):address;
}

/** Stable identity for verified addresses, preserving case on Base58 networks. */
export function walletIdentity(network:string,address:string):string {
  if(['ethereum','base','arbitrum','polygon','optimism'].includes(network))return address.toLowerCase();
  if(network==='bitcoin'&&/^bc1/i.test(address))return address.toLowerCase();
  if(network!=='ton')return address;
  if(/^(0|-1):[0-9a-f]{64}$/i.test(address))return address.toLowerCase();
  try{
    const b=Uint8Array.from(atob(address.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
    if(b.length!==36||![17,81].includes(b[0])||![0,255].includes(b[1]))return address;
    let crc=0;
    for(const value of b.subarray(0,34)){
      crc^=value<<8;
      for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
    }
    if(((b[34]<<8)|b[35])!==crc)return address;
    return (b[1]===255?'-1':'0')+':'+Array.from(b.subarray(2,34)).map(v=>v.toString(16).padStart(2,'0')).join('');
  }catch{return address;}
}
