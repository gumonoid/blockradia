import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash,createPrivateKey,sign} from 'node:crypto';
import path from 'node:path';
const dir=path.resolve(process.argv[2]||'release');
const expected=['BlockRadia-Windows-x64.exe','BlockRadia-macOS-arm64.dmg','BlockRadia-macOS-x64.dmg','BlockRadia-macOS-arm64.zip','BlockRadia-macOS-x64.zip','BlockRadia-Linux-x86_64.AppImage','BlockRadia-Linux-x64.tar.gz'];
const configuredKey=process.env.RELEASE_CHECKSUM_PRIVATE_KEY;
if(!configuredKey&&process.env.ALLOW_UNSIGNED_CHECKSUMS!=='1')throw Error('Missing release checksum signing key');
const privateKey=configuredKey?createPrivateKey(configuredKey):null;
if(privateKey&&privateKey.asymmetricKeyType!=='ed25519')throw Error('Release checksum signing key must be Ed25519');

const files=await readdir(dir);
const lines=[];
for(const file of expected.sort()){
 if(!files.includes(file))throw Error('Missing release asset: '+file);
 const bytes=await readFile(path.join(dir,file));
 if(bytes.length<1024*1024)throw Error('Unexpectedly small release asset: '+file);
 lines.push(createHash('sha256').update(bytes).digest('hex')+'  '+file);
}
const manifest=Buffer.from(lines.join('\n')+'\n');
await writeFile(path.join(dir,'SHA256SUMS.txt'),manifest);
if(privateKey)await writeFile(path.join(dir,'SHA256SUMS.txt.sig'),sign(null,manifest,privateKey));
console.log((privateKey?'Signed':'Generated unsigned')+' checksums for '+expected.length+' desktop packages');
