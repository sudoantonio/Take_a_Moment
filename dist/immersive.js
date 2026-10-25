import { t } from './i18n.js';
import { sceneArt } from './scenes.js';

// Each practice has a setting of its own. The SVG stays mounted across its three
// cues: changing data-step moves attention without restarting the whole scene.
const settings = {
  breath: 'breath', 'breath-478': 'rhythm', box: 'rhythm',
  body: 'body', stretch: 'body', stool: 'body', stop: 'pause',
  observe: 'garden', clouds: 'sky', listening: 'sound', focus: 'focus',
  kindness: 'warmth', compassion: 'warmth', hug: 'warmth', gratitude: 'warmth',
  'wash-hands': 'water', transition: 'path', intention: 'dawn',
  eating: 'table', morning: 'dawn', door: 'threshold',
};
export function immersiveSetting(id) {
  if (!settings[id]) throw new Error(`Missing immersive setting: ${id}`);
  return settings[id];
}
const smile = '<path d="M-22-6q8 12 16 0m12 0q8 12 16 0M-15 16q15 13 30 0" fill="none" stroke="#262820" stroke-width="5" stroke-linecap="round"/>';
const cloud = '<path d="M-100 20c-35-52 30-112 78-76C-1-110 87-91 88-35c63-9 95 82 20 88H-75c-34 0-49-16-25-33Z"/>';
const companion = (x, y, color, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-64 80C-78 25-91-39-50-72-14-105 46-91 64-51 87-9 68 34 68 80Z" fill="${color}"/><g transform="translate(0 -3)">${smile}</g></g>`;
const heart = (x, y, scale = 1, color = '#f5aad0') => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 52C-112-8-61-89 0-43 61-89 112-8 0 52Z" fill="${color}"/></g>`;
const leaf = '<path d="M0 0C-79-4-103-62-76-97 53-79 17-8 0 0Z"/>';

export function immersiveBackdrop(id) {
  const setting = immersiveSetting(id);
  const backdrops = {
    breath: '<g class="world-orbits" fill="none" stroke="currentColor"><ellipse cx="300" cy="340" rx="290" ry="290"/><ellipse cx="300" cy="340" rx="370" ry="370"/><ellipse cx="300" cy="340" rx="460" ry="460"/></g>',
    rhythm: '<path d="M-50 170Q180 40 330 130T690 90M-80 690Q110 560 330 640T700 610" fill="none" stroke="currentColor" stroke-width="2"/>',
    body: '<path d="M-100 510Q70 340 190 480T700 430V1000H-100Z" fill="#c3d2bd"/><path d="M-60 740Q190 630 360 730T690 660V1000H-60Z" fill="#b1c6a9"/>',
    pause: '<path d="M-80 490Q210 360 640 530V1000H-80Z" fill="#e6d9c5"/><path d="M-80 760Q290 620 680 710" fill="none" stroke="#d5c6ac" stroke-width="3"/>',
    garden: '<path d="M-70 500Q80 380 290 500T680 430V1000H-70Z" fill="#c5d7b7"/><path d="M-50 700Q160 590 340 690T680 600V1000H-50Z" fill="#a5c095"/>',
    sky: '<g class="world-cloud world-cloud-far" fill="#fffef9" opacity=".55" transform="translate(550 180) scale(1.5)">'+cloud+'</g><path d="M-50 760Q140 640 330 770T680 710V1000H-50Z" fill="#b9d3bf"/>',
    sound: '<g class="world-waves" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="300" cy="330" rx="225" ry="240"/><ellipse cx="300" cy="330" rx="310" ry="330"/><ellipse cx="300" cy="330" rx="400" ry="425"/></g>',
    focus: '<g class="world-periphery" fill="#adc1c4"><path d="m-30 160 110-70 25 140Z"/><path d="m535 500 130-25-15 120-100-7Z"/><ellipse cx="30" cy="760" rx="90" ry="50"/></g>',
    warmth: '<path d="M-80 410Q60 280 155 410T685 400V1000H-80Z" fill="#f4d3ac"/><path d="M-70 740Q190 610 390 700T690 620V1000H-70Z" fill="#edbd8b"/>',
    water: '<g class="world-water" fill="none" stroke="#8bbcc9" stroke-width="3"><path d="M-90 190Q60 120 210 190T680 190M-90 220Q60 150 210 220T680 220M-90 720Q60 650 210 720T680 720M-90 750Q60 680 210 750T680 750"/></g>',
    path: '<path class="world-path" d="M440 1000C90 750 460 650 305 470S200 210 360-100" fill="none" stroke="#c7d1b3" stroke-width="190"/>',
    dawn: '<path d="M-60 620Q110 390 330 570T690 540V1000H-60Z" fill="#d7c28d"/><path d="M-60 740Q190 540 400 700T690 660V1000H-60Z" fill="#a9bd99"/>',
    table: '<path d="M-80 460Q310 400 690 460V1000H-80Z" fill="#e9cba7"/><path d="M-60 700 660 670M-60 910 660 880" stroke="#dcb994" stroke-width="2"/>',
    threshold: '<path d="M-60 720 180 430h240l240 290v280H-60Z" fill="#e7d5b5"/><path d="M300 470v530M180 620h240" stroke="#d5c29f" stroke-width="2"/>',
  };
  return `<div class="immersive-world" aria-hidden="true"><svg viewBox="0 0 600 900" preserveAspectRatio="none">${backdrops[setting]}</svg></div>`;
}

function artwork(id) {
  switch (id) {
    case 'breath': return `<g transform="translate(30 -50) scale(1.5)"><g class="breathing-orb">${sceneArt(id).replaceAll('#1359df', '#ffd43b').replaceAll('#f5aad0', '#f68a36')}</g></g>`;
    case 'breath-478': case 'box': return `<g transform="translate(30 -50) scale(1.5)"><g class="breathing-orb">${sceneArt(id)}</g></g>`;
    case 'body': return `<ellipse cx="300" cy="407" rx="135" ry="16" fill="#819d80" opacity=".25"/><g class="body-person"><path d="M252 166Q219 172 207 224l-23 76q-5 17 10 20t22-14l30-64-5 83-17 71q-3 15 12 17t21-11l43-81 43 81q7 13 21 10t11-17l-17-71-5-83 30 64q8 17 22 14t10-20l-23-76q-12-52-45-58Z" fill="#5b947b"/><path d="M250 100c-1-67 100-67 100 0l-5 39c-6 53-83 53-90 0Z" fill="#ffd43b"/><g transform="translate(300 112)">${smile}</g></g><g class="attention-halo"><ellipse cx="300" cy="117" rx="79" ry="73" fill="#fffef9" fill-opacity=".12"/><ellipse cx="300" cy="117" rx="79" ry="73" stroke="#1359df" stroke-width="4" fill="none"/><circle cx="379" cy="117" r="8" fill="#1359df"/></g>`;
    case 'clouds': return `<circle class="sky-sun" cx="442" cy="115" r="61" fill="#ffd43b"/><g class="cloud-back" transform="translate(90 90) scale(.6)" fill="#fffef9" opacity=".6">${cloud}</g><g class="cloud-journey"><g transform="translate(292 224) scale(1.35)" fill="#fffef9">${cloud}<g transform="translate(0 4) scale(.7)">${smile}</g></g></g><g class="cloud-near" transform="translate(542 382) scale(1.4)" fill="#fffef9" opacity=".65">${cloud}</g>`;
    case 'observe': return `<g class="garden-distance"><circle cx="442" cy="97" r="46" fill="#ffd43b"/></g><g class="garden-plant"><path d="M300 344V133" stroke="#325b47" stroke-width="9" stroke-linecap="round"/><g class="garden-leaf-left" transform="translate(300 280)" fill="#447653">${leaf}</g><g class="garden-leaf-right" transform="translate(300 227) rotate(95)" fill="#5b947b">${leaf}</g><path d="m236 313 128-4-18 98-91 3-19-97Z" fill="#f68a36"/><g transform="translate(301 357) scale(.65)">${smile}</g><path d="m291 196 9 6 32-32" stroke="#ffd43b" stroke-width="4" fill="none" stroke-linecap="round"/></g><g class="garden-detail" fill="none" stroke="#1359df" stroke-width="4" stroke-linecap="round"><path d="M189 210v-24h24m174 0h24v24M189 288v24h24m174 0h24v-24"/></g>`;
    case 'stretch': return `<ellipse cx="300" cy="410" rx="130" ry="15" fill="#819d80" opacity=".22"/><path d="M257 178q43-22 86 0l5 99-16 119q-2 17-17 17t-17-16l2-90-3 90q-2 16-17 16t-18-17l-16-119Z" fill="#1359df"/><path d="M251 105c-7-72 99-80 99-8l-5 40c-5 52-83 56-90 3Z" fill="#ffd43b"/><g transform="translate(300 116)">${smile}</g><g class="stretch-limb left-limb"><path d="M263 207 197 156" stroke="#1359df" stroke-width="24" stroke-linecap="round"/><circle cx="197" cy="156" r="13" fill="#ffd43b"/></g><g class="stretch-limb right-limb"><path d="M337 207 403 156" stroke="#1359df" stroke-width="24" stroke-linecap="round"/><circle cx="403" cy="156" r="13" fill="#ffd43b"/></g><g class="stretch-space" stroke="#829e7a" stroke-width="3" fill="none"><path d="M136 321Q76 229 139 121M464 321q60-92-3-200"/></g>`;
    case 'wash-hands': return `<path d="M119 59h151q30 0 30 29v33" stroke="#1359df" stroke-width="29" stroke-linecap="round"/><path d="M136 35v48" stroke="#1359df" stroke-width="13" stroke-linecap="round"/><g class="wash-flow" stroke="#70afc8" stroke-width="7" stroke-linecap="round"><path d="M280 153v78m20-89v112m20-100v73"/></g><g class="wash-palms"><path d="M115 283c29-20 74-11 105-14l112-58q19-8 26 5t-7 24l-39 30 92-18q23-5 27 10t-17 23l-90 35q-46 12-93 1l-79 13Z" fill="#f68a36"/><path d="m485 311-83-20-102-42q-19-8-25 7t12 26l42 22-90-3q-23 0-24 16t24 19l94 20q46 4 86-16l53 15Z" fill="#ffd43b"/><path d="m267 288 38 5m27 23 40 4" stroke="#ce692d" stroke-width="4" stroke-linecap="round" fill="none"/></g><g class="wash-bubbles" fill="#fffef9"><circle cx="249" cy="228" r="15"/><circle cx="332" cy="209" r="11"/><circle cx="368" cy="184" r="7"/></g><g class="wash-ripples" stroke="#77aebe" stroke-width="3" fill="none"><ellipse cx="300" cy="367" rx="155" ry="30"/><ellipse cx="300" cy="367" rx="207" ry="48"/></g>`;
    case 'stop': return `<g class="pause-rings" fill="none" stroke="#b5a48b" stroke-width="2"><circle cx="300" cy="215" r="183"/><circle cx="300" cy="215" r="142"/></g><path d="M210 315c-28-87-21-170 24-196 67-43 149-7 158 69 4 41-3 84-16 127Z" fill="#f68a36"/><g class="stop-attention"><g transform="translate(300 206) scale(1.15)">${smile}</g><path d="M266 259q34 14 68 0" stroke="#c2632b" stroke-width="4" fill="none" stroke-linecap="round"/></g><g class="stop-pause-mark" stroke="#fffef9" stroke-width="16" stroke-linecap="round"><path d="M280 178v48m40-48v48"/></g><path class="pause-way" d="M300 367q-3-36-63-34m63 34q3-36 63-34" stroke="#1359df" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    case 'transition': return `<path d="M215 460C76 337 402 340 308 207S212 72 387-30" stroke="#bac8a6" stroke-width="105" fill="none" stroke-linecap="round"/><g class="journey-stone journey-stone-one"><path d="m211 341 24-19q14-5 22 10l9 22q5 15-11 20l-29 3q-18-1-15-18Z" fill="#1359df"/></g><g class="journey-stone journey-stone-two"><path d="m312 248 25-12q20-1 24 16l2 24q-2 14-18 15l-27-9q-14-7-6-34Z" fill="#f68a36"/></g><g class="journey-stone journey-stone-three"><path d="m278 120 28-16q17-5 23 11l5 27q0 16-16 17l-31-7q-14-5-9-32Z" fill="#ffd43b"/></g><g class="path-arrival" transform="translate(389 45)"><path d="M-27 8Q-34-25 0-26 32-25 27 8l-4 22h-48Z" fill="#1359df"/><g transform="scale(.6)">${smile.replace('#262820','#fffef9')}</g></g>`;
    case 'kindness': return `<g class="kindness-ripples" fill="none" stroke="#e79c5d" stroke-width="2"><ellipse cx="300" cy="225" rx="155" ry="137"/><ellipse cx="300" cy="225" rx="216" ry="180"/></g><g class="kindness-from">${companion(201,256,'#f68a36',.93)}</g><g class="kindness-to">${companion(411,236,'#ffd43b',1.1)}</g><g class="kindness-offering">${heart(275,105,.52,'#1359df')}</g><path d="M164 365q135 34 287-2" stroke="#c18b5d" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'compassion': return `<g class="care-shelter" stroke="#cf9666" stroke-width="3" fill="none"><path d="M122 306C35 70 306-31 463 134M151 322C68 103 304 2 440 152"/></g><g class="compassion-self">${companion(300,232,'#ffd43b',1.23)}<g class="compassion-heart">${heart(300,269,.46,'#1359df')}</g></g><g class="compassion-arms" stroke="#f68a36" stroke-width="29" stroke-linecap="round" fill="none"><path d="M182 240q12 76 100 79m136-79q-12 76-100 79"/></g>`;
    case 'hug': return `<g class="hug-space" fill="none" stroke="#d2a374" stroke-width="3"><ellipse cx="300" cy="239" rx="221" ry="170"/></g><g class="hug-one">${companion(193,240,'#f68a36',1.08)}</g><g class="hug-two">${companion(407,240,'#ffd43b',1.08)}</g><g class="hug-arms" stroke="#1359df" stroke-width="21" stroke-linecap="round" fill="none"><path d="M229 257q70 88 143 0"/></g><g class="hug-care">${heart(300,91,.43,'#1359df')}</g><path d="M130 363q170 28 340 0" stroke="#c79b70" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'gratitude': return `<g class="gratitude-petals" fill="#f68a36"><path d="M130 171C55 150 52 99 95 102c47 7 52 49 35 69Z"/><path d="M455 279c78-27 105 28 70 51-46 14-75-18-70-51Z"/><path d="M415 93c-34-59 13-92 43-61 19 31-9 58-43 61Z"/></g><g class="gratitude-center"><path d="M297 92c23-51 81-29 77 17 55-9 84 43 50 78 51 28 32 92-18 93 12 53-40 83-78 51-31 47-91 30-90-20-55 5-76-49-39-83-43-37-12-90 36-80-4-52 43-75 62-56Z" fill="#ffd43b"/><g transform="translate(300 216) scale(1.2)">${smile}</g></g><g class="gratitude-small" transform="translate(113 332) rotate(-15)"><path d="M0 0c-41-6-50-41-31-57C10-51 14-19 0 0Z" fill="#5b947b"/><path d="m-18-33 23 45" stroke="#325b47" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    case 'intention': return `<path d="M147 357q151 23 306-1" stroke="#b6a66b" stroke-width="6" stroke-linecap="round" fill="none"/><g class="intention-seed"><path d="M269 313c-10-42 55-50 63-9 6 34-50 45-63 9Z" fill="#f68a36"/><path class="intention-stem" d="M300 307V136" stroke="#447653" stroke-width="9" stroke-linecap="round"/><g class="intention-leaves" fill="#5b947b"><path d="M298 227c-73 1-106-52-79-84 66 1 90 42 79 84Z"/><path d="M304 190c-12-68 34-109 74-87 5 58-26 87-74 87Z"/></g><g class="intention-bud">${heart(301,107,.45,'#ffd43b')}</g></g><path class="intention-reach" d="M115 319Q68 179 180 97M485 319q47-140-65-222" fill="none" stroke="#b6a66b" stroke-width="3" stroke-linecap="round"/>`;
    case 'eating': return `<ellipse cx="300" cy="261" rx="198" ry="133" fill="#fffef9"/><ellipse cx="300" cy="261" rx="161" ry="101" stroke="#dcc7aa" stroke-width="3" fill="none"/><path d="M71 156v203m-15-198v49q15 21 30 0v-49M529 156v203m0-203c-26 31-26 82 0 82" stroke="#fffef9" stroke-width="9" stroke-linecap="round" fill="none"/><g class="meal-detail"><path d="M249 281c-49-11-70-58-46-91 22-31 52-19 68-18 31-32 77-12 76 25 28 54-47 108-98 84Z" fill="#f68a36"/><path d="M275 169c-9-40 27-71 60-55-5 37-35 58-60 55Z" fill="#5b947b"/><path d="M227 228q39 25 68-10" stroke="#ffd43b" stroke-width="8" stroke-linecap="round" fill="none"/></g><g class="meal-bite"><path d="M372 268c-9-22 9-42 28-39l24 10-16 34q-22 12-36-5Z" fill="#ffd43b"/><path d="m384 248 18 8" stroke="#f68a36" stroke-width="3" stroke-linecap="round"/></g>`;
    case 'morning': return `<g class="morning-rise"><circle cx="300" cy="207" r="96" fill="#ffd43b"/><g transform="translate(300 207) scale(1.2)">${smile}</g></g><g class="dawn-rays" stroke="#e5b34c" stroke-width="5" stroke-linecap="round"><path d="M300 12v25M117 95l20 16m346-16-20 16M78 234h25m394 0h25"/></g>`;
    case 'stool': return `<g class="seat-ground" fill="none" stroke="#5b947b" stroke-width="3"><ellipse cx="300" cy="400" rx="158" ry="23"/><ellipse cx="300" cy="400" rx="210" ry="42"/></g><path d="M222 267h158v30H222Z" fill="#f68a36"/><path d="m243 296-12 102m126-102 12 102" stroke="#b96a38" stroke-width="14" stroke-linecap="round"/><g class="seated-friend"><path d="M238 240c-30-75-14-145 47-155 78-14 103 75 63 155Z" fill="#ffd43b"/><g transform="translate(294 158) scale(1.05)">${smile}</g><path d="M246 242h92q30 0 30 31v109m-93-140v140" stroke="#1359df" stroke-width="25" stroke-linecap="round" fill="none"/><path d="M258 393h28m64 0h28" stroke="#262820" stroke-width="12" stroke-linecap="round"/></g>`;
    case 'door': return `<path d="M178 402V61q0-15 15-15h214q15 0 15 15v341" fill="#b2c5aa"/><path d="M199 402V69h202v333" fill="#fffef9"/><g class="door-view"><circle cx="329" cy="158" r="50" fill="#ffd43b"/><path d="M200 292q100-85 200-18v128H200Z" fill="#a9c5a6"/><path d="M200 354q94-72 200-18v66H200Z" fill="#719c73"/></g><g class="door-light"><path d="M214 269h172l117 158H97Z" fill="#ffd43b" fill-opacity=".35"/></g><g class="door-panel"><path d="m199 70 135 38v294H199Z" fill="#1359df"/><path d="m220 105 91 23v233h-91Z" fill="none" stroke="#3877eb" stroke-width="3"/><ellipse cx="312" cy="261" rx="7" ry="10" fill="#ffd43b"/></g><path d="M157 405h286" stroke="#9aab8f" stroke-width="7" stroke-linecap="round"/>`;
    case 'listening': return `<g class="listening-waves" fill="none" stroke="#a597b4" stroke-width="3"><path d="M135 143q-69 83 0 166M98 111q-105 115 0 230M465 143q69 83 0 166M502 111q105 115 0 230"/></g><g class="listening-friend"><path d="M222 268c-40-77-21-158 49-177 84-20 133 70 104 163l-11 66H233Z" fill="#ffd43b"/><g transform="translate(301 203) scale(1.18)">${smile}</g><path d="M207 224v-49c0-115 186-115 186 0v49" stroke="#1359df" stroke-width="18" stroke-linecap="round" fill="none"/><path d="M207 199v62m186-62v62" stroke="#1359df" stroke-width="36" stroke-linecap="round"/></g><g class="listening-levels" stroke="#f68a36" stroke-width="9" stroke-linecap="round"><path d="M242 373v12m29-26v40m29-52v64m29-52v40m29-26v12"/></g>`;
    case 'focus': return `<g class="focus-outer" fill="none" stroke="#91aaaa" stroke-width="3"><ellipse cx="300" cy="222" rx="173" ry="161"/><ellipse cx="300" cy="222" rx="224" ry="205"/></g><g class="focus-distractions"><path d="m112 102 36 21-13 52-49-13Z" fill="#5b947b"/><path d="m458 104 49 57-70 10Z" fill="#ffd43b"/><path d="M110 331c-21-31 35-55 48-23 12 30-25 48-48 23Z" fill="#f68a36"/><path d="m438 338 43-25 24 44-46 15Z" fill="#7e98d2"/></g><g class="focus-center"><path d="M218 293c-34-71-29-155 38-174 90-34 136 46 123 121l-11 76-138 2Z" fill="#1359df"/><g transform="translate(299 217) scale(1.2)">${smile.replace('#262820','#fffef9')}</g></g>`;
    default: throw new Error(`Missing immersive artwork: ${id}`);
  }
}

export function immersiveScene(id) {
  immersiveSetting(id);
  return `<div class="immersive-viewport" aria-hidden="true"><svg class="immersive-art art-${id}" viewBox="0 0 600 460" fill="none">${artwork(id)}</svg></div>`;
}

// Keep the scene and its animation clocks alive while routes advance.
export function updateImmersiveStep(container, practice, step) {
  const shell = container.querySelector('.immersive-shell');
  if (!shell || shell.dataset.practice !== practice.id || practice.mode === 'pattern') return false;
  const cue = practice.steps[step - 1];
  if (!cue) return false;
  shell.dataset.step = String(step);
  container.querySelector('#practice-cue').textContent = t(cue.title);
  container.querySelector('#practice-detail').textContent = t(cue.text);
  const dots = container.querySelector('.observation-dots');
  dots.setAttribute('aria-label', t(`Step ${step} of 3`));
  dots.querySelectorAll('span').forEach((dot, index) => dot.classList.toggle('current', index === step - 1));
  const next = container.querySelector('.breathing-finish');
  next.setAttribute('href', `#/${step === 3 ? `finished/${practice.id}` : `practice/${practice.id}/${step + 1}`}`);
  next.querySelector('span').textContent = t(step === 3 ? 'Finish' : 'Next');
  const previous = container.querySelector('.practice-previous');
  if (previous) {
    if (step > 1) {
      previous.setAttribute('href', `#/practice/${practice.id}/${step - 1}`);
      previous.removeAttribute('aria-disabled');
      previous.removeAttribute('tabindex');
    } else {
      previous.removeAttribute('href');
      previous.setAttribute('aria-disabled', 'true');
      previous.setAttribute('tabindex', '-1');
    }
  }
  container.querySelector('.close-practice').setAttribute('href', `#/stopped/${practice.id}/${step}`);
  return true;
}
