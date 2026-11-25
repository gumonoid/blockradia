'use client';
import {useMemo,useState,useEffect} from 'react';
import {fetchExplorer} from '../../lib/explorer-client';
import {downloadReportPDF} from '../../lib/pdf-download';
import {useI18n} from '../../lib/i18n';
import {analyzeAML} from '../../lib/aml';
import ExchangeBadge from './ExchangeBadge';
import {buildAMLReview,amlExplanation,validScannerFeed,scannerStatus,scannerFindingLabel} from '../../lib/aml-review';
import type {ScannerFeed} from '../../lib/aml-scanner-types';

export default function AMLPanel({network,address,bundle,onVisit}:{network:string;address:string;bundle:any;onVisit:(address:string)=>void}){
 const {language}=useI18n();
 const w=(en:string,ru:string,zh:string)=>language==='ru'?ru:language==='zh'?zh:en;
 const [amlVersion,setAMLVersion]=useState(0);
 useEffect(()=>{const update=()=>setAMLVersion(v=>v+1);window.addEventListener('blockradia-aml-updated',update);return()=>window.removeEventListener('blockradia-aml-updated',update);},[]);
 const [scan,setScan]=useState<ScannerFeed|null>(null),[scanLoading,setScanLoading]=useState(true),[scanFailed,setScanFailed]=useState(false),[scanAttempt,setScanAttempt]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setScanAttempt(v=>v+1),300000);return()=>clearInterval(timer);},[network,address]);
 useEffect(()=>{
  const controller=new AbortController();let cancelled=false;
  setScan(null);setScanLoading(true);setScanFailed(false);
  fetchExplorer('/api/explorer?'+new URLSearchParams({network,action:'aml-address',q:address}),{signal:controller.signal,timeoutMs:75000})
   .then(data=>{if(!validScannerFeed(data,network,address))throw Error('Invalid scanner response');if(!cancelled)setScan(data);})
   .catch(()=>{if(!cancelled)setScanFailed(true);})
   .finally(()=>{if(!cancelled)setScanLoading(false);});
  return()=>{cancelled=true;controller.abort();};
 },[network,address,scanAttempt]);
 const review=useMemo(()=>buildAMLReview(network,address,bundle,scan),[network,address,bundle,scan,amlVersion]);
 const {report,rating,scanners}=review;
 const date=(value:string|null)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(language==='ru'?'ru-RU':language==='zh'?'zh-CN':'en-GB',{dateStyle:'medium',timeStyle:'long'}).format(new Date(value)):w('Not checked','Не проверено','未检查');
 const known=report.counterparties.filter(p=>p.exchange);
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const signals=review.signals.map(p=>({address:p.address,signals:p.items}));
 async function download(){
  setExporting(true);setExportError('');
  try{
   const data={...report,rating,additionalSignals:signals,scannerEvidence:scanners,listSources:review.additionalSources,explanation:amlExplanation(review,language),warnings:bundle.warnings};
   await downloadReportPDF('aml',data,'blockradia-aml-'+network+'.pdf');
  }catch{setExportError(w('Could not create PDF. Please retry.','Не удалось создать PDF. Повторите попытку.','无法创建 PDF，请重试。'));}
  finally{setExporting(false);}
 }
 return <section className="result-card aml-panel"><div className="section-heading"><h2>{w('AML · Evidence review','AML · Проверка связей','AML · 证据审查')}</h2><button disabled={exporting} onClick={download}>{exporting?w('Creating PDF…','Создаём PDF…','正在生成 PDF…'):w('PDF report','Отчёт PDF','PDF 报告')}</button></div>
 {exportError&&<p role="alert">{exportError}</p>}
 <div className={'aml-rating aml-rating-'+rating.color} role="status"><strong>{rating.color==='red'?w('Red · Direct sanctions match','Красный · Прямое санкционное совпадение','红色 · 直接制裁匹配'):rating.color==='green'?w('Green · No signals in checked sample','Зелёный · В проверенной выборке сигналов нет','绿色 · 已检查样本中无信号'):rating.reason==='incomplete_checks'?w('Yellow · Incomplete checks','Жёлтый · Проверка неполная','黄色 · 检查不完整'):w('Yellow · Review required','Жёлтый · Требуется проверка','黄色 · 需要审查')}</strong><p>{w('The color summarizes available evidence, not a guarantee of safety or a legal conclusion.','Цвет отражает доступные доказательства, а не гарантию безопасности или юридическое заключение.','颜色概括现有证据，并非安全保证或法律结论。')}</p></div>
 <div className="aml-explanation"><h3>{w('Why this result?','Почему такой результат?','为什么得出此结果？')}</h3><p>{amlExplanation(review,language)[0]}</p>
 <details><summary>{w('How to read AML evidence','Как читать результат AML','如何理解 AML 证据')}</summary>{amlExplanation(review,language).slice(1).map(line=><p key={line}>{line}</p>)}</details></div>
 <div className="section-heading"><h3>{w('Scanner results · this address','Результаты сканеров · этот адрес','扫描结果 · 此地址')}</h3><button disabled={scanLoading} onClick={()=>setScanAttempt(v=>v+1)}>{scanLoading?w('Checking…','Проверяем…','检查中…'):w('Check again','Проверить ещё раз','重新检查')}</button></div>
 <p>{w('The public address and network are sent to the listed providers. Results are cached for up to 5 minutes; the time below is the retrieval time, not the incident date.','Публичный адрес и сеть передаются перечисленным источникам. Результаты кешируются до 5 минут; ниже указано время получения, а не дата происшествия.','公开地址和网络会发送给所列服务商。结果最多缓存 5 分钟；下方时间为获取时间，并非事件日期。')}</p>
 {scanLoading&&<p role="status">{w('Requesting scanner evidence. Other results remain available.','Запрашиваем данные сканеров. Остальные результаты доступны.','正在获取扫描证据。其他结果仍可查看。')}</p>}
 {scanFailed&&<p role="alert">{w('Scanner results could not be loaded. This check is incomplete; retry above.','Не удалось загрузить результаты сканеров. Проверка неполная; повторите запрос выше.','无法加载扫描结果。检查不完整，请重试。')}</p>}
 {scanners&&!review.scannerFresh&&<p role="status">{w('Scanner results have expired. Check again.','Результаты сканеров устарели. Повторите проверку.','扫描结果已过期，请重新检查。')}</p>}
 <div className="aml-source-grid">{scanners?.sources.map(source=><article className="aml-source-card" key={source.id}>
 <h4><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></h4><p>{scannerStatus(source,language)}{source.totalChecks>0?` · ${source.checks}/${source.totalChecks}`:''}</p><small>{date(source.checkedAt)}</small>
 {source.findings.map((finding,i)=><p key={i}><strong>{finding.kind==='risk'?w('Source signal','Сигнал источника','来源信号'):w('Public label','Публичная метка','公开标签')}</strong>: {scannerFindingLabel(finding,language)}{finding.attribution?' · '+finding.attribution:''}</p>)}
 {source.status==='ok'&&!source.findings.some(f=>f.kind==='risk')&&<p>{w('No risk flags returned by this source. This is not a safety certification.','Источник не вернул меток риска. Это не подтверждение безопасности.','此来源未返回风险标记。这不是安全认证。')}</p>}
 </article>)}</div>
 <details><summary>{w('Downloaded lists and freshness','Скачанные списки и актуальность','已下载名单及更新时间')}</summary>
 {review.additionalSources.map(source=><p key={source.source}><a href={source.source} target="_blank" rel="noreferrer">{source.name}</a> · {date(source.retrievedAt)} · {source.recordCount} {w('records','записей','条记录')} · {w('EVM addresses; other networks not covered','EVM-адреса; другие сети не покрыты','EVM 地址；不覆盖其他网络')}</p>)}
 {review.additionalStale&&<p>{w('Additional lists are outdated; current status is unverified.','Дополнительные списки устарели; актуальный статус не проверен.','附加名单已过期；当前状态未验证。')}</p>}
 </details>
 {signals.map(p=><div className="aml-peer" key={p.address}><strong>{p.address===address?w('This address','Этот адрес','此地址'):w('Counterparty','Контрагент','交易对手')}</strong><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button>{p.signals.map((s,i)=><div key={i}><a href={s.source} target="_blank" rel="noreferrer">{s.name}</a><p>{w('Source report — not independently verified','Сообщение источника — независимо не подтверждено','来源报告 — 未经独立验证')} · {s.date||w('Date not provided','Дата не указана','未提供日期')} · {s.scope==='network_unconfirmed'?w('Network unconfirmed','Сеть не подтверждена','网络未确认'):'Ethereum'}</p><p>{s.comment}</p></div>)}</div>)}
 <p>{w('Preliminary analysis of loaded transfers. Exchange attribution is not a risk finding. Unknown addresses are not classified as safe.','Предварительный анализ загруженных переводов. Метка биржи не означает риск. Неизвестные адреса не считаются безопасными.','仅分析已加载转账。交易所标签不代表风险，未知地址不代表安全。')}</p>
 <div className="info-banner"><div><strong>OFAC SDN</strong><p>{w('Exact address screening against the downloaded official snapshot. No match does not establish safety. Other sources are listed separately; multi-hop exposure is not covered.','Точная проверка адресов по загруженной официальной версии. Отсутствие совпадения не означает безопасность. Другие источники перечислены отдельно; связи через несколько переводов не проверены.','依据官方快照进行精确地址检查。无匹配不代表安全。其他来源单独列出；不覆盖多跳关联。')}</p><a href={report.sanctions.source} target="_blank" rel="noreferrer">{report.sanctions.retrievedAt}</a> · {report.sanctions.recordCount}</div></div>
 <SanctionsResult result={report.sanctions}/>
 {report.counterparties.filter(p=>p.sanctions.matches.length).map(p=><div className="aml-peer" key={p.address}><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button><strong>{w('Counterparty match · not a direct match','Совпадение у контрагента · не у этого адреса','交易对手匹配 · 非此地址匹配')}</strong><SanctionsResult result={p.sanctions}/></div>)}
 <p>{bundle.history_loading?w('History is still loading.','История ещё загружается.','历史记录仍在加载。'):w('Loaded sample','Загруженная выборка','已加载样本')}: {report.transferCount} · {w('Counterparties','Контрагенты','交易对手')}: {report.counterparties.length} · {w('Exchange matches','Совпадения с биржами','交易所匹配')}: {known.length}</p>
 {report.attribution&&<p><ExchangeBadge network={network} address={address}/> <a href={report.attribution.source} target="_blank" rel="noreferrer">{w('Address attribution source','Источник метки адреса','地址标签来源')}</a> · {report.attribution.checkedAt}</p>}
 <details><summary>{w('Counterparties and evidence','Контрагенты и доказательства','交易对手与证据')} ({report.counterparties.length})</summary>{report.counterparties.map(p=><div className="aml-peer" key={p.address}><button onClick={()=>onVisit(p.address)}><code>{p.address}</code></button><ExchangeBadge network={network} address={p.address}/><span>↓ {p.incoming} · ↑ {p.outgoing}</span>{p.exchange?<a href={p.exchange.source} target="_blank" rel="noreferrer">{w('Source','Источник','来源')} · {p.exchange.checkedAt}</a>:<span>{w('Unattributed','Нет атрибуции','未归属')}</span>}<details><summary>{w('Transaction hashes','Хеши транзакций','交易哈希')} ({p.hashes.length})</summary>{p.hashes.map(h=><code className="aml-hash" key={h}>{h}</code>)}</details></div>)}</details>
 </section>;
}

function SanctionsResult({result}:{result:ReturnType<typeof analyzeAML>['sanctions']}){
 const {language}=useI18n();const w=(en:string,ru:string,zh:string)=>language==='ru'?ru:language==='zh'?zh:en;
 return <div><p>{!result.fresh?w('Outdated snapshot — current status unverified','Список устарел — текущий статус не проверен','快照已过期 — 当前状态未验证'):result.matches.length?w('Address found in OFAC snapshot — review evidence','Адрес найден в версии OFAC — проверьте доказательства','在 OFAC 快照中找到地址 — 请审查证据'):result.status==='network_unconfirmed'?w('Network coverage unconfirmed','Покрытие сети не подтверждено','网络覆盖未确认'):w('No exact match in this OFAC snapshot','Точного совпадения в этой версии OFAC нет','此 OFAC 快照中无精确匹配')}</p>{result.matches.map((m,i)=><p key={i}><a href={m.source} target="_blank" rel="noreferrer">{m.entity}</a> · {m.currency} · {m.programs.join(', ')} · {m.scope==='network_match'?w('Network match','Совпадение сети','网络匹配'):w('Network requires verification','Сеть требует проверки','网络需要验证')}</p>)}</div>;
}
