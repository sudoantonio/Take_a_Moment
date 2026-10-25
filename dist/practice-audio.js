import { createAmbientLoop } from './ambient-audio.js';

// Pre-generated ElevenLabs clips; no browser speech service or API credentials.
export const PILOT_AUDIO = Object.freeze(Object.fromEntries([
  ['breath', 'waves', 'Gentle ocean waves'],
  ['observe', 'birds', 'Quiet birdsong'],
  ['stretch', 'rain', 'Soft rain'],
  ['wash-hands', 'rain', 'Soft rain'],
  ['stop', 'summer-night', 'Quiet evening'],
  ['transition', 'chimes', 'Gentle wind chimes'],
  ['kindness', 'bowl', 'Soft singing bowl'],
  ['intention', 'chimes', 'Gentle wind chimes'],
  ['compassion', 'fireplace', 'Quiet fireplace'],
  ['hug', 'waves', 'Gentle ocean waves'],
  ['eating', 'summer-night', 'Quiet evening'],
  ['morning', 'chimes', 'Gentle wind chimes'],
  ['stool', 'rain', 'Soft rain'],
  ['breath-478', 'waves', 'Gentle ocean waves'],
  ['box', 'bowl', 'Soft singing bowl'],
  ['door', 'summer-night', 'Quiet evening'],
  ['body', 'stream', 'Gentle stream'],
  ['clouds', 'wind', 'Soft wind'],
  ['listening', 'bowl', 'Soft singing bowl'],
  ['gratitude', 'fireplace', 'Quiet fireplace'],
  ['focus', 'rain', 'Soft rain'],
].map(([id, nature, natureLabel]) => [id, Object.freeze({
  mode: id === 'box' || id === 'breath-478' ? 'pattern' : 'steps',
  clips: (id === 'box' || id === 'breath-478' ? [] : [1, 2, 3]).map(step => `./audio/voice/${id}-step-0${step}.mp3`),
  nature: `./audio/nature/${nature}.mp3`, natureLabel,
  ...(id === 'box' || id === 'breath-478' ? {
    intro: `./audio/voice/${id}-intro.mp3`, outro: `./audio/voice/${id}-outro.mp3`,
    phases: (id === 'box' ? ['inhale','hold-in','exhale','hold-out'] : ['inhale','hold','exhale'])
      .map(phase => `./audio/voice/${id}-${phase}.mp3`),
  } : {}),
})])));
export const PRACTICE_AUDIO = PILOT_AUDIO;

