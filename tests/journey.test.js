import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourneyStore, JOURNEY_KEY } from '../dist/journey.js';

const ids = ['breath', 'observe'];
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('reopening the browser restores the exact practice step without personal metadata', () => {
  const local = storage();
  const first = createJourneyStore(local, ids);
  first.checkpoint('observe', 2);
  const reopened = createJourneyStore(local, ids);
  assert.equal(reopened.resumePath, 'practice/observe/2');
  assert.equal(reopened.saved, true);
  assert.deepEqual(JSON.parse(local.getItem(JOURNEY_KEY)), {
    version: 1, shared: false, progress: { practiceId: 'observe', step: 2 },
  });
});

test('shared-device mode removes progress and keeps saving disabled after reopening', () => {
  const local = storage();
  const first = createJourneyStore(local, ids);
  first.checkpoint('breath', 3);
  first.setShared(true);
  const reopened = createJourneyStore(local, ids);
  reopened.checkpoint('observe', 2);
  assert.equal(reopened.shared, true);
  assert.equal(reopened.progress, null);
  assert.equal(reopened.resumePath, 'practice/breath/1');
  assert.equal(JSON.parse(local.getItem(JOURNEY_KEY)).progress, null);
  reopened.setShared(false);
  reopened.checkpoint('breath', 1);
  assert.equal(createJourneyStore(local, ids).resumePath, 'practice/breath/1');
});

test('forgetting progress survives reopening and preserves the shared-device preference', () => {
  const local = storage();
  const store = createJourneyStore(local, ids);
  store.checkpoint('breath', 2);
  store.clear();
  assert.equal(createJourneyStore(local, ids).progress, null);
  store.setShared(true);
  store.clear();
  assert.equal(createJourneyStore(local, ids).shared, true);
});

test('malformed or unsupported checkpoints cannot create arbitrary resume routes', () => {
  const local = storage();
  for (const progress of [{ practiceId: '../contact', step: 1 }, { practiceId: 'breath', step: 99 }, { practiceId: 'observe', step: '2' }]) {
    local.setItem(JOURNEY_KEY, JSON.stringify({ version: 1, shared: false, progress }));
    assert.equal(createJourneyStore(local, ids).resumePath, 'practice/breath/1');
  }
  local.setItem(JOURNEY_KEY, '{broken');
  assert.equal(createJourneyStore(local, ids).progress, null);
});

test('blocked storage keeps practicing usable without claiming durable saving', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  const store = createJourneyStore(blocked, ids);
  store.checkpoint('breath', 2);
  assert.equal(store.resumePath, 'practice/breath/2');
  assert.equal(store.saved, false);
  assert.equal(createJourneyStore(blocked, ids).progress, null);
});
