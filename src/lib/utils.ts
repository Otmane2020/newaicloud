import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency with K/M notation
 * @param value - The numeric value to format
 * @param currency - The currency symbol (default: '€')
 * @returns Formatted string (e.g., "77.9K€", "1.2M€")
 */
export function formatCurrency(value: number, currency: string = '€'): string {
  if (value === 0) return `0${currency}`;
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000) {
    // Format as millions (M)
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M${currency}`;
  } else if (absValue >= 1_000) {
    // Format as thousands (K)
    return `${sign}${(absValue / 1_000).toFixed(1)}K${currency}`;
  } else {
    // Format as is with 2 decimals
    return `${sign}${absValue.toFixed(2)}${currency}`;
  }
}
