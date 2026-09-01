import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en, Translations } from './translations';

// Helper function to ensure a value is always a string (prevents React error #300)
export function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    console.warn('[safeString] Received object instead of string:', value);
    return fallback;
  }
  return String(value);
}

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  tf: (key: string, vars?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // CatalogOptimize AI is English-only. Keep the setter for API compatibility,
  // but always resolve the active UI language to English.
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (_lang: Language) => {
    setLanguageState('en');
    try {
      localStorage.setItem('app-language', 'en');
    } catch {}
  };

  const t = en;

  const tf = (key: string, vars?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = t;

    for (const k of keys) {
      value = value?.[k];
    }

    // Ensure we always return a string, never an object
    if (!value || typeof value !== 'string') {
      console.warn('[tf] Translation key returned non-string value:', key, typeof value);
      return key;
    }

    if (vars) {
      return Object.entries(vars).reduce(
        (str, [k, val]) => str.replace(`{{${k}}}`, String(val)),
        value
      );
    }

    return value;
  };

  useEffect(() => {
    try {
      localStorage.setItem('app-language', 'en');
      document.documentElement.lang = 'en';
      document.documentElement.setAttribute('data-language', 'en');
    } catch {}
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tf }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}
