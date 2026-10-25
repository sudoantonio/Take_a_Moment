import { LANGUAGE_KEY, getLanguage, setLanguage, t, translateHTML, languageToggle } from './i18n.js';
import { BFP, PRACTICES, PRACTICE_GROUPS, CATEGORIES } from './content.js';
import { emptyRequest, normalizeRequest, validateContact, buildEmail, clearRequest } from './contact.js';
import { registerOffline, getOfflineStatus, saveOffline, removeOffline, checkConnection } from './offline.js';
import { createJourneyStore, JOURNEY_KEY } from './journey.js';
import { createActivityStore, ACTIVITY_KEY, nextPracticeGoal, streakTheme } from './activity.js';

const root = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
let journeyStorage;
try { journeyStorage = window.localStorage; } catch { /* Browser storage is optional. */ }
const journey = createJourneyStore(journeyStorage, Object.keys(PRACTICES));
const activity = createActivityStore(journeyStorage, Object.keys(PRACTICES), { shared: journey.shared });
let activePracticeRun;
let finishedSuggestion;
const state = {
  shared: journey.shared, online: navigator.onLine, offlineReady: false, offlineSupported: null,
  practiceFilter: 'All', lastPracticeId: journey.progress?.practiceId || null, saving: false, cacheError: '', request: emptyRequest(), errors: {},
};
let languageChanging = false;
let lastFocus;
let lastJourneyRoute;
let breathingGuide;
let breathingSession = { elapsed: 0, paused: false };
let observationPaused = false;
// Home, Community and the journey do not need the practice rendering/audio code.
let mountBreathing, playbackIcon, sceneMarkup, immersiveBackdrop, immersiveScene, immersiveSetting, updateImmersiveStep;
let PILOT_AUDIO, practiceAudio, practiceLoad;
const needsPracticeFeatures = page => ['practice', 'choose', 'finished'].includes(page);
function loadPracticeFeatures() {
  if (!practiceLoad) practiceLoad = Promise.all([
    import('./breathing.js'), import('./scenes.js'), import('./immersive.js'), import('./practice-audio.js'),
  ]).then(([breathing, scenes, immersive, audio]) => {
    ({ mountBreathing, playbackIcon } = breathing);
    ({ sceneMarkup } = scenes);
    ({ immersiveBackdrop, immersiveScene, immersiveSetting, updateImmersiveStep } = immersive);
    PILOT_AUDIO = audio.PILOT_AUDIO;
    practiceAudio = audio.createPracticeAudio({ onChange: syncAudioControls });
  }).catch(error => { practiceLoad = undefined; throw error; });
  return practiceLoad;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arrow = '<span aria-hidden="true">↗</span>';
const link = (label, route, cls = 'button secondary', sub = '') => `<a class="${cls}" href="#/${route}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>${arrow}</a>`;
const button = (label, action, cls = 'button secondary', attrs = '') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const note = text => `<div class="note"><span class="note-mark" aria-hidden="true">✳</span><div>${text}</div></div>`;
const back = (route, label = 'Back') => `<a class="back-link" href="#/${route}"><span aria-hidden="true">←</span> ${label}</a>`;
const kicker = () => '';

function userArtwork() {
  return `<svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><circle cx="40" cy="40" r="39" fill="#F5AAD0"/><g transform="translate(0 11)"><path d="M21 29c-1-14 9-22 20-21 12-1 22 9 20 23l-3 11c-4 11-28 12-33 0l-4-13Z" fill="#FFD43B"/><path d="M29 29q4 6 8 0m7 0q4 6 8 0M34 39q7 6 13 0" stroke="#262820" stroke-width="3" stroke-linecap="round"/><path d="m23 15 2-6m36 8 5-4" stroke="#262820" stroke-width="2.5" stroke-linecap="round"/></g></svg>`;
}

function streakArtwork(count) {
  return `<svg class="streak-badge" viewBox="0 0 320 320" fill="none" aria-hidden="true"><path d="M160 38C214 2 258 50 251 98C310 107 320 167 278 202C298 262 239 296 198 276C165 329 104 304 93 264C33 278 2 221 36 179C-2 133 32 78 80 83C87 29 131 17 160 38Z" fill="#1359DF"/><text x="160" y="198" text-anchor="middle" fill="#FFFEF9" font-size="${count >= 100 ? 104 : 130}" font-weight="700" font-family="inherit">${count}</text></svg>`;
}



function profile() {
  const stats = activity.summary();
  const goal = nextPracticeGoal(stats.total);
  const week = stats.week.map((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const label = date.toLocaleDateString(getLanguage() === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return `<li class="journey-day ${day.done ? 'is-done' : ''} ${day.today ? 'is-today' : ''} ${day.future ? 'is-future' : ''}" ${day.today ? 'aria-current="date"' : ''} aria-label="${label}: ${t(day.done ? 'practice complete' : day.future ? 'coming up' : 'no completed practice')}"><span>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</span><span class="journey-day-circle" aria-hidden="true">${day.done ? '✓' : '·'}</span></li>`;
  }).join('');
  return `<div class="journey-heading">${back('home')}<h1>Your journey</h1><a class="journey-settings" href="#/settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.7 2.1-2 .9-2.1-.4-2.5 4.3L3.6 12l-1.4 2.1 2.5 4.3 2.1-.4 2 .9.7 2.1h5l.7-2.1 2-.9 2.1.4 2.5-4.3-1.4-2.1 1.4-2.1-2.5-4.3-2.1.4-2-.9-.7-2.1h-5Z"/><circle cx="12" cy="12" r="3"/></svg></a></div>
    <section class="journey-overview" aria-label="Your streak and this week’s practice"><div class="journey-intro">${streakArtwork(stats.streak)}<h2><span class="visually-hidden">${stats.streak} </span>Day streak</h2>${stats.completedToday ? '<p>Today complete</p>' : ''}</div>
      <ol class="journey-calendar" aria-label="This week">${week}</ol>
      <section class="journey-goal" aria-labelledby="journey-goal-title"><div class="journey-goal-top"><span>Next goal</span><span class="journey-goal-count">${goal.current} / ${goal.target}</span></div><h3 id="journey-goal-title">${goal.target === 1 ? 'Complete your first practice' : `Complete ${goal.target} practices`}</h3><progress value="${goal.current}" max="${goal.target}" aria-label="${goal.current} of ${goal.target} practices completed"></progress></section>
    </section>
    <nav class="journey-links" aria-label="Community and settings"><a href="#/about"><span>About &amp; privacy</span><span aria-hidden="true">→</span></a><a class="journey-community" href="#/support"><span>Community</span><span aria-hidden="true">→</span></a></nav>
    ${state.shared || !activity.saved ? `<p class="journey-storage">${state.shared ? 'Shared device: your journey is not saved.' : 'This session only: your browser cannot save your journey.'}</p>` : ''}`;
}

function route() {
  const [page = 'home', id = 'breath', step = '1'] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: page || 'home', id: PRACTICES[id] ? id : 'breath', step: Math.min(3, Math.max(1, Math.trunc(Number(step)) || 1)) };
}
function navigate(path, replace = false) {
  stopAudio(); state.errors = {};
  const target = `#/${path}`;
  if (replace) { history.replaceState(null, '', target); render(true); }
  else if (location.hash === target) render(true);
  else location.hash = target;
}
function announce(text) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = t(text); }); }
function stopAudio() { practiceAudio?.stop(); }
function soundIcon(enabled) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4V5Z"/>${enabled ? '<path d="M14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m15 9 6 6m0-6-6 6"/>'}</svg>`;
}
function pilotAudioControls(p) {
  if (!PILOT_AUDIO[p.id]) return '';
  return `<button type="button" class="practice-circle practice-audio" data-action="practice-audio" aria-label="Turn audio on" title="Turn audio on" aria-pressed="false">${soundIcon(false)}</button>`;
}
function syncAudioControls(audio = practiceAudio?.snapshot()) {
  if (!audio) return;
  breathingGuide?.setIntroWaiting(audio.introPending);
  const control = root.querySelector('[data-action="practice-audio"]');
  if (!control) return;
  control.innerHTML = soundIcon(audio.enabled);
  control.setAttribute('aria-pressed', String(audio.enabled));
  const audioLabel = getLanguage() === 'es' ? (audio.enabled ? 'Turn nature sounds off' : 'Turn nature sounds on') : (audio.enabled ? 'Turn audio off' : 'Turn audio on');
  control.setAttribute('aria-label', t(audioLabel));
  control.setAttribute('title', t(audioLabel));
  const status = root.querySelector('#practice-audio-status');
  if (status) status.textContent = audio.failed ? t('Audio could not start. Turn audio on to try again.') : '';
}
function formError(key) { return state.errors[key] ? `<p class="field-error" id="error-${key}">${esc(state.errors[key])}</p>` : ''; }
function focusError() { const field = root.querySelector('[aria-invalid="true"]'); field?.focus(); announce(Object.values(state.errors)[0] || 'Check the highlighted fields.'); }
function resetPrivateState() { state.request = clearRequest(state.request); state.errors = {}; stopAudio(); }

