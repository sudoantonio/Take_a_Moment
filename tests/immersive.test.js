import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICES } from '../dist/content.js';
import { immersiveSetting, immersiveScene, immersiveBackdrop, updateImmersiveStep } from '../dist/immersive.js';

test('all 21 practices render a local, independent immersive setting without remote media', () => {
  const illustrations = new Set();
  for (const p of Object.values(PRACTICES)) {
    assert.ok(immersiveSetting(p.id));
    const svg = immersiveScene(p.id);
    illustrations.add(svg);
    assert.match(svg, /aria-hidden="true"/);
    assert.match(immersiveBackdrop(p.id), /<svg/);
    assert.doesNotMatch(svg + immersiveBackdrop(p.id), /https?:|<image|<script|<foreignObject/);
  }
  assert.equal(illustrations.size, 21);
  assert.throws(() => immersiveScene('unknown'));
});

function mounted(practice) {
  const nodes = new Map();
  const element = () => ({ textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } });
  const shell = { dataset: { practice: practice.id, step: '1' } };
  const dots = Object.assign(element(), { querySelectorAll: () => markers });
  const markers = [0,1,2].map(() => ({ current: false, classList: { toggle(_key, value) { this.owner.current = value; } } }));
  markers.forEach(marker => marker.classList.owner = marker);
  const nextLabel = element(), next = Object.assign(element(), { querySelector: () => nextLabel });
  nodes.set('.immersive-shell', shell); nodes.set('.observation-dots', dots);
  nodes.set('#practice-cue', element()); nodes.set('#practice-detail', element());
  nodes.set('.practice-previous', element()); nodes.set('.breathing-finish', next); nodes.set('.close-practice', element());
  // No innerHTML or replaceChildren exists in this mock: updates must preserve art.
  return { root: { querySelector: selector => nodes.get(selector) }, shell, nodes, markers, nextLabel };
}

test('advancing every step practice preserves the mounted scene and updates exact resume/finish routes', () => {
  for (const p of Object.values(PRACTICES).filter(p => p.mode !== 'pattern')) {
    const m = mounted(p);
    for (const step of [2,3,1]) {
      assert.equal(updateImmersiveStep(m.root, p, step), true, p.id);
      assert.equal(m.shell.dataset.step, String(step));
      assert.equal(m.nodes.get('#practice-cue').textContent, p.steps[step-1].title);
      assert.equal(m.nodes.get('#practice-detail').textContent, p.steps[step-1].text);
      assert.deepEqual(m.markers.map(dot => dot.current), [1,2,3].map(n => n === step));
      assert.equal(m.nodes.get('.close-practice').attrs.href, `#/stopped/${p.id}/${step}`);
      assert.equal(m.nodes.get('.breathing-finish').attrs.href, step === 3 ? `#/finished/${p.id}` : `#/practice/${p.id}/${step+1}`);
      assert.equal(m.nextLabel.textContent, step === 3 ? 'Finish' : 'Next');
      const previous = m.nodes.get('.practice-previous');
      assert.equal(previous.attrs.href, step > 1 ? `#/practice/${p.id}/${step-1}` : undefined);
      assert.equal(previous.attrs['aria-disabled'], step === 1 ? 'true' : undefined);
      assert.equal(previous.attrs.tabindex, step === 1 ? '-1' : undefined);
    }
  }
});

test('continuity never reuses a different practice or replaces a timed breathing guide', () => {
  const m = mounted(PRACTICES.body);
  assert.equal(updateImmersiveStep(m.root, PRACTICES.clouds, 2), false);
  assert.equal(updateImmersiveStep(m.root, PRACTICES.body, 4), false);
  const b = mounted(PRACTICES.box);
  assert.equal(updateImmersiveStep(b.root, PRACTICES.box, 1), false);
});
