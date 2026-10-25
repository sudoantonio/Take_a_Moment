// Decode once and loop on the audio clock: no MP3 restart or JavaScript timer.
export function seamlessBuffer(context, input, seconds = 2.5) {
  const overlap = Math.min(Math.floor(seconds * input.sampleRate), Math.floor(input.length / 4));
  if (overlap < 2) throw new Error('BACKGROUND_TOO_SHORT');
  const middle = input.length - 2 * overlap;
  const output = context.createBuffer(input.numberOfChannels, input.length - overlap, input.sampleRate);
  for (let channel = 0; channel < input.numberOfChannels; channel++) {
    const samples = input.getChannelData(channel), loop = output.getChannelData(channel);
    loop.set(samples.subarray(overlap, input.length - overlap));
    for (let i = 0; i < overlap; i++) {
      const angle = i / (overlap - 1) * Math.PI / 2;
      loop[middle + i] = samples[input.length - overlap + i] * Math.cos(angle) + samples[i] * Math.sin(angle);
    }
  }
  return output;
}

export function createAmbientFactory({
  makeContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  fetchAudio = src => fetch(src),
} = {}) {
  let context;
  const buffers = new Map();
  function load(src) {
    if (buffers.has(src)) {
      const entry = buffers.get(src);
      buffers.delete(src); buffers.set(src, entry);
      return entry;
    }
    const entry = (async () => {
      const response = await fetchAudio(src);
      if (!response.ok) throw new Error('BACKGROUND_DOWNLOAD_FAILED');
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      return seamlessBuffer(context, decoded);
    })();
    buffers.set(src, entry);
    // Keep at most two decoded backgrounds, including the current one.
    while (buffers.size > 2) buffers.delete(buffers.keys().next().value);
    entry.catch(() => { if (buffers.get(src) === entry) buffers.delete(src); });
    return entry;
  }

  return function makeAmbient(src) {
    let buffer, source, gain, pending;
    let wanted = false, disposed = false, offset = 0, startedAt = 0, volume = 0.65;
    function halt() {
      if (!source) return;
      const now = context.currentTime, retiringSource = source, retiringGain = gain;
      offset = (offset + Math.max(0, now - startedAt)) % buffer.duration;
      source = gain = undefined;
      retiringGain.gain.cancelScheduledValues(now);
      retiringGain.gain.setValueAtTime(retiringGain.gain.value, now);
      retiringGain.gain.linearRampToValueAtTime(0, now + 0.08);
      retiringSource.onended = () => { retiringSource.disconnect(); retiringGain.disconnect(); };
      retiringSource.stop(now + 0.08);
    }
    function start() {
      if (!wanted || disposed || source) return;
      source = context.createBufferSource(); gain = context.createGain();
      source.buffer = buffer; source.loop = true;
      source.loopStart = 0; source.loopEnd = buffer.duration;
      source.connect(gain); gain.connect(context.destination);
      startedAt = context.currentTime;
      gain.gain.setValueAtTime(0, startedAt);
      gain.gain.linearRampToValueAtTime(volume, startedAt + 0.15);
      source.start(startedAt, offset);
    }
    return {
      src,
      get paused() { return !wanted; },
      get volume() { return volume; },
      set volume(value) { volume = Math.min(1, Math.max(0, Number(value) || 0)); },
      play() {
        if (disposed) return Promise.resolve();
        wanted = true;
        if (pending) return pending;
        try {
          // Resume synchronously inside the user's first audio gesture, before fetching.
          context ||= makeContext();
          const resumed = context.resume();
          pending = Promise.all([resumed, buffer || load(src)]).then(([, loaded]) => {
            buffer = loaded; start();
          }).catch(error => {
            if (disposed || !wanted) return;
            wanted = false; throw error;
          }).finally(() => { pending = undefined; });
          return pending;
        } catch (error) { wanted = false; return Promise.reject(error); }
      },
      pause() { wanted = false; halt(); },
      dispose() { disposed = true; wanted = false; halt(); buffer = undefined; },
    };
  };
}

export const createAmbientLoop = createAmbientFactory();
