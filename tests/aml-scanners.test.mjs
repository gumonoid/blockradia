import test from 'node:test';
import assert from 'node:assert/strict';
import {createScannerCollector,parseGoPlus,parseBlockscout,parseTronscan} from '../lib/aml-scanners.ts';
import {securityFlags} from '../lib/aml-scanner-types.ts';
import {buildAMLReview,validScannerFeed,amlExplanation} from '../lib/aml-review.ts';
import {amlReport,amlText} from '../bot/reports.mjs';
import {amlReportData} from '../lib/pdf-reports.ts';
import {localExplorer} from '../app/api/explorer/route.ts';
import {refreshAML} from '../lib/aml-refresh.ts';
import ofac from '../lib/ofac-snapshot.json' with {type:'json'};
import additional from '../lib/aml-additional.json' with {type:'json'};

const address='0x'+'1'.repeat(40),peer='0x'+'2'.repeat(40);
const go=()=>({code:1,result:{...Object.fromEntries(securityFlags.map(f=>[f,'0'])),number_of_malicious_contracts_created:'0'}});
const bundle={transfers:[{id:'one',hash:'tx',from:peer,to:address,amount:'1',asset:'native',symbol:'ETH'}]};

test('GoPlus parses explicit flags, preserves source attribution and never turns unknown into clean',()=>{
 const data=go();data.result.phishing_activities='1';data.result.data_source='SlowMist';data.result.mixer=null;
 const parsed=parseGoPlus(data);
 assert.equal(parsed.status,'partial');assert.equal(parsed.findings.length,1);
 assert.equal(parsed.findings[0].attribution,'SlowMist');
 assert.throws(()=>parseGoPlus({code:1,result:{}}));
 assert.throws(()=>parseGoPlus({code:429,result:data.result}));
 assert.equal(parseGoPlus(go()).status,'ok');
});

test('Blockscout only uses public labels and scam flag, not contract verification or private tags',()=>{
 const data={hash:address,is_scam:false,is_verified:true,name:'Binance',public_tags:[{label:'Exchange'}],private_tags:[{label:'SECRET'}]};
 const result=parseBlockscout(data,address);
 assert.equal(result.findings.filter(f=>f.kind==='risk').length,0);
 assert(!JSON.stringify(result).includes('SECRET'));
 assert.throws(()=>parseBlockscout({...data,hash:peer},address));
 assert.equal(parseBlockscout({...data,is_scam:undefined},address).status,'partial');
 assert.equal(parseBlockscout({...data,is_scam:true},address).findings[0].kind,'risk');
});

test('TRONSCAN separates risk tags from ordinary attribution and rejects error payloads',()=>{
 const result=parseTronscan({redTag:'Reported phishing',blueTag:'',greyTag:'',publicTag:'Wallet'});
 assert.deepEqual(result.findings.map(f=>f.kind),['risk','label']);
 assert.throws(()=>parseTronscan({code:401}));
});

test('collector combines providers, caches concurrent requests and never leaks server keys',async()=>{
 const urls=[];
 const collect=createScannerCollector(async url=>{urls.push(url);return url.includes('goplus')?go():{hash:address,is_scam:false,public_tags:[]};},{});
 const [first,second]=await Promise.all([collect('ethereum',address),collect('ethereum',address)]);
 assert.equal(urls.length,2);assert.deepEqual(first,second);
 assert(validScannerFeed(first,'ethereum',address));
 assert.equal(first.sources.length,2);
 const tron=createScannerCollector(async(url,headers)=>url.includes('goplus')?go():{redTag:'',blueTag:'Bybit',greyTag:'',publicTag:''},{TRONSCAN_API_KEY:'fixture-secret'});
 const feed=await tron('tron','TEPSrSYPDSQ7yXpMFPq91Fb1QEWpMkRGfn');
 assert(!JSON.stringify(feed).includes('fixture-secret'));
 assert.equal(feed.sources[1].findings[0].kind,'label');
});

test('provider failures, missing keys and unsupported networks remain explicit',async()=>{
 let requests=0;
 const collect=createScannerCollector(async()=>{requests++;throw Error('secret upstream error');},{});
 const eth=await collect('ethereum',address);
 assert(eth.sources.every(s=>s.status==='unavailable'));
 assert(!JSON.stringify(eth).includes('secret'));
 const tron=await collect('tron','TEPSrSYPDSQ7yXpMFPq91Fb1QEWpMkRGfn');
 assert.equal(tron.sources[1].status,'not_configured');
 const before=requests;
 for(const network of ['bitcoin','solana','ton']){
  assert.equal((await collect(network,'address')).sources[0].status,'unsupported');
 }
 assert.equal(requests,before);
 await assert.rejects(collect('ethereum','https://127.0.0.1/'));
 await assert.rejects(collect('__proto__',address));
});

