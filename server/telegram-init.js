(() => {
 const app=window.Telegram?.WebApp;
 if(!app?.initData)return;
 document.documentElement.dataset.telegram='true';
 const syncInsets=()=>{
  const safe=app.safeAreaInset||{};
  const content=app.contentSafeAreaInset||{};
  for(const side of ['top','right','bottom','left']){
   document.documentElement.style.setProperty('--telegram-inset-'+side,(Number(safe[side]||0)+Number(content[side]||0))+'px');
  }
 };
 if(app.isVersionAtLeast('8.0')){
  app.onEvent('safeAreaChanged',syncInsets);
  app.onEvent('contentSafeAreaChanged',syncInsets);
  window.blockradiaWindow={
   toggleFullscreen:()=>app.isFullscreen?app.exitFullscreen():app.requestFullscreen(),
   exitFullscreen:()=>app.exitFullscreen(),
   watchFullscreen(callback){
    const changed=()=>callback(app.isFullscreen);
    app.onEvent('fullscreenChanged',changed);
    changed();
    return ()=>app.offEvent('fullscreenChanged',changed);
   },
  };
 }
 document.addEventListener('click',event=>{
  const anchor=event.target instanceof Element?event.target.closest('a[target="_blank"]'):null;
  if(event.defaultPrevented||!anchor||anchor.protocol!=='https:'||anchor.origin===location.origin)return;
  event.preventDefault();
  app.openLink(anchor.href);
 });
 syncInsets();
 app.ready();
 app.expand();
})();
