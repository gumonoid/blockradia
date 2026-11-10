import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

const types={js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
const policy=[
 'default-src \'self\'',
 'script-src \'self\' https://telegram.org',
 'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com',
 'font-src \'self\' https://fonts.gstatic.com',
 'img-src \'self\' data: blob:',
 'object-src \'none\'',
 'base-uri \'none\'',
 'frame-ancestors \'self\' https://web.telegram.org',
].join('; ');

export async function createWebApp(directory){
 const original=await readFile(join(directory,'index.html'),'utf8');
 const index=original.replace('</head>','<script src="https://telegram.org/js/telegram-web-app.js"></script><script src="/telegram-init.js" defer></script></head>');
 const files=new Map([
  ['/',{body:index,type:'text/html; charset=utf-8',cache:'no-cache'}],
  ['/telegram-init.js',{body:await readFile(new URL('./telegram-init.js',import.meta.url)),type:types.js,cache:'no-cache'}],
 ]);
 for(const entry of await readdir(join(directory,'assets'),{withFileTypes:true})){
  if(!entry.isFile()||!/^[\w-]+\.(js|css)$/.test(entry.name))continue;
  const extension=entry.name.split('.').at(-1);
  files.set('/assets/'+entry.name,{body:await readFile(join(directory,'assets',entry.name)),type:types[extension],cache:'public, max-age=31536000, immutable'});
 }
 return (path,response)=>{
  const file=files.get(path);
  if(!file)return false;
  response.writeHead(200,{
   'Content-Type':file.type,
   'Cache-Control':file.cache,
   'Content-Security-Policy':policy,
   'Referrer-Policy':'no-referrer',
   'X-Content-Type-Options':'nosniff',
  });
  response.end(file.body);
  return true;
 };
}
