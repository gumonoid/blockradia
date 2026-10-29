import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const dir=path.resolve(process.argv[2]||'release');
const expected=['BlockRadia-Windows-x64.exe','BlockRadia-macOS-arm64.dmg','BlockRadia-macOS-x64.dmg','BlockRadia-macOS-arm64.zip','BlockRadia-macOS-x64.zip','BlockRadia-Linux-x86_64.AppImage','BlockRadia-Linux-x64.tar.gz'];
const files=await readdir(dir);for(const file of expected){if(!files.includes(file))throw Error('Missing release asset: '+file);const bytes=await readFile(path.join(dir,file));if(bytes.length<1024*1024)throw Error('Unexpectedly small release asset: '+file);}
const lines=await Promise.all(expected.sort().map(async file=>createHash('sha256').update(await readFile(path.join(dir,file))).digest('hex')+'  '+file));
await writeFile(path.join(dir,'SHA256SUMS.txt'),lines.join('\n')+'\n');console.log('Validated '+expected.length+' desktop packages and wrote SHA256SUMS.txt');
