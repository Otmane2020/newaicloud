import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

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
