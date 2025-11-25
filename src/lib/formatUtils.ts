/**
 * Format a limit value for display
 * @param limit - The limit value to format
 * @returns Formatted string with ∞ for unlimited or formatted number
 */
export const formatLimit = (limit: number | null | undefined): string => {
  if (isUnlimited(limit)) return '∞';
  if (limit! >= 1000) return `${(limit! / 1000).toFixed(0)}K`;
  return limit!.toLocaleString('fr-FR');
};

/**
 * Check if a limit is unlimited
 * @param limit - The limit value to check
 * @returns true if the limit is considered unlimited
 */
export const isUnlimited = (limit: number | null | undefined): boolean => {
  return limit === null || limit === undefined || limit === -1 || limit >= 999999;
};

/**
 * Get currency symbol based on language
 * @param language - The language code ('fr' or 'en')
 * @returns Currency symbol ('€' for French, '$' for English)
 */
export const getCurrencySymbol = (language: 'fr' | 'en'): string => {
  return language === 'fr' ? '€' : '$';
}

/**
 * Get the appropriate Stripe price ID based on language and billing period
 * @param plan - The subscription plan object
 * @param language - The language code ('fr' or 'en')
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The appropriate Stripe price ID (EUR for French, USD for English)
 */
export const getPriceIdByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): string => {
  if (language === 'fr') {
    return billingPeriod === 'monthly' 
      ? plan.stripe_price_id_monthly_eur
      : plan.stripe_price_id_yearly_eur;
  } else {
    return billingPeriod === 'monthly' 
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly;
  }
};

/**
 * Get the appropriate price amount based on language and billing period
 * @param plan - The subscription plan object
 * @param language - The language code ('fr' or 'en')
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The price amount (USD for English, EUR for French)
 */
export const getPriceByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): number => {
  if (language === 'fr') {
    return billingPeriod === 'monthly' 
      ? plan.price_monthly_eur
      : plan.price_yearly_eur;
  } else {
    return billingPeriod === 'monthly' 
      ? plan.price_monthly
      : plan.price_yearly;
  }
};

/**
 * Format a price with the appropriate currency symbol
 * French: "9,99 €" (symbol after), English: "$9.99" (symbol before)
 * @param amount - The price amount
 * @param language - The language code ('fr' or 'en')
 * @returns Formatted price string
 */
export const formatPrice = (
  amount: number, 
  language: 'fr' | 'en',
  forceDecimals: boolean = false,
  isYearlyTotal: boolean = false
): string => {
  const symbol = getCurrencySymbol(language);
  
  // Keep decimals for prices like 9.99, 7.99, etc. (check with tolerance for floating point)
  const roundedAmount = Math.round(amount * 100) / 100;
  const shouldKeepDecimals = (
    Math.abs(roundedAmount - 9.99) < 0.01 || 
    Math.abs(roundedAmount - 7.99) < 0.01
  );
  
  if (shouldKeepDecimals) {
    if (language === 'fr') {
      const formattedAmount = roundedAmount.toFixed(2).replace('.', ',');
      return `${formattedAmount} ${symbol}`;
    } else {
      return `${symbol}${roundedAmount.toFixed(2)}`;
    }
  }
  
  // Round to whole numbers for other amounts
  const wholeAmount = Math.round(amount);
  
  // French: "100 €", English: "$100"
  return language === 'fr' 
    ? `${wholeAmount} ${symbol}`
    : `${symbol}${wholeAmount}`;
};
