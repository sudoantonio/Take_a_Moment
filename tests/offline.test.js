import test from 'node:test';
import assert from 'node:assert/strict';
import { PILOT_AUDIO } from '../dist/practice-audio.js';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');

function worker(fetchImpl) {
  const handlers = new Map(), storage = new Map();
  const caches = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const entries = storage.get(name);
      return { async match(url) { return entries.get(String(url))?.clone(); }, async put(url, response) { entries.set(String(url), response.clone()); } };
    },
    async delete(name) { return storage.delete(name); },
    async keys() { return [...storage.keys()]; },
  };
  const context = vm.createContext({
    URL, Response, Request, Promise, Set, Error, caches, fetch: fetchImpl,
    self: { registration: { scope: 'https://example.test/' }, location: { origin: 'https://example.test' }, clients: { matchAll: async () => [], claim: async () => {} }, skipWaiting: async () => {}, addEventListener: (name, handler) => handlers.set(name, handler) },
  });
  vm.runInContext(script, context);
  return {
    storage,
    async message(type) {
      let result, task;
      handlers.get('message')({ data: { type }, ports: [{ postMessage(data) { result = data; } }], waitUntil(promise) { task = promise; } });
      await task;
      return result;
    },
    async request(url, method = 'GET', mode = 'cors', range) {
      let response;
      handlers.get('fetch')({ request: { url, method, mode, headers: { get: () => range } }, respondWith(promise) { response = promise; }, waitUntil() {} });
      return response ? await response : null;
    },
  };
}
const publicResponse = url => new Response(url.endsWith('/') || url.endsWith('index.html') ? '<html data-bfp-app></html>' : 'public content');

test('installation does not automatically save the public package', async () => {
  const w = worker(async url => publicResponse(url));
  assert.equal((await w.message('STATUS')).ready, false);
});

test('explicit save confirms only a complete package; remove actually clears it', async () => {
  const w = worker(async url => publicResponse(url));
  assert.equal((await w.message('SAVE')).ready, true);
  assert.equal((await w.message('STATUS')).ready, true);
  assert.equal((await w.message('REMOVE')).ready, false);
  assert.equal((await w.message('STATUS')).ready, false);
});

test('failed or redirected downloads never produce a ready package', async () => {
  const w = worker(async url => url.endsWith('contact.js') ? new Response('failure', { status: 503 }) : publicResponse(url));
  assert.equal((await w.message('SAVE')).ok, false);
  assert.equal((await w.message('STATUS')).ready, false);
});

test('an authentication page cannot be cached as the application shell', async () => {
  const w = worker(async () => new Response('<html>Sign in</html>'));
  assert.equal((await w.message('SAVE')).ok, false);
  assert.equal((await w.message('STATUS')).ready, false);
});

test('only public allowlisted assets are intercepted; no forms, query strings or external URLs', async () => {
  const w = worker(async url => publicResponse(url));
  assert.equal(await w.request('https://example.test/api/support', 'POST'), null);
  assert.equal(await w.request('https://example.test/?email=alex@example.com', 'GET', 'navigate'), null);
  assert.equal(await w.request('https://outside.example/index.html'), null);
  assert.equal(await w.request('https://example.test/health.txt'), null);
});

test('a saved app genuinely opens when the network fetch fails', async () => {
  let connected = true;
  const w = worker(async url => { if (!connected) throw new Error('OFFLINE'); return publicResponse(url); });
  await w.message('SAVE'); connected = false;
  const result = await w.request('https://example.test/', 'GET', 'navigate');
  assert.equal(result.status, 200);
  assert.match(await result.text(), /data-bfp-app/);
});


test('the immersive renderer is part of the complete offline package', async () => {
  let connected = true;
  const requested = [];
  const w = worker(async url => {
    if (!connected) throw new Error('OFFLINE');
    requested.push(url);
    return publicResponse(url);
  });
  assert.equal((await w.message('SAVE')).ready, true);
  assert.ok(requested.includes('https://example.test/immersive.js'));
  connected = false;
  const response = await w.request('https://example.test/immersive.js');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public content');
});

test('all 68 voice clips, nine backgrounds and attributions remain available offline', async () => {
  let connected = true;
  const w = worker(async url => { if (!connected) throw new Error('OFFLINE'); return publicResponse(url); });
  assert.equal((await w.message('SAVE')).ready, true);
  connected = false;
  const assets = Object.values(PILOT_AUDIO).flatMap(p => [p.nature, ...(p.mode === 'pattern' ? [p.intro, ...p.phases, p.outro] : p.clips)]);
  for (const asset of [...new Set(assets), './ambient-audio.js', './audio/nature/ATTRIBUTION.txt', './audio/nature/credits.json']) {
    assert.equal((await w.request(new URL(asset, 'https://example.test/').href)).status, 200, asset);
  }
});

test('cached MP3s support browser byte ranges offline, including invalid ranges', async () => {
  let connected = true;
  const w = worker(async url => { if (!connected) throw new Error('OFFLINE'); return publicResponse(url); });
  await w.message('SAVE'); connected = false;
  const url = 'https://example.test/audio/voice/observe-step-01.mp3';
  const partial = await w.request(url, 'GET', 'cors', 'bytes=0-5');
  assert.equal(partial.status, 206);
  assert.equal(await partial.text(), 'public');
  assert.equal(partial.headers.get('Content-Range'), 'bytes 0-5/14');
  const suffix = await w.request(url, 'GET', 'cors', 'bytes=-7');
  assert.equal(await suffix.text(), 'content');
  assert.equal((await w.request(url, 'GET', 'cors', 'bytes=100-200')).status, 416);
});

test('explicit downloads use at most four concurrent fetches and write incrementally', async () => {
  let active = 0, peak = 0, fetched = 0, writesSeen = false;
  const w = worker(async url => {
    active++; peak = Math.max(peak, active); fetched++;
    if (fetched > 4 && [...w.storage.values()].some(entries => entries.size > 0)) writesSeen = true;
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return publicResponse(url);
  });
  assert.equal((await w.message('SAVE')).ready, true);
  assert.equal(peak, 4);
  assert.equal(writesSeen, true);
});

test('failed downloads finish outstanding writes before removing the incomplete cache', async () => {
  let fetched = 0;
  const w = worker(async url => {
    fetched++;
    await new Promise(resolve => setImmediate(resolve));
    return url.endsWith('index.html') ? new Response('failed', { status: 503 }) : publicResponse(url);
  });
  assert.equal((await w.message('SAVE')).ok, false);
  assert.ok(fetched < 10, 'remaining files must not be scheduled after failure');
  assert.equal(w.storage.size, 0);
});

test('Spanish can still be selected from a complete offline download', async () => {
  let connected = true;
  const w = worker(async url => { if (!connected) throw new Error('OFFLINE'); return publicResponse(url); });
  await w.message('SAVE'); connected = false;
  for (const name of ['i18n.js', 'locales/es.js']) {
    assert.equal((await w.request(`https://example.test/${name}`)).status, 200);
  }
});
