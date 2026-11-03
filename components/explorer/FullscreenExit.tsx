import {useEffect,useState} from 'react';
import {Minimize} from 'lucide-react';
import {useI18n} from '../../lib/i18n';
type WindowControls={exitFullscreen:()=>void;watchFullscreen:(callback:(active:boolean)=>void)=>()=>void};
export default function FullscreenExit(){
  const [active,setActive]=useState(false);
  const {language}=useI18n();
  const controls=()=> (window as Window&{blockradiaWindow?:WindowControls}).blockradiaWindow;
  useEffect(()=>controls()?.watchFullscreen(setActive),[]);
  const label=language==='ru'?'Выйти из полноэкранного режима':language==='zh'?'退出全屏':'Exit fullscreen';
  return active?<button className="export-button" title={label+' (Esc)'} aria-label={label} onClick={()=>controls()?.exitFullscreen()}><Minimize size={16}/>{label}</button>:null;
}
