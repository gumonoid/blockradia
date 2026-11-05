import {useEffect,useState} from 'react';
import {importInvestigation} from '../../lib/investigation-import';
import {useWords} from './ResearchTools';
export default function Investigations({capture,restore}:{capture:()=>any;restore:(data:any)=>void}){
 const w=useWords(),[rows,setRows]=useState<any[]>([]),[name,setName]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState('');
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('blockradia-investigations')||'[]');if(Array.isArray(saved))setRows(saved)}catch{}},[]);
 function save(next:any[]){try{localStorage.setItem('blockradia-investigations',JSON.stringify(next));setRows(next);setError('')}catch{setError(w('Storage is full. Export or delete old projects.','Хранилище заполнено. Экспортируйте или удалите старые проекты.','存储已满，请导出或删除旧项目。'))}}
 function download(row:any){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(row,null,2)],{type:'application/json'}));a.href=url;a.download='blockradia-investigation.json';a.click();URL.revokeObjectURL(url)}
 async function load(file:File){
  try{
   if(file.size>4*1024*1024)throw new Error('File too large');
   const project=importInvestigation(await file.text(),crypto.randomUUID());
   save([project,...rows].slice(0,30));
  }catch{
   setError(w('Invalid investigation JSON (maximum 4 MB).','Некорректный JSON расследования (до 4 МБ).','调查 JSON 无效（最大 4 MB）。'));
  }
 }
 return <details className="research-panel"><summary>{w('Saved investigations','Сохранённые расследования','已保存调查')} · {rows.length}</summary><label>{w('Import investigation JSON','Импортировать JSON расследования','导入调查 JSON')}
 <input type="file" accept=".json,application/json" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void load(file)}}/>
 </label><label>{w('Project name','Название проекта','项目名称')}<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>{w('Notes','Заметки','笔记')}<textarea value={notes} maxLength={10000} onChange={e=>setNotes(e.target.value)}/></label><button disabled={!name.trim()} onClick={()=>{const data=capture();save([{id:crypto.randomUUID(),name:name.trim(),notes,at:new Date().toISOString(),...data},...rows].slice(0,30))}}>{w('Save graph and notes','Сохранить граф и заметки','保存图谱及笔记')}</button><p>{w('Saved locally, including node positions, transfers and nicknames. Opening a project restores its saved snapshot.','Сохраняется локально: позиции узлов, переводы и никнеймы. Проект открывается как сохранённый снимок.','本地保存节点位置、转账和昵称，打开时恢复保存快照。')}</p>{error&&<p role="alert">{error}</p>}{rows.map(row=><div className="research-row" key={row.id}><span>{row.name} · {row.network} · {new Date(row.at).toLocaleString()}</span><button onClick={()=>{restore(row);setName(row.name);setNotes(row.notes||'')}}>{w('Open','Открыть','打开')}</button><button onClick={()=>download(row)}>JSON</button><button onClick={()=>save(rows.filter(r=>r.id!==row.id))}>{w('Delete','Удалить','删除')}</button></div>)}</details>;
}
