import {analyzeAML} from './aml.ts';
import {additionalSignals,amlStatus} from './aml-status.ts';
import {currentAdditionalSources} from './aml-refresh.ts';
import type {ScannerFeed,ScannerSource,ScannerFinding} from './aml-scanner-types.ts';

import {chains,explorers,securityFlags} from './aml-scanner-types.ts';

function requiredChecks(network:string):Record<string,number>{
 if(Object.hasOwn(explorers,network))return {goplus:securityFlags.length+1,blockscout:1};
 if(network==='tron')return {goplus:securityFlags.length+1,tronscan:1};
 return {};
}

function sourceOrigin(network:string,id:string){
 if(id==='goplus')return Object.hasOwn(chains,network)?'https://api.gopluslabs.io':'https://docs.gopluslabs.io';
 if(id==='blockscout'&&Object.hasOwn(explorers,network))return 'https://'+explorers[network];
 if(id==='tronscan'&&network==='tron')return 'https://tronscan.org';
 return null;
}

export function validScannerFeed(value:any,network:string,address:string):value is ScannerFeed{
 const same=typeof value?.address==='string'&&(/^0x/i.test(address)?value.address.toLowerCase()===address.toLowerCase():value.address===address);
 return value?.network===network&&same&&Number.isFinite(Date.parse(value.checkedAt))&&Array.isArray(value.sources)&&value.sources.length>0&&value.sources.length<=3&&value.sources.every((s:any)=>{
  try{return ['goplus','blockscout','tronscan'].includes(s.id)&&typeof s.name==='string'&&s.name.length<=50&&new URL(s.url).origin===sourceOrigin(network,s.id)&&new URL(s.url).protocol==='https:'&&!new URL(s.url).username&&!new URL(s.url).password&&['ok','partial','unsupported','unavailable','not_configured'].includes(s.status)&&Number.isSafeInteger(s.checks)&&Number.isSafeInteger(s.totalChecks)&&s.checks>=0&&s.checks<=s.totalChecks&&s.totalChecks<=100&&(s.checkedAt===null||Number.isFinite(Date.parse(s.checkedAt)))&&Array.isArray(s.findings)&&s.findings.length<=40&&s.findings.every((f:any)=>['risk','label'].includes(f.kind)&&typeof f.code==='string'&&f.code.length<=80&&typeof f.label==='string'&&f.label.length<=200&&(f.attribution===undefined||typeof f.attribution==='string'&&f.attribution.length<=200));}catch{return false;}
 });
}

export function buildAMLReview(network:string,address:string,bundle:any,feed?:ScannerFeed|null){
 const report=analyzeAML(network,address,bundle.transfers||[]);
 const signals=[{address,items:additionalSignals(network,address)},...report.counterparties.map(p=>({address:p.address,items:additionalSignals(network,p.address)}))].filter(p=>p.items.length);
 const scanners=validScannerFeed(feed,network,address)?feed:undefined;
 const age=scanners?Date.now()-Date.parse(scanners.checkedAt):Infinity;
 const scannerFresh=age>=-300000&&age<900000&&!!scanners?.sources.every(s=>{
  if(!['ok','partial'].includes(s.status))return true;
  const age=Date.now()-Date.parse(s.checkedAt||'');
  return Number.isFinite(age)&&age>=-300000&&age<900000;
 });
 const scannerRisk=scanners?.sources.flatMap(s=>s.findings.filter(f=>f.kind==='risk'))||[];
 const historyIncomplete=!!bundle.history_loading||!!bundle.partial_history||!!bundle.history_error||!!bundle.warnings?.length||!report.transferCount;
 const additionalSources=currentAdditionalSources();
 const additionalStale=['ethereum','base','arbitrum','optimism','polygon'].includes(network)&&additionalSources.some(s=>{const age=Date.now()-Date.parse(s.retrievedAt);return !Number.isFinite(age)||age<0||age>86400000;});
 const required=Object.entries(requiredChecks(network));
 const completeCoverage=required.length>0 && scanners?.sources.length===required.length &&
  required.every(([id,expected])=>scanners.sources.some(source=>
   source.id===id && source.status==='ok' && source.checks===expected && source.totalChecks===expected));
 const scannersIncomplete=!scannerFresh||!completeCoverage;
 const rating=amlStatus(report.sanctions,report.counterparties.map(p=>p.sanctions),signals.reduce((n,p)=>n+p.items.length,0)+scannerRisk.length,historyIncomplete||scannersIncomplete||additionalStale);
 return {report,signals,rating,scanners,scannerFresh,historyIncomplete,additionalStale,
  additionalSources:additionalSources.map(s=>({name:s.name,source:s.source,retrievedAt:s.retrievedAt,recordCount:s.records.length,scope:s.scope,sha256:s.sha256})),scannerRisk};
}
export type AMLReview=ReturnType<typeof buildAMLReview>;
export const amlWords=(language:string,en:string,ru:string,zh:string)=>language==='ru'?ru:language==='zh'?zh:en;

