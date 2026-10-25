let registration;
export async function registerOffline(onNetworkChange) {
  if (!('serviceWorker' in navigator)) return false;
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    const pending = registration.installing || registration.waiting;
    if (pending && pending.state !== 'activated') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WORKER_ACTIVATION_TIMEOUT')), 15000);
        const check = () => {
          if (pending.state === 'activated') { clearTimeout(timeout); resolve(); }
          if (pending.state === 'redundant') { clearTimeout(timeout); reject(new Error('WORKER_ACTIVATION_FAILED')); }
        };
        pending.addEventListener('statechange', check);
        check();
      });
    }
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'NETWORK_STATUS') onNetworkChange?.(Boolean(event.data.online));
    });
    return true;
  } catch { return false; }
}

async function workerMessage(type) {
  if (!registration) throw new Error('OFFLINE_UNAVAILABLE');
  const worker = registration.active || (await navigator.serviceWorker.ready).active;
  if (!worker) throw new Error('OFFLINE_UNAVAILABLE');
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('OFFLINE_TIMEOUT')); }, 120000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout); channel.port1.close();
      data?.ok ? resolve(data) : reject(new Error(data?.error || 'OFFLINE_FAILED'));
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}
export const getOfflineStatus = () => workerMessage('STATUS');
export const saveOffline = () => workerMessage('SAVE');
export const removeOffline = () => workerMessage('REMOVE');

export async function checkConnection() {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const result = await fetch('./health.txt', { cache: 'no-store', signal: controller.signal, redirect: 'error' });
    return result.ok && (await result.text()).trim() === 'bfp-mvp-online';
  } catch { return false; }
  finally { clearTimeout(timer); }
}
