import { t } from './i18n.js';
export function playbackIcon(paused = false) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paused ? '<path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5Z"/>' : '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'}</svg>`;
}

// Natural attention and paced techniques are kept distinct. Holds are optional.
const patterns = {
  box: [
    { cue: 'Breathe in', duration: 4000 },
    { cue: 'Hold if comfortable', duration: 4000, hold: true },
    { cue: 'Breathe out', duration: 4000 },
    { cue: 'Hold if comfortable', duration: 4000, hold: true },
  ],
  'breath-478': [
    { cue: 'Breathe in', duration: 4000 },
    { cue: 'Hold if comfortable', duration: 7000, hold: true },
    { cue: 'Breathe out', duration: 8000 },
  ],
};

export function breathFrame(kind, elapsed) {
  const phases = patterns[kind];
  if (!phases) return { cue: 'Notice your breath.', natural: true, cycle: (elapsed % 10000) / 10000 };
  const total = phases.reduce((sum, p) => sum + p.duration, 0);
  const time = elapsed % total;
  let start = 0;
  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    if (time < start + phase.duration) return { ...phase, index, fraction: (time - start) / phase.duration, remaining: start + phase.duration - time, cycle: time / total };
    start += phase.duration;
  }
}

export function mountBreathing(container, session, kind = 'breath', hooks = {}) {
  const visual = container.querySelector('.breathing-orb');
  const cue = container.querySelector('#breath-cue') || container.querySelector('#practice-cue');
  const toggle = container.querySelector('#breath-toggle');
  const skip = container.querySelector('#skip-hold');
  const marker = container.querySelector('.pattern-marker');
  const shell = container.querySelector('.immersive-shell');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame, previous;
  let waitingIntro = false, lastPhaseKey;
  let disposed = false;

  function paint() {
    const phase = breathFrame(kind, session.elapsed);
    if (shell) {
      shell.classList.toggle('is-paused', session.paused);
      shell.dataset.phase = phase.natural ? 'natural' : String(phase.index);
    }
    const scale = 0.66 + 0.34 * (1 - Math.cos(phase.cycle * Math.PI * 2)) / 2;
    visual.style.transform = phase.natural && !motion.matches ? `scale(${scale})` : 'none';
    if (marker && !motion.matches) {
      let x, y;
      if (kind === 'box') {
        const points = [[75,75],[285,75],[285,285],[75,285],[75,75]];
        const [a,b] = [points[phase.index],points[phase.index+1]];
        x = a[0] + (b[0]-a[0])*phase.fraction;
        y = a[1] + (b[1]-a[1])*phase.fraction;
      } else {
        const angle = phase.cycle * Math.PI * 2 - Math.PI/2;
        x = 180+110*Math.cos(angle); y = 180+110*Math.sin(angle);
      }
      marker.setAttribute('cx', x); marker.setAttribute('cy', y);
    }
    const label = t(session.paused ? 'At your pace.' : waitingIntro ? 'Listen, then follow the guide.' : phase.cue);
    if (cue && !(phase.natural && hooks.preserveNaturalCue) && cue.textContent !== label) cue.textContent = label;
    if (!phase.natural && !session.paused && !waitingIntro) {
      const cycle = Math.floor(session.elapsed / (kind === 'box' ? 16000 : 19000));
      const key = `${cycle}/${phase.index}`;
      if (key !== lastPhaseKey) { lastPhaseKey = key; hooks.onPhase?.(phase.index, cycle); }
    }
    if (skip) skip.hidden = !phase.hold;
    const toggleLabel = t(session.paused ? 'Resume breathing guide' : 'Pause breathing guide');
    if (toggle.getAttribute('aria-label') !== toggleLabel) {
      toggle.innerHTML = playbackIcon(session.paused);
      toggle.setAttribute('aria-label', toggleLabel);
      toggle.setAttribute('aria-pressed', String(session.paused));
      toggle.setAttribute('title', t(session.paused ? 'Resume' : 'Pause'));
    }
  }
  function tick(now) {
    if (disposed || session.paused) return;
    if (previous !== undefined && !waitingIntro) session.elapsed += Math.min(now - previous, 100);
    previous = now;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    session.paused = true;
    cancelAnimationFrame(frame);
    previous = undefined;
    paint();
    hooks.onPause?.(true);
  }
  function onToggle() {
    if (!session.paused) { pause(); return; }
    session.paused = false;
    hooks.onPause?.(false);
    previous = undefined;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function onSkip() {
    const phase = breathFrame(kind, session.elapsed);
    if (phase.hold) { session.elapsed += phase.remaining; previous = undefined; paint(); }
  }
  function onVisibility() { if (document.hidden) pause(); }
  if (document.hidden) session.paused = true;
  toggle.addEventListener('click', onToggle);
  skip?.addEventListener('click', onSkip);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', paint);
  paint();
  if (!session.paused) frame = requestAnimationFrame(tick);
  return {
    pause,
    setIntroWaiting(value) {
      value = Boolean(value);
      if (value === waitingIntro) return;
      waitingIntro = value; session.elapsed = 0; previous = undefined; lastPhaseKey = undefined;
      paint();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      toggle.removeEventListener('click', onToggle);
      skip?.removeEventListener('click', onSkip);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', paint);
    },
  };
}
