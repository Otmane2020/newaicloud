import { useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

/**
 * Component that automatically translates the page using Google Translate API
 * when the user changes the language setting.
 */
export function AutoTranslator() {
  const { language } = useTranslation();
  
  // Enable auto-translation for non-French languages
  const { translatePage } = useAutoTranslate(language, true);

  // Force translation when language changes
  useEffect(() => {
    if (language !== 'fr') {
      // Give React time to render, then translate
      const timer = setTimeout(() => {
        translatePage(language);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [language, translatePage]);

  return null;
}
