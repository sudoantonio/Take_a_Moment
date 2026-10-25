import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICES, PRACTICE_GROUPS } from '../dist/content.js';
import { sceneMarkup } from '../dist/scenes.js';
import { createJourneyStore } from '../dist/journey.js';

test('all 21 source exercises have a working visual mode, cues and category', () => {
  const all = Object.values(PRACTICES);
  assert.equal(all.length, 21);
  assert.equal(new Set(all.map(p => p.originalName)).size, 21);
  for (const practice of all) {
    assert.ok(PRACTICE_GROUPS.includes(practice.group), practice.name);
    assert.ok(['natural', 'pattern', 'steps'].includes(practice.mode), practice.name);
    assert.equal(practice.steps.length, 3, practice.name);
    for (const step of practice.steps) {
      assert.ok(step.title && step.text, practice.name);
    }
    if (practice.id !== 'observe') {
      for (const step of [1,2,3]) assert.match(sceneMarkup(practice.id, step), /viewBox="0 0 360 360"/, practice.name);
    }
  }
});

test('every new practice can be saved and resumed, including hyphenated IDs', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const ids = Object.keys(PRACTICES);
  for (const practice of Object.values(PRACTICES)) {
    const store = createJourneyStore(storage, ids);
    const step = practice.mode === 'steps' ? 3 : 1;
    store.checkpoint(practice.id, step);
    assert.equal(createJourneyStore(storage, ids).resumePath, `practice/${practice.id}/${step}`);
  }
});
