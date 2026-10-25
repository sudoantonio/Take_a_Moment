import { BFP, CATEGORIES } from './content.js';
import { t } from './i18n.js';

const clean = (value, max = 180) => String(value || '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export function emptyRequest() {
  return { category: CATEGORIES[0], method: 'phone', contact: '', name: '', safeTime: '', voicemail: false, consent: false };
}

export function normalizeRequest(input) {
  return {
    category: CATEGORIES.includes(input?.category) ? input.category : CATEGORIES[0],
    method: ['phone', 'email', 'none'].includes(input?.method) ? input.method : 'none',
    contact: clean(input?.contact),
    name: clean(input?.name, 80),
    safeTime: clean(input?.safeTime, 120),
    voicemail: input?.method === 'phone' && input?.voicemail === true,
    consent: input?.consent === true,
  };
}

export function validateContact(input) {
  const value = normalizeRequest(input);
  if (value.method === 'none') return {};
  if (!value.contact) return { contact: 'Enter a contact detail or choose “I don’t have a safe contact”.' };
  if (value.method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contact)) return { contact: 'Check your email address. Something may be missing.' };
  const digits = value.contact.replace(/\D/g, '');
  if (value.method === 'phone' && (!/^\+?[\d ().-]+$/.test(value.contact) || digits.length < 7 || digits.length > 15)) return { contact: 'Check your number, including the area or country code.' };
  return {};
}

export function buildEmail(input, language = 'en') {
  const r = normalizeRequest(input);
  if (!r.consent) throw new Error('CONSENT_REQUIRED');
  if (r.method === 'none') throw new Error('NO_SAFE_CONTACT');
  if (Object.keys(validateContact(r)).length) throw new Error('INVALID_CONTACT');
  const spanish = language === 'es';
  const category = spanish ? t(r.category) : r.category;
  const subject = spanish ? `Solicitud de contacto BFP · ${category}` : `BFP contact request · ${category}`;
  const lines = spanish ? [
    'Hola, equipo de BFP:', '', `Me gustaría recibir información sobre: ${category}.`,
    ...(r.name ? [`Me gustaría que me llamaran: ${r.name}.`] : []),
    `Método de contacto preferido: ${r.method === 'phone' ? 'teléfono' : 'correo electrónico'}.`,
    `Medio de contacto seguro: ${r.contact}.`,
    ...(r.method === 'phone' ? [`Horario seguro para contactarme: ${r.safeTime || 'sin preferencia indicada'}.`, `Mensajes de voz: ${r.voicemail ? 'permitidos' : 'NO permitidos'}.`] : []),
    '', 'Doy mi consentimiento para que BFP me contacte sobre esta solicitud.', 'Gracias.',
  ] : [
    'Hello BFP team,',
    '',
    `I’d like information about: ${r.category}.`,
    ...(r.name ? [`Please call me: ${r.name}.`] : []),
    `Preferred contact method: ${r.method === 'phone' ? 'phone' : 'email'}.`,
    `Safe contact detail: ${r.contact}.`,
    ...(r.method === 'phone' ? [
      `Safe time to contact me: ${r.safeTime || 'no preference given'}.`,
      `Voicemail: ${r.voicemail ? 'allowed' : 'NOT allowed'}.`,
    ] : []),
    '',
    'I consent to BFP contacting me about this request.',
    'Thank you.',
  ];
  const body = lines.join('\n');
  return { to: BFP.email, subject, body, url: `mailto:${BFP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

export function clearRequest(current) {
  if (current && typeof current === 'object') Object.keys(current).forEach(key => { delete current[key]; });
  return emptyRequest();
}