test('desktop and bot share decisions and explanations; source flags require review, not inherited guilt',async()=>{
 const collect=createScannerCollector(async url=>url.includes('goplus')?{...go(),result:{...go().result,phishing_activities:'1'}}:{hash:address,is_scam:false},{});
 const feed=await collect('ethereum',address);
 const review=buildAMLReview('ethereum',address,bundle,feed);
 const bot=amlReport('ethereum',address,{...bundle,scannerEvidence:feed});
 assert.deepEqual(bot.rating,review.rating);
 assert.equal(review.rating.color,'yellow');assert.equal(review.rating.reason,'review_signals');
 assert.equal(review.report.riskScore,null);
 assert(amlExplanation(review,'ru')[0].includes('не доказывает'));
 assert(amlExplanation(review,'zh')[0].includes('需要审查'));
 const text=amlText('ethereum',address,{...bundle,scannerEvidence:feed});
 assert.match(text,/Why this result/);assert.match(text,/GoPlus/);assert.match(text,/phishing activities/);
 const pdf=amlReportData({...review.report,rating:review.rating,scannerEvidence:feed,explanation:amlExplanation(review)});
 assert(JSON.stringify(pdf).includes('phishing activities'));
 assert(JSON.stringify(pdf).includes(feed.sources[0].checkedAt));
});

test('malformed, mismatched, unsafe links and expired scanner data cannot produce a green result',async()=>{
 const collect=createScannerCollector(async url=>url.includes('goplus')?go():{hash:address,is_scam:false},{});
 const feed=await collect('ethereum',address);
 assert(!validScannerFeed({...feed,address:peer},'ethereum',address));
 assert(!validScannerFeed({...feed,sources:[{...feed.sources[0],url:'javascript:alert(1)'}]},'ethereum',address));
 assert(!validScannerFeed({...feed,sources:[{...feed.sources[0],findings:[{kind:'risk',label:{},code:'bad'}]}]},'ethereum',address));
 const stale={...feed,checkedAt:'2020-01-01T00:00:00Z'};
 assert.equal(buildAMLReview('ethereum',address,bundle,stale).rating.color,'yellow');
 assert.equal(buildAMLReview('ethereum',address,bundle).rating.color,'yellow');
});

test('AML route rejects invalid inputs before any provider calls and returns explicit unsupported coverage',async()=>{
 for(const query of ['network=ethereum&q=invalid','network=bad&q='+address]){
  const response=await localExplorer(new Request('http://localhost/api/explorer?action=aml-address&'+query));
  assert.equal(response.status,400);
 }
 const response=await localExplorer(new Request('http://localhost/api/explorer?action=aml-address&network=bitcoin&q=1BoatSLRHtKNngkdXEeobR76b53LETtpyT'));
 const feed=await response.json();
 assert.equal(feed.sources[0].status,'unsupported');
 assert.equal(response.headers.get('cache-control'),'no-store');
});

test('green requires fresh complete sources; counterparty sanctions are yellow and direct sanctions are red',async()=>{
 const now=new Date().toISOString();
 const snapshot={...ofac,retrievedAt:now,records:ofac.records.filter(r=>![address,peer].includes(r.address.toLowerCase()))};
 const feed={ofac:snapshot,additional:additional.map(s=>({...s,retrievedAt:now}))};
 await refreshAML(async()=>feed,true);
 const collect=createScannerCollector(async url=>url.includes('goplus')?go():{hash:address,is_scam:false,name:'Exchange label'},{});
 const scanners=await collect('ethereum',address);
 assert.equal(buildAMLReview('ethereum',address,bundle,scanners).rating.color,'green');
 for(const sources of [[scanners.sources[0]], [scanners.sources[0],scanners.sources[0]],
  [{...scanners.sources[0],checks:1,totalChecks:1},scanners.sources[1]],
  [{...scanners.sources[0],url:scanners.sources[1].url},scanners.sources[1]]]){
  assert.equal(buildAMLReview('ethereum',address,bundle,{...scanners,sources}).rating.color,'yellow');
 }
 const staleSource={...scanners,sources:scanners.sources.map(s=>({...s,checkedAt:'2020-01-01T00:00:00Z'}))};
 assert.equal(buildAMLReview('ethereum',address,bundle,staleSource).rating.color,'yellow');
 const emptyChecks={...scanners,sources:scanners.sources.map(s=>({...s,checks:0,totalChecks:0}))};
 assert.equal(buildAMLReview('ethereum',address,bundle,emptyChecks).rating.color,'yellow');
 await refreshAML(async()=>({...feed,ofac:{...snapshot,records:[...snapshot.records,{address:peer,uid:'123',currency:'ETH',entity:'Test fixture',programs:[]}]}}),true);
 assert.equal(buildAMLReview('ethereum',address,bundle,scanners).rating.color,'yellow');
 await refreshAML(async()=>({...feed,ofac:{...snapshot,records:[...snapshot.records,{address,uid:'123',currency:'ETH',entity:'Test fixture',programs:[]}]}}),true);
 assert.equal(buildAMLReview('ethereum',address,bundle,scanners).rating.color,'red');
});

test('Blockscout credentials only go to its fixed API host and never enter evidence links',async()=>{
 const urls=[];
 const collect=createScannerCollector(async url=>{urls.push(url);return url.includes('goplus')?go():{hash:address,is_scam:false};},{BLOCKSCOUT_API_KEY:'fixture-key'});
 const feed=await collect('ethereum',address);
 const privateURL=new URL(urls.find(url=>url.includes('fixture-key')));
 assert.equal(privateURL.hostname,'api.blockscout.com');
 assert.equal(privateURL.pathname,'/1/api/v2/addresses/'+address);
 assert(!JSON.stringify(feed).includes('fixture-key'));
});
