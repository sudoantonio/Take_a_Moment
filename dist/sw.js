const VERSION = 'bfp-public-v73';
const BASE = self.registration.scope;
const FILES = ['./i18n.js', './locales/es.js', './', './index.html', './styles.css', './app.js', './content.js', './contact.js', './journey.js', './activity.js', './breathing.js', './scenes.js', './immersive.js', './offline.js', './manifest.webmanifest', './icon.svg', './bfp-logo.png', './friends.svg', './breath-friend.svg', './observe-friend.svg', './rest-friend.svg', './complete-friend.svg', './bfp-exercises.pdf', './practice-audio.js', './ambient-audio.js', './audio/nature/birds.mp3', './audio/nature/stream.mp3', './audio/nature/wind.mp3', './audio/nature/credits.json', './audio/voice/observe-step-01.mp3', './audio/voice/observe-step-02.mp3', './audio/voice/observe-step-03.mp3', './audio/voice/body-step-01.mp3', './audio/voice/body-step-02.mp3', './audio/voice/body-step-03.mp3', './audio/voice/clouds-step-01.mp3', './audio/voice/clouds-step-02.mp3', './audio/voice/clouds-step-03.mp3', './audio/nature/summer-night.mp3', './audio/nature/rain.mp3', './audio/nature/ATTRIBUTION.txt', './audio/nature/waves.mp3', './audio/nature/chimes.mp3', './audio/nature/fireplace.mp3', './audio/nature/bowl.mp3', './audio/voice/listening-step-02.mp3', './audio/voice/stool-step-01.mp3', './audio/voice/listening-step-03.mp3', './audio/voice/listening-step-01.mp3', './audio/voice/stool-step-03.mp3', './audio/voice/stool-step-02.mp3', './audio/voice/stop-step-02.mp3', './audio/voice/door-step-01.mp3', './audio/voice/box-hold-in.mp3', './audio/voice/stop-step-03.mp3', './audio/voice/stop-step-01.mp3', './audio/voice/door-step-02.mp3', './audio/voice/breath-478-hold.mp3', './audio/voice/door-step-03.mp3', './audio/voice/morning-step-03.mp3', './audio/voice/compassion-step-01.mp3', './audio/voice/box-hold-out.mp3', './audio/voice/morning-step-02.mp3', './audio/voice/breath-478-inhale.mp3', './audio/voice/compassion-step-02.mp3', './audio/voice/compassion-step-03.mp3', './audio/voice/morning-step-01.mp3', './audio/voice/box-intro.mp3', './audio/voice/box-outro.mp3', './audio/voice/breath-478-exhale.mp3', './audio/voice/hug-step-01.mp3', './audio/voice/eating-step-01.mp3', './audio/voice/box-inhale.mp3', './audio/voice/eating-step-03.mp3', './audio/voice/hug-step-03.mp3', './audio/voice/hug-step-02.mp3', './audio/voice/eating-step-02.mp3', './audio/voice/wash-hands-step-03.mp3', './audio/voice/focus-step-03.mp3', './audio/voice/stretch-step-01.mp3', './audio/voice/focus-step-02.mp3', './audio/voice/transition-step-01.mp3', './audio/voice/box-exhale.mp3', './audio/voice/wash-hands-step-02.mp3', './audio/voice/breath-step-01.mp3', './audio/voice/breath-step-03.mp3', './audio/voice/transition-step-03.mp3', './audio/voice/stretch-step-02.mp3', './audio/voice/stretch-step-03.mp3', './audio/voice/focus-step-01.mp3', './audio/voice/transition-step-02.mp3', './audio/voice/wash-hands-step-01.mp3', './audio/voice/breath-step-02.mp3', './audio/voice/gratitude-step-03.mp3', './audio/voice/gratitude-step-02.mp3', './audio/voice/breath-478-intro.mp3', './audio/voice/breath-478-outro.mp3', './audio/voice/gratitude-step-01.mp3', './audio/voice/kindness-step-02.mp3', './audio/voice/kindness-step-03.mp3', './audio/voice/intention-step-01.mp3', './audio/voice/intention-step-03.mp3', './audio/voice/kindness-step-01.mp3', './audio/voice/intention-step-02.mp3'].map(path => new URL(path, BASE).href);
const ALLOWED = new Set(FILES);
let saveInProgress;

async function cachedMediaResponse(response, range) {
  if (!range) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const bytes = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
    'Content-Range': `bytes ${start}-${end}/${bytes.byteLength}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes',
  } });
}

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

async function isReady() {
  const cache = await caches.open(VERSION);
  const checks = await Promise.all(FILES.map(url => cache.match(url)));
  return checks.every(Boolean);
}

async function savePublicContent() {
  if (await isReady()) return;
  try {
    const cache = await caches.open(VERSION);
    let next = 0, failure;
    // Bound network and memory use; write each file before fetching another.
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (!failure && next < FILES.length) {
        const url = FILES[next++];
        try {
          const response = await fetch(url, { cache: 'reload', redirect: 'error' });
          if (!response.ok || response.type === 'opaque' || response.redirected) throw new Error('DOWNLOAD_FAILED');
          if (url === BASE || url.endsWith('/index.html')) {
            const html = await response.clone().text();
            if (!html.includes('data-bfp-app')) throw new Error('INVALID_APP_SHELL');
          }
          await cache.put(url, response);
        } catch (error) { failure ||= error; }
      }
    }));
    if (failure) throw failure;
    if (!(await isReady())) throw new Error('INCOMPLETE_DOWNLOAD');
  } catch (error) {
    await caches.delete(VERSION);
    throw error;
  }
}

self.addEventListener('message', event => {
  const port = event.ports?.[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (event.data?.type === 'SAVE') {
        if (!saveInProgress) saveInProgress = savePublicContent().finally(() => { saveInProgress = null; });
        await saveInProgress;
      } else if (event.data?.type === 'REMOVE') {
        if (saveInProgress) await saveInProgress.catch(() => {});
        await Promise.all((await caches.keys()).filter(key => key.startsWith('bfp-public-')).map(key => caches.delete(key)));
      } else if (event.data?.type !== 'STATUS') throw new Error('UNKNOWN_ACTION');
      port.postMessage({ ok: true, ready: await isReady() });
    } catch { port.postMessage({ ok: false, error: 'OFFLINE_FAILED' }); }
  })());
});

async function notifyNetwork(online) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'NETWORK_STATUS', online }));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Do not cache contacts, credentials, mail, external sites, or arbitrary routes.
  const isNavigation = request.mode === 'navigate' && (url.pathname === new URL(BASE).pathname || url.pathname === new URL('index.html', BASE).pathname) && !url.search;
  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) { event.waitUntil(notifyNetwork(true)); return response; }
        throw new Error('NETWORK_UNAVAILABLE');
      } catch {
        const cached = await (await caches.open(VERSION)).match(new URL('index.html', BASE).href);
        if (cached) { event.waitUntil(notifyNetwork(false)); return cached; }
        return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>You’re offline</title><main><h1>You’re offline.</h1><p>Your first visit needs internet. You can use a printed practice if you have one.</p></main></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
    })());
  } else if (ALLOWED.has(url.href)) {
    event.respondWith((async () => {
      const cached = await (await caches.open(VERSION)).match(url.href);
      return cached ? (url.pathname.endsWith('.mp3') ? cachedMediaResponse(cached, request.headers?.get('Range')) : cached) : fetch(request);
    })());
  }
});
