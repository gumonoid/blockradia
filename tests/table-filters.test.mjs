import test from 'node:test';import assert from 'node:assert/strict';
import {filterTransactions} from '../lib/table-filters.ts';
const defaults={text:'',status:'all',from:'',to:'',direction:'all',minimum:'',asset:''};
const rows=[{hash:'a',status:'pending',value:'200000000',from:{hash:'alice'},to:{hash:'bob'}},{hash:'b',status:'ok',block_number:2,timestamp:'2026-11-04T12:00:00Z',value:'500000000',from:{hash:'bob'},to:{hash:'alice'}},{hash:'c',status:'error',block_number:3,timestamp:'2026-11-03T12:00:00Z',token_amount:'40',token_symbol:'USDT'}];
const pick=f=>filterTransactions(rows,{...defaults,...f},{wallet:'alice',decimals:8,symbol:'BTC',identity:a=>a==='bob'?'Exchange label':''}).map(t=>t.hash);
test('pending and confirmed sets distinguish mined failed operations',()=>{assert.deepEqual(pick({status:'pending'}),['a']);assert.deepEqual(pick({status:'confirmed'}),['b','c'])});
test('search finds labels; direction and amount filters use relevant asset units',()=>{assert.deepEqual(pick({text:'exchange'}),['a','b']);assert.deepEqual(pick({direction:'in',minimum:'3'}),['b']);assert.deepEqual(pick({asset:'usdt',minimum:'30'}),['c']);assert.deepEqual(pick({minimum:'100'}),[])});
test('date filtering excludes unknown timestamps without inventing dates',()=>{assert.deepEqual(pick({from:'2026-11-04',to:'2026-11-04'}),['b'])});