function frame(body, page, extra = '') {
  const neutral = page === 'exit';
  if (page === 'practice') {
    const id = route().id;
    return `<div class="breathing-shell immersive-shell setting-${immersiveSetting(id)} ${PRACTICES[id].mode === 'steps' && observationPaused ? 'is-paused' : ''}" data-practice="${id}" data-step="${route().step}">${immersiveBackdrop(id)}<header class="breathing-top"><span>${esc(PRACTICES[id].name)}</span><div class="practice-top-actions">${languageToggle()}<a class="close-practice" href="#/stopped/${id}/${route().step}" aria-label="Stop practice"><span aria-hidden="true">×</span></a></div></header><main id="main" class="breathing-main" tabindex="-1">${body}</main></div>`;
  }
  return `<div class="app-shell ${neutral ? 'neutral-shell' : ''} ${page === 'profile' ? `profile-shell theme-${streakTheme(activity.summary().streak)}` : ''}">
    ${neutral || page === 'choose' || page === 'stopped' || page === 'finished' || page === 'support' || page === 'profile' || page === 'settings' ? '' : `<header class="site-header ${page === 'home' ? 'home-header' : ''}"><a class="brand" href="#/home" aria-label="BFP, home"><img class="brand-logo" src="./bfp-logo.png" alt="Boundless Freedom Project" width="1024" height="414"></a><div class="header-actions">${languageToggle()}${page === 'about' ? '' : `<a class="profile-link" href="#/profile" aria-label="Your journey">${userArtwork()}</a>`}</div></header>`}
    <main id="main" class="app-main ${extra}" tabindex="-1">${body}</main>
  </div>`;
}

function home() {
  return `<section class="home-actions" aria-label="Main actions"><button type="button" class="practice-launch" data-action="random-practice"><img src="./friends.svg" alt="" width="640" height="500"><span class="practice-launch-label">Practice now</span></button><a class="button secondary home-connect" href="#/choose"><svg class="practice-shapes-icon" viewBox="0 0 64 24" fill="none" aria-hidden="true"><path d="M2 9C4 2 12 1 15 7C19 13 13 22 7 21C1 20-1 14 2 9Z" fill="#1359DF"/><path d="m29 2 13 17c-6 3-14 3-22 1L29 2Z" fill="#F68A36"/><path d="M49 5Q55 2 63 4L62 20Q56 22 48 19L49 5Z" fill="#FFD43B"/></svg><span>Choose a practice</span></a><a class="understated-link home-choose" href="#/support">Connect with BFP</a></section>`;
}

function practiceArtwork(p, step = 1) {
  return p.id === 'observe' ? observationScene(step) : sceneMarkup(p.id, step, observationPaused);
}

