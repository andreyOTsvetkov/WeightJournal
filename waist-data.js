import { normalize, fromCSV, toCSV } from './data.js';

export const WAIST_KEY = 'waist-journal-v1';
export function normalizeWaist(records) {
  if (!Array.isArray(records)) throw new Error('Неверный формат замеров талии.');
  return normalize(records.map(r => ({ date: r?.date, weight: r?.waist })))
    .map(r => ({ date: r.date, waist: r.weight }));
}
export function waistFromCSV(text) {
  return fromCSV(text, 'waist').map(r => ({ date: r.date, waist: r.weight }));
}
export function waistToCSV(records) {
  return toCSV(records.map(r => ({ date: r.date, weight: r.waist }))).replace('date,weight', 'date,waist');
}
export function loadWaist(storage) {
  const saved = storage.getItem(WAIST_KEY);
  return saved === null ? [] : normalizeWaist(JSON.parse(saved));
}
export function saveWaist(storage, records) {
  const next = normalizeWaist(records);
  storage.setItem(WAIST_KEY, JSON.stringify(next));
  return next;
}
