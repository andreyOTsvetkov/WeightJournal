import {test} from 'node:test';
import assert from 'node:assert/strict';
import {average,shift,validDate,normalize,fromCSV,toCSV} from '../data.js';
test('seven-day windows are disjoint and missing days are not zeros',()=>{const r=[{date:'2026-10-02',weight:80},{date:'2026-10-03',weight:70},{date:'2026-10-09',weight:72}];assert.equal(average(r,'2026-10-09',7).value,71);assert.equal(average(r,shift('2026-10-09',-7),7).value,80);assert.equal(average(r,'2026-09-01',7).value,null);});
test('calendar boundaries and leap years',()=>{assert.equal(shift('2024-03-01',-1),'2024-02-29');assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2024-02-29'),true);assert.equal(shift('2026-01-01',-1),'2025-12-31');});
test('CSV round trip, BOM, CRLF, quotes and decimal commas',()=>{const r=[{date:'2026-10-09',weight:72.5}];assert.deepEqual(fromCSV(toCSV(r)),r);assert.deepEqual(fromCSV('date;weight\r\n"2026-10-09";"72,5"'),r);assert.deepEqual(fromCSV('date,weight\n2026-10-09,"72,5"'),r);});
test('invalid imports fail as a whole',()=>{for(const s of ['date,weight\n2026-10-09,72\n2026-02-30,80','date,weight\n2026-10-09,-2','date,weight\n2026-10-09,Infinity','date,weight\n2026-10-09,"72','wrong,columns\n2026-10-09,72'])assert.throws(()=>fromCSV(s));});
test('duplicate dates update one daily record and sort chronologically',()=>{assert.deepEqual(normalize([{date:'2026-10-09',weight:72},{date:'2026-10-08',weight:73},{date:'2026-10-09',weight:71}]),[{date:'2026-10-08',weight:73},{date:'2026-10-09',weight:71}]);});
