import test from 'node:test';
import assert from 'node:assert/strict';
import { createAmbientFactory, seamlessBuffer } from '../dist/ambient-audio.js';

function audioBuffer(channels, length, sampleRate) {
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return { length, numberOfChannels: channels, sampleRate, duration: length / sampleRate, getChannelData: i => data[i] };
}

function environment(fetchAudio) {
  const sources = [], gains = [], downloads = [];
  const input = audioBuffer(2, 1000, 100);
  input.getChannelData(0).fill(0.05); input.getChannelData(1).fill(-0.05);
  const context = {
    currentTime: 0, destination: {}, resumes: 0,
    resume() { this.resumes++; return Promise.resolve(); },
    decodeAudioData: async () => input,
    createBuffer: audioBuffer,
    createBufferSource() {
      const node = { starts: [], stops: [], connect() {}, disconnect() { this.disconnected = true; },
        start(...args) { this.starts.push(args); }, stop(time) { this.stops.push(time); } };
      sources.push(node); return node;
    },
    createGain() {
      const node = { connect() {}, disconnect() { this.disconnected = true; }, gain: {
        value: 0.65, ramps: [], cancelScheduledValues() {}, setValueAtTime(value) { this.value = value; },
        linearRampToValueAtTime(value, time) { this.ramps.push([value, time]); },
      } };
      gains.push(node); return node;
    },
  };
  const make = createAmbientFactory({ makeContext: () => context, fetchAudio: src => {
    downloads.push(src);
    return fetchAudio ? fetchAudio(src) : Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  } });
  return { context, sources, gains, downloads, make };
}

test('a discontinuous recording becomes a continuous circular buffer in both channels', () => {
  const input = audioBuffer(2, 1000, 100);
  for (let i = 0; i < input.length; i++) {
    input.getChannelData(0)[i] = i / 1000;
    input.getChannelData(1)[i] = -i / 1000;
  }
  const output = seamlessBuffer({ createBuffer: audioBuffer }, input);
  assert.equal(output.length, 750);
  for (const channel of [0, 1]) {
    const samples = output.getChannelData(channel);
    assert.ok(Math.abs(samples[0] - samples.at(-1)) < 0.002, 'no jump at the wrap');
    assert.ok(Math.abs(samples[500] - samples[499]) < 0.002, 'no jump at the overlap entrance');
    assert.ok(samples.every(value => Math.abs(value) > 0.2), 'no fade to silence');
  }
});

test('many cycles use one native loop; pause/resume preserves the exact position', async () => {
  const e = environment(), loop = e.make('rain.mp3');
  await loop.play(); await loop.play();
  assert.equal(e.sources.length, 1);
  assert.equal(e.downloads.length, 1);
  assert.equal(e.sources[0].loop, true);
  assert.equal(e.sources[0].loopEnd, 7.5);
  e.context.currentTime = 1000.25;
  loop.pause();
  assert.equal(loop.paused, true);
  assert.equal(e.sources[0].stops[0], 1000.33);
  e.sources[0].onended();
  assert.ok(e.sources[0].disconnected && e.gains[0].disconnected);
  await loop.play();
  assert.equal(e.sources.length, 2);
  assert.equal(e.downloads.length, 1);
  assert.equal(e.sources[1].starts[0][1], 1000.25 % 7.5);
  assert.equal(e.gains[1].gain.ramps[0][0], 0.65);
  loop.dispose();
});

test('pausing or leaving while a download is pending cannot start a late background', async () => {
  for (const action of ['pause', 'dispose']) {
    let finish;
    const e = environment(() => new Promise(resolve => { finish = resolve; }));
    const loop = e.make('waves.mp3');
    const loading = loop.play();
    assert.equal(e.context.resumes, 1, 'audio unlocked before the network completes');
    loop[action]();
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    await loading;
    assert.equal(e.sources.length, 0);
    if (action === 'pause') { await loop.play(); assert.equal(e.sources.length, 1); }
    else { await loop.play(); assert.equal(e.sources.length, 0); }
  }
});

test('a failed decode/download can be retried and the cache is bounded to two backgrounds', async () => {
  let fail = true;
  const e = environment(async () => ({ ok: !fail, arrayBuffer: async () => new ArrayBuffer(1) }));
  const loop = e.make('birds.mp3');
  await assert.rejects(loop.play(), /BACKGROUND_DOWNLOAD_FAILED/);
  fail = false;
  await loop.play(); loop.dispose();
  for (const name of ['rain.mp3', 'bowl.mp3', 'birds.mp3']) {
    const track = e.make(name); await track.play(); track.dispose();
  }
  assert.equal(e.downloads.filter(src => src === 'birds.mp3').length, 3);
});
