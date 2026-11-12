'use client';
import {useEffect,useRef,useState} from 'react';
import {fetchExplorer} from '../../lib/explorer-client';
import {coverage,compareWallets,researchSnapshot,changesSince} from '../../lib/research';
import {analyzeAML} from '../../lib/aml';
import {refreshAML} from '../../lib/aml-refresh';
import {useWords} from './ResearchTools';

export default function ResearchWorkspace({network,address,bundle,onOpen}:{network:string;address:string;bundle:any;onOpen:(address:string)=>void}){
 const w=useWords(),[wallets,setWallets]=useState<{network:string;address:string}[]>([]),[portfolio,setPortfolio]=useState<any[]>([]),[comparison,setComparison]=useState<any>(null),[other,setOther]=useState(''),[change,setChange]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[amlState,setAMLState]=useState('');
 const last=useRef<any>(null),info=coverage(bundle),abort=useRef<AbortController|null>(null);
 useEffect(()=>{try{const data=JSON.parse(localStorage.getItem('blockradia-portfolio')||'[]');if(Array.isArray(data))setWallets(data.filter(r=>typeof r.address==='string'&&typeof r.network==='string').slice(0,20));}catch{}return()=>abort.current?.abort();},[]);
 useEffect(()=>{
  if(bundle.history_loading||last.current===bundle)return;
  last.current=bundle;
  try{
   const key='blockradia-research-snapshots',data=JSON.parse(localStorage.getItem(key)||'{}'),id=network+':'+address;
   const next=researchSnapshot(bundle,analyzeAML(network,address,bundle.transfers||[]));
   setChange(changesSince(data[id],next));
   // Failed history is not a new baseline.
   if(!info.partial){delete data[id];data[id]=next;localStorage.setItem(key,JSON.stringify(Object.fromEntries(Object.entries(data).slice(-30))));}
  }catch{setError(w('Could not save the comparison baseline.','Не удалось сохранить исходную проверку.','无法保存基线。'));}
 },[bundle,network,address]);
 useEffect(()=>{setComparison(null);setOther('');},[network,address]);
 async function updateAML(force=false){
  try{await refreshAML(()=>fetchExplorer('/api/explorer?action=aml'),force);setAMLState(w('Sources checked','Источники проверены','已检查来源'));window.dispatchEvent(new Event('blockradia-aml-updated'));}
  catch{setAMLState(w('Update failed; source dates remain visible in AML.','Обновление не удалось; проверьте даты источников в AML.','更新失败，请查看来源日期。'));}
 }
 useEffect(()=>{void updateAML();const timer=setInterval(()=>void updateAML(),60000);return()=>clearInterval(timer);},[]);
 function saveWallets(next:typeof wallets){try{localStorage.setItem('blockradia-portfolio',JSON.stringify(next));setWallets(next);}catch{setError(w('Storage unavailable','Хранилище недоступно','存储不可用'));}}
 async function loadPortfolio(){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;
  setBusy(true);setError('');const result=[];
  try{for(const wallet of wallets){
   try{result.push(await fetchExplorer('/api/explorer?'+new URLSearchParams({network:wallet.network,action:'portfolio',q:wallet.address}),{signal:controller.signal,timeoutMs:65000}));}
   catch{if(controller.signal.aborted)return;result.push({...wallet,error:w('Balance unavailable','Баланс недоступен','余额不可用')});}
  }setPortfolio(result);}finally{setBusy(false);}
 }
 async function compare(){
  if(!other.trim()||other.length>128)return;
  setBusy(true);setError('');
  try{const data=await fetchExplorer('/api/explorer?'+new URLSearchParams({network,action:'address',q:other.trim()}),{timeoutMs:65000});setComparison(compareWallets(network,address,other.trim(),bundle,data));}
  catch{setError(w('Comparison unavailable. Check the address and retry.','Сравнение недоступно. Проверьте адрес и повторите.','比较不可用，请检查地址后重试。'));}
  finally{setBusy(false);}
 }
 return <section className="research-panel"><h2>{w('Research workspace','Рабочее пространство исследования','研究工作区')}</h2>
 <p>{w('Coverage','Покрытие','覆盖范围')}: {info.rows} {w('transactions','операций','交易')} · {info.from||'—'} — {info.to||'—'} · {info.source} · {info.partial?w('Partial','Неполное','不完整'):w('Loaded sample','Загруженная выборка','已加载样本')}</p>
 <p>{change?.baseline?w('First check establishes a baseline.','Первая проверка создаёт исходный снимок.','首次检查建立基线。'):change?w('Since previous check','С прошлой проверки','与上次检查相比')+': '+change.newHashes.length+' '+w('new transactions','новых операций','新交易')+' · '+w('Attribution changed','Изменились метки','标签变化')+': '+String(change.labelsChanged):''}</p>
 {change?.newHashes?.length>0&&<details><summary>{w('New transaction hashes','Хеши новых операций','新交易哈希')}</summary>{change.newHashes.map((hash:string)=><p key={hash}><code>{hash}</code></p>)}</details>}
 <button onClick={()=>updateAML(true)}>{w('Refresh AML sources','Обновить AML-источники','更新 AML 来源')}</button><span role="status"> {amlState}</span>
 <details><summary>{w('Compare wallets','Сравнить кошельки','比较钱包')}</summary><label>{w('Second address in this network','Второй адрес в этой сети','此网络中的第二个地址')}<input value={other} maxLength={128} onChange={e=>setOther(e.target.value)}/></label><button disabled={busy} onClick={compare}>{w('Compare','Сравнить','比较')}</button>{comparison&&<div><p>{w('Direct transfers','Прямые переводы','直接转账')}: {comparison.direct.length} · {w('Common counterparties','Общие контрагенты','共同交易对手')}: {comparison.common.length}</p>{comparison.coverage.some((c:any)=>c.partial)&&<p>{w('Comparison uses incomplete history.','Сравнение использует неполную историю.','比较基于不完整历史。')}</p>}{comparison.common.map((a:string)=><button key={a} onClick={()=>onOpen(a)}><code>{a}</code></button>)}{comparison.direct.slice(0,30).map((t:any)=><p key={t.id}>{t.amount} {t.symbol} · <code>{t.hash}</code></p>)}</div>}</details>
 <details><summary>{w('Multichain portfolio','Портфель по сетям','多链投资组合')} · {wallets.length}/20</summary><button disabled={wallets.length>=20||wallets.some(r=>r.network===network&&r.address===address)} onClick={()=>saveWallets([...wallets,{network,address}])}>{w('Add this wallet','Добавить кошелёк','添加此钱包')}</button><button disabled={busy||!wallets.length} onClick={loadPortfolio}>{busy?w('Loading…','Загрузка…','加载中…'):w('Refresh balances','Обновить балансы','更新余额')}</button>{wallets.map(r=><div className="research-row" key={r.network+r.address}><code>{r.network} · {r.address}</code><button onClick={()=>saveWallets(wallets.filter(x=>x!==r))}>{w('Remove','Удалить','删除')}</button></div>)}<p>{w('Known USD total','Известная сумма USD','已知 USD 总值')}: ${portfolio.reduce((s,r)=>s+(r.knownUSD||0),0).toFixed(2)} · {w('Unpriced assets','Активы без оценки','未定价资产')}: {portfolio.reduce((s,r)=>s+(r.unpriced||0),0)}</p>{portfolio.map((r,i)=><div key={i}><p>{r.network} · {r.address} · {r.error||r.source} {r.partial?'⚠':''}</p>{r.assets?.map((a:any)=><p key={a.asset}>{a.symbol}: {a.balance??'—'} · {a.usd==null?'USD —':'$'+a.usd.toFixed(2)}</p>)}</div>)}</details>
 {error&&<p role="alert">{error}</p>}</section>;
}
