import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import translationEN from './locales/en.json';
import translationFR from './locales/fr.json';
import translationES from './locales/es.json';
import translationDE from './locales/de.json';
import translationIT from './locales/it.json';
import translationPT from './locales/pt.json';
import translationNL from './locales/nl.json';
import translationJA from './locales/ja.json';
import translationZH from './locales/zh.json';
import translationAR from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translationEN },
      fr: { translation: translationFR },
      es: { translation: translationES },
      de: { translation: translationDE },
      it: { translation: translationIT },
      pt: { translation: translationPT },
      nl: { translation: translationNL },
      ja: { translation: translationJA },
      zh: { translation: translationZH },
      ar: { translation: translationAR },
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
