/**
 * Shared GraphQL helpers for Shopify Admin API
 * Migration from REST to GraphQL Admin API (Deadline: 2025-04-01)
 */

// ============= ID CONVERSION HELPERS =============

/**
 * Converts a REST numeric ID to a GraphQL Global ID (GID)
 * @param numericId - Numeric Shopify ID (e.g., 123456)
 * @param resourceType - Shopify resource type (e.g., "Product", "ProductVariant", "ProductImage")
 * @returns GraphQL GID string (e.g., "gid://shopify/Product/123456")
 */
export function restIdToGid(numericId: number | string, resourceType: string): string {
  return `gid://shopify/${resourceType}/${numericId}`;
}

/**
 * Converts a GraphQL Global ID (GID) to a REST numeric ID
 * @param gid - GraphQL GID (e.g., "gid://shopify/Product/123456")
 * @returns Numeric ID as number
 */
export function gidToRestId(gid: string): number {
  const parts = gid.split('/');
  const numericId = parts[parts.length - 1];
  return parseInt(numericId, 10);
}

// ============= GRAPHQL REQUEST HELPER =============

export interface ShopifyGraphQLError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: any;
  };
}

export interface ShopifyUserError {
  field?: string[];
  message: string;
}

export interface ShopifyGraphQLResponse<T = any> {
  data?: T;
  errors?: ShopifyGraphQLError[];
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

/**
 * Makes a GraphQL request to Shopify Admin API
 * @param storeUrl - Store URL (e.g., "store-name.myshopify.com")
 * @param accessToken - Shopify access token
 * @param query - GraphQL query or mutation string
 * @param variables - GraphQL variables object
 * @returns GraphQL response data
 * @throws Error if request fails or contains errors
 */
export async function shopifyGraphQL<T = any>(
  storeUrl: string,
  accessToken: string,
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const apiVersion = '2025-01'; // Latest stable API version
  const url = `https://${storeUrl}/admin/api/${apiVersion}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify GraphQL HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result: ShopifyGraphQLResponse<T> = await response.json();

  // Handle GraphQL-level errors
  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map((e) => e.message).join(', ');
    throw new Error(`Shopify GraphQL errors: ${errorMessages}`);
  }

  // Log rate limit info if available
  if (result.extensions?.cost) {
    const { currentlyAvailable, maximumAvailable } = result.extensions.cost.throttleStatus;
    console.log(`[GraphQL] Rate limit: ${currentlyAvailable}/${maximumAvailable} points available`);
  }

  return result.data as T;
}

// ============= USER ERROR HANDLING =============

/**
 * Checks and throws user errors from GraphQL mutations
 * @param userErrors - Array of user errors from mutation response
 * @param operationName - Name of the operation for error context
 * @throws Error if userErrors exist
 */
export function handleUserErrors(userErrors: ShopifyUserError[] | undefined, operationName: string): void {
  if (userErrors && userErrors.length > 0) {
    const errorMessages = userErrors
      .map((e) => `${e.field?.join('.')} : ${e.message}`)
      .join(', ');
    throw new Error(`${operationName} failed: ${errorMessages}`);
  }
}

// ============= PAGINATION HELPERS =============

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

/**
 * Extracts nodes from a GraphQL connection response
 * @param connection - GraphQL connection object with edges
 * @returns Array of node objects
 */
export function extractNodes<T>(connection: { edges: Array<{ node: T }> }): T[] {
  return connection.edges.map((edge) => edge.node);
}

/**
 * Helper to fetch all pages of a paginated GraphQL query
 * @param fetchPage - Function to fetch a single page with cursor
 * @param maxPages - Maximum number of pages to fetch (safety limit)
 * @returns Array of all nodes from all pages
 */
export async function fetchAllPages<T>(
  fetchPage: (cursor?: string) => Promise<{ nodes: T[]; pageInfo: PageInfo }>,
  maxPages: number = 100
): Promise<T[]> {
  const allNodes: T[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const { nodes, pageInfo } = await fetchPage(cursor);
    allNodes.push(...nodes);
    
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
      break;
    }
    
    cursor = pageInfo.endCursor;
    pageCount++;
  }

  return allNodes;
}

// ============= COMMON GRAPHQL QUERIES =============

/**
 * GraphQL query to fetch product by ID with full details
 */
export const PRODUCT_BY_ID_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      handle
      status
      vendor
      productType
      tags
      seo {
        title
        description
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            sku
            inventoryQuantity
            weight
            weightUnit
            barcode
            availableForSale
          }
        }
      }
      images(first: 250) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      metafields(first: 50) {
        edges {
          node {
            id
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch products with pagination
 */
export const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          descriptionHtml
          handle
          status
          vendor
          productType
          tags
          seo {
            title
            description
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                inventoryQuantity
              }
            }
          }
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * GraphQL mutation to update product
 */
export const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to delete product
 */
export const PRODUCT_DELETE_MUTATION = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

// ============= ADDITIONAL QUERIES FOR MIGRATION =============

/**
 * GraphQL query to get products count
 */
export const PRODUCTS_COUNT_QUERY = `
  query getProductsCount {
    productsCount(limit: null) {
      count
    }
  }
`;

/**
 * GraphQL query to fetch all product IDs with pagination (for sync/cleanup)
 */
export const PRODUCTS_IDS_QUERY = `
  query getProductIds($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * GraphQL query to check if product exists
 */
export const PRODUCT_EXISTS_QUERY = `
  query productExists($id: ID!) {
    product(id: $id) {
      id
    }
  }
`;

/**
 * GraphQL query to fetch product with variants for pricing sync
 */
export const PRODUCT_VARIANTS_QUERY = `
  query getProductVariants($id: ID!) {
    product(id: $id) {
      id
      title
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            inventoryItem {
              id
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL mutation to update variant pricing
 */
export const VARIANT_UPDATE_MUTATION = `
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
        id
        price
        compareAtPrice
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to update inventory item cost
 */
export const INVENTORY_ITEM_UPDATE_MUTATION = `
  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem {
        id
        unitCost {
          amount
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to update product title and body HTML
 */
export const PRODUCT_UPDATE_FULL_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Fetch all product IDs from Shopify using pagination
 */
export async function fetchAllProductIds(
  storeUrl: string,
  accessToken: string
): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | undefined;
  let hasNext = true;

  while (hasNext) {
    const result = await shopifyGraphQL<{
      products: {
        edges: Array<{ node: { id: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(storeUrl, accessToken, PRODUCTS_IDS_QUERY, { first: 250, after: cursor });

    for (const edge of result.products.edges) {
      ids.push(gidToRestId(edge.node.id));
    }

    hasNext = result.products.pageInfo.hasNextPage;
    cursor = result.products.pageInfo.endCursor;

    // Rate limit
    if (hasNext) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return ids;
}

/**
 * Check if a product exists in Shopify
 */
export async function productExists(
  storeUrl: string,
  accessToken: string,
  shopifyId: number
): Promise<boolean> {
  try {
    const gid = restIdToGid(shopifyId, 'Product');
    const result = await shopifyGraphQL<{ product: { id: string } | null }>(
      storeUrl,
      accessToken,
      PRODUCT_EXISTS_QUERY,
      { id: gid }
    );
    return result.product !== null;
  } catch {
    return false;
  }
}
