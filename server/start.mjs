import {localExplorer} from '../app/api/explorer/route.ts';
import {createGateway} from './http.mjs';
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const server=createGateway(localExplorer,{trustProxy:process.env.TRUST_PROXY==='true'});
server.listen(port,'0.0.0.0',()=>console.log('BlockRadia API listening on port '+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
