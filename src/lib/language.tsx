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

const LEGACY_FRENCH_UI: Record<string, string> = {
  'Je cherche une composition TV murale moderne en bois.': 'I am looking for a modern wall-mounted wooden TV unit.',
  'La composition SWITCH correspond à votre recherche. Elle est disponible en plusieurs finitions dans le catalogue Decora Home.': 'The SWITCH TV unit matches your search. It is available in several finishes in the Decora Home catalog.',
  'Disponible · plusieurs finitions': 'Available · several finishes',
  'Voir le produit': 'View product',
  'Erreur': 'Error',
  'Succès': 'Success',
  'Supprimer': 'Delete',
  'Confirmer': 'Confirm',
  'Impossible': 'Unable',
  'Annuler': 'Cancel',
  'Enregistrer': 'Save',
  'Chargement...': 'Loading...',
  'Aucun résultat': 'No results',
};

function translateLegacyFrenchValue(value: string): string {
  const trimmed = value.trim();
  const translated = LEGACY_FRENCH_UI[trimmed];
  if (!translated) return value;

  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function normalizeLegacyFrenchUi(root: ParentNode) {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const parentTag = node.parentElement?.tagName;
    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'NOSCRIPT') {
      const nextValue = translateLegacyFrenchValue(node.data);
      if (nextValue !== node.data) node.data = nextValue;
    }
    current = walker.nextNode();
  }

  if (root instanceof Element) {
    const elements = [root, ...Array.from(root.querySelectorAll('*'))];
    elements.forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        const nextValue = translateLegacyFrenchValue(value);
        if (nextValue !== value) element.setAttribute(attribute, nextValue);
      });
    });
  }
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

    if (typeof document === 'undefined' || !document.body) return;

    normalizeLegacyFrenchUi(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && mutation.target.parentNode) {
          normalizeLegacyFrenchUi(mutation.target.parentNode);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
            normalizeLegacyFrenchUi(node.parentNode);
          } else if (node instanceof Element) {
            normalizeLegacyFrenchUi(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
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
