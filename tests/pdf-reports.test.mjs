import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFName} from 'pdf-lib';
import {reportPDF,investigationReportData,amlReportData} from '../lib/pdf-reports.ts';

test('PDF reports paginate long notes and keep untrusted input as plain text',async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/report-latin.ttf',import.meta.url)));
 const model=investigationReportData({name:'Проверка PDF',network:'ethereum',root:'0x'+'1'.repeat(40),notes:'Длинная заметка '.repeat(600),nodes:{},transfers:[]});
 const bytes=await reportPDF(model,font);
 const pdf=await PDFDocument.load(bytes);
 assert(pdf.getPageCount()>1);
 assert.equal(pdf.catalog.has(PDFName.of('OpenAction')),false);
 assert.equal(pdf.catalog.has(PDFName.of('AA')),false);
 assert.equal(pdf.getTitle(),'BlockRadia - Проверка PDF');
});

test('AML model includes coverage, snapshot dates, hashes and sources',()=>{
 const model=amlReportData({network:'ethereum',sanctions:{source:'https://example.com',retrievedAt:'2026-11-10',sha256:'fixture'},counterparties:[{address:'wallet',incoming:1,outgoing:0,hashes:['transaction']}],warnings:['Incomplete source']});
 const text=JSON.stringify(model);
 for(const value of ['https://example.com','2026-11-10','fixture','transaction','Incomplete source'])assert(text.includes(value));
});
