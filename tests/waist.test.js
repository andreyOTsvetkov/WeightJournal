import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCSV, toCSV } from '../data.js';
import { WAIST_KEY, loadWaist, saveWaist, waistFromCSV, waistToCSV } from '../waist-data.js';

test('waist operations preserve existing weight storage byte for byte', () => {
  const oldWeight = '[{"date":"2026-10-09","weight":110.65},{"date":"2026-10-23","weight":109}]';
  const values = new Map([['weight-journal-v1', oldWeight]]), writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
  assert.deepEqual(loadWaist(storage), []);
  assert.deepEqual(writes, []);
  saveWaist(storage, [{date:'2026-10-23',waist:85.5}]);
  const imported = waistFromCSV('date;waist\n2026-10-23;84,5\n2026-10-22;86');
  saveWaist(storage, [...loadWaist(storage), ...imported]);
  assert.deepEqual(loadWaist(storage), [{date:'2026-10-22',waist:86},{date:'2026-10-23',waist:84.5}]);
  saveWaist(storage, []);
  assert.ok(writes.every(key => key === WAIST_KEY));
  assert.equal(values.get('weight-journal-v1'), oldWeight);
});
test('CSV files cannot be confused and each format round-trips', () => {
  const waist = [{date:'2026-10-23',waist:85.5}], weight = [{date:'2026-10-23',weight:109}];
  assert.deepEqual(waistFromCSV(waistToCSV(waist)), waist);
  assert.deepEqual(fromCSV(toCSV(weight)), weight);
  assert.throws(() => fromCSV(waistToCSV(waist)));
  assert.throws(() => waistFromCSV(toCSV(weight)));
  assert.throws(() => waistFromCSV('date,waist\n2026-10-23,85\n2026-02-30,80'));
});
test('corrupt or invalid waist data does not get overwritten', () => {
  const storage = {getItem: () => '{broken', setItem: () => assert.fail('must not write')};
  assert.throws(() => loadWaist(storage));
  assert.throws(() => saveWaist(storage, [{date:'2026-10-23',waist:-1}]));
});
