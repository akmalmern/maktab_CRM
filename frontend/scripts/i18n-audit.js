/* global process */
import fs from 'node:fs';

const paths = {
  uz: 'frontend/src/i18n/locales/uz.json',
  en: 'frontend/src/i18n/locales/en.json',
  ru: 'frontend/src/i18n/locales/ru.json',
};

function load(p) {
  let t = fs.readFileSync(p, 'utf8');
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return JSON.parse(t);
}

function flat(o, p = [], m = {}) {
  if (Array.isArray(o)) {
    o.forEach((v, i) => flat(v, p.concat(i), m));
    return m;
  }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) flat(v, p.concat(k), m);
    return m;
  }
  m[p.join('.')] = o;
  return m;
}

function hasControlChars(str) {
  if (typeof str !== 'string') return false;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code <= 31 && code !== 9 && code !== 10 && code !== 13) return true;
  }
  return false;
}

const placeholderQ = /\?{2,}/;

const all = Object.fromEntries(
  Object.entries(paths).map(([k, p]) => [k, flat(load(p))]),
);
const canonicalKeys = Object.keys(all.uz).sort();
let hasError = false;

for (const [lang, map] of Object.entries(all)) {
  const keys = Object.keys(map).sort();
  const missing = canonicalKeys.filter((k) => !(k in map));
  const extra = keys.filter((k) => !(k in all.uz));
  const suspicious = keys.filter((k) => {
    const v = map[k];
    return typeof v === 'string' && (placeholderQ.test(v) || v.includes('�') || hasControlChars(v));
  });

  console.log(`\n[${lang}] missing=${missing.length} extra=${extra.length} suspicious=${suspicious.length}`);
  if (missing.length) console.log('  missing sample:', missing.slice(0, 10));
  if (extra.length) console.log('  extra sample:', extra.slice(0, 10));
  if (suspicious.length) {
    console.log(
      '  suspicious sample:',
      suspicious.slice(0, 15).map((k) => `${k} => ${map[k]}`),
    );
  }
  if (missing.length || suspicious.length) hasError = true;
}

if (process.argv.includes('--strict') && hasError) process.exit(1);

