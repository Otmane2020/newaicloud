import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import modular translations for EN
import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enLanding from './en/landing.json';
import enDashboard from './en/dashboard.json';
import enProducts from './en/products.json';
import enSeo from './en/seo.json';
import enBlog from './en/blog.json';
import enSubscription from './en/subscription.json';

// Import modular translations for FR
import frCommon from './fr/common.json';
import frAuth from './fr/auth.json';
import frLanding from './fr/landing.json';
import frDashboard from './fr/dashboard.json';
import frProducts from './fr/products.json';
import frSeo from './fr/seo.json';
import frBlog from './fr/blog.json';
import frSubscription from './fr/subscription.json';

// Import full translations for other languages (fallback to old structure)
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

// Static fallback resources with modular structure for EN and FR
const fallbackResources = {
  en: {
    translation: {
      ...enCommon,
      ...enAuth,
      ...enLanding,
      ...enDashboard,
      ...enProducts,
      ...enSeo,
      ...enBlog,
      ...enSubscription,
    }
  },
  fr: {
    translation: {
      ...frCommon,
      ...frAuth,
      ...frLanding,
      ...frDashboard,
      ...frProducts,
      ...frSeo,
      ...frBlog,
      ...frSubscription,
    }
  },
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
