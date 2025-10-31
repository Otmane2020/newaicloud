import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fr, en, Translations } from './translations';

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
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app-language');
      if (saved === 'fr' || saved === 'en') return saved;
      return 'en'; // Default to English
    } catch {
      return 'en';
    }
  });

  const translations = { fr, en };
  const t = translations[language];

  const tf = (key: string, vars?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = t;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (!value) return key;
    
    if (vars) {
      return Object.entries(vars).reduce(
        (str, [key, val]) => str.replace(`{{${key}}}`, String(val)),
        value
      );
    }
    
    return value;
  };

  useEffect(() => {
    try {
      localStorage.setItem('app-language', language);
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

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
