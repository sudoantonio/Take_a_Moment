import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PRACTICES } from '../dist/content.js';
import { createPracticeAudio, PILOT_AUDIO } from '../dist/practice-audio.js';

function setup() {
  const tracks = [];
  const makeAudio = src => {
    const track = { src, currentTime: 0, paused: true, plays: 0, released: false,
      play() { this.paused = false; this.plays++; return Promise.resolve(); },
      pause() { this.paused = true; }, removeAttribute() { this.released = true; }, load() {},
    };
    tracks.push(track); return track;
  };
  const player = createPracticeAudio({ makeAudio, makeNature: makeAudio });
  return { player, tracks };
}

test('all 21 experiences reference 68 existing, distinct voice files and nine backgrounds', () => {
  assert.deepEqual(Object.keys(PILOT_AUDIO).sort(), Object.keys(PRACTICES).sort());
  const clips = Object.values(PILOT_AUDIO).flatMap(p => p.mode === 'pattern' ? [p.intro, ...p.phases, p.outro] : p.clips);
  assert.equal(clips.length, 68);
  assert.equal(new Set(clips).size, 68);
  for (const src of [...clips, ...Object.values(PILOT_AUDIO).map(p => p.nature)]) {
    assert.ok(existsSync(new URL('../dist/' + src, import.meta.url)), src);
  }
  assert.equal(new Set(Object.values(PILOT_AUDIO).map(p => p.nature)).size, 9);
});

test('audio waits for Listen; Next replaces the voice while preserving the nature track', () => {
  const { player, tracks } = setup();
  player.setContext('body', 1);
  assert.equal(tracks.length, 0);
  player.toggle();
  const nature = tracks[0], first = tracks[1];
  assert.match(nature.src, /stream/); assert.match(first.src, /body-step-01/);
  player.setContext('body', 2);
  assert.ok(first.paused && first.released);
  assert.equal(tracks.filter(t => t.src.includes('/nature/')).length, 1);
  assert.match(tracks[2].src, /body-step-02/);
  assert.equal(nature.paused, false);
});

test('Pause preserves the playhead; resume continues and ended speech does not loop on rerender', () => {
  const { player, tracks } = setup();
  player.setContext('observe', 1); player.toggle();
  const nature = tracks[0], voice = tracks[1]; voice.currentTime = 5;
  player.setPaused(true);
  assert.ok(nature.paused && voice.paused);
  player.setPaused(false);
  assert.equal(voice.currentTime, 5); assert.equal(voice.paused, false);
  voice.onended(); const plays = voice.plays;
  player.setContext('observe', 1);
  assert.equal(voice.plays, plays);
  player.replay();
  assert.equal(tracks.length, 3); assert.ok(voice.released);
});

test('rapid Next ignores old callbacks and never overlaps voices; leaving stops everything', () => {
  const { player, tracks } = setup();
  player.setContext('clouds', 1); player.toggle();
  const oldEnded = tracks[1].onended;
  player.setContext('clouds', 2); player.setContext('clouds', 3);
  oldEnded(); assert.equal(player.snapshot().completed, false);
  assert.equal(tracks.filter(t => !t.paused && t.src.includes('/voice/')).length, 1);
  player.setContext(null, 1);
  assert.ok(tracks.every(t => t.paused && t.released));
  assert.equal(player.snapshot().available, false);
});

test('muting nature leaves the spoken guide running; an audio failure offers a retry', () => {
  const { player, tracks } = setup();
  player.setContext('body', 1); player.toggle(); player.toggleNature();
  assert.equal(tracks[0].paused, true); assert.equal(tracks[1].paused, false);
  tracks[1].onerror(); assert.equal(player.snapshot().failed, true);
  assert.equal(player.snapshot().enabled, false);
  player.replay(); assert.equal(player.snapshot().failed, false);
});

test('late blocked autoplay cannot disable a newer step', async () => {
  let rejectFirst;
  const makeAudio = src => {
    return { src, play() { return src.endsWith('step-01.mp3') ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve(); }, pause() {}, removeAttribute() {}, load() {} };
  };
  const player = createPracticeAudio({ makeAudio, makeNature: makeAudio });
  player.setContext('body', 1); player.toggle();
  player.setContext('body', 2); rejectFirst(new Error('blocked')); await Promise.resolve();
  assert.equal(player.snapshot().enabled, true);
  assert.equal(player.snapshot().failed, false);
});


test('paced audio waits for its intro, replaces phase cues and plays its outro once', () => {
  const { player, tracks } = setup();
  player.setContext('box', 1); player.toggle();
  assert.equal(player.snapshot().introPending, true);
  player.setPhase(0, 0);
  assert.equal(tracks.length, 2);
  tracks[1].onended();
  assert.equal(player.snapshot().introPending, false);
  player.setPhase(0, 0);
  assert.match(tracks.at(-1).src, /box-inhale/);
  const inhale = tracks.at(-1);
  player.setPhase(1, 0);
  assert.ok(inhale.paused && inhale.released);
  player.setPhase(1, 0);
  assert.equal(tracks.length, 4);
  player.setPhase(0, 1);
  assert.match(tracks.at(-1).src, /box-inhale/);
  player.finishPattern('box');
  const outro = tracks.at(-1), count = tracks.length;
  assert.match(outro.src, /box-outro/);
  player.finishPattern('box');
  assert.equal(tracks.length, count);
  outro.onended();
  assert.ok(tracks.every(t => t.paused && t.released));
});

test('listening leaves the user music alone during moment two', () => {
  const { player, tracks } = setup();
  player.setContext('listening', 1); player.toggle();
  const nature = tracks[0];
  player.setContext('listening', 2);
  assert.equal(nature.paused, true);
  assert.equal(tracks.at(-1).paused, false);
  player.setContext('listening', 3);
  assert.equal(nature.paused, false);
});


test('background continues after the voice ends and through every moment until leaving', async () => {
  const { player, tracks } = setup();
  player.setContext('stretch', 1); player.toggle();
  const background = tracks[0];
  tracks[1].onended();
  assert.equal(background.paused, false);
  player.setContext('stretch', 2); player.setContext('stretch', 3);
  assert.equal(tracks.filter(t => t.src.includes('/nature/')).length, 1);
  assert.equal(background.paused, false);
  player.setContext(null, 1);
  assert.ok(background.paused && background.released);
});

test('Spanish nature-only mode never loads English speech or blocks the breathing introduction', () => {
  const voices = [], backgrounds = [];
  const audio = createPracticeAudio({
    makeAudio: src => { throw new Error(`English narration requested: ${src}`); },
    makeNature: src => {
      backgrounds.push(src);
      return { play: () => Promise.resolve(), pause() {}, dispose() {} };
    },
  });
  audio.setNarrationEnabled(false);
  audio.setContext('observe', 1);
  audio.toggle();
  assert.equal(backgrounds.length, 1);
  audio.setContext('observe', 2);
  assert.equal(backgrounds.length, 1);
  audio.setContext('box', 1);
  assert.equal(audio.snapshot().introPending, false);
  audio.setPhase(0, 0);
  assert.equal(audio.snapshot().enabled, true);
  audio.stop();
});
