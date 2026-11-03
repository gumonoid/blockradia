import {useEffect,useState} from 'react';
import {Minimize,Maximize} from 'lucide-react';
import {useI18n} from '../../lib/i18n';
type WindowControls={toggleFullscreen:()=>void;watchFullscreen:(callback:(active:boolean)=>void)=>()=>void};
export default function FullscreenExit(){
  const [active,setActive]=useState(false);
  const [available,setAvailable]=useState(false);
  const {language}=useI18n();
  const controls=()=> (window as Window&{blockradiaWindow?:WindowControls}).blockradiaWindow;
  useEffect(()=>{setAvailable(!!controls());return controls()?.watchFullscreen(setActive)},[]);
  const label=active?(language==='ru'?'Выйти из полноэкранного режима':language==='zh'?'退出全屏':'Exit fullscreen'):(language==='ru'?'Полный экран':language==='zh'?'全屏':'Fullscreen');
  const Icon=active?Minimize:Maximize;
  return available?<button className="export-button" title={label+' (F11)'} aria-label={label} aria-pressed={active} onClick={()=>controls()?.toggleFullscreen()}><Icon size={16}/>{label}</button>:null;
}