export function createPracticeAudio({ makeAudio = src => new Audio(src), makeNature = createAmbientLoop, onChange = () => {} } = {}) {
  let practiceId, step, voice, nature, enabled = false, natureEnabled = true;
  let paused = false, completed = false, failed = false, generation = 0;
  let narrationEnabled = true;
  let stage = 'steps', phaseIndex, phaseKey, lastFinishedId;
  const snapshot = () => ({ available: Boolean(PILOT_AUDIO[practiceId]), enabled, natureEnabled, paused, completed, failed,
    introPending: enabled && narrationEnabled && stage === 'intro', patternStage: stage });
  const notify = () => onChange(snapshot());
  function release(audio) {
    if (!audio) return;
    if (audio.dispose) { audio.dispose(); return; }
    audio.onended = null; audio.onerror = null;
    audio.pause(); audio.removeAttribute('src'); audio.load();
  }
  function retireVoice() { generation += 1; release(voice); voice = undefined; }
  function stop() {
    retireVoice(); release(nature); nature = undefined;
    practiceId = undefined; step = undefined; completed = false; failed = false; paused = false;
    phaseIndex = undefined; phaseKey = undefined; stage = 'steps';
    notify();
  }
  function play(audio, token = generation) {
    if (!audio || !enabled || paused) return;
    Promise.resolve(audio.play()).catch(() => {
      if (token !== generation) return;
      failed = true; enabled = false;
      voice?.pause(); nature?.pause(); notify();
    });
  }
  function startVoice() {
    const config = PILOT_AUDIO[practiceId];
    if (!config || !enabled || !narrationEnabled || paused || completed) return;
    if (!voice) {
      const token = generation;
      const source = config.mode !== 'pattern' ? config.clips[step - 1]
        : stage === 'intro' ? config.intro : stage === 'outro' ? config.outro : config.phases[phaseIndex];
      if (!source) return;
      voice = makeAudio(source); voice.preload = 'auto'; voice.volume = 1;
      voice.onended = () => {
        if (token !== generation) return;
        if (stage === 'intro') { retireVoice(); stage = 'cycle'; completed = false; notify(); }
        else if (stage === 'outro') stop();
        else { completed = true; notify(); }
      };
      voice.onerror = () => {
        if (token !== generation) return;
        failed = true; enabled = false; voice?.pause(); nature?.pause(); notify();
      };
    }
    play(voice);
  }
  function startNature() {
    const config = PILOT_AUDIO[practiceId];
    if (!config || !enabled || !natureEnabled || paused || (practiceId === 'listening' && step === 2)) { nature?.pause(); return; }
    if (!nature) {
      nature = makeNature(config.nature);
      // Files are already mixed softly; keep nature below the spoken guide.
      nature.volume = 0.65;
      const currentNature = nature;
      nature.onerror = () => {
        if (nature !== currentNature) return;
        natureEnabled = false; currentNature.pause(); notify();
      };
    }
    const currentNature = nature;
    Promise.resolve(nature.play()).catch(() => {
      if (nature !== currentNature) return;
      natureEnabled = false; currentNature.pause(); notify();
    });
  }
  function setContext(id, nextStep, isPaused = false) {
    if (!PILOT_AUDIO[id] || !Number.isInteger(nextStep) || nextStep < 1 || nextStep > 3) { stop(); return; }
    if (id !== practiceId) {
      stop(); practiceId = id;
      stage = PILOT_AUDIO[id].mode === 'pattern' ? (narrationEnabled ? 'intro' : 'cycle') : 'steps'; lastFinishedId = undefined;
    }
    if (nextStep !== step) {
      retireVoice(); step = nextStep; completed = false; failed = false;
    }
    paused = isPaused;
    if (paused) { voice?.pause(); nature?.pause(); }
    else { startNature(); startVoice(); }
    notify();
  }
  function setPaused(value) {
    paused = Boolean(value);
    if (paused) { voice?.pause(); nature?.pause(); }
    else { startNature(); startVoice(); }
    notify();
  }
  function toggle() {
    if (!practiceId) return;
    if (failed && !enabled) { retireVoice(); completed = false; }
    enabled = !enabled; failed = false;
    if (enabled) { startNature(); startVoice(); }
    else { voice?.pause(); nature?.pause(); }
    notify();
  }
  function toggleNature() {
    natureEnabled = !natureEnabled; startNature(); notify();
  }
  function replay() {
    if (!practiceId || paused) return;
    retireVoice(); completed = false; failed = false; enabled = true;
    startNature(); startVoice(); notify();
  }
  function setPhase(index, cycle = 0) {
    const config = PILOT_AUDIO[practiceId];
    if (config?.mode !== 'pattern' || stage !== 'cycle' || !config.phases[index]) return;
    const key = `${cycle}/${index}`;
    if (phaseKey === key) return;
    retireVoice(); phaseKey = key; phaseIndex = index; completed = false;
    startVoice(); notify();
  }
  function finishPattern(id) {
    if (lastFinishedId === id) return;
    if (practiceId !== id || PILOT_AUDIO[id]?.mode !== 'pattern' || !enabled) { stop(); return; }
    lastFinishedId = id; retireVoice(); stage = 'outro'; paused = false; completed = false;
    startNature(); startVoice(); notify();
  }
  function setNarrationEnabled(value) {
    value = Boolean(value);
    if (narrationEnabled === value) return;
    narrationEnabled = value;
    retireVoice(); completed = false;
    if (!value && stage === 'intro') stage = 'cycle';
    notify();
  }
  return { setNarrationEnabled, setContext, setPaused, toggle, toggleNature, replay, stop, snapshot, setPhase, finishPattern };
}
