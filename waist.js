import { today, validDate, validWeight, parseWeight, DAY } from './data.js';
import { WAIST_KEY, loadWaist, saveWaist, waistFromCSV, waistToCSV } from './waist-data.js';

const $ = selector => document.querySelector(selector);
const number = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
const dateLabel = date => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date));
let records = [], storageBroken = false;
function notice(message, error = false) {
  $('#waist-status').textContent = message;
  $('#waist-status').classList.toggle('error', error);
}
function load() {
  try { records = loadWaist(localStorage); storageBroken = false; }
  catch { storageBroken = true; notice('Не удалось прочитать замеры талии. Сохранение заблокировано, существующие данные не перезаписаны.', true); }
}
function save(next) {
  if (storageBroken) { notice('Хранилище талии недоступно или повреждено. Сохранение заблокировано.', true); return false; }
  try { records = saveWaist(localStorage, next); render(); return true; }
  catch { notice('Не удалось сохранить замеры. Проверьте доступ к хранилищу и свободное место.', true); return false; }
}
for (const name of ['weight', 'waist']) {
  $(`#${name}-tab`).onclick = () => {
    for (const other of ['weight', 'waist']) {
      $(`#${other}-panel`).hidden = name !== other;
      $(`#${other}-tab`).setAttribute('aria-pressed', String(name === other));
    }
    if (name === 'waist') renderChart();
  };
}
$('#waist-date').value = today();
$('#waist-form').onsubmit = event => {
  event.preventDefault();
  const date = $('#waist-date').value, waist = parseWeight($('#waist-value').value);
  if (!validDate(date) || !validWeight(waist)) { notice('Введите корректную дату и значение больше 0 и не больше 1000 см.', true); return; }
  if (save([...records, { date, waist }])) { $('#waist-value').value = ''; notice('Замер сохранён.'); }
};
function render() {
  $('#waist-count').textContent = records.length;
  $('#waist-export').disabled = !records.length;
  const host = $('#waist-history'); host.replaceChildren();
  if (!records.length) host.innerHTML = '<div class="empty">Добавьте первый замер талии.</div>';
  else {
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th scope="col">Дата</th><th scope="col">Талия</th><th scope="col">Действия</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const r of [...records].reverse()) {
      const row = document.createElement('tr');
      const date = document.createElement('td'), value = document.createElement('td'), actions = document.createElement('td');
      date.textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(r.date));
      value.textContent = `${number(r.waist)} см`;
      for (const [label, action] of [
        ['Изменить', () => { $('#waist-date').value = r.date; $('#waist-value').value = r.waist; $('#waist-value').focus(); }],
        ['Удалить', () => { if (confirm(`Удалить замер талии за ${date.textContent}?`) && save(records.filter(x => x.date !== r.date))) notice('Замер удалён.'); }]
      ]) {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'row-action' + (label === 'Удалить' ? ' delete' : '');
        button.textContent = label; button.setAttribute('aria-label', `${label} замер талии за ${date.textContent}`);
        button.onclick = action; actions.append(button);
      }
      row.append(date, value, actions); body.append(row);
    }
    table.append(body); host.append(table);
  }
  renderChart();
}
function renderChart() {
  const host = $('#waist-chart');
  if (!host.clientWidth) return;
  host.replaceChildren();
  if (!records.length) { host.innerHTML = '<div class="empty">Здесь появится график ваших замеров.</div>'; return; }
  const W = host.clientWidth, H = 280, L = 54, R = 12, T = 18, B = 36;
  const start = Date.parse(records[0].date), end = Date.parse(records.at(-1).date);
  let low = Infinity, high = -Infinity;
  for (const r of records) { low = Math.min(low, r.waist); high = Math.max(high, r.waist); }
  const padding = Math.max((high - low) * .2, .5); low -= padding; high += padding;
  const x = date => start === end ? (L + W - R) / 2 : L + (Date.parse(date) - start) / (end - start) * (W - L - R);
  const y = value => T + (high - value) / (high - low) * (H - T - B);
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.classList.add('chart'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'График талии в сантиметрах. Точные значения доступны в таблице замеров.');
  function add(tag, attrs, text) {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    svg.append(el); return el;
  }
  for (let i = 0; i < 5; i++) {
    const value = low + (high - low) * i / 4;
    add('line', { x1: L, y1: y(value), x2: W-R, y2: y(value), stroke: '#edf0e9' });
    add('text', { x: L-10, y: y(value)+4, 'text-anchor': 'end', fill: '#64786b', 'font-size': 12 }, number(value));
  }
  const intervals = W < 400 ? 2 : 3; let previous;
  for (let i = 0; i <= intervals; i++) {
    const date = new Date(start + Math.round((end-start)/DAY*i/intervals)*DAY).toISOString().slice(0,10);
    if (date === previous) continue; previous = date;
    add('text', { x: x(date), y: H-10, 'text-anchor': start === end ? 'middle' : i === 0 ? 'start' : i === intervals ? 'end' : 'middle', fill: '#64786b', 'font-size': 12 }, dateLabel(date));
  }
  add('polyline', { points: records.map(r => `${x(r.date)},${y(r.waist)}`).join(' '), fill: 'none', stroke: '#315e4c', 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
  for (const r of records) {
    const dot = add('circle', { cx: x(r.date), cy: y(r.waist), r: 4, fill: '#315e4c', stroke: '#fff', 'stroke-width': 2 });
    const title = document.createElementNS(ns, 'title'); title.textContent = `${r.date}: ${number(r.waist)} см`; dot.append(title);
  }
  host.append(svg);
}
$('#waist-export').onclick = () => {
  const url = URL.createObjectURL(new Blob([waistToCSV(records)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `waist-journal-${today()}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#waist-import').onclick = () => $('#waist-file').click();
$('#waist-file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2*1024*1024) throw new Error('Максимальный размер CSV — 2 МБ.');
    const imported = waistFromCSV(await file.text());
    const overlaps = imported.filter(r => records.some(x => x.date === r.date)).length;
    if (overlaps && !confirm(`Импорт обновит замеры талии за ${overlaps} дат. Продолжить?`)) return;
    if (save([...records, ...imported])) notice(`Импортировано замеров талии: ${imported.length}.`);
  } catch (error) { notice(error.message, true); }
  finally { event.target.value = ''; }
};
window.addEventListener('storage', event => { if (event.key === WAIST_KEY || event.key === null) { load(); render(); } });
let chartWidth = 0;
new ResizeObserver(() => {
  const width = $('#waist-chart').clientWidth;
  if (!width || width === chartWidth) return;
  chartWidth = width; renderChart();
}).observe($('#waist-chart'));
load(); render();
