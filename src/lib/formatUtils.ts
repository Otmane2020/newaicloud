/**
 * Format a limit value for display
 * @param limit - The limit value to format
 * @returns Formatted string with ∞ for unlimited or formatted number
 */
export const formatLimit = (limit: number | null | undefined): string => {
  if (limit === null || limit === undefined) return '∞';
  if (limit === 999999 || limit === 9999999) return '∞';
  return limit.toLocaleString('fr-FR');
};

/**
 * Check if a limit is unlimited
 * @param limit - The limit value to check
 * @returns true if the limit is considered unlimited
 */
export const isUnlimited = (limit: number | null | undefined): boolean => {
  return limit === null || limit === undefined || limit >= 999999;
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
 * Get the appropriate Stripe price ID based on language and billing period
 * @param plan - The subscription plan object
 * @param language - The language code ('fr' or 'en')
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The appropriate Stripe price ID
 */
export const getPriceIdByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): string => {
  if (language === 'fr') {
    return billingPeriod === 'monthly' 
      ? (plan.stripe_price_id_monthly_eur || plan.stripe_price_id_monthly)
      : (plan.stripe_price_id_yearly_eur || plan.stripe_price_id_yearly);
  }
  return billingPeriod === 'monthly' 
    ? plan.stripe_price_id_monthly 
    : plan.stripe_price_id_yearly;
};

/**
 * Get the appropriate price amount based on language and billing period
 * @param plan - The subscription plan object
 * @param language - The language code ('fr' or 'en')
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The price amount
 */
export const getPriceByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): number => {
  if (language === 'fr') {
    return billingPeriod === 'monthly' 
      ? (plan.price_monthly_eur || plan.price_monthly)
      : (plan.price_yearly_eur || plan.price_yearly);
  }
  return billingPeriod === 'monthly' 
    ? plan.price_monthly 
    : plan.price_yearly;
};

/**
 * Format a price with the appropriate currency symbol
 * Smart formatting: shows decimals only when needed (9,99 or 7,99), otherwise shows whole numbers (9 or 49)
 * @param amount - The price amount
 * @param language - The language code ('fr' or 'en')
 * @param forceDecimals - Force showing decimals even for whole numbers (default: false)
 * @param isYearlyTotal - If true, round to avoid decimals in yearly totals (default: false)
 * @returns Formatted price string
 */
export const formatPrice = (
  amount: number, 
  language: 'fr' | 'en',
  forceDecimals: boolean = false,
  isYearlyTotal: boolean = false
): string => {
  const symbol = getCurrencySymbol(language);
  
  // For yearly totals, always round to avoid decimals
  if (isYearlyTotal) {
    const roundedAmount = Math.round(amount);
    return language === 'fr' 
      ? `${roundedAmount} ${symbol}`
      : `${symbol}${roundedAmount}`;
  }
  
  // Check if the number has meaningful decimals
  const hasDecimals = amount % 1 !== 0;
  
  let formattedAmount: string;
  if (forceDecimals || hasDecimals) {
    // Show decimals
    formattedAmount = language === 'fr' 
      ? amount.toFixed(2).replace('.', ',')
      : amount.toFixed(2);
  } else {
    // Show whole number without decimals
    formattedAmount = Math.round(amount).toString();
  }
  
  return language === 'fr' 
    ? `${formattedAmount} ${symbol}`
    : `${symbol}${formattedAmount}`;
};
