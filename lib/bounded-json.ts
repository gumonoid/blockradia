const MiB=1024*1024;
export const portfolioResponseLimit=4*MiB;
export const rpcResponseLimit=16*MiB;
export function sharedResponseLimit(action:string|null){
 return action==='aml'?32*MiB:rpcResponseLimit;
}

/** Count bytes from the decoded stream; Content-Length can describe compressed data. */
export async function readBoundedJSON(response:Response,maxBytes:number){
 const reader=response.body?.getReader();
 if(!reader)throw new Error('Empty JSON response');
 const decoder=new TextDecoder();
 let size=0;
 let text='';
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){
    void reader.cancel().catch(()=>{});
    throw new RangeError('Response exceeds size limit');
   }
   text+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(text+decoder.decode());
 }finally{
  reader.releaseLock();
 }
}
