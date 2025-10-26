import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache des traductions en mémoire
const translationCache = new Map<string, Map<string, string>>();

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  // Fonction pour traduire un texte dynamiquement
  const translateText = async (text: string, context = ""): Promise<string> => {
    const currentLang = i18n.language;
    
    // Si c'est du français, retourner tel quel
    if (currentLang === 'fr' || currentLang === 'fr-FR') {
      return text;
    }

    // Vérifier le cache
    const langCache = translationCache.get(currentLang);
    if (langCache?.has(text)) {
      return langCache.get(text)!;
    }

    try {
      setIsTranslating(true);
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { text, targetLang: currentLang, context }
      });

      if (error) throw error;

      const translation = data.translation;
      
      // Mettre en cache
      if (!translationCache.has(currentLang)) {
        translationCache.set(currentLang, new Map());
      }
      translationCache.get(currentLang)!.set(text, translation);

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback sur le texte original
    } finally {
      setIsTranslating(false);
    }
  };

  // Fonction wrapper pour traduire avec clé i18n ou texte direct
  const translate = (key: string, fallback?: string): string => {
    // Essayer d'abord avec i18n
    const translation = t(key);
    
    // Si la clé n'existe pas et qu'on a un fallback, le retourner
    if (translation === key && fallback) {
      return fallback;
    }
    
    return translation;
  };

  return {
    t: translate,
    translateText,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
    isTranslating
  };
};
