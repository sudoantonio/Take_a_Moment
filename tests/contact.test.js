import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRequest, normalizeRequest, validateContact, buildEmail, clearRequest } from '../dist/contact.js';

test('sharing contact details requires explicit consent', () => {
  const request = { ...emptyRequest(), contact: '+1 202 555 0142' };
  assert.throws(() => buildEmail(request), /CONSENT_REQUIRED/);
  assert.throws(() => buildEmail({ ...request, consent: 'true' }), /CONSENT_REQUIRED/);
});

test('contact is validated according to the selected method', () => {
  assert.deepEqual(validateContact({ method: 'none' }), {});
  assert.ok(validateContact({ method: 'phone', contact: 'not-a-number' }).contact);
  assert.ok(validateContact({ method: 'phone', contact: '123' }).contact);
  assert.ok(validateContact({ method: 'email', contact: 'alex@' }).contact);
  assert.deepEqual(validateContact({ method: 'phone', contact: '+1 (202) 555-0142' }), {});
  assert.deepEqual(validateContact({ method: 'email', contact: 'alex@example.com' }), {});
});

test('no-safe-contact path never creates an email or fictional request', () => {
  assert.throws(() => buildEmail({ ...emptyRequest(), method: 'none', consent: true }), /NO_SAFE_CONTACT/);
});

test('email is addressed only to BFP, contains safe-contact preferences, and encodes payload', () => {
  const request = {
    ...emptyRequest(), contact: '+1 202 555 0142', name: 'Alex & amici', safeTime: 'Afternoons',
    consent: true, voicemail: false, to: 'attacker@example.com', status: 'received',
  };
  const message = buildEmail(request);
  assert.equal(message.to, 'info@boundlessfreedom.org');
  assert.ok(message.url.startsWith('mailto:info@boundlessfreedom.org?subject='));
  assert.match(message.body, /NOT allowed/);
  assert.match(message.body, /Afternoons/);
  assert.match(message.url, /Alex%20%26%20amici/);
  assert.ok(!message.body.includes('attacker@example.com'));
  assert.ok(!message.body.includes('received'));
});

test('normalization strips controls, limits data and ignores unsupported fields', () => {
  const result = normalizeRequest({ category: 'Injected\r\nBcc: injected@example.com', method: 'email', name: 'Alex\r\nBcc: no', contact: 'alex@example.com', voicemail: true, consent: true, token: 'secret' });
  assert.ok(!result.name.includes('\n'));
  assert.equal(result.category, 'I’d like to talk to someone');
  assert.equal(result.voicemail, false);
  assert.ok(!Object.hasOwn(result, 'token'));
});

test('exit clears the original request object and returns unchecked defaults', () => {
  const original = { ...emptyRequest(), contact: 'alex@example.com', name: 'Alex', consent: true };
  const fresh = clearRequest(original);
  assert.deepEqual(original, {});
  assert.equal(fresh.contact, '');
  assert.equal(fresh.consent, false);
  assert.equal(fresh.voicemail, false);
});