function choose() {
  const practices = Object.values(PRACTICES).filter(p => state.practiceFilter === 'All' || p.group === state.practiceFilter);
  return `<div class="catalogue-tools"><a class="catalogue-back" href="#/home"><span aria-hidden="true">←</span> Back</a><div class="catalogue-title"><h1>Choose a practice</h1><button type="button" class="random-practice" data-action="random-practice"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6s4-6 6-6h3m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>Random</button></div><nav class="practice-filters" aria-label="Practice categories">${PRACTICE_GROUPS.map(group => `<button type="button" data-filter="${group}" aria-pressed="${state.practiceFilter === group}">${group === 'All' ? 'All · 21' : group}</button>`).join('')}</nav></div><div class="practice-grid">${practices.map(p => `<a class="practice-card category-${p.group.toLowerCase()}" href="#/practice/${p.id}/1">${practiceArtwork(p)}<h2>${p.name}</h2><p>${p.description}</p><span class="card-bottom">${PILOT_AUDIO[p.id] ? (getLanguage() === 'es' ? 'Nature sounds' : 'Voice + nature') : 'At your pace'} <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`;
}

function visualBreathing(p) {
  const step = route().step;
  const natural = p.mode === 'natural';
  const cue = p.steps[step - 1];
  return `<section class="breathing-stage" aria-label="${esc(p.name)} visual guide">${immersiveScene(p.id)}<div class="immersive-copy">${natural ? `<div class="observation-dots" aria-label="Step ${step} of 3">${[1,2,3].map(i => `<span class="${i === step ? 'current' : ''}" aria-hidden="true"></span>`).join('')}</div>` : ''}<h1 id="${natural ? 'practice-cue' : 'breath-cue'}">${natural ? cue.title : 'Breathe in'}</h1><p id="practice-detail" class="breathing-permission">${natural ? cue.text : 'Keep it comfortable. Any hold is optional.'}</p>${!natural ? '<div class="skip-hold-space"><button type="button" id="skip-hold" hidden>Skip hold</button></div>' : ''}</div></section><div class="breathing-bottom"><div class="breathing-actions has-audio">${pilotAudioControls(p)}<button type="button" id="breath-toggle" class="breathing-pause practice-circle" aria-label="Pause breathing guide" aria-pressed="false" title="Pause">${playbackIcon(breathingSession.paused)}</button>${natural ? practiceNavigation(p, step) : practiceForward(p)}</div><p id="practice-audio-status" class="visually-hidden" role="status"></p></div>`;
}

function observationScene(step) {
  return `<div class="observation-scene scene-step-${step} ${observationPaused ? 'is-paused' : ''}" aria-hidden="true"><svg viewBox="0 0 360 360" fill="none"><circle cx="180" cy="180" r="170" fill="#f7e6db"/><g class="scene-surroundings"><rect x="65" y="38" width="230" height="249" rx="110" fill="#fffdf8"/><path d="M80 149a100 100 0 0 1 200 0v115H80V149Z" fill="#dae8fa"/><g class="scene-sun"><circle cx="230" cy="112" r="27" fill="#ffd43b"/><path d="M220 111q4 6 8 0m8 0q4 6 8 0" stroke="#262820" stroke-width="3" stroke-linecap="round"/></g><path d="M80 227q55-70 112-17t88-11v65H80v-37Z" fill="#a9c5a6"/><path d="M80 244q75-60 134-20t66 5v35H80v-20Z" fill="#6f987c"/><path d="M180 52v212M80 175h200" stroke="#fffdf8" stroke-width="8"/><path d="M66 276h228" stroke="#fffdf8" stroke-width="15" stroke-linecap="round"/></g><g class="scene-plant"><path d="M181 269v-87" stroke="#325b47" stroke-width="6" stroke-linecap="round"/><g class="scene-leaves"><path d="M180 229c-38 0-56-27-49-54 31 1 51 20 49 54Z" fill="#5b947b"/><path d="M182 210c-3-35 15-55 46-54 2 31-16 53-46 54Z" fill="#5b947b"/><path d="m142 189 38 40m3-20 33-39" stroke="#325b47" stroke-width="3" stroke-linecap="round"/></g><path d="M145 259h74l-9 53h-56l-9-53Z" fill="#f68a36"/><path d="M166 283q5 8 10 0m11 0q5 8 10 0m-25 12q10 9 20 0" stroke="#262820" stroke-width="3" stroke-linecap="round"/></g><g class="scene-focus-frame" stroke="#1359df" stroke-width="5" stroke-linecap="round"><path d="M111 176v-17h17m111 0h17v17M111 247v17h17m111 0h17v-17"/></g><g class="scene-return" fill="#1359df"><path d="m45 124 4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12ZM309 208l3 10 11 4-11 3-3 11-4-11-10-3 10-4 4-10Z"/></g></svg></div>`;
}

function stepArrow(backward = false) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${backward ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6'}"/></svg>`;
}
function practiceForward(p, step = 3) {
  return `<a class="button breathing-finish practice-next" href="#/${step === 3 ? `finished/${p.id}` : `practice/${p.id}/${step + 1}`}"><span>${step === 3 ? 'Finish' : 'Next'}</span>${stepArrow()}</a>`;
}
function practiceNavigation(p, step) {
  return `<nav class="practice-navigation" aria-label="Practice steps"><a class="practice-previous" aria-label="Previous step" ${step > 1 ? `href="#/practice/${p.id}/${step - 1}"` : 'aria-disabled="true" tabindex="-1"'}>${stepArrow(true)}</a>${practiceForward(p, step)}</nav>`;
}

function visualObservation(p, step) {
  const cue = p.steps[step - 1];
  return `<section class="breathing-stage observation-stage" aria-label="${esc(p.name)} practice">${immersiveScene(p.id, step)}<div class="immersive-copy"><div class="observation-dots" aria-label="Step ${step} of 3">${[1, 2, 3].map(i => `<span class="${i === step ? 'current' : ''}" aria-hidden="true"></span>`).join('')}</div><h1 id="practice-cue">${cue.title}</h1><p id="practice-detail" class="breathing-permission">${cue.text}</p></div></section><div class="breathing-bottom"><div class="breathing-actions ${PILOT_AUDIO[p.id] ? 'has-audio' : ''}">${pilotAudioControls(p)}${button(playbackIcon(observationPaused), 'pause-observation', 'breathing-pause practice-circle', `aria-label="${observationPaused ? 'Resume' : 'Pause'} practice" aria-pressed="${observationPaused}" title="${observationPaused ? 'Resume' : 'Pause'}"`)}${practiceNavigation(p, step)}</div><p id="practice-audio-status" class="visually-hidden" role="status"></p></div>`;
}

function setObservationPaused(paused) {
  observationPaused = paused;
  practiceAudio.setPaused(paused);
  root.querySelector('.immersive-shell')?.classList.toggle('is-paused', paused);
  const control = root.querySelector('[data-action="pause-observation"]');
  if (control) {
    control.innerHTML = playbackIcon(paused);
    control.setAttribute('aria-label', t(`${paused ? 'Resume' : 'Pause'} practice`));
    control.setAttribute('aria-pressed', String(paused));
    control.setAttribute('title', t(paused ? 'Resume' : 'Pause'));
  }
}

function stopped(p, step) {
  return `<section class="stop-content"><img class="rest-companion" src="./rest-friend.svg" alt="" width="320" height="240"><h1>Take a break.</h1><div class="stop-actions"><a class="button primary" href="#/practice/${p.id}/${step}">Resume</a><a class="button secondary stop-home" href="#/home"><span aria-hidden="true">←</span>Home</a></div></section>`;
}

function finished(completed) {
  if (!finishedSuggestion) {
    const choices = Object.values(PRACTICES).filter(practice => practice.id !== completed.id);
    finishedSuggestion = choices[Math.floor(Math.random() * choices.length)].id;
  }
  const suggested = PRACTICES[finishedSuggestion];
  return `<section class="stop-content"><img class="rest-companion" src="./complete-friend.svg" alt="" width="320" height="240"><h1>Practice complete.</h1><div class="stop-actions"><a class="button suggested-practice setting-${immersiveSetting(suggested.id)}" href="#/practice/${suggested.id}/1"><span class="suggested-practice-icon" aria-hidden="true">${practiceArtwork(suggested)}</span><span>${esc(suggested.name)}</span></a><a class="button secondary stop-home" href="#/home"><span aria-hidden="true">←</span>Home</a></div><a class="understated-link home-choose finished-choose" href="#/choose">Choose another practice</a></section>`;
}

