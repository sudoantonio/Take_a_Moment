import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_KEY, createActivityStore, localDay, nextPracticeGoal } from '../dist/activity.js';
const ids = ['breath', 'observe'];
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('the next goal advances on completed practices, including more than one on the same day', () => {
  const activity = createActivityStore(storage(), ids, { now: () => new Date(2026, 9, 24) });
  assert.deepEqual(nextPracticeGoal(activity.summary().total), { current: 0, target: 1 });
  activity.complete('breath');
  assert.deepEqual(nextPracticeGoal(activity.summary().total), { current: 1, target: 3 });
  activity.complete('breath');
  assert.deepEqual(nextPracticeGoal(activity.summary().total), { current: 2, target: 3 });
  activity.complete('observe');
  assert.deepEqual(nextPracticeGoal(activity.summary().total), { current: 3, target: 5 });
  assert.deepEqual(nextPracticeGoal(365), { current: 365, target: 400 });
  assert.equal(activity.summary().streak, 1);
});

test('completed practices count once per completion but only once per practice day', () => {
  const local = storage(), now = () => new Date(2026, 9, 24, 23, 50);
  const activity = createActivityStore(local, ids, { now });
  activity.complete('breath'); activity.complete('observe');
  assert.equal(activity.summary().total, 2);
  assert.equal(activity.summary().streak, 1);
  assert.equal(activity.summary().activeDays, 1);
  assert.deepEqual(JSON.parse(local.getItem(ACTIVITY_KEY)), { version: 1, days: [{ date: '2026-10-24', practices: { breath: 1, observe: 1 } }] });
  assert.equal(createActivityStore(local, ids, { now }).summary().total, 2);
});

test('a streak survives until the next day ends and resets after a missed day', () => {
  const local = storage(); let date = new Date(2026, 9, 23, 23, 59);
  const activity = createActivityStore(local, ids, { now: () => date });
  activity.complete('breath'); date = new Date(2026, 9, 24, 0, 1);
  assert.equal(activity.summary().streak, 1);
  activity.complete('observe'); assert.equal(activity.summary().streak, 2);
  date = new Date(2026, 9, 25, 23, 59); assert.equal(activity.summary().streak, 2);
  date = new Date(2026, 9, 26, 0, 1); assert.equal(activity.summary().streak, 0);
  activity.complete('breath'); assert.equal(activity.summary().streak, 1);
  assert.equal(activity.summary().bestStreak, 2);
});

test('calendar days work across month, year and daylight-saving boundaries', () => {
  const local = storage(); let date = new Date(2026, 11, 31, 23, 59);
  const activity = createActivityStore(local, ids, { now: () => date });
  activity.complete('breath'); date = new Date(2027, 0, 1, 0, 1); activity.complete('breath');
  assert.equal(activity.summary().streak, 2);
  assert.equal(localDay(new Date(2026, 2, 8, 0, 1)), '2026-03-08');
  const dst = storage(); date = new Date(2026, 2, 7, 23, 59);
  const next = createActivityStore(dst, ids, { now: () => date });
  next.complete('breath'); date = new Date(2026, 2, 8, 23, 59); next.complete('observe');
  assert.equal(next.summary().streak, 2);
  assert.equal(next.summary().week.length, 7);
});

test('shared mode clears existing history and prevents new recording', () => {
  const local = storage(), now = () => new Date(2026, 9, 24);
  const activity = createActivityStore(local, ids, { now }); activity.complete('breath');
  activity.setShared(true); assert.equal(activity.complete('observe'), false);
  assert.equal(activity.summary().total, 0);
  assert.equal(createActivityStore(local, ids, { now }).summary().total, 0);
  activity.setShared(false); activity.complete('observe'); assert.equal(activity.summary().total, 1);
  activity.clear(); assert.equal(activity.summary().streak, 0);
});

test('invalid, future and old records cannot inflate the streak or add arbitrary metadata', () => {
  const local = storage(), now = () => new Date(2026, 9, 24);
  local.setItem(ACTIVITY_KEY, JSON.stringify({ version: 1, email: 'not-stored@example.test', days: [
    { date: '2026-10-24', practices: { breath: 1, unknown: 100, observe: -2 }, name: 'ignored' },
    { date: '2026-10-25', practices: { breath: 1 } },
    { date: '2026-02-30', practices: { breath: 1 } },
    { date: '2024-01-01', practices: { breath: 1 } },
  ] }));
  const activity = createActivityStore(local, ids, { now });
  assert.equal(activity.summary().total, 1); activity.complete('observe');
  assert.deepEqual(Object.keys(JSON.parse(local.getItem(ACTIVITY_KEY))), ['version', 'days']);
  assert.equal(local.getItem(ACTIVITY_KEY).includes('email'), false);
});

test('blocked storage keeps session totals honest and separate tabs preserve each other', () => {
  const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  const now = () => new Date(2026, 9, 24);
  const activity = createActivityStore(blocked, ids, { now });
  activity.complete('breath'); activity.complete('observe');
  assert.equal(activity.summary().total, 2); assert.equal(activity.saved, false);
  const local = storage(), first = createActivityStore(local, ids, { now }), second = createActivityStore(local, ids, { now });
  first.complete('breath'); second.complete('observe'); first.read();
  assert.equal(first.summary().total, 2);
});
