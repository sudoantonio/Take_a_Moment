import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLanguage, getLanguage, translateHTML, languageToggle } from '../dist/i18n.js';
import { PRACTICES } from '../dist/content.js';
import { buildEmail } from '../dist/contact.js';

test('all 21 names, descriptions and 63 practice moments have Spanish translations', async () => {
  await setLanguage('es');
  for (const p of Object.values(PRACTICES)) {
    for (const value of [p.name, p.description, p.invitation, ...p.steps.flatMap(step => [step.title, step.text])]) {
      assert.notEqual(t(value), value, `${p.id}: ${value}`);
      assert.ok(t(value).trim().length);
    }
  }
  assert.equal(t('Step 2 of 3'), 'Paso 2 de 3');
  assert.equal(t('Complete 20 practices'), 'Completa 20 prácticas');
  assert.equal(t('6 of 10 practices completed'), '6 de 10 prácticas completadas');
  await setLanguage('en');
  assert.equal(t('Practice now'), 'Practice now');
});

test('translation preserves route IDs, category values, SVGs and personal text safely', async () => {
  await setLanguage('es');
  const html = '<a href="#/practice/body/1" aria-label="Previous step">Back</a><select><option value="Mentorship">Mentorship</option></select><input value="Home" placeholder="For example: afternoons"><dd translate="no">Home &amp; Next &lt;script&gt;</dd><svg><path d="M1 2"/><g><text>12</text></g></svg><p>Data &amp; saving</p>';
  const result = translateHTML(html);
  assert.match(result, /href="#\/practice\/body\/1" aria-label="Paso anterior">Atrás/);
  assert.match(result, /value="Mentorship">Acompañamiento/);
  assert.match(result, /value="Home" placeholder="Por ejemplo: por las tardes"/);
  assert.match(result, /translate="no">Home &amp; Next &lt;script&gt;/);
  assert.match(result, /<path d="M1 2"\/>/);
  assert.match(result, /<p>Datos y almacenamiento<\/p>/);
  assert.match(languageToggle(), /🇪🇸/);
  assert.equal(await setLanguage('invalid'), false);
  assert.equal(getLanguage(), 'es');
  await setLanguage('en');
  assert.equal(translateHTML(html), html);
});

test('Spanish email drafts preserve consent, canonical categories and exact personal details', async () => {
  await setLanguage('es');
  const input = { category: 'Mentorship', method: 'phone', contact: '+1 916 555 0101', name: 'Home', safeTime: 'Next', consent: true, voicemail: false };
  const email = buildEmail(input, 'es');
  assert.match(email.subject, /Acompañamiento/);
  assert.match(email.body, /llamaran: Home/);
  assert.match(email.body, /contactarme: Next/);
  assert.match(email.body, /NO permitidos/);
  assert.match(email.body, /Doy mi consentimiento/);
  assert.throws(() => buildEmail({ ...input, consent: false }, 'es'), /CONSENT_REQUIRED/);
  assert.equal(input.category, 'Mentorship');
  await setLanguage('en');
});
