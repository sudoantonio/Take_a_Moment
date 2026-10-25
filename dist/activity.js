// Daily practice totals stay in this browser. No identity or precise timestamps.
export const ACTIVITY_KEY = 'bfp-activity-v1';
export function nextPracticeGoal(completions) {
  const current = Number.isSafeInteger(completions) && completions > 0 ? completions : 0;
  const target = [1, 3, 5, 10, 20, 30, 50, 100, 200, 365].find(value => value > current) || (Math.floor(current / 50) + 1) * 50;
  return { current, target };
}
export function streakTheme(streak) {
  if (streak >= 30) return 'month';
  if (streak >= 14) return 'fortnight';
  if (streak >= 7) return 'week';
  if (streak >= 3) return 'steady';
  return streak >= 1 ? 'seed' : 'start';
}
const DAY = 86400000;
const RETENTION = 366;
const pad = value => String(value).padStart(2, '0');
export const localDay = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const ordinal = key => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
  const [year, month, day] = key.split('-').map(Number);
  const value = Date.UTC(year, month - 1, day);
  return new Date(value).toISOString().slice(0, 10) === key ? value / DAY : NaN;
};
const dayKey = day => new Date(day * DAY).toISOString().slice(0, 10);

export function createActivityStore(storage, practiceIds, { shared = false, now = () => new Date() } = {}) {
  const validIds = new Set(practiceIds);
  let days = [], saved = false;
  const todayOrdinal = () => ordinal(localDay(now()));
  function clean(records) {
    const today = todayOrdinal(), merged = new Map();
    for (const record of Array.isArray(records) ? records.slice(-RETENTION * 2) : []) {
      const date = record?.date, day = typeof date === 'string' ? ordinal(date) : NaN;
      if (!Number.isFinite(day) || day > today || day <= today - RETENTION) continue;
      const practices = {};
      for (const [id, count] of Object.entries(record.practices && typeof record.practices === 'object' ? record.practices : {})) {
        if (validIds.has(id) && Number.isInteger(count) && count > 0 && count <= 10000) practices[id] = count;
      }
      if (Object.keys(practices).length) merged.set(date, { date, practices });
    }
    return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  function read() {
    if (shared) { days = []; return; }
    try {
      const record = JSON.parse(storage?.getItem(ACTIVITY_KEY) || 'null');
      days = clean(record?.version === 1 ? record.days : []);
      saved = Boolean(storage);
      if (record?.version === 1 && JSON.stringify(record) !== JSON.stringify({ version: 1, days })) write();
    } catch { days = []; saved = false; }
  }
  function write() {
    saved = false;
    try {
      if (!storage) return;
      storage.setItem(ACTIVITY_KEY, JSON.stringify({ version: 1, days }));
      saved = true;
    } catch { /* The current session remains usable when storage is blocked. */ }
  }
  function clear() { days = []; write(); }
  function summary() {
    const currentDays = clean(days);
    if (JSON.stringify(currentDays) !== JSON.stringify(days)) { days = currentDays; write(); }
    const today = todayOrdinal(), keys = new Set(days.map(record => ordinal(record.date)));
    let cursor = keys.has(today) ? today : today - 1, streak = 0, bestStreak = 0, run = 0, previous;
    while (keys.has(cursor)) { streak++; cursor--; }
    for (const day of [...keys].sort((a, b) => a - b)) {
      run = day === previous + 1 ? run + 1 : 1;
      bestStreak = Math.max(bestStreak, run); previous = day;
    }
    const monday = today - (new Date(today * DAY).getUTCDay() + 6) % 7;
    return {
      streak, bestStreak, activeDays: days.length, completedToday: keys.has(today),
      total: days.reduce((sum, record) => sum + Object.values(record.practices).reduce((a, b) => a + b, 0), 0),
      week: Array.from({ length: 7 }, (_, i) => ({ date: dayKey(monday + i), done: keys.has(monday + i), today: monday + i === today, future: monday + i > today })),
    };
  }
  read();
  if (shared) clear();
  return {
    read, clear, summary,
    get saved() { return saved; },
    complete(practiceId) {
      if (shared || !validIds.has(practiceId)) return false;
      if (saved) read(); // Preserve completions from another open tab.
      days = clean(days);
      const date = localDay(now());
      let record = days.find(day => day.date === date);
      if (!record) { record = { date, practices: {} }; days.push(record); }
      record.practices[practiceId] = Math.min(10000, (record.practices[practiceId] || 0) + 1);
      write(); return true;
    },
    setShared(value) {
      const changed = shared !== Boolean(value);
      shared = Boolean(value);
      if (shared && changed) clear();
      else if (changed) read();
    },
  };
}
