import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Helper to detect mixed language content
const detectMixedLanguages = (text: string, expectedLang: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  // Arabic/RTL detection
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const latinPattern = /[a-zA-Z]/;
  const hasArabic = arabicPattern.test(text);
  const hasLatin = latinPattern.test(text);
  
  // Detect if we have mixed scripts
  if (hasArabic && hasLatin && expectedLang === 'ar') {
    console.warn('🚨 Mixed Arabic-Latin content detected:', text.substring(0, 50));
    return true;
  }
  
  return false;
};

// Fix Arabic numbers (prevent reversal)
const fixArabicNumbers = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Wrap numbers in LTR marks to prevent reversal
  return text.replace(/(\d+)/g, '\u202D$1\u202C');
};

export const useTranslation = () => {
  const { t: originalT, i18n } = useI18nTranslation();
  
  // Wrapped translation function with logging and fixes
  const t = (key: string, options?: any): any => {
    const translated = originalT(key, options);
    const currentLang = i18n.language;
    const translatedStr = String(translated);
    
    // Log if translation key is missing
    if (translatedStr === key) {
      console.warn(`⚠️ Missing translation for key: "${key}" in language: ${currentLang}`);
    }
    
    // Detect mixed language content
    if (detectMixedLanguages(translatedStr, currentLang)) {
      console.error(`❌ Mixed language detected in key: "${key}"`);
    }
    
    // Fix Arabic text
    if (currentLang.startsWith('ar') && typeof translated === 'string') {
      return fixArabicNumbers(translated);
    }
    
    return translated;
  };

  // Load preferred language from user profile (only if authenticated)
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', user.id)
            .single();
          
          if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
            await i18n.changeLanguage(profile.preferred_language);
            localStorage.setItem('i18nextLng', profile.preferred_language);
          }
        }
      } catch (error) {
        console.log('No user authenticated, using browser language');
      }
    };
    
    loadUserLanguage();
  }, [i18n]);

  // Save language preference (works for both authenticated and anonymous users)
  const changeLanguage = async (lang: string) => {
    // Change i18n language immediately
    await i18n.changeLanguage(lang);
    
    // Store in localStorage for persistence
    localStorage.setItem('i18nextLng', lang);
    
    // Update user profile in database (only if authenticated)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', user.id);
      }
    } catch (error) {
      console.log('Not authenticated, language saved to localStorage only');
    }
  };

  return {
    t,
    language: i18n.language,
    changeLanguage,
  };
};
