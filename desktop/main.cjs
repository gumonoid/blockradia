const {app,BrowserWindow,shell,dialog,ipcMain,Tray,Menu}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {APP_ORIGIN,appOrigin,createAppHandler,trustedIPC,allowPermission,externalURL}=require('./security.cjs');
const profileOverride=app.commandLine.getSwitchValue('user-data-dir');
const profile=profileOverride?path.resolve(profileOverride):path.join(app.getPath('appData'),'blockradia-desktop');
// Keep the old Chromium storage origin for existing profiles. Requests to it
// are handled inside Electron, so there is no socket or port to reserve.
const origin=APP_ORIGIN;
const legacyProfile=path.join(app.getPath('appData'),['chain','lens-desktop'].join(''));
if(!profileOverride&&!require('node:fs').existsSync(profile)&&require('node:fs').existsSync(legacyProfile))require('node:fs').cpSync(legacyProfile,profile,{recursive:true});
app.setPath('userData',profile);
let window,tray;
let quitting=false;
const lock=app.requestSingleInstanceLock();
if(!lock){app.quit()}else{
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}});
app.whenReady().then(start).catch(error=>{dialog.showErrorBox('BlockRadia — ошибка запуска',String(error));app.quit()});
}
async function start(){
if(process.platform==='linux'&&app.commandLine.hasSwitch('no-sandbox')){
 throw Error('BlockRadia requires the Chromium sandbox. Enable unprivileged user namespaces for this app on your distribution, then restart without --no-sandbox.');
}
for(const file of [path.join(__dirname,'../.env.local'),path.join(app.getPath('userData'),'.env.local')]){try{process.loadEnvFile(file);}catch(error){if(error.code!=='ENOENT')throw Error('Unable to load local API configuration');}}
try{const config=JSON.parse(await fs.readFile(path.join(__dirname,'service.json'),'utf8'));if(config.apiUrl)process.env.BLOCKRADIA_API_URL=config.apiUrl;}catch(error){if(error.code!=='ENOENT')throw Error('Unable to load service configuration');}
const {GET}=await import(pathToFileURL(path.join(__dirname,'api.mjs')).href);
const root=path.join(__dirname,'ui-dist');
// Keep macOS fullscreen on the current desktop. AppKit's Spaces transition
// can leave Chromium waiting for a resized frame when exiting HTML fullscreen.
window=new BrowserWindow({width:1440,height:1040,minWidth:480,minHeight:640,simpleFullscreen:process.platform==='darwin',title:'BlockRadia',icon:path.join(__dirname,'icon.png'),backgroundColor:'#f8f9fc',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
window.webContents.session.protocol.handle('http',createAppHandler(root,GET));
window.webContents.session.setPermissionCheckHandler((contents,permission,requestingOrigin)=>allowPermission(contents,window.webContents,permission,requestingOrigin,origin));
window.webContents.session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(allowPermission(contents,window.webContents,permission,details.requestingUrl||contents.getURL(),origin)));
window.webContents.on('will-attach-webview',event=>event.preventDefault());
ipcMain.handle('watch-in-background',(event,enabled,language)=>{
 if(!trustedIPC(event,window.webContents,origin)||typeof enabled!=='boolean')return false;
 if(enabled&&!tray){
  try{
   tray=new Tray(path.join(__dirname,process.platform==='win32'?'icon.ico':'icon.png'));
   const open=language==='ru'?'Открыть BlockRadia':language==='zh'?'打开 BlockRadia':'Open BlockRadia';
   const quit=language==='ru'?'Выйти из BlockRadia':language==='zh'?'退出 BlockRadia':'Quit BlockRadia';
   tray.setToolTip('BlockRadia');
   tray.setContextMenu(Menu.buildFromTemplate([{label:open,click:()=>window.show()},{label:quit,click:()=>app.quit()}]));
   tray.on('click',()=>window.show());
  }catch{tray?.destroy();tray=undefined;return false;}
 }else if(!enabled&&tray){tray.destroy();tray=undefined;}
 window.webContents.setBackgroundThrottling(!tray);
 return !!tray;
});
window.on('close',event=>{if(tray&&!quitting){event.preventDefault();window.hide();}});

let htmlFullscreen=false,exitRequested=false;
const fullscreen=()=>window.isFullScreen()||htmlFullscreen;
ipcMain.handle('fullscreen-state',event=>trustedIPC(event,window.webContents,origin)?fullscreen():false);
ipcMain.on('toggle-fullscreen',event=>{if(!trustedIPC(event,window.webContents,origin))return;if(fullscreen())exitFullscreen();else window.setFullScreen(true);});
function exitFullscreen(){
 exitRequested=true;
 if(htmlFullscreen){
  window.webContents.executeJavaScript('document.fullscreenElement && document.exitFullscreen()').catch(()=>{if(!window.isDestroyed())window.setFullScreen(false);});
  if(process.platform==='darwin')return; // Chromium exits the native Space after leaving HTML fullscreen.
 }
 window.setFullScreen(false);
}
ipcMain.on('exit-fullscreen',event=>{if(trustedIPC(event,window.webContents,origin))exitFullscreen();});
window.on('enter-html-full-screen',()=>{htmlFullscreen=true;window.webContents.send('fullscreen-state',true);if(exitRequested)exitFullscreen();});
window.on('leave-html-full-screen',()=>{htmlFullscreen=false;exitRequested=false;window.webContents.send('fullscreen-state',fullscreen())});
window.on('enter-full-screen',()=>{window.webContents.send('fullscreen-state',true);if(exitRequested)exitFullscreen();});
window.on('leave-full-screen',()=>{exitRequested=false;window.webContents.send('fullscreen-state',htmlFullscreen)});
window.webContents.on('before-input-event',(event,input)=>{
if(input.type!=='keyDown'||input.isAutoRepeat)return;

if(input.key==='Escape'&&(window.isFullScreen()||htmlFullscreen)){event.preventDefault();exitFullscreen();}
else if(input.key==='F11'){event.preventDefault();if(window.isFullScreen()||htmlFullscreen)exitFullscreen();else window.setFullScreen(true);}
});
window.webContents.setWindowOpenHandler(({url})=>{const safe=externalURL(url);if(safe)shell.openExternal(safe).catch(()=>{});return {action:'deny'}});
window.webContents.on('will-navigate',(event,url)=>{if(!appOrigin(url,origin)){event.preventDefault();const safe=externalURL(url);if(safe)shell.openExternal(safe).catch(()=>{})}});
await window.loadURL(origin+'/');
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;tray?.destroy();tray=undefined});
