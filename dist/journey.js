// A local checkpoint, without an account, identity, contact details or visit history.
export const JOURNEY_KEY = 'bfp-journey-v1';

export function createJourneyStore(storage, practiceIds) {
  const validIds = new Set(practiceIds);
  let shared = false;
  let progress = null;
  let saved = false;

  function read() {
    shared = false; progress = null; saved = false;
    try {
      const record = JSON.parse(storage?.getItem(JOURNEY_KEY) || 'null');
      if (record?.version !== 1 || typeof record.shared !== 'boolean') return;
      shared = record.shared;
      const p = record.progress;
      if (!shared && validIds.has(p?.practiceId) && Number.isInteger(p.step) && p.step >= 1 && p.step <= 3) {
        progress = { practiceId: p.practiceId, step: p.step };
      }
      saved = Boolean(storage);
    } catch { /* Storage may be blocked; practicing still works. */ }
  }

  function write() {
    saved = false;
    try {
      if (!storage) return;
      // Serialize only these fields, never arbitrary app or form state.
      storage.setItem(JOURNEY_KEY, JSON.stringify({ version: 1, shared, progress }));
      saved = true;
    } catch { /* Keep a session-only checkpoint if saving is unavailable. */ }
  }

  read();
  return {
    read,
    get shared() { return shared; },
    get progress() { return progress ? { ...progress } : null; },
    get saved() { return saved; },
    get resumePath() { return progress ? `practice/${progress.practiceId}/${progress.step}` : 'practice/breath/1'; },
    checkpoint(practiceId, step) {
      if (shared || !validIds.has(practiceId) || !Number.isInteger(step) || step < 1 || step > 3) return;
      if (progress?.practiceId === practiceId && progress.step === step) return;
      progress = { practiceId, step };
      write();
    },
    setShared(value) {
      shared = Boolean(value);
      if (shared) progress = null;
      write();
    },
    clear() { progress = null; write(); },
  };
}
