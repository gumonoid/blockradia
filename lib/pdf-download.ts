export async function downloadReportPDF(kind:'aml'|'investigation',data:any,filename:string){
 const fontURL=/[\u3400-\u9fff]/u.test(JSON.stringify(data))
  ?new URL('./assets/report-font.ttf',import.meta.url)
  :new URL('./assets/report-latin.ttf',import.meta.url);
 const [{reportPDF,amlReportData,investigationReportData},response]=await Promise.all([
  import('./pdf-reports'),
  fetch(fontURL.href),
 ]);
 if(!response.ok)throw Error('PDF font unavailable');
 const bytes=await reportPDF(kind==='aml'?amlReportData(data):investigationReportData(data),new Uint8Array(await response.arrayBuffer()));
 const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));
 const anchor=document.createElement('a');
 anchor.href=url;anchor.download=filename;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
