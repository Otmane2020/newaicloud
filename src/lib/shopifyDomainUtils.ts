/**
 * Utility functions for converting Shopify URLs to public domains
 */

/**
 * Converts a Shopify myshopify.com URL to the public domain
 * @param shopifyUrl - The URL from Shopify (e.g., https://store.myshopify.com/collections/xyz)
 * @param publicDomain - The public domain (e.g., example.com)
 * @returns The converted URL with the public domain
 */
export function convertShopifyUrlToPublicDomain(
  shopifyUrl: string,
  publicDomain: string
): string {
  if (!shopifyUrl || !publicDomain) {
    return shopifyUrl;
  }

  try {
    const url = new URL(shopifyUrl);
    
    // If it's already using the public domain, return as is
    if (url.hostname === publicDomain) {
      return shopifyUrl;
    }

    // If it's a myshopify.com domain, replace with public domain
    if (url.hostname.includes('.myshopify.com')) {
      url.hostname = publicDomain;
      return url.toString();
    }

    return shopifyUrl;
  } catch (error) {
    console.error('Error converting Shopify URL:', error);
    return shopifyUrl;
  }
}

/**
 * Extracts the path from a Shopify URL and constructs a new URL with the public domain
 * @param shopifyUrl - The URL from Shopify
 * @param publicDomain - The public domain
 * @returns The new URL with public domain
 */
export function buildPublicUrl(
  path: string,
  publicDomain: string
): string {
  if (!path || !publicDomain) {
    return '';
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Construct the URL
  return `https://${publicDomain}${normalizedPath}`;
}
