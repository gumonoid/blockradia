const fs=require('node:fs/promises');
const path=require('node:path');
const APP_ORIGIN='http://127.0.0.1:19237';
function appOrigin(value,expected=APP_ORIGIN){try{return new URL(value).origin===expected}catch{return false}}
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function createAppHandler(root,explorer){
 return async request=>{
  const url=new URL(request.url);
  const origin=request.headers.get('origin');
  const site=request.headers.get('sec-fetch-site');
  if(!appOrigin(url)||(origin&&origin!==APP_ORIGIN)||(site&&!['same-origin','none'].includes(site)))return new Response(null,{status:403});
  if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  try{
   if(url.pathname==='/api/explorer'){
    if(request.headers.get('x-blockradia-client')!=='1')return new Response(null,{status:403});
    const response=await explorer(request);
    return new Response(response.body,{status:response.status,headers:{
     'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
     ...(response.headers.has('retry-after')?{'Retry-After':response.headers.get('retry-after')}:{})
    }});
   }
   const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
   if(pathname.includes('\\')||pathname.includes('\0'))return new Response(null,{status:403});
   const filename=path.resolve(root,'.'+pathname);
   if(!filename.startsWith(root+path.sep))return new Response(null,{status:403});
   const content=await fs.readFile(filename);
   return new Response(content,{headers:{'Content-Type':MIME[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':CSP}});
  }catch(error){
   return Response.json({error:'Не удалось выполнить запрос'},{status:error.code==='ENOENT'?404:500});
  }
 };
}
function trustedIPC(event,contents,expected=APP_ORIGIN){return event.sender===contents&&event.senderFrame===contents.mainFrame&&appOrigin(event.senderFrame?.url,expected);}
function allowPermission(contents,expected,permission,origin,allowedOrigin=APP_ORIGIN){return contents===expected&&appOrigin(origin,allowedOrigin)&&['notifications','fullscreen','clipboard-sanitized-write'].includes(permission);}
function externalURL(value){try{if(/[\\\u0000-\u0020]/.test(value))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
module.exports={APP_ORIGIN,appOrigin,createAppHandler,trustedIPC,allowPermission,externalURL};
