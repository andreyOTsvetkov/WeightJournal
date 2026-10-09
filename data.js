export const DAY = 86400000;
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= '1900-01-01' && s <= '9999-12-31' && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function shift(date, days) { return new Date(Date.parse(date) + days * DAY).toISOString().slice(0,10); }
export function validWeight(w) { return typeof w === 'number' && Number.isFinite(w) && w > 0 && w <= 1000; }
export function parseWeight(value) { const s = String(value).trim().replace(',', '.'); return /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN; }
export function average(records, end, days) { const start = shift(end, 1-days); const values = records.filter(r => r.date >= start && r.date <= end); return { value: values.length ? values.reduce((n,r) => n+r.weight,0)/values.length : null, count: values.length, start, end }; }
export function normalize(records) { if (!Array.isArray(records)) throw new Error('Неверный формат данных.'); const map = new Map(); for (const r of records) { if (!r || !validDate(r.date) || !validWeight(r.weight)) throw new Error('Неверная дата или вес.'); map.set(r.date,{date:r.date,weight:r.weight}); } return [...map.values()].sort((a,b) => a.date.localeCompare(b.date)); }
export function toCSV(records) { return '\uFEFFdate,weight\r\n' + records.map(r => `${r.date},${r.weight}`).join('\r\n') + '\r\n'; }
export function fromCSV(text) {
  text = text.replace(/^\uFEFF/,'');
  const first = text.split(/\r?\n/)[0]; const sep = first.includes(';') ? ';' : ',';
  const rows=[]; let row=[], field='', quoted=false, closed=false;
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(quoted) { if(c==='"') { if(text[i+1]==='"') {field+='"';i++;} else {quoted=false;closed=true;} } else field+=c; }
    else if(c==='"') { if(field || closed) throw new Error('Некорректные кавычки в CSV.'); quoted=true; }
    else if(c===sep || c==='\n' || c==='\r') { row.push(field);field='';closed=false; if(c!==sep) {if(row.some(v=>v.trim())) rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;} }
    else {if(closed && c.trim()) throw new Error('Некорректный CSV.'); if(!closed)field+=c;}
  }
  if(quoted) throw new Error('Незакрытые кавычки в CSV.');
  row.push(field); if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length || rows[0].length!==2 || rows[0][0].trim().toLowerCase()!=='date' || rows[0][1].trim().toLowerCase()!=='weight') throw new Error('Ожидаются столбцы date,weight.');
  if(rows.length===1) throw new Error('В файле нет записей.');
  return normalize(rows.slice(1).map((r,i)=> {const date=r[0].trim(),weight=parseWeight(r[1]);if(r.length!==2 || !validDate(date) || !validWeight(weight))throw new Error(`Строка ${i+2}: нужна дата ГГГГ-ММ-ДД и вес от 0 до 1000 кг (не включая 0).`);return {date,weight};}));
}
