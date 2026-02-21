import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
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
