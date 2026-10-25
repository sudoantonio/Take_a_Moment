import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as content from '../dist/content.js';
import * as contact from '../dist/contact.js';
import * as journey from '../dist/journey.js';
import * as activity from '../dist/activity.js';
import * as i18n from '../dist/i18n.js';

const source = (await readFile(new URL('../dist/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '')
  .replace(/\bimport\(/g, 'loadModule(');
const tick = () => new Promise(resolve => setImmediate(resolve));

function app(hash = '#/home', imports = specifier => import(new URL(`../dist/${specifier.slice(2)}`, import.meta.url))) {
  const events = new Map(), rootEvents = new Map(), attributes = new Map(), requests = [];
  const root = { innerHTML: '', querySelector: () => null, addEventListener: (name, fn) => rootEvents.set(name, fn),
    setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key) };
  const location = { hash };
  const document = { hidden: false, readyState: 'loading', activeElement: null, title: '',
    querySelector: selector => selector === '#app' ? root : selector === '#announcer' ? { textContent: '' } : { addEventListener() {} },
    addEventListener() {} };
  let offlineStarts = 0;
  const context = vm.createContext({ ...content, ...contact, ...journey, ...activity, ...i18n, document, location,
    navigator: { onLine: false }, history: { replaceState(_state, _title, hash) { location.hash = hash; } },
    window: { addEventListener: (name, fn) => events.set(name, fn), scrollTo() {} },
    requestAnimationFrame: fn => fn(), setTimeout, clearTimeout, CSS: { escape: value => value },
    registerOffline: async () => { offlineStarts++; return false; }, checkConnection: async () => false,
    getOfflineStatus: async () => ({ ready: false }), saveOffline() {}, removeOffline() {},
    loadModule: specifier => { requests.push(specifier); return imports(specifier); },
  });
  vm.runInContext(source, context);
  return { root, requests, attributes, document, async toggleLanguage() { await rootEvents.get('click')({ target: { closest: selector => selector === '[data-action]' ? { dataset: { action: 'change-language' }, disabled: false } : null } }); }, offlineStarts: () => offlineStarts,
    async navigate(hash) { location.hash = hash; events.get('hashchange')(); await tick(); },
    load() { events.get('load')(); },
  };
}

test('Home and Community render without fetching practice or audio code; offline setup waits for load', async () => {
  const a = app();
  assert.match(a.root.innerHTML, /Practice now/);
  assert.deepEqual(a.requests, []);
  assert.equal(a.offlineStarts(), 0);
  await a.navigate('#/support');
  assert.match(a.root.innerHTML, /<h1>Community<\/h1>/);
  assert.deepEqual(a.requests, []);
  a.load(); await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(a.offlineStarts(), 1);
});

test('direct practice loads on demand, keeps all three steps and reuses the modules', async () => {
  const a = app('#/practice/observe/1');
  assert.match(a.root.innerHTML, /One moment/);
  for (let i = 0; i < 20 && a.attributes.has('aria-busy'); i++) await tick();
  assert.equal(a.attributes.has('aria-busy'), false);
  assert.match(a.root.innerHTML, /data-practice="observe" data-step="1"/);
  assert.match(a.root.innerHTML, /#\/practice\/observe\/2/);
  const downloads = a.requests.length;
  await a.navigate('#/practice/observe/3');
  assert.match(a.root.innerHTML, /#\/finished\/observe/);
  await a.navigate('#/choose');
  assert.match(a.root.innerHTML, /Choose a practice/);
  assert.equal((a.root.innerHTML.match(/class="practice-card /g) || []).length, 21);
  assert.equal(a.requests.length, downloads);
});

test('late feature downloads cannot reopen a practice after navigating back to Community', async () => {
  let resume;
  const waiting = new Promise(resolve => { resume = resolve; });
  const a = app('#/practice/observe/1', async specifier => {
    await waiting;
    return import(new URL(`../dist/${specifier.slice(2)}`, import.meta.url));
  });
  await a.navigate('#/support');
  resume();
  for (let i = 0; i < 5; i++) await tick();
  assert.match(a.root.innerHTML, /<h1>Community<\/h1>/);
  assert.doesNotMatch(a.root.innerHTML, /breathing-shell/);
});

test('failed practice-code download gives a retry and never leaves a blank page', async () => {
  const a = app('#/practice/observe/1', async () => { throw new Error('offline'); });
  await tick();
  assert.match(a.root.innerHTML, /Couldn’t load this practice/);
  assert.match(a.root.innerHTML, /data-action="reload-app"/);
  assert.equal(a.attributes.has('aria-busy'), false);
  await a.navigate('#/home');
  assert.match(a.root.innerHTML, /Practice now/);
});


test('language toggle translates Home, keeps the route, and returns to English', async () => {
  const a = app();
  assert.match(a.root.innerHTML, /🇺🇸/);
  await a.toggleLanguage();
  assert.match(a.root.innerHTML, /🇪🇸/);
  assert.match(a.root.innerHTML, /Practicar ahora/);
  await a.navigate('#/support');
  assert.match(a.root.innerHTML, /<h1>Comunidad<\/h1>/);
  await a.navigate('#/settings');
  assert.match(a.root.innerHTML, /Guardar en este dispositivo/);
  await a.toggleLanguage();
  assert.match(a.root.innerHTML, /Save on this device/);
  await a.navigate('#/home');
  assert.match(a.root.innerHTML, /Practice now/);
});

test('Spanish direct practice translates the cue, navigation and safe contact options', async () => {
  await i18n.setLanguage('es');
  try {
    const a = app('#/practice/observe/1');
    for (let i = 0; i < 30 && a.attributes.has('aria-busy'); i++) await tick();
    assert.match(a.root.innerHTML, /Mira a tu alrededor/);
    assert.match(a.root.innerHTML, /Siguiente/);
    assert.match(a.root.innerHTML, /Paso anterior/);
    await a.navigate('#/request');
    assert.match(a.root.innerHTML, /value="Mentorship"[^>]*>Acompañamiento/);
    await a.navigate('#/contact');
    assert.match(a.root.innerHTML, /value="none"[^>]*>No tengo un medio de contacto seguro/);
  } finally { await i18n.setLanguage('en'); }
});
