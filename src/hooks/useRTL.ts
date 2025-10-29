import { useEffect } from 'react';
import { useTranslation } from './useTranslation';

// RTL languages list
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export const useRTL = () => {
  const { language } = useTranslation();

  const isRTL = RTL_LANGUAGES.some(lang => language.startsWith(lang));

  useEffect(() => {
    // Apply direction to HTML element
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    
    // Add/remove RTL class for additional styling control
    if (isRTL) {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
  }, [isRTL]);

  return { isRTL, direction: isRTL ? 'rtl' : 'ltr' };
};
