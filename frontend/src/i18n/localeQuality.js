import { autoTranslateUzToEn } from '../lib/autoEnTranslate.js';

const cp1251Decoder = new TextDecoder('windows-1251');
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const cp1251ReverseMap = new Map();

for (let i = 0; i < 256; i += 1) {
  cp1251ReverseMap.set(cp1251Decoder.decode(Uint8Array.of(i)), i);
}

export function looksLikeMojibake(value) {
  return typeof value === 'string'
    && /[ЃѓЄєІіЇїЈљЉњЊќҐґЎўџ©®±µ¶·ё№º»¼½¾]/u.test(value);
}

export function isLikelyUzbekText(value) {
  if (typeof value !== 'string') return false;
  const lower = value.replace(/{{\s*[\w.]+\s*}}/g, '').toLowerCase();
  return /(o'|o`|bo'yicha|oylik|to'lov|qarz|sinf|o'qituvchi|xodim|hisob|yangilash|saqlash|bekor|hammasi|tanlang|yo'q)/u.test(lower);
}

function isAsciiOnly(value) {
  return typeof value === 'string' && [...value].every((char) => char.codePointAt(0) <= 0x7f);
}

function isLikelyBrokenEnglish(value) {
  if (typeof value !== 'string') return false;
  return (
    looksLikeMojibake(value)
    || /\b(emplmonth|stus|allsini|rateni|runni|nlash|sdiql|sndart|monthlik)\b/i.test(value)
    || isLikelyUzbekText(value)
  );
}

export function tryDecodeCp1251Mojibake(value) {
  if (typeof value !== 'string' || !value || isAsciiOnly(value)) return value;
  const bytes = [];
  for (const ch of value) {
    const byte = cp1251ReverseMap.get(ch);
    if (byte == null) return value;
    bytes.push(byte);
  }
  try {
    const decoded = utf8Decoder.decode(Uint8Array.from(bytes));
    if (!decoded || decoded === value) return value;
    if (!/[А-Яа-яЁё]/u.test(decoded)) return value;
    return decoded;
  } catch {
    return value;
  }
}

export function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(base, patch) {
  if (!isPlainObject(base)) return patch;
  const out = { ...base };
  if (!isPlainObject(patch)) return out;
  Object.entries(patch).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
      return;
    }
    out[key] = value;
  });
  return out;
}

function mapLeaves(resource, fn, path = []) {
  if (Array.isArray(resource)) {
    return resource.map((item, index) => mapLeaves(item, fn, [...path, String(index)]));
  }
  if (isPlainObject(resource)) {
    return Object.fromEntries(
      Object.entries(resource).map(([key, value]) => [key, mapLeaves(value, fn, [...path, key])]),
    );
  }
  return fn(resource, path);
}

export function flattenLeaves(resource, path = [], out = new Map()) {
  if (Array.isArray(resource)) {
    resource.forEach((value, index) => flattenLeaves(value, [...path, String(index)], out));
    return out;
  }
  if (isPlainObject(resource)) {
    Object.entries(resource).forEach(([key, value]) => flattenLeaves(value, [...path, key], out));
    return out;
  }
  out.set(path.join('.'), resource);
  return out;
}

export function extractPlaceholders(value) {
  if (typeof value !== 'string') return [];
  const tokens = [...value.matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]);
  return [...new Set(tokens)].sort();
}

function autoTranslatePreservingPlaceholders(source) {
  if (typeof source !== 'string') return source;
  const placeholders = [];
  const marked = source.replace(/{{\s*([\w.]+)\s*}}/g, (_, token) => {
    const idx = placeholders.length;
    placeholders.push(token);
    return `__PH_${idx}__`;
  });
  const translated = autoTranslateUzToEn(marked);
  return translated.replace(/__PH_(\d+)__/g, (_, idxRaw) => {
    const idx = Number(idxRaw);
    const token = placeholders[idx];
    return token ? `{{${token}}}` : '';
  });
}

function normalizeEnglishResource(resource, { glossaryEn } = {}) {
  return mapLeaves(resource, (value, path) => {
    if (typeof value !== 'string') return value;
    const sourceKey = path[path.length - 1] || '';
    if (sourceKey && glossaryEn?.[sourceKey]) return glossaryEn[sourceKey];
    if (!sourceKey || sourceKey === value) return autoTranslatePreservingPlaceholders(sourceKey || value);
    if (isLikelyBrokenEnglish(value)) return autoTranslatePreservingPlaceholders(sourceKey);
    return value;
  });
}

function normalizeRussianResource(resource, { fallbackFlat, glossaryRu }) {
  const decoded = mapLeaves(resource, (value) => (
    typeof value === 'string' ? tryDecodeCp1251Mojibake(value) : value
  ));
  return mapLeaves(decoded, (value, path) => {
    if (typeof value !== 'string') return value;
    const sourceKey = path[path.length - 1] || '';
    if (!sourceKey) return value;
    if (glossaryRu?.[sourceKey]) return glossaryRu[sourceKey];
    if (!isLikelyUzbekText(value)) return value;
    const fallback = fallbackFlat.get(path.join('.'));
    return typeof fallback === 'string' && fallback.trim() ? fallback : value;
  });
}