function offlinePage(p) {
  return `${back('settings')}${kicker('ANCHE QUANDO LA RETE MANCA')}<h1>Take a practice<br><em>with you.</em></h1><p class="lead">Save all 21 practices on this device.</p>${state.offlineReady ? note('<strong>Your practices are available offline.</strong><br>You can reopen this site without a connection.') : note('Your first download needs internet. Clearing browser data may remove saved practices.')}<div class="save-summary"><span aria-hidden="true">↓</span><div><strong>Your offline practices</strong><p>21 visual practices<br>Practice text and essential contacts.</p></div></div>${state.shared ? note('This is a shared device. Choose a printed practice instead of saving content here.') : ''}${state.cacheError ? `<p class="field-error" role="alert">${esc(state.cacheError)}</p>` : ''}<div class="action-stack">${!state.offlineReady ? button(state.saving ? 'Saving practices…' : 'Save practices on this device', 'save-offline', 'button primary', state.saving || state.shared || !state.online || !state.offlineSupported ? 'disabled' : '') : link('Open a saved practice', 'choose', 'button primary')}${link('Open a printable practice', `print/${p.id}`)}${state.offlineReady ? button('Remove saved practices', 'remove-offline', 'button plain') : ''}</div>${!state.online ? '<p class="quiet-copy">You can save content when you’re online again.</p>' + button('Check connection', 'check-connection', 'button plain') : ''}${state.offlineSupported === false ? '<p class="quiet-copy">This browser can’t save practices offline. You can print one instead.</p>' : ''}`;
}

function sheet(p) {
  return `<div class="print-controls">${back(`offline/${p.id}`)}${button('Print this practice', 'print', 'button secondary compact')}</div><article class="paper-sheet"><p class="tiny-label">BOUNDLESS FREEDOM PROJECT</p><h1>${p.name}</h1><p class="lead">About a minute, at your pace.</p><ol>${p.steps.map(s => `<li>${s.text}</li>`).join('')}</ol><p><strong>You can keep your eyes open. You can stop at any time.</strong></p><hr><h2>Stay connected.</h2><p>BFP: ${BFP.phoneDisplay}<br>${BFP.email}<br>boundlessfreedom.org</p><p class="quiet-copy">BFP is not an emergency service. Response times are not confirmed.</p><p class="quiet-copy">In the US: call 911 for an immediate emergency. Call or text 988 for crisis support.</p><p class="sheet-version">MVP draft · October 2026 · pending BFP review</p></article>`;
}

function communityArtwork(kind) {
  const pictures = {
    online: `<path d="M18 17 139 12q12 0 12 12l-3 71q0 10-11 10L19 109Q8 108 8 97L7 30q0-11 11-13Z" fill="#FFFEF9" stroke="#262820" stroke-width="3"/><path d="M19 29 139 25l-3 66-116 4-1-66Z" fill="#E2EAF8"/><path d="M33 89c-13-7-17-29-7-38s25-7 29 5l7 32-29 1Z" fill="#F3A6CE"/><path d="M65 89 62 55c-2-18 7-28 20-27 17 0 21 12 21 25l-3 36H65Z" fill="#FFD43B"/><path d="M101 88 99 66c-1-15 7-23 20-22 14 2 18 12 17 24l-1 20h-34Z" fill="#F68A36"/><g stroke="#262820" stroke-width="2.5" stroke-linecap="round"><path d="M31 66q3 5 6 0m7-1q3 5 6 0m-13 12q5 4 10 0M71 50q3 5 6 0m8 0q3 5 6 0m-15 12q6 5 12 0M107 65q3 5 6 0m7-1q3 5 6 0m-13 12q5 4 10 0M72 108l-3 11m24-11 3 11m-39 3h51"/></g><path d="m140 6 3-4m3 10h6" stroke="#FFD43B" stroke-width="3" stroke-linecap="round"/>`,
    meet: `<path d="M14 66C3 51 7 28 21 25c16-4 28 10 25 26l-3 18-29-3Z" fill="#F3A6CE"/><path d="M52 66c-6-19-4-44 11-48 15-5 30 9 27 28l-4 23-34-3Z" fill="#FFD43B"/><g stroke="#262820" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 42q3 5 6 0m8 0q3 5 6 0m-15 10q5 5 10 0M59 36q3 5 6 0m8 0q3 5 6 0m-15 11q5 5 10 0M42 52q7 12 15-1M19 68l-3 14H8m25-13 3 15h9m15-17-2 17h-9m28-15 3 14h10"/></g><path d="m45 12 1-6m-7 9-5-2" stroke="#1359DF" stroke-width="3" stroke-linecap="round"/>`,
    mentor: `<path d="M10 14q24-8 47-3 11 2 11 14v19q0 12-13 14l-25 1-13 11 1-14Q5 53 5 42V26q0-9 5-12Z" fill="#1359DF"/><path d="M49 48q16-6 32-2 10 3 10 13l-1 16q0 10-13 12l-1 8-13-8-13-1q-11-1-11-12V60q0-9 10-12Z" fill="#F68A36"/><g stroke="#FFFEF9" stroke-width="3" stroke-linecap="round"><path d="M18 30q4 6 8 0m13 0q4 6 8 0m-22 12q9 6 17 0"/></g><g stroke="#262820" stroke-width="2.5" stroke-linecap="round"><path d="M51 63q3 5 6 0m12 0q3 5 6 0m-20 10q7 5 14 0"/></g>`,
  };
  return `<svg class="community-illustration community-illustration-${kind}" viewBox="${kind === 'online' ? '0 0 160 128' : '0 0 96 96'}" fill="none" aria-hidden="true">${pictures[kind]}</svg>`;
}

function support() {
  return `<div class="support-heading">${back('home')}<h1>Community</h1><a class="support-about" href="#/about">About</a></div>
    <div class="community-options"><section class="community-online" aria-labelledby="online-title">
      <div class="community-online-top"><div><h2 id="online-title">Online Sangha</h2><p>Meditate and connect.<br>Open to everyone.</p></div>${communityArtwork('online')}</div>
      <p class="community-schedule">1st &amp; 3rd Wednesdays · Zoom</p>
      <a class="button community-gatherings" href="${BFP.website}/sangha" target="_blank" rel="noopener noreferrer"><span>View gatherings</span>${arrow}</a>
    </section>
    <nav class="community-paths" aria-label="More ways to connect">
      ${button(communityArtwork('meet') + '<span>Meet in person<small>Ask about groups near you.</small></span>', 'request-community', 'button community-local')}
      <a class="button community-mentor" href="#/mentorship">${communityArtwork('mentor')}<span>Find a mentor<small>Explore one-to-one support.</small></span></a>
    </nav></div>
    <section class="community-contact" aria-labelledby="contact-title"><h2 id="contact-title">Contact BFP</h2>
      <a class="support-phone" href="tel:${BFP.phone}">
        <svg class="call-companion" viewBox="0 0 88 80" fill="none" aria-hidden="true">
          <path d="M17 66C5 54 5 31 15 20C23 10 41 8 51 18C63 27 67 45 59 59L55 68H20Z" fill="#FA923C"/>
          <path d="M22 33q4 6 8 0m8 0q4 6 8 0M28 44q7 6 14 0" stroke="#262820" stroke-width="3" stroke-linecap="round"/>
          <path d="m26 67-2 8H13m31-8 3 8h11" stroke="#262820" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 49q-7 7 0 12m32-7q14 2 16-16" stroke="#262820" stroke-width="3" stroke-linecap="round"/>
          <path d="M60 15c-4 0-9 6-10 13-2 10 3 22 10 27 4 3 10 3 13 0l3-6c1-2 0-3-2-4l-8-3c-2-1-3 0-4 2l-1 2c-5-4-7-11-6-16l3 1c2 0 3-1 3-3l3-9c1-3-1-4-4-4Z" fill="#F4A9CE" stroke="#262820" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="m72 15 5-4m-3 11h7" stroke="#262820" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <span class="support-phone-copy"><span class="support-phone-label">Call BFP</span><span class="support-phone-number">${BFP.phoneDisplay}</span></span>
        <span class="call-chevron" aria-hidden="true">→</span>
      </a>
      <div class="support-quick-actions">${button('Message BFP', 'new-request', 'button secondary')}<a class="button support-download" href="./bfp-exercises.pdf" download="BFP-21-Mindfulness-Exercises.pdf" aria-label="Download exercises (PDF, 21 exercises)"><span>Download exercises</span></a></div>
    </section>
    <p class="support-safety">BFP is not an emergency service. <a href="#/urgent">Urgent help →</a></p>`;
}