export function scannerFindingLabel(finding:ScannerFinding,language='en'){
 const labels:Record<string,[string,string]>={
  phishing_activities:['Фишинг','网络钓鱼'],stealing_attack:['Кража средств','资金盗窃'],
  blackmail_activities:['Вымогательство','勒索'],money_laundering:['Отмывание средств','洗钱'],
  sanctioned:['Санкционная метка источника','来源制裁标签'],mixer:['Миксер','混币器'],
  blacklist_doubt:['Подозрение на вредоносный адрес','疑似恶意地址'],honeypot_related_address:['Связь с мошенническими токенами','关联蜜罐代币'],
  cybercrime:['Киберпреступления','网络犯罪'],financial_crime:['Финансовые преступления','金融犯罪'],
  darkweb_transactions:['Операции в даркнете','暗网交易'],fake_kyc:['Поддельная проверка KYC','虚假 KYC'],
  malicious_mining_activities:['Вредоносный майнинг','恶意挖矿'],gas_abuse:['Злоупотребление газом','Gas 滥用'],
  reinit:['Повторное развёртывание контракта','合约重新部署'],fake_standard_interface:['Поддельный стандартный интерфейс','伪造标准接口'],
  fake_token:['Поддельный токен','假冒代币'],scam:['Метка мошенничества обозревателя','浏览器诈骗标签'],
 };
 const translation=labels[finding.code];
 return translation?amlWords(language,finding.label,...translation):finding.label;
}

export function scannerStatus(source:ScannerSource,language='en'){
 const w=(en:string,ru:string,zh:string)=>amlWords(language,en,ru,zh);
 switch(source.status){
  case 'ok':return w('Checked','Проверено','已检查');
  case 'partial':return w('Some checks missing','Часть проверок отсутствует','部分检查缺失');
  case 'not_configured':return w('Server API key required','Нужен ключ API на сервере','需要服务器 API 密钥');
  case 'unsupported':return w('Not integrated for this network','Для этой сети не подключён','此网络未接入');
  default:return w('Source unavailable — not a clean result','Источник недоступен — результат неизвестен','来源不可用 — 结果未知');
 }
}

export function amlExplanation(review:AMLReview,language='en'){
 const w=(en:string,ru:string,zh:string)=>amlWords(language,en,ru,zh),{report,rating}=review;
 const reason=rating.reason==='direct_sanctions_match'
  ?w('The exact address and network match a record in the fresh OFAC snapshot. Review the linked entity and sanctions program.','Адрес и сеть точно совпали с записью в свежей версии OFAC. Проверьте организацию и санкционную программу по ссылке.','地址和网络与最新 OFAC 快照中的记录完全匹配。请核对链接中的实体及制裁项目。')
  :rating.reason==='review_signals'
   ?w('One or more sources reported a signal. A provider label or a counterparty match requires review; it is not proof that this wallet committed a crime.','Один или несколько источников сообщили о сигнале. Метка источника или совпадение у контрагента требует проверки и не доказывает нарушение владельцем кошелька.','一个或多个来源报告了信号。来源标签或交易对手匹配需要审查，并不证明此钱包有违法行为。')
   :rating.reason==='incomplete_checks'
    ?w('There is not enough current data to complete all checks. Missing history, stale lists or unavailable scanners cannot be treated as a clean result.','Не хватает актуальных данных для всех проверок. Неполная история, устаревшие списки и недоступные сканеры не означают отсутствие рисков.','当前数据不足以完成所有检查。历史缺失、名单过期或扫描服务不可用不表示没有风险。')
    :w('No signals were found in the checked sources and loaded transfers. This does not guarantee safety or cover the entire transaction history.','В проверенных источниках и загруженных переводах сигналы не найдены. Это не гарантирует безопасность и не охватывает всю историю.','在已检查来源和已加载转账中未发现信号。这不保证安全，也不覆盖完整历史。');
 return [reason,
  w('AML means anti-money-laundering screening. BlockRadia combines sanctions, public reports and explorer labels; it does not invent a percentage risk score.','AML — проверка признаков отмывания средств. BlockRadia объединяет санкционные списки, публичные сообщения и метки обозревателей, не выдумывая процент риска.','AML 是反洗钱筛查。BlockRadia 整合制裁名单、公开报告和浏览器标签，不编造风险百分比。'),
  w(`Scope: ${report.transferCount} loaded transfers, ${report.counterparties.length} direct counterparties. Live scanners check this address only; counterparties are checked against the downloaded lists.`,`Охват: ${report.transferCount} загруженных переводов, ${report.counterparties.length} прямых контрагентов. Онлайн-сканеры проверяют этот адрес; контрагенты проверяются по скачанным спискам.`,`范围：${report.transferCount} 笔已加载转账，${report.counterparties.length} 个直接交易对手。在线扫描仅检查此地址；交易对手通过已下载名单检查。`),
  w('Incoming transfers can be unsolicited. A counterparty flag does not establish ownership, intent or the origin of every coin.','Входящий перевод может быть нежелательным. Метка контрагента не устанавливает владельца, умысел или происхождение всех средств.','入账可能并非自愿接受。交易对手标签不能确定所有权、意图或全部资金来源。'),
  w('Exchange labels and verified contract code are context, not a safety guarantee. Sources may reuse the same reports and are not independent votes.','Метка биржи и проверенный код контракта — контекст, а не гарантия безопасности. Источники могут использовать одни и те же сообщения: это не независимые голоса.','交易所标签和已验证合约代码仅提供背景，不保证安全。来源可能复用同一报告，不能视为独立投票。'),
 ];
}
