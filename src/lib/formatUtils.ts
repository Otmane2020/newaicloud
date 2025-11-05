/**
 * Format a limit value for display
 * @param limit - The limit value to format
 * @returns Formatted string with ∞ for unlimited or formatted number
 */
export const formatLimit = (limit: number | null | undefined): string => {
  if (!limit || limit === 0) return '∞';
  if (limit === 999999 || limit === 9999999) return '∞';
  return limit.toLocaleString('fr-FR');
};

/**
 * Check if a limit is unlimited
 * @param limit - The limit value to check
 * @returns true if the limit is considered unlimited
 */
export const isUnlimited = (limit: number | null | undefined): boolean => {
  return !limit || limit === 0 || limit >= 999999;
};

/**
 * Get currency symbol based on language
 * @param language - The language code ('fr' or 'en')
 * @returns Currency symbol ('€' for French, '$' for English)
 */
export const getCurrencySymbol = (language: 'fr' | 'en'): string => {
  return language === 'fr' ? '€' : '$';
};

/**
 * Format a price with the appropriate currency symbol
 * @param amount - The price amount
 * @param language - The language code ('fr' or 'en')
 * @returns Formatted price string
 */
export const formatPrice = (amount: number, language: 'fr' | 'en'): string => {
  const symbol = getCurrencySymbol(language);
  // French: "9,99 €" or "49 €"
  // English: "$9.99" or "$49"
  const formattedAmount = language === 'fr' 
    ? amount.toFixed(2).replace('.', ',')
    : amount.toFixed(2);
  
  return language === 'fr' 
    ? `${formattedAmount} ${symbol}`
    : `${symbol}${formattedAmount}`;
};
