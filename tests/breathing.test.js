import test from 'node:test';
import assert from 'node:assert/strict';
import { mountBreathing, breathFrame } from '../dist/breathing.js';

function guide(kind = 'box', hooks = {}) {
  const originals = ['requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'document'].map(key => [key, globalThis[key]]);
  const frames = new Map();
  let serial = 0, time = 0;
  class Element extends EventTarget {
    style = {};
    textContent = '';
    innerHTML = '';
    attrs = new Map();
    getAttribute(key) { return this.attrs.get(key); }
    setAttribute(key, value) { this.attrs.set(key, value); }
  }
  const visual = new Element(), cue = new Element(), toggle = new Element(), skip = new Element(), marker = new Element();
  const shell = { dataset: {}, paused: false, classList: { toggle(_class, value) { shell.paused = value; } } };
  const document = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: false });
  globalThis.document = document;
  globalThis.matchMedia = () => motion;
  globalThis.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const session = { elapsed: 0, paused: false };
  const control = mountBreathing({ querySelector: selector => ({ '.breathing-orb': visual, '#breath-cue': cue, '#breath-toggle': toggle, '#skip-hold': skip, '.pattern-marker': kind === 'breath' ? undefined : marker, '.immersive-shell': shell })[selector] }, session, kind, hooks);
  return {
    visual, cue, toggle, skip, marker, shell, document, motion, session, frames, control,
    advance(count) {
      for (let i = 0; i < count; i++) {
        time += 100;
        const pending = [...frames.values()]; frames.clear();
        pending.forEach(callback => callback(time));
      }
    },
    cleanup() { control.dispose(); for (const [key, value] of originals) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } },
  };
}

test('guide starts immediately, alternates cues, and pause freezes the visual and timing', () => {
  const g = guide();
  try {
    assert.equal(g.cue.textContent, 'Breathe in');
    g.advance(90);
    assert.equal(g.cue.textContent, 'Breathe out');
    g.toggle.dispatchEvent(new Event('click'));
    const scale = g.visual.style.transform, elapsed = g.session.elapsed;
    g.advance(70);
    assert.equal(g.visual.style.transform, scale);
    assert.equal(g.session.elapsed, elapsed);
    assert.equal(g.cue.textContent, 'At your pace.');
    g.toggle.dispatchEvent(new Event('click'));
    g.advance(5);
    assert.ok(g.session.elapsed > elapsed);
    assert.equal(g.frames.size, 1);
  } finally { g.cleanup(); }
});

test('hiding the page pauses the guide; reduced-motion disables scaling', () => {
  const g = guide();
  try {
    g.motion.matches = true;
    g.motion.dispatchEvent(new Event('change'));
    g.advance(20);
    assert.equal(g.visual.style.transform, 'none');
    g.document.hidden = true;
    g.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(g.session.paused, true);
    assert.equal(g.frames.size, 0);
    g.document.hidden = false;
    g.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(g.session.paused, true);
  } finally { g.cleanup(); }
});

test('leaving the guide cancels animation and removes its controls', () => {
  const g = guide();
  try {
    g.control.dispose();
    assert.equal(g.frames.size, 0);
    g.toggle.dispatchEvent(new Event('click'));
    assert.equal(g.frames.size, 0);
  } finally { g.cleanup(); }
});


test('4-7-8 uses the source timings and a hold can be skipped immediately', () => {
  assert.equal(breathFrame('breath-478', 3999).cue, 'Breathe in');
  assert.equal(breathFrame('breath-478', 4000).hold, true);
  assert.equal(breathFrame('breath-478', 11000).cue, 'Breathe out');
  assert.equal(breathFrame('breath-478', 19000).cue, 'Breathe in');
  const g = guide('breath-478');
  try {
    g.advance(43);
    assert.equal(g.skip.hidden, false);
    g.skip.dispatchEvent(new Event('click'));
    assert.equal(g.cue.textContent, 'Breathe out');
    assert.equal(g.skip.hidden, true);
    assert.equal(g.session.elapsed, 11000);
  } finally { g.cleanup(); }
});

test('natural breathing never instructs timed inhalation or holding', () => {
  const g = guide('breath');
  try {
    for (let i = 0; i < 5; i++) {
      g.advance(40);
      assert.equal(g.cue.textContent, 'Notice your breath.');
      assert.equal(g.skip.hidden, true);
    }
  } finally { g.cleanup(); }
});


test('the paced marker follows its local square and pausing also freezes the surrounding world', () => {
  const g = guide('box');
  try {
    assert.equal(g.marker.getAttribute('cx'), 75);
    assert.equal(g.marker.getAttribute('cy'), 75);
    g.advance(21);
    assert.equal(g.marker.getAttribute('cx'), 180);
    assert.equal(g.marker.getAttribute('cy'), 75);
    g.toggle.dispatchEvent(new Event('click'));
    assert.equal(g.shell.paused, true);
    const x = g.marker.getAttribute('cx');
    g.advance(50);
    assert.equal(g.marker.getAttribute('cx'), x);
    g.toggle.dispatchEvent(new Event('click'));
    assert.equal(g.shell.paused, false);
    g.advance(22);
    assert.equal(g.shell.dataset.phase, '1');
    assert.equal(g.skip.hidden, false);
    g.skip.dispatchEvent(new Event('click'));
    assert.equal(g.shell.dataset.phase, '2');
    assert.equal(g.marker.getAttribute('cy'), 285);
  } finally { g.cleanup(); }
});


test('intro freezes the paced clock and restarts phase zero, with one cue per phase and cycle', () => {
  const phases = [], pauses = [];
  const g = guide('box', { onPhase: (index, cycle) => phases.push([index, cycle]), onPause: value => pauses.push(value) });
  try {
    g.control.setIntroWaiting(true);
    g.advance(60);
    assert.equal(g.session.elapsed, 0);
    assert.equal(g.cue.textContent, 'Listen, then follow the guide.');
    const before = phases.length;
    g.control.setIntroWaiting(false);
    assert.deepEqual(phases.at(-1), [0, 0]);
    assert.equal(phases.length, before + 1);
    g.advance(41);
    assert.deepEqual(phases.at(-1), [1, 0]);
    g.skip.dispatchEvent(new Event('click'));
    assert.deepEqual(phases.at(-1), [2, 0]);
    g.advance(81);
    assert.deepEqual(phases.at(-1), [0, 1]);
    g.control.pause();
    assert.deepEqual(pauses, [true]);
    g.toggle.dispatchEvent(new Event('click'));
    assert.deepEqual(pauses, [true, false]);
  } finally { g.cleanup(); }
});

test('natural breathing preserves each independent written moment', () => {
  const g = guide('breath', { preserveNaturalCue: true });
  try {
    g.cue.textContent = 'Feel your breath';
    g.advance(80);
    assert.equal(g.cue.textContent, 'Feel your breath');
    g.cue.textContent = 'Return gently';
    g.advance(80);
    assert.equal(g.cue.textContent, 'Return gently');
  } finally { g.cleanup(); }
});
