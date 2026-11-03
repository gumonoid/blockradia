const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('blockradiaWindow',{
  exitFullscreen:()=>ipcRenderer.send('exit-fullscreen'),
  toggleFullscreen:()=>ipcRenderer.send('toggle-fullscreen'),
  watchFullscreen:callback=>{
    const listener=(_,active)=>callback(active);
    ipcRenderer.on('fullscreen-state',listener);
    ipcRenderer.invoke('fullscreen-state').then(callback);
    return ()=>ipcRenderer.removeListener('fullscreen-state',listener);
  }
});
