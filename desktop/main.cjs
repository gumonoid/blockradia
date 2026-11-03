const {app,BrowserWindow,shell,dialog}=require('electron');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const profile=path.join(app.getPath('appData'),'blockradia-desktop');
const legacyProfile=path.join(app.getPath('appData'),['chain','lens-desktop'].join(''));
if(!require('node:fs').existsSync(profile)&&require('node:fs').existsSync(legacyProfile))require('node:fs').cpSync(legacyProfile,profile,{recursive:true});
app.setPath('userData',profile);
let window,server;
const lock=app.requestSingleInstanceLock();
if(!lock){app.quit()}else{
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}});
app.whenReady().then(start).catch(error=>{dialog.showErrorBox('BlockRadia — ошибка запуска',String(error));app.quit()});
}
async function start(){
for(const file of [path.join(__dirname,'../.env.local'),path.join(app.getPath('userData'),'.env.local')]){try{process.loadEnvFile(file);}catch(error){if(error.code!=='ENOENT')throw Error('Unable to load local API configuration');}}
try{const config=JSON.parse(await fs.readFile(path.join(__dirname,'service.json'),'utf8'));if(config.apiUrl)process.env.BLOCKRADIA_API_URL=config.apiUrl;}catch(error){if(error.code!=='ENOENT')throw Error('Unable to load service configuration');}
const {GET}=await import(pathToFileURL(path.join(__dirname,'api.mjs')).href);
const root=path.join(__dirname,'ui-dist');
server=http.createServer(async(req,res)=>{try{
if(req.method!=='GET'){res.writeHead(405);res.end();return}
const url=new URL(req.url,'http://127.0.0.1:19237');
if(req.headers.host!=='127.0.0.1:19237'){res.writeHead(403);res.end();return}
if(url.pathname==='/api/explorer'){const response=await GET(new Request(url));res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await response.text());return}
const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
const content=await fs.readFile(filename);
const ext=path.extname(filename);const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'"});res.end(content);
}catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Не удалось выполнить запрос'}));}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(19237,'127.0.0.1',resolve)});
window=new BrowserWindow({width:1440,height:1040,minWidth:480,minHeight:640,title:'BlockRadia',icon:path.join(__dirname,'icon.png'),backgroundColor:'#f8f9fc',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
window.webContents.on('before-input-event',(event,input)=>{
if(input.type!=='keyDown'||input.isAutoRepeat)return;
const exitFullscreen=()=>{if(window.webContents.isHTMLFullScreen())window.webContents.executeJavaScript('document.exitFullscreen().catch(()=>{})');if(window.isFullScreen())window.setFullScreen(false);};
if(input.key==='Escape'&&(window.isFullScreen()||window.webContents.isHTMLFullScreen())){event.preventDefault();exitFullscreen();}
else if(input.key==='F11'){event.preventDefault();if(window.isFullScreen()||window.webContents.isHTMLFullScreen())exitFullscreen();else window.setFullScreen(true);}
});
window.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'}});
window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('http://127.0.0.1:19237/')){event.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url)}});
await window.loadURL('http://127.0.0.1:19237/');
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>server?.close());
