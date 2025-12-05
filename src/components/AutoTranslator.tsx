import { useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

/**
 * Component that automatically translates the page using Google Translate API
 * when the user changes the language setting.
 * When switching back to French, restores original texts.
 */
export function AutoTranslator() {
  const { language } = useTranslation();
  
  // Enable auto-translation
  const { translatePage, restoreOriginalTexts } = useAutoTranslate(language, true);

  // Handle language changes
  useEffect(() => {
    if (language === 'fr') {
      // Restore original French texts
      restoreOriginalTexts();
    } else {
      // Give React time to render, then translate
      const timer = setTimeout(() => {
        translatePage(language);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [language, translatePage, restoreOriginalTexts]);

  return null;
}
