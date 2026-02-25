import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { adminLocaleOverrides } from './adminOverrides';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
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

const uzMerged = deepMerge(uz, adminLocaleOverrides.uz);
const ruMerged = deepMerge(ru, adminLocaleOverrides.ru);
const enMerged = deepMerge(en, adminLocaleOverrides.en);

const resources = {
  uz: { translation: uzMerged },
  ru: { translation: ruMerged },
  en: { translation: enMerged },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_lang',
      lookupQuerystring: 'lang',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
