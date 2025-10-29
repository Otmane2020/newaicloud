import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Static fallback resources
const fallbackResources = {
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
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: fallbackResources, // Fallback to static files
    backend: {
      loadPath: `${SUPABASE_URL}/functions/v1/get-translations?lng={{lng}}`,
      customHeaders: {
        apikey: SUPABASE_KEY,
      },
      allowMultiLoading: false,
      crossDomain: true,
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;
