import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  // Load preferred language from user profile
  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single();
        
        if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
          i18n.changeLanguage(profile.preferred_language);
        }
      }
    };
    
    loadUserLanguage();
  }, [i18n]);

  // Save language preference to user profile
  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id);
    }
  };

  return {
    t,
    language: i18n.language,
    changeLanguage,
  };
};