function community(mentor = false) {
  return `${back('support')}${kicker(mentor ? 'MENTORSHIP BFP' : 'OUTSIDE SANGHA')}<h1>${mentor ? 'Personal<br><em>support.</em>' : 'Practice with<br><em>the community.</em>'}</h1><p class="lead">${mentor ? 'Ask BFP about mentorship and how it works.' : 'Outside Sangha is the BFP community you can practice with after release.'}</p><p>${mentor ? 'The team can explain what’s available.' : 'Ask how to join and which gatherings are available.'}</p><div class="action-stack">${button(mentor ? 'Ask about mentorship' : 'Ask how to join', mentor ? 'request-mentor' : 'request-community', 'button primary')}<a class="button secondary" href="tel:${BFP.phone}">Call BFP ${arrow}</a>${link('Back to support', 'support', 'button plain')}</div><p class="quiet-copy">Joining is your choice. Check availability with BFP.</p>`;
}

function requestPage() {
  return `${back('support')}${kicker('MESSAGGIO A BFP · 1 DI 3')}<h1>How can we<br><em>help?</em></h1><p class="lead">You don’t have to tell your whole story.</p><form id="request-category"><label for="category">What do you need?</label><select id="category" name="category">${CATEGORIES.map(c => `<option value="${esc(c)}" ${state.request.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select><p class="field-help">If you’re unsure, choose “I’d like to talk to someone”.</p>${note('You’ll review a draft in your email app and choose whether to send it.')}<button class="button primary" type="submit">Continue ${arrow}</button></form>`;
}

function contactPage() {
  const r = state.request;
  return `${back('request')}${kicker('MESSAGGIO A BFP · 2 DI 3')}<h1>How can BFP<br><em>reach you?</em></h1><p class="lead">Choose a safe way to be contacted.</p><form id="contact-form" novalidate><label for="method">Preferred contact method</label><select id="method" name="method"><option value="phone" ${r.method === 'phone' ? 'selected' : ''}>Phone</option><option value="email" ${r.method === 'email' ? 'selected' : ''}>Email</option><option value="none" ${r.method === 'none' ? 'selected' : ''}>I don’t have a safe contact</option></select>${r.method === 'none' ? note('You can contact BFP yourself when it’s safe. You don’t need to leave a contact detail here.') : `<label for="contact">${r.method === 'phone' ? 'Phone number' : 'Email address'}</label><input id="contact" name="contact" type="${r.method === 'phone' ? 'tel' : 'email'}" value="${esc(r.contact)}" maxlength="180" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="contact-help${state.errors.contact ? ' error-contact' : ''}" ${state.errors.contact ? 'aria-invalid="true"' : ''}><p id="contact-help" class="field-help">Only share a contact detail that is safe for you.</p>${formError('contact')}${r.method === 'phone' ? `<label for="safeTime">When is it safe to call? <span>Optional</span></label><input id="safeTime" name="safeTime" value="${esc(r.safeTime)}" maxlength="120" autocomplete="off" placeholder="For example: afternoons"><label class="check-label"><input type="checkbox" name="voicemail" ${r.voicemail ? 'checked' : ''}><span>It’s okay to leave a voicemail.</span></label>` : '<p class="field-help">Other people may see your email notifications.</p>'}<label for="name">What would you like to be called? <span>Optional</span></label><input id="name" name="name" value="${esc(r.name)}" maxlength="80" autocomplete="off">`}${state.shared ? note('Shared device: form details stay only in this session. Your email app may keep a draft.') : ''}<button class="button primary" type="submit">${r.method === 'none' ? 'How to contact BFP' : 'Review your message'} ${arrow}</button></form>`;
}

function noContact() {
  return `${back('contact')}${kicker('NESSUN RECAPITO DA LASCIARE')}<h1>Take the next step<br><em>when it’s safe.</em></h1><p class="lead">You can call BFP when it’s safe for you.</p><div class="direct-contact"><a href="tel:${BFP.phone}">${BFP.phoneDisplay} ${arrow}</a><p>${BFP.email}</p></div><p>${getLanguage() === 'es' ? `Puedes pedir al equipo ${state.request.category === CATEGORIES[0] ? 'que te ayude a hablar con alguien' : 'información sobre ' + esc(t(state.request.category))}.` : `You can ask the team to ${state.request.category === CATEGORIES[0] ? 'help you talk to someone' : 'tell you about ' + esc(state.request.category.toLowerCase())}.`}</p>${note('No request has been sent. You haven’t left contact details on this site.')}<div class="action-stack">${link('Back to practices', 'choose', 'button primary')}${link('Exit', 'exit', 'button plain')}</div>`;
}

function review() {
  const r = normalizeRequest(state.request);
  return `${back('contact')}${kicker('MESSAGGIO A BFP · 3 DI 3')}<h1>You choose<br><em>what to share.</em></h1><p class="lead">Review your details before opening your email app.</p><dl class="review-data"><div><dt>To</dt><dd>BFP · ${BFP.email}</dd></div><div><dt>About</dt><dd>${esc(r.category)}</dd></div>${r.name ? `<div><dt>Your chosen name</dt><dd translate="no">${esc(r.name)}</dd></div>` : ''}<div><dt>Preferred contact</dt><dd>${r.method === 'phone' ? 'Phone' : 'Email'} · <span translate="no">${esc(r.contact)}</span></dd></div>${r.method === 'phone' ? `<div><dt>Safe time to contact</dt><dd>${r.safeTime ? `<span translate="no">${esc(r.safeTime)}</span>` : 'No preference given'}</dd></div><div><dt>Voicemail</dt><dd>${r.voicemail ? 'Voicemail allowed' : 'No voicemail allowed'}</dd></div>` : ''}</dl><form id="review-form"><label class="check-label consent-label"><input id="consent" type="checkbox" name="consent" ${r.consent ? 'checked' : ''} ${state.errors.consent ? 'aria-invalid="true" aria-describedby="error-consent"' : ''}><span>I agree to share these details with BFP for this request.</span></label>${formError('consent')}<p class="field-help">This opens a draft. It’s only sent when you select Send in your email app. BFP will also see the email address you send from.</p>${!state.online ? note('You’re offline. You can prepare a draft, but sending it needs a connection.') : ''}<button class="button primary" type="submit">Open your email app ${arrow}</button>${link('Edit contact details', 'contact', 'button plain')}</form><p class="quiet-copy">Response times are not confirmed. For an emergency, use <a href="#/urgent">Urgent help</a>.</p>`;
}

function emailNext() {
  return `${kicker('IL PROSSIMO PASSO È TUO')}<h1>Continue in<br><em>your email app.</em></h1><p class="lead">We asked your email app to open a draft for BFP.</p><p>Review the draft and choose whether to send it. This site can’t confirm delivery.</p>${note('If no draft opened, you can contact BFP directly:<br><a href="mailto:${BFP.email}">${BFP.email}</a><br><a href="tel:${BFP.phone}">${BFP.phoneDisplay}</a>')}<p class="quiet-copy">Form details have been cleared from this session. Your email app may keep drafts or messages.</p><div class="action-stack">${link('Back to practices', 'choose', 'button primary')}${link('Exit', 'exit', 'button plain')}</div>`;
}

function settings() {
  const stats = activity.summary();
  return `<div class="settings-heading">${back('profile')}<h1>Settings</h1></div>
    <section class="settings-card settings-language"><div><h2>Language</h2><p>Interface and practice text</p>${getLanguage() === 'es' ? '<p>Spanish uses nature sounds. Recorded narration is in English.</p>' : ''}</div>${languageToggle()}</section>
    <section class="settings-card"><h2>Data &amp; saving</h2><label class="settings-toggle" for="save-on-device"><span>Save on this device</span><span class="shared-toggle"><input type="checkbox" id="save-on-device" aria-describedby="saving-help" ${state.shared ? '' : 'checked'}><span class="toggle-track" aria-hidden="true"></span></span></label><p id="saving-help">Your journey stays in this browser. Switching off clears your history and saved place, and stops new offline downloads.</p>${!state.shared && !activity.saved ? '<p class="field-error">This browser cannot save your journey. It lasts for this session only.</p>' : ''}<div class="settings-data-summary"><span>${stats.total} ${stats.total === 1 ? 'practice' : 'practices'} saved</span><span>${stats.activeDays} ${stats.activeDays === 1 ? 'day' : 'days'}</span></div>${button('Clear my journey', 'clear-journey', 'settings-clear', !stats.total && !journey.progress ? 'disabled' : '')}</section>
    ${journey.progress ? `<section class="settings-card"><h2>Saved practice</h2><p>${esc(PRACTICES[journey.progress.practiceId].name)}</p>${link('Resume', journey.resumePath, 'button secondary')}${button('Forget saved place', 'forget-progress', 'settings-clear')}</section>` : ''}
    <section class="settings-card"><h2>Offline practices</h2><p>${state.offlineReady ? 'Practices are downloaded on this device.' : 'No offline download on this device.'}</p>${link('Manage downloads', 'offline/breath', 'button secondary')}</section>
    <nav class="settings-links" aria-label="Information">${link('Privacy', 'privacy', 'button plain')}${link('About this project', 'about', 'button plain')}</nav>`;
}

function about() {
  return `${back('support')}<h1>About</h1><nav class="about-options" aria-label="Information">${link('Settings', 'settings')}${link('Privacy', 'privacy')}${link('Urgent help', 'urgent')}</nav><p class="quiet-copy about-disclaimer">Independent preview · practices pending BFP review</p><details class="practice-sources"><summary>Practice sources</summary><p><a href="./audio/nature/ATTRIBUTION.txt" target="_blank" rel="noopener noreferrer">Background sound credits and licences</a></p><p><a href="https://drive.google.com/file/d/1SjP6GzjpFtS8yHych0zROcXZ8HOn9RWV/view" target="_blank" rel="noopener noreferrer">BFP: 21 One-Minute Mindfulness Exercises</a></p><p>Visual scenes and short cues are prototype adaptations. Mindful breathing follows natural breathing; timed guides are separate practices. The 4-7-8 timing comes from the supplied PDF. The square guide uses four seconds per side, following <a href="https://www.nnuh.nhs.uk/wp-content/uploads/2021/03/Relaxation-Information-Pack.pdf" target="_blank" rel="noopener noreferrer">NHS box-breathing guidance</a>. Holds can always be skipped. No camera, microphone, or breathing measurement is used.</p></details>`;
}

function privacy() {
  return `${back('settings')}${kicker('PRIVACY, CON PAROLE SEMPLICI')}<h1>Choose what<br><em>to share.</em></h1><div class="privacy-list"><section><h2>To practice</h2><p>No account needed. We don’t ask for your name, email or personal history.</p><p>We save your practice checkpoint and daily totals of completed practices in this browser. Dates and practice IDs power your streak, calendar and milestones for up to a year. We save no identity, exact times or location. You can clear your journey in Settings. Switch off Save on this device to remove it and stop future saving.</p></section><section><h2>To contact BFP</h2><p>Form details stay in this page’s temporary memory. We don’t save them in browser storage or send them to our server.</p><p>If you open an email draft, the details go to your email app. Delivery and storage depend on that app and BFP.</p></section><section><h2>On a shared device</h2><p>In Settings, choose Clear my journey to remove saved practice history and your saved place. Switching off Save on this device also removes practice history and stops future saving. It won’t clear browser history or drafts in your email app.</p></section><section><h2>Offline practices</h2><p>We save only the interface, public practices and essential contacts. The offline package contains no requests or personal details. Your checkpoint and daily practice history are stored separately in this browser unless Shared device is on.</p><p>Remove saved practices on the Offline page. Clearing browser data may remove them too.</p></section><section><h2>External services</h2><p>Calls, email and BFP website links open external services. The hosting provider may keep technical logs under its own privacy policy.</p></section></div><p class="quiet-copy">This version has no analytics, advertising or session recording.</p>${link('Back to practices', 'choose', 'button primary')}`;
}

function urgent() {
  return `${back('support')}${kicker('CONTATTI PER GLI STATI UNITI')}<h1>Need<br><em>urgent help?</em></h1><p class="lead">BFP is not an emergency service.</p><div class="action-stack"><a class="button primary" href="tel:911"><span>Call 911<small>Immediate danger or a medical emergency.</small></span>${arrow}</a><a class="button secondary" href="tel:988?oai_link_source=model_response_hotline"><span>Call 988<small>Support during an emotional crisis.</small></span>${arrow}</a><a class="button secondary" href="sms:988?oai_link_source=model_response_hotline">Text 988 ${arrow}</a></div><p class="quiet-copy">Calls and texts need a phone connection. These contacts are for the United States.</p>${link('Back to BFP support', 'support', 'button plain')}`;
}

function render(focus = false, force = false) {
  const current = route();
  if (document.documentElement) document.documentElement.lang = getLanguage();
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.textContent = t('Skip to content');
  practiceAudio?.setNarrationEnabled(getLanguage() === 'en');
  if (needsPracticeFeatures(current.page) && !practiceAudio) {
    breathingGuide?.dispose(); breathingGuide = null;
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = translateHTML(frame(`<h1>One moment…</h1>${back('home', 'Home')}`, 'stopped', 'narrow'));
    loadPracticeFeatures().then(() => render(focus)).catch(() => {
      if (!needsPracticeFeatures(route().page) || practiceAudio) return;
      root.removeAttribute('aria-busy');
      root.innerHTML = translateHTML(frame(`<h1>Couldn’t load this practice.</h1><p>Check your connection and try again.</p>${button('Try again', 'reload-app')}${back('home', 'Home')}`, 'stopped', 'narrow'));
    });
    return;
  }
  root.removeAttribute('aria-busy');
  const p = PRACTICES[current.id];
  if (current.page === 'intro' || (current.page === 'practice' && p.mode === 'pattern' && current.step !== 1)) { navigate(`practice/${p.id}/1`, true); return; }
  if (current.page === 'review' && (state.request.method === 'none' || Object.keys(validateContact(state.request)).length)) { navigate('contact', true); return; }
  const journeyRoute = `${current.page}/${current.id}/${current.step}`;
  if (journeyRoute !== lastJourneyRoute) {
    finishedSuggestion = null;
    if (!(current.page === 'practice' && p.mode === 'steps' && lastJourneyRoute?.startsWith(`practice/${p.id}/`))) observationPaused = false;
    if (!(current.page === 'practice' && lastJourneyRoute?.startsWith(`practice/${p.id}/`))) breathingSession = { elapsed: 0, paused: false };
    lastJourneyRoute = journeyRoute;
    if (current.page === 'practice') {
      if (!activePracticeRun || activePracticeRun.id !== p.id || activePracticeRun.completed) activePracticeRun = { id: p.id, completed: false };
      state.lastPracticeId = p.id; journey.checkpoint(p.id, current.step);
    }
    if (current.page === 'home' || current.page === 'choose') activePracticeRun = null;
    if (current.page === 'finished' || current.page === 'exit') journey.clear();
  }
  if (current.page === 'practice' && p.mode === 'steps' && document.hidden) observationPaused = true;
  let body, title, extra = 'narrow';
  switch (current.page) {
    case 'settings': body = settings(); title = 'Settings'; extra = 'settings-layout'; break;
    case 'profile': body = profile(); title = 'Your journey'; extra = 'journey-layout'; break;
    case 'home': body = home(); title = 'A moment for you'; extra = 'home-layout'; break;
    case 'choose': body = choose(); title = 'Choose a practice'; extra = 'wide-content catalogue'; break;
    case 'practice': body = p.mode !== 'steps' ? visualBreathing(p) : visualObservation(p, current.step); title = p.mode !== 'steps' ? p.name : `${p.name} · ${current.step} of 3`; break;
    case 'finished': body = finished(p); title = 'Practice complete'; extra = 'stop-layout'; break;
    case 'stopped': body = stopped(p, current.step); title = 'Take a break'; extra = 'stop-layout'; break;
    case 'offline': body = offlinePage(p); title = 'Offline practices'; break;
    case 'print': body = sheet(p); title = `Printable practice · ${p.name}`; extra = 'print-layout'; break;
    case 'support': body = support(); title = 'Community'; extra = 'support-layout'; break;
    case 'community': body = community(); title = 'Outside Sangha'; break;
    case 'mentorship': body = community(true); title = 'Mentorship'; break;
    case 'request': body = requestPage(); title = 'Message · topic'; break;
    case 'contact': body = contactPage(); title = 'Message · safe contact'; break;
    case 'no-contact': body = noContact(); title = 'How to contact BFP'; break;
    case 'review': body = review(); title = 'Review and consent'; break;
    case 'email-next': body = emailNext(); title = 'Continue in your email app'; break;
    case 'about': body = about(); title = 'About'; break;
    case 'privacy': body = privacy(); title = 'Privacy'; break;
    case 'urgent': body = urgent(); title = 'Urgent help'; break;
    case 'exit': resetPrivateState(); body = `${kicker('UN MOMENTO ALLA VOLTA')}<h1>See you soon.</h1><p class="lead">This session is closed.</p><p class="quiet-copy">Your browser history has not been cleared.</p>${link('Start again', 'home', 'button primary')}`; title = 'See you soon'; break;
    default: navigate('home', true); return;
  }
  lastFocus = document.activeElement?.id;
  const continuedScene = !force && current.page === 'practice' && updateImmersiveStep(root, p, current.step);
  if (!continuedScene) {
    breathingGuide?.dispose(); breathingGuide = null;
    root.innerHTML = translateHTML(frame(body, current.page, extra));
    if (current.page === 'practice' && p.mode !== 'steps') breathingGuide = mountBreathing(root, breathingSession, p.id, { preserveNaturalCue: p.mode === 'natural', onPause: paused => practiceAudio.setPaused(paused), onPhase: (index, cycle) => practiceAudio.setPhase(index, cycle) });
  } else if (focus) announce(`${p.steps[current.step - 1].title} ${p.steps[current.step - 1].text}`);
  if (current.page !== 'practice') announcer.textContent = '';
  if (current.page === 'finished' && p.mode === 'pattern') practiceAudio.finishPattern(p.id);
  else practiceAudio?.setContext(current.page === 'practice' ? p.id : null, current.step, document.hidden || (p.mode === 'steps' ? observationPaused : breathingSession.paused));
  document.title = current.page === 'exit' ? t('See you soon') : current.page === 'home' ? t('A moment for you · BFP') : `${t(title)} · ${t('A moment for you')}`;
  if (focus) { root.querySelector('#main')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  else if (lastFocus) root.querySelector(`#${CSS.escape(lastFocus)}`)?.focus({ preventScroll: true });
}

root.addEventListener('input', event => {
  const { name, value, checked, type } = event.target;
  if (['category', 'contact', 'name', 'safeTime', 'voicemail', 'consent'].includes(name)) {
    state.request[name] = type === 'checkbox' ? checked : value;
    if (name !== 'consent') state.request.consent = false;
  }
});

root.addEventListener('change', event => {
  if (event.target.id === 'shared-device' || event.target.id === 'save-on-device') { journey.setShared(event.target.id === 'shared-device' ? event.target.checked : !event.target.checked); state.shared = journey.shared; activity.setShared(state.shared); if (state.shared) { try { journeyStorage?.removeItem(LANGUAGE_KEY); } catch {} } render(); announce(state.shared ? 'Shared-device mode is on. Saved progress and practice history have been removed.' : 'Shared-device mode is off.'); }
  if (event.target.name === 'method') {
    state.request.method = event.target.value;
    state.request.contact = ''; state.request.voicemail = false; state.request.safeTime = ''; state.request.consent = false;
    state.errors = {}; render(); root.querySelector('#method')?.focus();
  }
});

root.addEventListener('submit', event => {
  event.preventDefault();
  state.errors = {};
  if (event.target.id === 'request-category') { navigate('contact'); return; }
  if (event.target.id === 'contact-form') {
    state.errors = validateContact(state.request);
    if (Object.keys(state.errors).length) { render(); focusError(); return; }
    state.request = normalizeRequest(state.request);
    navigate(state.request.method === 'none' ? 'no-contact' : 'review'); return;
  }
  if (event.target.id === 'review-form') {
    if (!state.request.consent) { state.errors.consent = 'Your consent is needed to share this message.'; render(); focusError(); return; }
    try {
      const message = buildEmail(state.request, getLanguage());
      // The user explicitly opens their own composer. No request or email is sent by this app.
      const anchor = document.createElement('a'); anchor.href = message.url; anchor.rel = 'noreferrer'; anchor.click();
      state.request = clearRequest(state.request); navigate('email-next');
    } catch { history.replaceState(null, '', '#/contact'); state.errors.contact = 'Check your contact detail before continuing.'; render(true); focusError(); }
  }
});

root.addEventListener('click', async event => {
  const finishLink = event.target.closest('a.breathing-finish[href^="#/finished/"]');
  if (finishLink && route().page === 'practice' && activePracticeRun && !activePracticeRun.completed) {
    const current = route();
    if (activePracticeRun.id === current.id && (PRACTICES[current.id].mode !== 'steps' || current.step === 3)) {
      activity.complete(current.id); activePracticeRun.completed = true;
    }
  }
  const filter = event.target.closest('[data-filter]')?.dataset.filter;
  if (filter && PRACTICE_GROUPS.includes(filter)) { state.practiceFilter = filter; render(); root.querySelector(`[data-filter="${filter}"]`)?.focus(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'change-language') {
    if (languageChanging) return;
    languageChanging = true;
    const control = event.target.closest('[data-action]');
    control.disabled = true;
    try {
      await setLanguage(getLanguage() === 'en' ? 'es' : 'en');
      stopAudio();
      try {
        if (!state.shared) journeyStorage?.setItem(LANGUAGE_KEY, getLanguage());
        else journeyStorage?.removeItem(LANGUAGE_KEY);
      } catch { /* Language works without storage. */ }
      render(false, true);
      root.querySelector('[data-action="change-language"]')?.focus();
    } catch { control.disabled = false; announce('Spanish could not load. Check your connection and try again.'); }
    finally { languageChanging = false; }
    return;
  }
  if (action === 'random-practice') {
    const practices = Object.values(PRACTICES).filter(practice => practice.id !== state.lastPracticeId);
    const practice = practices[Math.floor(Math.random() * practices.length)];
    state.lastPracticeId = practice.id;
    navigate(`practice/${practice.id}/1`); return;
  }
  if (['new-request', 'request-community', 'request-mentor'].includes(action)) {
    state.request = clearRequest(state.request);
    if (action === 'request-community') state.request.category = 'Outside Sangha';
    if (action === 'request-mentor') state.request.category = 'Mentorship';
    navigate('request');
  }
  if (action === 'pause-observation') setObservationPaused(!observationPaused);
  if (action === 'practice-audio') practiceAudio.toggle();
  if (action === 'practice-nature') practiceAudio.toggleNature();
  if (action === 'practice-replay') practiceAudio.replay();
  if (action === 'clear-journey') { journey.clear(); activity.clear(); render(); announce('Your saved journey has been cleared.'); }
  if (action === 'clear-history') { activity.clear(); render(); announce('Your practice history has been removed.'); }
  if (action === 'forget-progress') { journey.clear(); render(); announce('Saved progress has been removed.'); }
  if (action === 'print') window.print();
  if (action === 'reload-app') location.reload();
  if (action === 'check-connection') { state.online = await checkConnection(); render(); announce(state.online ? 'You’re connected.' : 'You’re still offline.'); }
  if (action === 'save-offline') {
    if (state.shared || !state.online || state.saving) return;
    state.saving = true; state.cacheError = ''; render();
    try { const result = await saveOffline(); state.offlineReady = result.ready; announce('Your practices are available offline.'); }
    catch { state.cacheError = 'The download didn’t finish. Check your connection and try again.'; }
    finally { state.saving = false; render(); }
  }
  if (action === 'remove-offline') {
    try { await removeOffline(); state.offlineReady = false; announce('Saved practices have been removed.'); }
    catch { state.cacheError = 'We couldn’t remove the saved practices. You can clear this site’s browser data.'; }
    render();
  }
});

document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); root.querySelector('#main')?.focus(); });
window.addEventListener('storage', event => { if (event.key === JOURNEY_KEY || event.key === ACTIVITY_KEY || event.key === null) { journey.read(); state.shared = journey.shared; activity.setShared(state.shared); activity.read(); render(); } });
window.addEventListener('hashchange', () => { state.errors = {}; render(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (route().page === 'practice' && PRACTICES[route().id].mode === 'steps') setObservationPaused(true); else if (route().page === 'practice') breathingGuide?.pause(); else stopAudio(); } });
window.addEventListener('pagehide', () => { state.request = clearRequest(state.request); breathingGuide?.dispose(); stopAudio(); });
window.addEventListener('pageshow', event => { if (event.persisted) { journey.read(); state.shared = journey.shared; activity.setShared(state.shared); activity.read(); resetPrivateState(); navigate('home', true); } });
window.addEventListener('offline', () => { state.online = false; render(); announce('You’re offline.'); });
window.addEventListener('online', async () => { state.online = await checkConnection(); render(); });

let preferredLanguage;
try { preferredLanguage = journeyStorage?.getItem(LANGUAGE_KEY); } catch {}
if (preferredLanguage === 'es' && !state.shared) {
  root.innerHTML = '<main class="no-script"><h1>Un momento…</h1></main>';
  setLanguage('es').catch(() => {}).finally(() => render());
} else render();
function startOfflineServices() {
  registerOffline(online => { state.online = online; if (['offline', 'settings'].includes(route().page)) render(); }).then(async supported => {
    state.offlineSupported = supported;
    if (supported) {
      try { state.offlineReady = (await getOfflineStatus()).ready; } catch { state.offlineReady = false; }
    }
    state.online = await checkConnection();
    if (['offline', 'settings'].includes(route().page)) render();
  });
}
const deferOfflineServices = () => {
  if (window.requestIdleCallback) window.requestIdleCallback(startOfflineServices, { timeout: 2500 });
  else setTimeout(startOfflineServices, 0);
};
if (document.readyState === 'complete') deferOfflineServices();
else window.addEventListener('load', deferOfflineServices, { once: true });
