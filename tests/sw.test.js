import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function setup(fetch) {
  const handlers = {}, saved = new Map();
  let skipped = false, requests;
  const cache = {
    addAll: async values => { requests = values; },
    match: async url => saved.get(url)?.clone(),
    put: async (url, response) => { saved.set(url, response.clone()); }
  };
  runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), {
    URL, Request, fetch,
    caches: { open: async () => cache },
    self: {
      registration: { scope: 'https://example.com/WeightJournal/' },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: async () => { skipped = true; }
    }
  });
  return { handlers, saved, installed: () => ({ skipped, requests }) };
}

test('installation bypasses HTTP cache and activates without waiting for tabs', async () => {
  const state = setup(); let done;
  state.handlers.install({ waitUntil: p => { done = p; } }); await done;
  assert.equal(state.installed().skipped, true);
  assert.ok(state.installed().requests.every(r => r.cache === 'reload'));
});

for (const offline of [false, true]) test(offline ? 'offline serves stored files' : 'online replaces stale files', async () => {
  const url = 'https://example.com/WeightJournal/style.css';
  const state = setup(async (_request, options) => {
    assert.equal(options.cache, 'no-cache');
    if (offline) throw new Error('offline');
    return new Response('new CSS');
  });
  state.saved.set(url, new Response('old CSS'));
  let response, done;
  state.handlers.fetch({ request: new Request(url), respondWith: p => { response = p; }, waitUntil: p => { done = p; } });
  assert.equal(await (await response).text(), offline ? 'old CSS' : 'new CSS');
  await done;
  assert.equal(await state.saved.get(url).text(), offline ? 'old CSS' : 'new CSS');
});
