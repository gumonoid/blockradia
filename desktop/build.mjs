import {build} from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serviceURL} from '../lib/remote-explorer.ts';
const root=path.dirname(fileURLToPath(import.meta.url));
const apiOrigin=process.env.BLOCKRADIA_API_URL||'https://blockradia-api.onrender.com';
await writeFile(path.join(root,'service.json'),JSON.stringify({apiUrl:apiOrigin==='direct'?null:serviceURL(apiOrigin)}));
await build({configFile:false,root:path.join(root,'ui'),plugins:[react()],base:'/',build:{outDir:path.join(root,'ui-dist'),emptyOutDir:true}});
const source=await readFile(path.join(root,'../app/api/explorer/route.ts'),'utf8');
const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
await writeFile(path.join(root,'api.mjs'),result.outputText.replaceAll('../../../lib/archive-history.ts','./archive-history.mjs').replaceAll('../../../lib/exchange-candles.ts','./exchange-candles.mjs').replaceAll('../../../lib/market-data.ts','./market-data.mjs').replaceAll('../../../lib/network-fees.ts','./network-fees.mjs').replaceAll('../../../lib/network-statistics.ts','./network-statistics.mjs').replaceAll('../../../lib/solana-throttle.ts','./solana-throttle.mjs').replaceAll('../../../lib/remote-explorer.ts','./remote-explorer.mjs').replaceAll('../../../lib/alchemy.ts','./alchemy.mjs'));
for(const name of ['archive-history','solana-throttle','remote-explorer','alchemy','network-statistics','network-fees','market-data','exchange-candles']){const source=await readFile(path.join(root,'../lib/'+name+'.ts'),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});await writeFile(path.join(root,name+'.mjs'),compiled.outputText);}
console.log('Desktop UI and API built.');
