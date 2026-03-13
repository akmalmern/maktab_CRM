import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import catalog from './locales/catalog.json';

const resources = {
  uz: { translation: catalog.uz },
  ru: { translation: catalog.ru },
  en: { translation: catalog.en },
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
