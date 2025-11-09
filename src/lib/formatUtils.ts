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
 * Get currency symbol
 * All prices are in EUR now
 * @param language - The language code ('fr' or 'en')
 * @returns Currency symbol (always '€')
 */
export const getCurrencySymbol = (language: 'fr' | 'en'): string => {
  return '€';
}

/**
 * Get the appropriate Stripe price ID based on billing period
 * All prices are in EUR
 * @param plan - The subscription plan object
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The appropriate Stripe price ID
 */
export const getPriceIdByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): string => {
  return billingPeriod === 'monthly' 
    ? plan.stripe_price_id_monthly
    : plan.stripe_price_id_yearly;
};

/**
 * Get the appropriate price amount based on billing period
 * All prices are in EUR
 * @param plan - The subscription plan object
 * @param language - The language code ('fr' or 'en')
 * @param billingPeriod - The billing period ('monthly' or 'yearly')
 * @returns The price amount in EUR
 */
export const getPriceByLanguage = (
  plan: any,
  language: 'fr' | 'en',
  billingPeriod: 'monthly' | 'yearly'
): number => {
  return billingPeriod === 'monthly' 
    ? plan.price_monthly_eur
    : plan.price_yearly_eur;
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