export function buildStaticLocaleCatalog({
  uz,
  en,
  ru,
  adminOverrides = { uz: {}, en: {}, ru: {} },
  payrollFinanceOverrides = { uz: {}, en: {}, ru: {} },
  glossaryOverrides = { uz: {}, en: {}, ru: {} },
}) {
  const uzMerged = deepMerge(
    deepMerge(deepMerge(uz, adminOverrides.uz), payrollFinanceOverrides.uz),
    glossaryOverrides.uz || {},
  );
  const enRaw = deepMerge(
    deepMerge(deepMerge(en, adminOverrides.en), payrollFinanceOverrides.en),
    glossaryOverrides.en || {},
  );
  const enMerged = normalizeEnglishResource(enRaw, {
    glossaryEn: glossaryOverrides.en || {},
  });
  const enFlat = flattenLeaves(enMerged);
  const ruRaw = deepMerge(
    deepMerge(deepMerge(ru, adminOverrides.ru), payrollFinanceOverrides.ru),
    glossaryOverrides.ru || {},
  );
  const ruMerged = normalizeRussianResource(ruRaw, {
    fallbackFlat: enFlat,
    glossaryRu: glossaryOverrides.ru || {},
  });
  return { uz: uzMerged, en: enMerged, ru: ruMerged };
}

export const normalizeI18nResources = buildStaticLocaleCatalog;

export function collectLocaleParityIssues(catalog, { baseLocale = 'uz', locales = ['en', 'ru'] } = {}) {
  const baseFlat = flattenLeaves(catalog?.[baseLocale] || {});
  const localeMaps = new Map(locales.map((locale) => [locale, flattenLeaves(catalog?.[locale] || {})]));
  const issues = [];

  for (const [keyPath, baseValue] of baseFlat.entries()) {
    if (baseValue === undefined || baseValue === null || (typeof baseValue === 'string' && !baseValue.trim())) {
      continue;
    }
    locales.forEach((locale) => {
      const localeValue = localeMaps.get(locale)?.get(keyPath);
      if (localeValue === undefined || localeValue === null || (typeof localeValue === 'string' && !localeValue.trim())) {
        issues.push(`${locale.toUpperCase()} missing key: ${keyPath}`);
      }
    });
  }

  return issues;
}

export function collectPlaceholderIssues(catalog, { baseLocale = 'uz', locales = ['en', 'ru'] } = {}) {
  const baseFlat = flattenLeaves(catalog?.[baseLocale] || {});
  const localeMaps = new Map(locales.map((locale) => [locale, flattenLeaves(catalog?.[locale] || {})]));
  const issues = [];

  for (const [keyPath, baseValue] of baseFlat.entries()) {
    if (typeof baseValue !== 'string') continue;
    const baseTokens = extractPlaceholders(baseValue);
    locales.forEach((locale) => {
      const localeTokens = extractPlaceholders(localeMaps.get(locale)?.get(keyPath));
      if (JSON.stringify(baseTokens) !== JSON.stringify(localeTokens)) {
        issues.push(
          `${locale.toUpperCase()} placeholder mismatch at ${keyPath}: expected [${baseTokens.join(', ')}], got [${localeTokens.join(', ')}]`,
        );
      }
    });
  }

  return issues;
}

export function collectMojibakeIssues(catalog, { locales = ['en', 'ru'] } = {}) {
  const issues = [];
  locales.forEach((locale) => {
    const flat = flattenLeaves(catalog?.[locale] || {});
    for (const [keyPath, value] of flat.entries()) {
      if (typeof value === 'string' && tryDecodeCp1251Mojibake(value) !== value) {
        issues.push(`${locale.toUpperCase()} mojibake at ${keyPath}`);
      }
    }
  });
  return issues;
}

export function collectGlossaryIssues(catalog, glossary = { uz: {}, en: {}, ru: {} }) {
  const issues = [];
  const flatCatalog = {
    uz: flattenLeaves(catalog?.uz || {}),
    en: flattenLeaves(catalog?.en || {}),
    ru: flattenLeaves(catalog?.ru || {}),
  };
  const glossaryKeys = [
    ...Object.keys(glossary.uz || {}),
    ...Object.keys(glossary.en || {}),
    ...Object.keys(glossary.ru || {}),
  ];

  [...new Set(glossaryKeys)].forEach((keyPath) => {
    ['en', 'ru'].forEach((locale) => {
      const expected = glossary?.[locale]?.[keyPath];
      if (!expected) return;
      const actual = flatCatalog[locale].get(keyPath);
      if (actual !== expected) {
        issues.push(`${locale.toUpperCase()} glossary mismatch for "${keyPath}": expected "${expected}", got "${actual}"`);
      }
    });
  });

  return issues;
}

export function collectSuspiciousLocaleWarnings(catalog, { locales = ['en', 'ru'] } = {}) {
  const warnings = [];
  locales.forEach((locale) => {
    const flat = flattenLeaves(catalog?.[locale] || {});
    for (const [keyPath, value] of flat.entries()) {
      if (typeof value !== 'string') continue;
      if (locale === 'en' && isLikelyUzbekText(value)) {
        warnings.push(`EN suspicious untranslated text at ${keyPath}: "${value}"`);
      }
      if (locale === 'ru' && isLikelyUzbekText(value)) {
        warnings.push(`RU suspicious untranslated text at ${keyPath}: "${value}"`);
      }
    }
  });
  return warnings;
}
