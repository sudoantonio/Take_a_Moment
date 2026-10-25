export const LANGUAGE_KEY = 'bfp-language-v1';
let language = 'en', spanish;
export const getLanguage = () => language;
export async function setLanguage(next) {
  if (!['en', 'es'].includes(next)) return false;
  if (next === 'es' && !spanish) spanish = (await import('./locales/es.js')).default;
  language = next;
  return true;
}
export function t(value) {
  const text = String(value ?? '');
  if (language !== 'es') return text;
  if (spanish[text]) return spanish[text];
  const rules = [
    [/^Step (\d+) of 3$/, n => `Paso ${n} de 3`],
    [/^Step (\d+)$/, n => `Paso ${n}`],
    [/^Complete (\d+) practices$/, n => `Completa ${n} prácticas`],
    [/^(\d+) practices saved$/, n => `${n} prácticas guardadas`],
    [/^(\d+) practice saved$/, n => `${n} práctica guardada`],
    [/^(\d+) days$/, n => `${n} días`], [/^(\d+) day$/, n => `${n} día`],
    [/^(\d+) of (\d+) practices completed$/, (n, total) => `${n} de ${total} prácticas completadas`],
    [/^(.+) · (\d+) of 3$/, (name, n) => `${t(name)} · ${n} de 3`],
    [/^Printable practice · (.+)$/, name => `Práctica para imprimir · ${t(name)}`],
    [/^(.+) visual guide$/, name => `Guía visual: ${t(name)}`],
    [/^(.+) practice$/, name => `Práctica: ${t(name)}`],
  ];
  for (const [pattern, translate] of rules) {
    const match = text.match(pattern);
    if (match) return translate(...match.slice(1));
  }
  return text;
}
const escapeHTML = text => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const decode = text => text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, key) => ({ amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'", '#x27':"'" }[key]));
function translatedText(text) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const plain = decode(match[2]), translated = t(plain);
  return translated === plain ? text : match[1] + escapeHTML(translated) + match[3];
}
// Translate only display text and accessible labels. IDs, URLs, values, SVG paths,
// and translate="no" user-provided details always keep their original meaning.
export function translateHTML(html) {
  if (language !== 'es') return html;
  const stack = [];
  let protectedDepth = 0;
  return html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/g, token => {
    if (!token.startsWith('<')) return protectedDepth ? token : translatedText(token);
    const closing = /^<\//.test(token);
    const name = token.match(/^<\/?([\w-]+)/)?.[1]?.toLowerCase();
    if (closing) {
      const entry = stack.pop();
      if (entry?.protected) protectedDepth--;
      return token;
    }
    const protect = /\btranslate="no"/.test(token) || ['script', 'style'].includes(name);
    if (name && !/\/$/.test(token.slice(0,-1)) && !['input','img','br','hr','meta','link','source','path','circle','ellipse','rect','line','polyline','polygon'].includes(name)) {
      stack.push({ protected: protect });
      if (protect) protectedDepth++;
    }
    if (protectedDepth) return token;
    return token.replace(/\b(aria-label|title|placeholder|alt)="([^"]*)"/g,
      (_, attribute, text) => `${attribute}="${translatedText(text)}"`);
  });
}
export function languageToggle() {
  return `<button type="button" class="language-toggle" data-action="change-language" aria-label="${language === 'es' ? 'Switch to English' : 'Cambiar a español'}" title="${language === 'es' ? 'English' : 'Español'}"><span aria-hidden="true">${language === 'es' ? '🇪🇸' : '🇺🇸'}</span><span>${language === 'es' ? 'ES' : 'EN'}</span></button>`;
}
