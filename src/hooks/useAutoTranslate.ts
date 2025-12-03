import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslationCache {
  [key: string]: string;
}

// Global cache to avoid re-translating the same content
const translationCache: TranslationCache = {};

// Elements to skip during translation
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 
  'INPUT', 'TEXTAREA', 'SELECT', 'CODE', 'PRE', 'KBD', 'VAR'
]);

// Attributes that contain translatable text
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];

// Minimum text length to translate
const MIN_TEXT_LENGTH = 2;

// Maximum batch size for API calls
const BATCH_SIZE = 50;

export function useAutoTranslate(language: string, enabled: boolean = true) {
  const isTranslatingRef = useRef(false);
  const lastLanguageRef = useRef(language);
  const observerRef = useRef<MutationObserver | null>(null);

  const getCacheKey = useCallback((text: string, targetLang: string) => {
    return `${targetLang}:${text}`;
  }, []);

  const translateTexts = useCallback(async (texts: string[], targetLang: string): Promise<string[]> => {
    if (texts.length === 0) return [];

    // Check cache first
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];
    const results: string[] = new Array(texts.length);

    texts.forEach((text, index) => {
      const cacheKey = getCacheKey(text, targetLang);
      if (translationCache[cacheKey]) {
        results[index] = translationCache[cacheKey];
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    if (uncachedTexts.length === 0) return results;

    try {
      const { data, error } = await supabase.functions.invoke("google-translate", {
        body: {
          text: uncachedTexts,
          targetLang,
          // Let Google detect source language and only translate if different
          detectOnly: false,
        },
      });

      if (error || !data?.translations) {
        console.error("[useAutoTranslate] Translation error:", error);
        // Return original texts for failed translations
        uncachedIndices.forEach((originalIndex, i) => {
          results[originalIndex] = texts[originalIndex];
        });
        return results;
      }

      // Update cache and results - only use translation if source language differs
      data.translations.forEach((translation: any, i: number) => {
        const detectedLang = translation.detectedSourceLanguage?.toLowerCase();
        const targetLangNorm = targetLang.toLowerCase().split('-')[0];
        
        // If source language matches target, keep original text
        if (detectedLang === targetLangNorm) {
          results[uncachedIndices[i]] = uncachedTexts[i];
          // Still cache it to avoid re-checking
          const cacheKey = getCacheKey(uncachedTexts[i], targetLang);
          translationCache[cacheKey] = uncachedTexts[i];
        } else {
          const translatedText = translation.translatedText || uncachedTexts[i];
          const originalIndex = uncachedIndices[i];
          const cacheKey = getCacheKey(uncachedTexts[i], targetLang);
          translationCache[cacheKey] = translatedText;
          results[originalIndex] = translatedText;
        }
      });

      return results;
    } catch (error) {
      console.error("[useAutoTranslate] Error:", error);
      return texts;
    }
  }, [getCacheKey]);

  const collectTextNodes = useCallback((root: Element): { node: Text; text: string }[] => {
    const textNodes: { node: Text; text: string }[] = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
          
          const text = node.textContent?.trim();
          if (!text || text.length < MIN_TEXT_LENGTH) return NodeFilter.FILTER_REJECT;
          
          // Skip numbers only, URLs, emails
          if (/^[\d\s.,€$%]+$/.test(text)) return NodeFilter.FILTER_REJECT;
          if (/^https?:\/\//.test(text)) return NodeFilter.FILTER_REJECT;
          if (/^[\w.-]+@[\w.-]+\.\w+$/.test(text)) return NodeFilter.FILTER_REJECT;
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent?.trim();
      if (text) {
        textNodes.push({ node, text });
      }
    }

    return textNodes;
  }, []);

  const collectAttributes = useCallback((root: Element): { element: Element; attr: string; text: string }[] => {
    const attrs: { element: Element; attr: string; text: string }[] = [];
    const elements = root.querySelectorAll('*');
    
    elements.forEach((el) => {
      if (SKIP_TAGS.has(el.tagName)) return;
      if (el.closest('[data-no-translate]')) return;
      
      TRANSLATABLE_ATTRS.forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && value.length >= MIN_TEXT_LENGTH && !/^[\d\s.,€$%]+$/.test(value)) {
          attrs.push({ element: el, attr, text: value });
        }
      });
    });

    return attrs;
  }, []);

  const translatePage = useCallback(async (targetLang: string) => {
    if (isTranslatingRef.current) return;
    if (targetLang === 'fr') return; // French is the base language, no translation needed
    
    isTranslatingRef.current = true;
    console.log(`[useAutoTranslate] Translating page to ${targetLang}`);

    try {
      const root = document.body;
      
      // Collect all translatable content
      const textNodes = collectTextNodes(root);
      const attrItems = collectAttributes(root);
      
      // Combine all texts for batch translation
      const allTexts = [
        ...textNodes.map(t => t.text),
        ...attrItems.map(a => a.text)
      ];

      if (allTexts.length === 0) {
        console.log("[useAutoTranslate] No texts to translate");
        return;
      }

      console.log(`[useAutoTranslate] Found ${allTexts.length} texts to translate`);

      // Translate in batches
      const translatedTexts: string[] = [];
      for (let i = 0; i < allTexts.length; i += BATCH_SIZE) {
        const batch = allTexts.slice(i, i + BATCH_SIZE);
        const translated = await translateTexts(batch, targetLang);
        translatedTexts.push(...translated);
      }

      // Apply translations to text nodes
      textNodes.forEach((item, index) => {
        if (translatedTexts[index] && item.node.textContent) {
          const originalText = item.node.textContent;
          const trimmedOriginal = originalText.trim();
          // Preserve whitespace
          const translated = originalText.replace(trimmedOriginal, translatedTexts[index]);
          item.node.textContent = translated;
        }
      });

      // Apply translations to attributes
      const attrStartIndex = textNodes.length;
      attrItems.forEach((item, index) => {
        const translatedIndex = attrStartIndex + index;
        if (translatedTexts[translatedIndex]) {
          item.element.setAttribute(item.attr, translatedTexts[translatedIndex]);
        }
      });

      console.log("[useAutoTranslate] Translation complete");
    } catch (error) {
      console.error("[useAutoTranslate] Translation failed:", error);
    } finally {
      isTranslatingRef.current = false;
    }
  }, [collectTextNodes, collectAttributes, translateTexts]);

  // Translate when language changes
  useEffect(() => {
    if (!enabled) return;
    if (language === lastLanguageRef.current) return;
    
    lastLanguageRef.current = language;
    
    // Small delay to let React render first
    const timeout = setTimeout(() => {
      translatePage(language);
    }, 500);

    return () => clearTimeout(timeout);
  }, [language, enabled, translatePage]);

  // Set up mutation observer to translate new content
  useEffect(() => {
    if (!enabled || language === 'fr') return;

    const handleMutations = (mutations: MutationRecord[]) => {
      if (isTranslatingRef.current) return;
      
      const hasNewContent = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasNewContent) {
        // Debounce translation of new content
        setTimeout(() => {
          if (!isTranslatingRef.current) {
            translatePage(language);
          }
        }, 1000);
      }
    };

    observerRef.current = new MutationObserver(handleMutations);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled, language, translatePage]);

  // Initial translation on mount if not French
  useEffect(() => {
    if (enabled && language !== 'fr') {
      const timeout = setTimeout(() => {
        translatePage(language);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  return {
    translatePage,
    isTranslating: isTranslatingRef.current,
  };
}
