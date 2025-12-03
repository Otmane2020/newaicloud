import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface TranslateOptions {
  sourceLang?: string;
  showToast?: boolean;
}

export function useGoogleTranslate() {
  const { t } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(
    async (
      text: string | string[],
      targetLang: string,
      options: TranslateOptions = {}
    ): Promise<string | string[] | null> => {
      const { sourceLang, showToast = false } = options;
      
      if (!text || (Array.isArray(text) && text.length === 0)) {
        return null;
      }

      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-translate", {
          body: {
            text,
            targetLang,
            sourceLang,
          },
        });

        if (error) {
          console.error("[useGoogleTranslate] Error:", error);
          if (showToast) {
            toast.error(t.toasts?.error?.generic || "Translation error");
          }
          return null;
        }

        if (showToast) {
          toast.success(t.toasts?.success?.applied || "Translated");
        }

        // Return single string if input was single string
        if (!Array.isArray(text)) {
          return data.translation || data.translations?.[0]?.translatedText || null;
        }

        // Return array of translated texts
        return data.translations?.map((t: any) => t.translatedText) || null;
      } catch (error) {
        console.error("[useGoogleTranslate] Error:", error);
        if (showToast) {
          toast.error(t.toasts?.error?.generic || "Translation error");
        }
        return null;
      } finally {
        setIsTranslating(false);
      }
    },
    [t]
  );

  const translateObject = useCallback(
    async <T extends Record<string, any>>(
      obj: T,
      targetLang: string,
      keysToTranslate: (keyof T)[],
      options: TranslateOptions = {}
    ): Promise<T | null> => {
      const textsToTranslate = keysToTranslate
        .map((key) => obj[key])
        .filter((val) => typeof val === "string" && val.trim());

      if (textsToTranslate.length === 0) return obj;

      const translations = await translate(textsToTranslate as string[], targetLang, options);
      
      if (!translations || !Array.isArray(translations)) return null;

      const result = { ...obj };
      let translationIndex = 0;
      
      for (const key of keysToTranslate) {
        if (typeof obj[key] === "string" && obj[key].trim()) {
          (result as any)[key] = translations[translationIndex++];
        }
      }

      return result;
    },
    [translate]
  );

  return {
    translate,
    translateObject,
    isTranslating,
  };
}
