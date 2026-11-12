'use client';
import {useMemo,useState,useEffect} from 'react';
import {downloadReportPDF} from '../../lib/pdf-download';
import {useI18n} from '../../lib/i18n';
import {analyzeAML} from '../../lib/aml';
import ExchangeBadge from './ExchangeBadge';
import {additionalSignals,amlStatus} from '../../lib/aml-status';

export default function AMLPanel({network,address,bundle,onVisit}:{network:string;address:string;bundle:any;onVisit:(address:string)=>void}){
 const {language}=useI18n();
 const w=(en:string,ru:string,zh:string)=>language==='ru'?ru:language==='zh'?zh:en;
 const [amlVersion,setAMLVersion]=useState(0);
 useEffect(()=>{const update=()=>setAMLVersion(v=>v+1);window.addEventListener('blockradia-aml-updated',update);return()=>window.removeEventListener('blockradia-aml-updated',update);},[]);
 const report=useMemo(()=>analyzeAML(network,address,bundle.transfers||[]),[network,address,bundle.transfers,amlVersion]);
 const known=report.counterparties.filter(p=>p.exchange);
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const signals=[{address,signals:additionalSignals(network,address)},...report.counterparties.map(p=>({address:p.address,signals:additionalSignals(network,p.address)}))].filter(p=>p.signals.length);
 const rating=amlStatus(report.sanctions,report.counterparties.map(p=>p.sanctions),signals.reduce((n,p)=>n+p.signals.length,0),!!bundle.history_loading||!!bundle.partial_history||!!bundle.history_error||!!bundle.warnings?.length||!report.transferCount);
 async function download(){
  setExporting(true);setExportError('');
  try{
   const data={...report,rating,additionalSignals:signals,warnings:bundle.warnings};
   await downloadReportPDF('aml',data,'blockradia-aml-'+network+'.pdf');
  }catch{setExportError(w('Could not create PDF. Please retry.','Не удалось создать PDF. Повторите попытку.','无法创建 PDF，请重试。'));}
  finally{setExporting(false);}
 }
 return <section className="result-card aml-panel"><div className="section-heading"><h2>{w('AML · Evidence review','AML · Проверка связей','AML · 证据审查')}</h2><button disabled={exporting} onClick={download}>{exporting?w('Creating PDF…','Создаём PDF…','正在生成 PDF…'):w('PDF report','Отчёт PDF','PDF 报告')}</button></div>
 {exportError&&<p role="alert">{exportError}</p>}
 <div className={'aml-rating aml-rating-'+rating.color} role="status"><strong>{rating.color==='red'?w('Red · Direct sanctions match','Красный · Прямое санкционное совпадение','红色 · 直接制裁匹配'):rating.color==='green'?w('Green · No signals in checked sample','Зелёный · В проверенной выборке сигналов нет','绿色 · 已检查样本中无信号'):rating.reason==='incomplete_checks'?w('Yellow · Incomplete checks','Жёлтый · Проверка неполная','黄色 · 检查不完整'):w('Yellow · Review required','Жёлтый · Требуется проверка','黄色 · 需要审查')}</strong><p>{w('The color summarizes available evidence, not a guarantee of safety or a legal conclusion.','Цвет отражает доступные доказательства, а не гарантию безопасности или юридическое заключение.','颜色概括现有证据，并非安全保证或法律结论。')}</p></div>
 {signals.map(p=><div className="aml-peer" key={p.address}><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button>{p.signals.map((s,i)=><div key={i}><a href={s.source} target="_blank" rel="noreferrer">{s.name}</a><p>{w('Source report — not independently verified','Сообщение источника — независимо не подтверждено','来源报告 — 未经独立验证')} · {s.date||w('Date not provided','Дата не указана','未提供日期')} · {s.scope==='network_unconfirmed'?w('Network unconfirmed','Сеть не подтверждена','网络未确认'):'Ethereum'}</p><p>{s.comment}</p></div>)}</div>)}
 <p>{w('Preliminary analysis of loaded transfers. Exchange attribution is not a risk finding. Unknown addresses are not classified as safe.','Предварительный анализ загруженных переводов. Метка биржи не означает риск. Неизвестные адреса не считаются безопасными.','仅分析已加载转账。交易所标签不代表风险，未知地址不代表安全。')}</p>
 <div className="info-banner"><div><strong>OFAC SDN</strong><p>{w('Exact address screening against the downloaded official snapshot. No match does not establish safety. Other lists and indirect exposure are not covered.','Точная проверка адресов по загруженной официальной версии. Отсутствие совпадения не означает безопасность. Другие списки и косвенные связи не проверены.','依据官方快照进行精确地址检查。无匹配不代表安全。未涵盖其他名单和间接风险。')}</p><a href={report.sanctions.source} target="_blank" rel="noreferrer">{report.sanctions.retrievedAt}</a> · {report.sanctions.recordCount}</div></div>
 <SanctionsResult result={report.sanctions}/>
 {report.counterparties.filter(p=>p.sanctions.matches.length).map(p=><div className="aml-peer" key={p.address}><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button><SanctionsResult result={p.sanctions}/></div>)}
 <p>{bundle.history_loading?w('History is still loading.','История ещё загружается.','历史记录仍在加载。'):w('Loaded sample','Загруженная выборка','已加载样本')}: {report.transferCount} · {w('Counterparties','Контрагенты','交易对手')}: {report.counterparties.length} · {w('Exchange matches','Совпадения с биржами','交易所匹配')}: {known.length}</p>
 {report.attribution&&<p><ExchangeBadge network={network} address={address}/> <a href={report.attribution.source} target="_blank" rel="noreferrer">{w('Address attribution source','Источник метки адреса','地址标签来源')}</a> · {report.attribution.checkedAt}</p>}
 <details><summary>{w('Counterparties and evidence','Контрагенты и доказательства','交易对手与证据')} ({report.counterparties.length})</summary>{report.counterparties.map(p=><div className="aml-peer" key={p.address}><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button><ExchangeBadge network={network} address={p.address}/><span>↓ {p.incoming} · ↑ {p.outgoing}</span>{p.exchange?<a href={p.exchange.source} target="_blank" rel="noreferrer">{w('Source','Источник','来源')} · {p.exchange.checkedAt}</a>:<span>{w('Unattributed','Нет атрибуции','未归属')}</span>}<details><summary>{w('Transaction hashes','Хеши транзакций','交易哈希')} ({p.hashes.length})</summary>{p.hashes.map(h=><code className="aml-hash" key={h}>{h}</code>)}</details></div>)}</details>
 </section>;
}

function SanctionsResult({result}:{result:ReturnType<typeof analyzeAML>['sanctions']}){
 const {language}=useI18n();const w=(en:string,ru:string,zh:string)=>language==='ru'?ru:language==='zh'?zh:en;
 return <div><p>{!result.fresh?w('Outdated snapshot — current status unverified','Список устарел — текущий статус не проверен','快照已过期 — 当前状态未验证'):result.matches.length?w('Address found in OFAC snapshot — review evidence','Адрес найден в версии OFAC — проверьте доказательства','在 OFAC 快照中找到地址 — 请审查证据'):result.status==='network_unconfirmed'?w('Network coverage unconfirmed','Покрытие сети не подтверждено','网络覆盖未确认'):w('No exact match in this OFAC snapshot','Точного совпадения в этой версии OFAC нет','此 OFAC 快照中无精确匹配')}</p>{result.matches.map((m,i)=><p key={i}><a href={m.source} target="_blank" rel="noreferrer">{m.entity}</a> · {m.currency} · {m.programs.join(', ')} · {m.scope==='network_match'?w('Network match','Совпадение сети','网络匹配'):w('Network requires verification','Сеть требует проверки','网络需要验证')}</p>)}</div>;
}
