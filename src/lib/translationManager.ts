import { supabase } from '@/integrations/supabase/client';

interface TranslationKey {
  key: string;
  value: string;
}

interface TranslationResult {
  [key: string]: string;
}

/**
 * Detects missing translation keys by comparing reference locale with target locale
 */
export const detectMissingKeys = (
  referenceLocale: Record<string, any>,
  targetLocale: Record<string, any>,
  prefix = ''
): string[] => {
  const missingKeys: string[] = [];

  Object.keys(referenceLocale).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof referenceLocale[key] === 'object' && !Array.isArray(referenceLocale[key])) {
      // Recursive check for nested objects
      if (!targetLocale[key] || typeof targetLocale[key] !== 'object') {
        missingKeys.push(fullKey);
      } else {
        missingKeys.push(...detectMissingKeys(referenceLocale[key], targetLocale[key], fullKey));
      }
    } else {
      // Check if key exists in target
      if (targetLocale[key] === undefined || targetLocale[key] === null || targetLocale[key] === '') {
        missingKeys.push(fullKey);
      }
    }
  });

  return missingKeys;
};

/**
 * Gets the value from a nested object using dot notation
 */
export const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Sets a value in a nested object using dot notation
 */
export const setNestedValue = (obj: Record<string, any>, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

/**
 * Translates multiple keys in batch using the Edge Function
 */
export const batchTranslate = async (
  keys: TranslationKey[],
  targetLang: string,
  context = 'E-commerce SaaS platform for Shopify optimization'
): Promise<TranslationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('batch-translate', {
      body: { keys, targetLang, context }
    });

    if (error) throw error;
    return data.translations;
  } catch (error) {
    console.error('Batch translation error:', error);
    throw error;
  }
};

/**
 * Calculates translation completion percentage
 */
export const calculateCompletionRate = (
  referenceLocale: Record<string, any>,
  targetLocale: Record<string, any>
): number => {
  const flattenKeys = (obj: Record<string, any>, prefix = ''): string[] => {
    let keys: string[] = [];
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        keys = keys.concat(flattenKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    });
    return keys;
  };

  const totalKeys = flattenKeys(referenceLocale);
  const missingKeys = detectMissingKeys(referenceLocale, targetLocale);
  
  return Math.round(((totalKeys.length - missingKeys.length) / totalKeys.length) * 100);
};

/**
 * Export translations to JSON file
 */
export const exportTranslations = (locale: Record<string, any>, filename: string): void => {
  const dataStr = JSON.stringify(locale, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
