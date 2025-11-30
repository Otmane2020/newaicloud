import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateImportProducts } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  weight: number | null;
  weight_unit: string;
  barcode: string | null;
  image_id: number | null;
  image_url: string | null;  // NEW: Direct image URL from GraphQL variant.image
  cost_price: number | null;
}

interface ShopifyImage {
  id: number;
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  tags: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

interface RequestBody {
  shopName: string;
  apiKey?: string;
  apiSecret?: string;
  storeId?: string;
  autoImport?: boolean;  // 🆕 Flag pour mode auto-import
  maxProducts?: number;  // 🆕 Limite explicite
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

// --- FIX: Extraction correcte ID Shopify (GID -> numeric) ---
// Supports all Shopify GID formats: ProductImage, Image, MediaImage, Product, ProductVariant
function extractNumericId(gid: string | null): number | null {
  if (!gid) return null;
  // Match any Shopify GID format: gid://shopify/Type/12345
  const match = gid.match(/(ProductImage|Image|MediaImage|Product|ProductVariant)\/(\d+)/);
  return match ? parseInt(match[2]) : null;
}

// --- FIX: Normaliseur d'URL Shopify (évite faux doublons) ---
function cleanUrl(url: string): string {
  return url.split("?")[0].trim().toLowerCase();
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel=\"next\"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  let importJob: any = null;

  try {
    console.log('🚀 Starting import-products function');
    
    // Use the already-parsed body
    const { serviceMode, userId: serviceModeUserId } = body;
    
    const authHeader = req.headers.get('Authorization');
    
    // Service mode: use provided userId without JWT validation
    let user: any;
    let supabaseClient: any;
    let token: string | null = null;
    
    if (serviceMode === true && serviceModeUserId) {
      console.log('[IMPORT-PRODUCTS] 🔧 SERVICE MODE: Using provided userId:', serviceModeUserId);
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      user = { id: serviceModeUserId };
      // No token in service mode
    } else {
      // Normal mode: require JWT authentication
      if (!authHeader) {
        console.error('❌ No authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      token = authHeader.replace('Bearer ', '');
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      console.log('🔑 Authenticating user...');
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !authUser) {
        console.error('❌ Authentication failed:', authError);
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      user = authUser;
    }
    
    // Get auto-import config
    const autoImportLimit = body.autoImportLimit;
    const skipNotification = body.skipNotification;
    
    console.log('📦 Import config:', { autoImportLimit, skipNotification });

    // 📥 Log detailed request information
    console.log('📥 Request body received:', {
      shopName: body.shopName ? `✅ Present (${body.shopName})` : '❌ Missing',
      apiKey: body.apiKey ? `✅ Present (length: ${body.apiKey.length})` : '⚠️  Not provided (OAuth)',
      apiSecret: body.apiSecret ? `✅ Present (length: ${body.apiSecret.length}, starts with: ${body.apiSecret.substring(0, 10)}...)` : '❌ Missing or empty',
      storeId: body.storeId ? `✅ Present (${body.storeId})` : '⚠️  Not provided',
      allKeys: Object.keys(body)
    });

    // Validate input
    const validation = validateImportProducts(body);
    if (!validation.success || !validation.data) {
      console.error('❌ Validation errors:', validation.errors);
      console.error('📋 Failed validation for:', {
        shopName: body.shopName,
        apiKeyPresent: !!body.apiKey,
        apiSecretPresent: !!body.apiSecret,
        apiSecretType: typeof body.apiSecret,
        storeId: body.storeId
      });
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { shopName, apiKey, apiSecret, storeId } = validation.data;
    
    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    const syncMode = body.syncMode || 'smart'; // Default to smart mode
    
    console.log('🔄 Sync mode:', syncMode);
    
    // Determine authentication method and get access token
    const isManualAuth = !!apiKey;
    let authToken = apiSecret || '';
    
    // If using OAuth (storeId provided), fetch access token from database
    if (storeId && !authToken) {
      console.log('🔍 Fetching access token from database for storeId:', storeId);
      
      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { data: connection, error: connectionError } = await supabaseServiceClient
        .from('shopify_connections')
        .select('access_token, store_url, user_id')
        .eq('id', storeId)
        .single();
      
      console.log('📊 Connection query result:', {
        found: !!connection,
        error: connectionError?.message,
        userId: connection?.user_id,
        expectedUserId: user.id,
        hasToken: !!connection?.access_token
      });
      
      if (connectionError) {
        console.error('❌ Database error fetching connection:', connectionError);
        return new Response(
          JSON.stringify({ error: `Database error: ${connectionError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (!connection) {
        console.error('❌ No connection found with storeId:', storeId);
        return new Response(
          JSON.stringify({ error: 'Store connection not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (connection.user_id !== user.id) {
        console.error('❌ Store does not belong to user');
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to store' }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      authToken = connection.access_token;
      console.log('✅ Using OAuth access token from database (length:', authToken?.length, ')');
    }
    
    if (!authToken) {
      console.error('No access token available');
      return new Response(
        JSON.stringify({ error: 'No access token available' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log('🔐 Authentication method:', {
      type: isManualAuth ? 'Manual (API Key + Secret)' : 'OAuth',
      hasApiKey: !!apiKey,
      hasAccessToken: !!authToken
    });

    // Create service role client for database operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create import job
    const { data: jobData, error: jobError } = await supabaseServiceClient
      .from('import_jobs')
      .insert({
        user_id: user.id,
        store_id: storeId || null,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError || !jobData) {
      console.error('Failed to create import job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create import job' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    importJob = jobData;
    console.log('Import job created:', importJob.id);

    // Verify store ownership if storeId is provided
    if (storeId) {
      const { data: store, error: storeError } = await supabaseServiceClient
        .from('shopify_connections')
        .select('user_id')
        .eq('id', storeId)
        .maybeSingle();

      if (storeError) {
        console.error('Store query error:', storeError);
        return new Response(
          JSON.stringify({ error: 'Error verifying store ownership' }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!store) {
        console.error('Store not found with id:', storeId);
        return new Response(
          JSON.stringify({ error: 'Store not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (store.user_id !== user.id) {
        console.error('User does not own this store');
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to store' }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const cleanShopName = shopName.replace(".myshopify.com", "");
    const startTime = new Date().toISOString();

    // Fetch shop details to get currency using GraphQL
    let shopCurrency = 'USD';
    try {
      const shopQuery = `
        query {
          shop {
            currencyCode
          }
        }
      `;

      const shopResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2025-07/graphql.json`,
        {
          method: 'POST',
          headers: {
            "X-Shopify-Access-Token": authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: shopQuery })
        }
      );

      if (shopResponse.ok) {
        const shopData: any = await shopResponse.json();
        shopCurrency = shopData.data?.shop?.currencyCode || 'USD';
        console.log(`Shop currency detected: ${shopCurrency}`);
      }
    } catch (error) {
      console.log('Could not fetch shop currency, using USD as default');
    }

    // Update store currency if storeId is provided
    if (storeId) {
      await supabaseServiceClient
        .from('shopify_connections')
        .update({ store_url: `${cleanShopName}.myshopify.com` })
        .eq('id', storeId);
    }

    // Only check limits if we have a token (not in service mode)
    let limitsData: any = null;
    if (token) {
      const { data, error: limitsError } = await supabaseServiceClient.functions.invoke(
        'check-usage-limits',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (limitsError) {
        console.error('❌ Error fetching limits:', limitsError);
        throw new Error('Failed to fetch usage limits');
      }
      limitsData = data;
    } else {
      // Service mode: get limits from profile directly
      const { data: profile } = await supabaseServiceClient
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      
      const { data: plan } = await supabaseServiceClient
        .from('subscription_plans')
        .select('max_products')
        .eq('id', profile?.current_plan_id)
        .single();
      
      limitsData = { limits: { max_products: plan?.max_products || 100 } };
    }

    console.log('📊 Raw limitsData:', JSON.stringify(limitsData, null, 2));

    // CRITICAL: Respect the actual limit from the plan (10 for trial, 100 for paid)
    const maxProducts = limitsData?.limits?.max_products || 10;
    const isTrialing = limitsData?.isTrialing || false;
    
    console.log(`📊 User plan info:`);
    console.log(`   - Plan type: ${isTrialing ? '🔴 TRIAL' : '🟢 PAID'}`);
    console.log(`   - Max products from limits: ${maxProducts}`);
    console.log(`   - Full limits object:`, limitsData?.limits);
    
    // Count actual products from database for accuracy
    const { count: actualProductCount } = await supabaseServiceClient
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);
    
    const currentProductsCount = actualProductCount || 0;
    
    // Verify consistency with usage_tracking
    const trackedCount = limitsData?.usage?.products_count || 0;
    if (trackedCount !== currentProductsCount) {
      console.warn(`⚠️ Inconsistency detected: usage_tracking shows ${trackedCount} but actual count is ${currentProductsCount}. Using actual count.`);
      
      // Auto-correct usage_tracking
      const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
      await supabaseServiceClient
        .from('usage_tracking')
        .update({ 
          products_count: currentProductsCount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id)
        .eq('month', currentMonth);
      
      console.log(`✅ Corrected usage_tracking to ${currentProductsCount} products`);
    }
    
    const availableSlots = Math.max(0, maxProducts - currentProductsCount);

    console.log(`📊 État des quotas:`);
    console.log(`   - Produits actuels en DB: ${currentProductsCount}/${maxProducts}`);
    console.log(`   - Slots disponibles pour import: ${availableSlots}`);

    // Get total product count from Shopify first using GraphQL
    let totalShopifyProducts = 0;
    try {
      const countQuery = `
        query {
          productsCount {
            count
          }
        }
      `;

      const countResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2025-07/graphql.json`,
        {
          method: 'POST',
          headers: {
            "X-Shopify-Access-Token": authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: countQuery })
        }
      );
      if (countResponse.ok) {
        const countData: any = await countResponse.json();
        totalShopifyProducts = countData.data?.productsCount?.count || 0;
        console.log(`📊 Total products in Shopify store: ${totalShopifyProducts}`);
      }
    } catch (error) {
      console.error('Error getting product count:', error);
    }

    let allProducts: ShopifyProduct[] = [];
    
    // Use available slots as the limit for this import batch
    // This respects the user's plan limit (10 for trial, 100 for starter, 2000 for pro, etc.)
    const batchSize = 50; // Shopify API batch size
    const effectiveLimit = Math.min(availableSlots, batchSize);
    
    console.log(`📦 [IMPORT] Importing up to ${availableSlots} products (plan limit: ${maxProducts})`);
    console.log(`   - Current products: ${currentProductsCount}`);
    console.log(`   - Available slots: ${availableSlots}`);
    console.log(`   - Batch size: ${batchSize}`);
    
    let pageCount = 0;
    let quotaReached = false;
    let cursor: string | null = null;
    let hasNextPage = true;

    console.log(`🚀 Starting GraphQL import from ${cleanShopName}`);

    while (hasNextPage && !quotaReached) {
      pageCount++;
      console.log(`Fetching page ${pageCount} via GraphQL${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);

      // GraphQL query to fetch products with all necessary fields
      const graphqlQuery = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                legacyResourceId
                title
                descriptionHtml
                handle
                vendor
                productType
                status
                tags
                variants(first: 100) {
                  edges {
                    node {
                      id
                      legacyResourceId
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                      inventoryItem {
                        unitCost {
                          amount
                        }
                      }
                      image {
                        id
                        url
                        altText
                      }
                    }
                  }
                }
                images(first: 50) {
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
                seo {
                  title
                  description
                }
              }
            }
          }
        }
      `;

      const shopifyResponse: Response = await fetch(`https://${cleanShopName}.myshopify.com/admin/api/2025-07/graphql.json`, {
        method: 'POST',
        headers: {
          "X-Shopify-Access-Token": authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: {
            first: batchSize,
            after: cursor
          }
        })
      });

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error("Shopify GraphQL API Error:", errorText);
        return new Response(
          JSON.stringify({
            error: `Failed to fetch products from Shopify: ${shopifyResponse.statusText}`,
          }),
          {
            status: shopifyResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const graphqlData: any = await shopifyResponse.json();
      
      if (graphqlData.errors) {
        console.error("GraphQL Errors:", graphqlData.errors);
        return new Response(
          JSON.stringify({
            error: `GraphQL error: ${graphqlData.errors.map((e: any) => e.message).join(', ')}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Transform GraphQL response to match REST format
      const pageProducts = graphqlData.data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: parseInt(node.legacyResourceId),
          title: node.title,
          body_html: node.descriptionHtml,
          handle: node.handle,
          vendor: node.vendor,
          product_type: node.productType,
          status: node.status.toLowerCase(),
          tags: node.tags.join(','),
          variants: node.variants.edges.map((v: any) => {
            const options = v.node.selectedOptions || [];
            // FIX: Use extractNumericId for proper GID parsing
            const variantImageId = extractNumericId(v.node.image?.id || null);
            return {
              id: parseInt(v.node.legacyResourceId),
              title: v.node.title || 'Default',
              sku: v.node.sku || null,
              price: v.node.price,
              compare_at_price: v.node.compareAtPrice,
              inventory_quantity: v.node.inventoryQuantity || 0,
              option1: options[0]?.value || null,
              option2: options[1]?.value || null,
              option3: options[2]?.value || null,
              cost_price: v.node.inventoryItem?.unitCost?.amount ? parseFloat(v.node.inventoryItem.unitCost.amount) : null,
              // Direct variant image from GraphQL
              image_id: variantImageId,
              image_url: v.node.image?.url || null
            };
          }),
          images: node.images.edges.map((i: any) => {
            // FIX: Use extractNumericId for proper GID parsing
            const numericId = extractNumericId(i.node.id) || 0;
            return {
              id: numericId,
              src: i.node.url,
              alt: i.node.altText,
              width: i.node.width,
              height: i.node.height
            };
          }),
          metafields_global_title_tag: node.seo?.title,
          metafields_global_description_tag: node.seo?.description
        };
      });

      hasNextPage = graphqlData.data.products.pageInfo.hasNextPage;
      cursor = graphqlData.data.products.pageInfo.endCursor;

      console.log(`Page ${pageCount}: Fetched ${pageProducts.length} products via GraphQL`);
      
      // Vérifier si l'ajout de ces produits dépasserait la limite TOTALE
      const totalIfAdded = currentProductsCount + allProducts.length + pageProducts.length;
      
      console.log(`   📦 Produits sur cette page: ${pageProducts.length}`);
      console.log(`   📥 Produits déjà récupérés: ${allProducts.length}`);
      console.log(`   📊 Total si ajouté: ${totalIfAdded}/${maxProducts}`);
      
      if (totalIfAdded > maxProducts) {
        // Calculer combien de produits on peut encore ajouter
        const remainingSlots = Math.max(0, maxProducts - currentProductsCount - allProducts.length);
        
        if (remainingSlots > 0) {
          allProducts = allProducts.concat(pageProducts.slice(0, remainingSlots));
        }
        
        quotaReached = true;
        console.log(`⚠️ Quota atteint. Total: ${currentProductsCount + allProducts.length}/${maxProducts}`);
        console.log(`   - Produits existants: ${currentProductsCount}`);
        console.log(`   - Produits importés: ${allProducts.length}`);
        break;
      }
      
      allProducts = allProducts.concat(pageProducts);

      // Update job progress
      const estimatedTotalPages = hasNextPage ? pageCount + 10 : pageCount;
      await supabaseServiceClient
        .from('import_jobs')
        .update({
          current_page: pageCount,
          total_pages: estimatedTotalPages,
          products_processed: allProducts.length
        })
        .eq('id', importJob.id);

      if (hasNextPage && !quotaReached) {
        console.log(`Next page available, continuing with cursor...`);
        // Réduire le délai pour accélérer l'import
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    let products = allProducts;
    
    console.log(`Total products to import: ${products.length} (fetched across ${pageCount} pages)`);

    if (products.length === 0) {
      await supabaseServiceClient
        .from('import_jobs')
        .update({
          status: 'completed',
          total_pages: pageCount,
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);

      return new Response(
        JSON.stringify({ 
          count: 0, 
          message: "No products found in store",
          jobId: importJob.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch existing products to check optimization status (for smart mode)
    // Filter out any invalid products
    const validProducts = products.filter(p => p && p.id);
    const existingProductIds = validProducts.map(p => p.id);
    
    if (validProducts.length !== products.length) {
      console.warn(`⚠️ Filtered out ${products.length - validProducts.length} invalid products`);
    }
    
    products = validProducts; // Update products to only include valid ones
    
    // Fetch existing products in batches to avoid timeout
    const FETCH_BATCH_SIZE = 100;
    const existingProducts: any[] = [];
    const fetchBatches = Math.ceil(existingProductIds.length / FETCH_BATCH_SIZE);
    
    console.log(`🔍 Fetching existing products in ${fetchBatches} batches...`);
    
    for (let i = 0; i < existingProductIds.length; i += FETCH_BATCH_SIZE) {
      const batchIds = existingProductIds.slice(i, i + FETCH_BATCH_SIZE);
      const batchNumber = Math.floor(i / FETCH_BATCH_SIZE) + 1;
      
      console.log(`🔍 Fetching batch ${batchNumber}/${fetchBatches} (${batchIds.length} products)`);
      
      const { data, error } = await supabaseServiceClient
        .from('shopify_products')
        .select('shopify_id, optimization_count, title, description, seo_title, seo_description')
        .in('shopify_id', batchIds)
        .eq('seller_id', user.id);
      
      if (error) {
        console.error(`❌ Error fetching existing products batch ${batchNumber}:`, error);
      } else if (data) {
        existingProducts.push(...data);
      }
      
      // Small delay between fetches
      if (i + FETCH_BATCH_SIZE < existingProductIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const existingMap = new Map(existingProducts.map(p => [p.shopify_id, p]));
    
    console.log(`🔍 Found ${existingProducts.length} existing products in DB`);
    console.log(`🤖 Smart mode: ${syncMode === 'smart' ? 'ENABLED' : 'DISABLED'}`);
    
    const productsToInsert = products.map((product) => {
      const firstVariant = product.variants?.[0] || {} as ShopifyVariant;
      const firstImage = product.images?.[0];
      const totalInventory = product.variants?.reduce(
        (sum, v) => sum + (v.inventory_quantity || 0),
        0
      ) || 0;
      
      const existing = existingMap.get(product.id);
      const isOptimized = existing && existing.optimization_count > 0;
      
      // In smart mode, protect optimized content
      const shouldProtect = syncMode === 'smart' && isOptimized;
      
      if (shouldProtect) {
        console.log(`🛡️ Protecting optimized content for product ${product.id} (${existing?.title})`);
      }

      return {
        seller_id: user.id,
        store_id: storeId || null,
        shopify_id: product.id,
        // Protect optimized content if in smart mode and product is optimized
        title: shouldProtect ? existing.title : product.title,
        description: shouldProtect ? existing.description : (product.body_html || ""),
        body_html: product.body_html || "",
        vendor: product.vendor || "",
        product_type: product.product_type || "",
        handle: product.handle || "",
        status: product.status || "active",
        tags: product.tags || "",
        seo_title: shouldProtect ? existing.seo_title : (product.metafields_global_title_tag || product.title),
        seo_description: shouldProtect ? existing.seo_description : (
          product.metafields_global_description_tag || 
          product.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || 
          `Découvrez ${product.title}`
        ),
        image_url: firstImage?.src || "",
        price: parseFloat(firstVariant.price || "0"),
        compare_at_price: firstVariant.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null,
        inventory_quantity: totalInventory,
        currency: shopCurrency,
        raw_data: product,
        shop_name: cleanShopName,
        // Preserve optimization count only in smart mode for already optimized products
        ...(existing && syncMode === 'smart' ? { optimization_count: existing.optimization_count } : { optimization_count: 0 })
      };
    });

    // Insert products in batches to avoid timeout
    const BATCH_SIZE = 50; // Reduced from 100 to 50 for better reliability
    const productIdMap = new Map<string, string>();
    const totalBatches = Math.ceil(productsToInsert.length / BATCH_SIZE);
    
    console.log(`📦 Inserting ${productsToInsert.length} products in ${totalBatches} batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
      const batch = productsToInsert.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`🔄 Processing product batch ${batchNumber}/${totalBatches} (${batch.length} products)`);
      
      const { data: upsertedProducts, error: insertError } = await supabaseServiceClient
        .from("shopify_products")
        .upsert(batch, {
          onConflict: "shopify_id,seller_id",
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error(`❌ Database insert error in batch ${batchNumber}:`, insertError);
        
        // Update job status with error
        await supabaseServiceClient
          .from('import_jobs')
          .update({
            status: 'failed',
            error_message: `Failed at batch ${batchNumber}/${totalBatches}: ${insertError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', importJob.id);
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to save products (batch ${batchNumber}/${totalBatches}): ${insertError.message}`,
            batch: batchNumber,
            totalBatches
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Map product IDs from this batch
      if (upsertedProducts) {
        upsertedProducts.forEach((p: any) => {
          productIdMap.set(String(p.shopify_id), String(p.id));
        });
      }
      
      // Update import job progress
      await supabaseServiceClient
        .from('import_jobs')
        .update({
          products_processed: Math.min(i + BATCH_SIZE, productsToInsert.length)
        })
        .eq('id', importJob.id);
      
      console.log(`✅ Batch ${batchNumber}/${totalBatches} completed`);
      
      // Increased delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < productsToInsert.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    let totalVariants = 0;
    let totalImages = 0;

    // Collect all variants and images first
    const allVariants: any[] = [];
    const allImages: any[] = [];

    for (const product of products) {
      const productId = productIdMap.get(String(product.id));
      if (!productId) {
        console.warn(`⚠️ No mapping found for product ID ${product.id} (type: ${typeof product.id})`);
        continue;
      }

      if (product.variants && product.variants.length > 0) {
        const variantsToInsert = product.variants.map((variant) => {
          // Robust SKU handling - handle string, number, null, undefined
          let variantSku: string | null = null;
          if (variant.sku !== null && variant.sku !== undefined) {
            const skuStr = String(variant.sku).trim();
            variantSku = skuStr.length > 0 ? skuStr : null;
          }
          
          return {
            product_id: productId,
            shopify_variant_id: variant.id,
            sku: variantSku,
            title: variant.title || "Default",
            option1: variant.option1 || "",
            option2: variant.option2 || "",
            option3: variant.option3 || "",
            price: parseFloat(variant.price || "0"),
            compare_at_price: variant.compare_at_price
              ? parseFloat(variant.compare_at_price)
              : null,
            cost_price: variant.cost_price || null,
            inventory_quantity: variant.inventory_quantity || 0,
            weight: variant.weight,
            weight_unit: variant.weight_unit || "kg",
            barcode: variant.barcode || "",
            currency: shopCurrency,
            // FIX: Use nullish coalescing for proper fallback chain
            image_url:
              variant.image_url ??
              (variant.image_id
                ? product.images.find(img => img.id === variant.image_id)?.src
                : "") ??
              "",
            raw_data: variant,
          };
        });

        allVariants.push(...variantsToInsert);
      }

      if (product.images && product.images.length > 0) {
        const imagesToInsert = product.images.map((image, index) => ({
          product_id: productId,
          // image.id is already numeric from GraphQL transformation (line 677)
          shopify_image_id: image.id,
          src: image.src,
          position: index + 1,
          alt_text: (image as any).alt || "",
          width: (image as any).width || null,
          height: (image as any).height || null,
        }));

        allImages.push(...imagesToInsert);
      }

      // Also add variant-specific images if they're not in the main images array
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.image_id) {
            // Check if this image is already in allImages
            const imageExists = allImages.some(
              img => img.shopify_image_id === variant.image_id && img.product_id === productId
            );
            
            if (!imageExists) {
              // Find the image in product.images or use variant's own image data
              const variantImage = product.images.find(img => img.id === variant.image_id);
              if (variantImage) {
                allImages.push({
                  product_id: productId,
                  // variantImage.id is already numeric from GraphQL transformation
                  shopify_image_id: variantImage.id,
                  src: variantImage.src,
                  position: allImages.filter(i => i.product_id === productId).length + 1,
                  alt_text: (variantImage as any).alt || `${product.title} - ${variant.title}`,
                  width: (variantImage as any).width || null,
                  height: (variantImage as any).height || null,
                });
              }
            }
          }
        }
      }
    }
    
    // 🆕 CRITICAL FIX: Also fetch images for existing products with 0 images
    // This handles products that were imported before but had their images deleted during cleanup
    console.log(`🔍 Checking for existing products with 0 images...`);
    
    const { data: productsWithNoImages, error: noImgError } = await supabaseServiceClient
      .from('shopify_products')
      .select('id, shopify_id, title')
      .eq('store_id', storeId)
      .not('shopify_id', 'is', null);
    
    if (noImgError) {
      console.error(`⚠️ Error fetching products:`, noImgError);
    } else if (productsWithNoImages && productsWithNoImages.length > 0) {
      // Get image counts for these products - BATCHED to avoid "Bad Request" on large arrays
      const productIds = productsWithNoImages.map(p => p.id);
      const QUERY_BATCH_SIZE = 500;
      let allImageCounts: { product_id: string }[] = [];
      
      console.log(`📊 Checking image counts for ${productIds.length} products in batches of ${QUERY_BATCH_SIZE}`);
      
      for (let i = 0; i < productIds.length; i += QUERY_BATCH_SIZE) {
        const batchIds = productIds.slice(i, i + QUERY_BATCH_SIZE);
        const { data: imageCounts, error: imgCountError } = await supabaseServiceClient
          .from('product_images')
          .select('product_id')
          .in('product_id', batchIds);
        
        if (imgCountError) {
          console.error(`⚠️ Error fetching image counts batch ${Math.floor(i/QUERY_BATCH_SIZE)+1}:`, imgCountError);
        } else if (imageCounts) {
          allImageCounts.push(...imageCounts);
        }
      }
      
      const productsWithImageSet = new Set(allImageCounts.map(i => i.product_id));
      const productsNeedingImages = productsWithNoImages.filter(p => !productsWithImageSet.has(p.id));
      
      if (productsNeedingImages.length > 0) {
        console.log(`🖼️ Found ${productsNeedingImages.length} products with 0 images - fetching ALL from Shopify...`);
        
        // Fetch images in batches of 50 products using GraphQL (no limit)
        const FETCH_BATCH_SIZE = 50;
        let imagesFetched = 0;
        const totalBatchCount = Math.ceil(productsNeedingImages.length / FETCH_BATCH_SIZE);
        
        for (let i = 0; i < productsNeedingImages.length; i += FETCH_BATCH_SIZE) {
          const batchNum = Math.floor(i / FETCH_BATCH_SIZE) + 1;
          const batch = productsNeedingImages.slice(i, i + FETCH_BATCH_SIZE);
          const shopifyIds = batch.map(p => `gid://shopify/Product/${p.shopify_id}`);
          
          console.log(`📸 Fetching images batch ${batchNum}/${totalBatchCount} (${batch.length} products)...`);
          
          const imageQuery = `
            query getProductImages($ids: [ID!]!) {
              nodes(ids: $ids) {
                ... on Product {
                  id
                  legacyResourceId
                  images(first: 50) {
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
                }
              }
            }
          `;
          
          try {
            const imgResponse = await fetch(`https://${cleanShopName}.myshopify.com/admin/api/2025-07/graphql.json`, {
              method: 'POST',
              headers: {
                "X-Shopify-Access-Token": authToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: imageQuery,
                variables: { ids: shopifyIds }
              })
            });
            
            if (imgResponse.ok) {
              const imgData: any = await imgResponse.json();
              
              if (imgData.data?.nodes) {
                for (const node of imgData.data.nodes) {
                  if (!node || !node.images?.edges?.length) continue;
                  
                  const shopifyId = parseInt(node.legacyResourceId);
                  const productRecord = batch.find(p => p.shopify_id === shopifyId);
                  if (!productRecord) continue;
                  
                  const productImages = node.images.edges.map((edge: any, index: number) => {
                    // FIX: Use extractNumericId for proper GID parsing
                    const numericId = extractNumericId(edge.node.id) || 0;
                    return {
                      product_id: productRecord.id,
                      shopify_image_id: numericId,
                      src: edge.node.url,
                      position: index + 1,
                      alt_text: edge.node.altText || "",
                      width: edge.node.width || null,
                      height: edge.node.height || null,
                    };
                  });
                  
                  allImages.push(...productImages);
                  imagesFetched += productImages.length;
                }
              }
            } else {
              console.error(`⚠️ GraphQL error for batch ${batchNum}:`, await imgResponse.text());
            }
          } catch (fetchError) {
            console.error(`⚠️ Error fetching images for batch ${batchNum}:`, fetchError);
          }
          
          // Small delay between batches to avoid rate limits
          if (i + FETCH_BATCH_SIZE < productsNeedingImages.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log(`✅ Fetched ${imagesFetched} images for ${productsNeedingImages.length} existing products with 0 images`);
      }
    }

    // Images are now handled properly with shopify_image_id as the primary key
    // for Shopify images, and URL comparison for generated images
    // Insert variants in batches
    if (allVariants.length > 0) {
      const VARIANT_BATCH_SIZE = 500;
      const variantBatches = Math.ceil(allVariants.length / VARIANT_BATCH_SIZE);
      
      console.log(`📦 Inserting ${allVariants.length} variants in ${variantBatches} batches`);
      
      for (let i = 0; i < allVariants.length; i += VARIANT_BATCH_SIZE) {
        const batch = allVariants.slice(i, i + VARIANT_BATCH_SIZE);
        const batchNumber = Math.floor(i / VARIANT_BATCH_SIZE) + 1;
        
        console.log(`🔄 Processing variant batch ${batchNumber}/${variantBatches}`);
        
        const { error: variantError } = await supabaseServiceClient
          .from("product_variants")
          .upsert(batch, {
            onConflict: "shopify_variant_id",
            ignoreDuplicates: false,
          });

        if (variantError) {
          console.error(`❌ Variant insert error in batch ${batchNumber}:`, variantError);
        } else {
          totalVariants += batch.length;
          console.log(`✅ Variant batch ${batchNumber}/${variantBatches} completed`);
        }
        
        if (i + VARIANT_BATCH_SIZE < allVariants.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Insert images in batches - NEW STRATEGY: Delete existing then insert fresh
    if (allImages.length > 0) {
      console.log(`📦 Processing ${allImages.length} images for import`);
      
      // Get unique product IDs that have images to import
      const productIdsWithImages = [...new Set(allImages.map(img => img.product_id))];
      console.log(`📊 Products with images to sync: ${productIdsWithImages.length}`);
      
      // Helper to check if URL is from Shopify CDN (not a generated image)
      const isShopifyCdnUrl = (url: string) => url.includes('cdn.shopify.com');
      
      // STEP 1: Fetch existing images to preserve ONLY truly generated/optimized ones
      // BATCHED to avoid "Bad Request" error on large arrays (>500 IDs)
      const QUERY_BATCH_SIZE = 500;
      let existingImages: any[] = [];
      
      console.log(`📊 Fetching existing images for ${productIdsWithImages.length} products in batches of ${QUERY_BATCH_SIZE}`);
      
      for (let i = 0; i < productIdsWithImages.length; i += QUERY_BATCH_SIZE) {
        const batchIds = productIdsWithImages.slice(i, i + QUERY_BATCH_SIZE);
        const batchNum = Math.floor(i / QUERY_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(productIdsWithImages.length / QUERY_BATCH_SIZE);
        
        const { data: batchImages, error: fetchBatchError } = await supabaseServiceClient
          .from("product_images")
          .select("id, product_id, src, shopify_image_id, alt_text, optimization_count")
          .in("product_id", batchIds);
        
        if (fetchBatchError) {
          console.error(`⚠️ Error fetching existing images batch ${batchNum}/${totalBatches}:`, fetchBatchError);
        } else if (batchImages) {
          existingImages.push(...batchImages);
          console.log(`✅ Fetched batch ${batchNum}/${totalBatches}: ${batchImages.length} existing images`);
        }
      }
      
      console.log(`📊 Total existing images found: ${existingImages.length}`)
      
      // STEP 2: Identify images to PRESERVE (truly generated, not Shopify CDN)
      // An image is "generated" if it's NOT from Shopify CDN (e.g., from our storage bucket)
      const preservedImages: any[] = [];
      const imagesToDelete: string[] = [];
      
      if (existingImages) {
        for (const img of existingImages) {
          const isFromShopify = isShopifyCdnUrl(img.src);
          
          // Preserve ONLY if:
          // 1. NOT from Shopify CDN (truly generated/local image)
          // 2. OR has optimization_count > 0 (was optimized, even if from Shopify)
          if (!isFromShopify || img.optimization_count > 0) {
            preservedImages.push(img);
          } else {
            // Delete Shopify CDN images (will be re-imported fresh)
            imagesToDelete.push(img.id);
          }
        }
      }
      
      console.log(`🔒 Preserving ${preservedImages.length} generated/optimized images`);
      console.log(`🗑️ Will delete ${imagesToDelete.length} Shopify CDN images for fresh import`);
      
      // STEP 3: Delete Shopify CDN images - BATCHED to avoid "Bad Request" on large arrays
      if (imagesToDelete.length > 0) {
        const DELETE_BATCH_SIZE = 500;
        const deleteBatches = Math.ceil(imagesToDelete.length / DELETE_BATCH_SIZE);
        let deletedCount = 0;
        
        console.log(`🗑️ Deleting ${imagesToDelete.length} Shopify CDN images in ${deleteBatches} batches`);
        
        for (let i = 0; i < imagesToDelete.length; i += DELETE_BATCH_SIZE) {
          const batchIds = imagesToDelete.slice(i, i + DELETE_BATCH_SIZE);
          const batchNum = Math.floor(i / DELETE_BATCH_SIZE) + 1;
          
          const { error: deleteError } = await supabaseServiceClient
            .from("product_images")
            .delete()
            .in("id", batchIds);
          
          if (deleteError) {
            console.error(`⚠️ Error deleting images batch ${batchNum}/${deleteBatches}:`, deleteError);
          } else {
            deletedCount += batchIds.length;
            console.log(`✅ Deleted batch ${batchNum}/${deleteBatches}: ${batchIds.length} images`);
          }
        }
        
        console.log(`✅ Total deleted: ${deletedCount} old Shopify images`);
      }
      
      // STEP 4: Build set of preserved image URLs to avoid duplicates
      const existingUrlsByProduct = new Map<string, Set<string>>();
      for (const img of preservedImages) {
        if (!existingUrlsByProduct.has(img.product_id)) {
          existingUrlsByProduct.set(img.product_id, new Set());
        }
        existingUrlsByProduct.get(img.product_id)!.add(cleanUrl(img.src));
      }
      
      // Filter images to insert - exclude those with matching URLs in preserved images
      const imagesToInsert = allImages.filter(img => {
        const existingUrls = existingUrlsByProduct.get(img.product_id);
        const normalizedSrc = cleanUrl(img.src);
        return !existingUrls || !existingUrls.has(normalizedSrc);
      });
      
      const skippedImages = allImages.length - imagesToInsert.length;
      if (skippedImages > 0) {
        console.log(`⏭️ Skipped ${skippedImages} images (already exist as generated/optimized)`);
      }
      
      // STEP 4: Insert fresh images from Shopify
      if (imagesToInsert.length > 0) {
        const IMAGE_BATCH_SIZE = 500;
        const imageBatches = Math.ceil(imagesToInsert.length / IMAGE_BATCH_SIZE);
        
        console.log(`📦 Inserting ${imagesToInsert.length} fresh Shopify images in ${imageBatches} batches`);
        
        for (let i = 0; i < imagesToInsert.length; i += IMAGE_BATCH_SIZE) {
          const batch = imagesToInsert.slice(i, i + IMAGE_BATCH_SIZE);
          const batchNumber = Math.floor(i / IMAGE_BATCH_SIZE) + 1;
          
          // Use upsert with composite constraint (product_id + shopify_image_id) to handle shared images across products
          const { error: imageError } = await supabaseServiceClient
            .from("product_images")
            .upsert(batch, { 
              onConflict: 'product_id,shopify_image_id',
              ignoreDuplicates: false // Update duplicates instead of skipping
            });

          if (imageError) {
            console.error(`❌ Image upsert error in batch ${batchNumber}:`, imageError);
            // Log the first failing image for debugging
            if (batch.length > 0) {
              console.error(`First image in batch: product_id=${batch[0].product_id}, shopify_image_id=${batch[0].shopify_image_id}`);
            }
          } else {
            totalImages += batch.length;
            console.log(`✅ Image batch ${batchNumber}/${imageBatches} completed (${batch.length} images)`);
          }
          
          if (i + IMAGE_BATCH_SIZE < imagesToInsert.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      console.log(`📊 Image import complete: ${totalImages} inserted, ${skippedImages} skipped (preserved)`);
    }

    // Insert product-collection relationships
    console.log('🔗 Creating product-collection relationships...');
    const productCollectionRelations = [];
    
    // We need to get collection_ids from the original Shopify products
    // and map them to our internal product IDs
    for (const product of products) {
      const productId = productIdMap.get(String(product.id));
      if (!productId) continue;
      
      // Get collection associations from Shopify product data
      // Note: In Shopify API, collections are not directly in product data
      // They would need to be fetched separately or included in the product query
      // For now, we'll skip this since collection_ids is stored in the array field
    }
    
    console.log(`✅ Product-collection relationships will be established via collection_ids array field`);
    
    // Count variants with image_url for diagnostics
    const variantsWithImageUrl = allVariants.filter((v: any) => v.image_url).length;
    
    console.log(`📊 Import Summary:`);
    console.log(`   - Products inserted: ${productsToInsert.length}`);
    console.log(`   - Variants inserted: ${totalVariants}`);
    console.log(`   - Variants with image_url: ${variantsWithImageUrl}`);
    console.log(`   - Images collected: ${allImages.length}`);
    console.log(`   - Images inserted: ${totalImages}`);
    console.log(`   - Total batches: ${totalBatches} (products) + ${Math.ceil(allVariants.length / 500)} (variants) + ${Math.ceil(allImages.length / 500)} (images)`);
    
    const completedAt = new Date().toISOString();

    const { error: logError } = await supabaseServiceClient
      .from("sync_logs")
      .insert({
        seller_id: user.id,
        store_id: storeId || null,
        store_name: cleanShopName,
        operation_type: "import",
        status: "success",
        products_processed: products.length,
        products_added: products.length,
        products_updated: 0,
        variants_processed: totalVariants,
        started_at: startTime,
        completed_at: completedAt,
      });

    if (logError) {
      console.error("Sync log insert error:", logError);
    }

    // Mark job as completed or quota_reached
    await supabaseServiceClient
      .from('import_jobs')
      .update({
        status: quotaReached ? 'quota_reached' : 'completed',
        total_pages: pageCount,
        products_processed: products.length,
        completed_at: new Date().toISOString(),
        error_message: quotaReached ? `Quota atteint (${maxProducts} produits max)` : null
      })
      .eq('id', importJob.id);

    // Track usage
    await supabaseServiceClient.rpc('increment_usage', {
      p_seller_id: user.id,
      p_field: 'products_count',
      p_increment: products.length
    });

    // Import pages from Shopify
    let pagesImported = 0;
    try {
      console.log('📄 Importing Shopify pages...');
      const pagesResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2025-01/pages.json?limit=250`,
        {
          headers: {
            "X-Shopify-Access-Token": authToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (pagesResponse.ok) {
        const { pages } = await pagesResponse.json();
        
        if (pages && pages.length > 0) {
          const pagesToInsert = pages.map((page: any) => ({
            user_id: user.id,
            store_id: storeId || null,
            shopify_page_id: page.id,
            title: page.title,
            body_html: page.body_html,
            handle: page.handle,
            published_at: page.published_at,
            template_suffix: page.template_suffix,
            seo_title: page.title,
            seo_description: page.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || `En savoir plus sur ${page.title}`,
            updated_at: page.updated_at,
          }));

          const { error: pagesError } = await supabaseServiceClient
            .from('shopify_pages')
            .upsert(pagesToInsert, {
              onConflict: 'shopify_page_id',
              ignoreDuplicates: false,
            });
          
          if (pagesError) {
            console.error('❌ Error inserting pages:', pagesError);
            throw pagesError;
          }
          
          pagesImported = pages.length;
          console.log(`✅ Successfully imported ${pagesImported} pages`);
        } else {
          console.log('⚠️ No pages found in Shopify');
        }
      } else {
        const errorText = await pagesResponse.text();
        console.error(`❌ Shopify pages API error: ${pagesResponse.status}`, errorText);
      }
    } catch (error) {
      console.error('❌ Error importing pages:', error);
      // Ne pas bloquer l'import si les pages échouent
    }

    // Import blog articles from Shopify
    let articlesImported = 0;
    try {
      console.log('📰 Importing Shopify blog articles...');
      const articlesInvokeBody: any = { 
        shopName: cleanShopName,
        authToken: authToken,
        storeId: storeId
      };
      
      const articlesInvokeHeaders: any = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};
      
      const articlesResult = await supabaseServiceClient.functions.invoke('import-shopify-articles', {
        body: articlesInvokeBody,
        ...articlesInvokeHeaders
      });

      if (articlesResult.data && articlesResult.data.success) {
        articlesImported = articlesResult.data.count || 0;
        console.log(`✅ Successfully imported ${articlesImported} blog articles`);
      } else if (articlesResult.error) {
        console.error('❌ Error importing articles:', articlesResult.error);
      }
    } catch (error) {
      console.error('❌ Error importing articles:', error);
      // Ne pas bloquer l'import si les articles échouent
    }

    // Calculer les statistiques détaillées
    const existingProductsSet = new Set(existingProducts?.map(p => p.shopify_id?.toString()) || []);
    const stats = {
      total: products.length,
      new: products.filter(p => !existingProductsSet.has(p.id.toString())).length,
      updated: products.filter(p => existingProductsSet.has(p.id.toString())).length,
      protected: syncMode === 'smart' ? products.filter(p => {
        const existing = existingMap.get(p.id);
        return existing && existing.optimization_count > 0;
      }).length : 0,
      skipped: 0
    };

    // 🧹 Cleanup: Delete products that no longer exist in Shopify
    console.log(`🧹 [IMPORT-PRODUCTS] Checking for deleted products...`);
    const shopifyProductIds = products.map(p => p.id);
    
    const { data: allExistingProducts, error: fetchAllError } = await supabaseServiceClient
      .from('shopify_products')
      .select('id, shopify_id, title')
      .eq('seller_id', user.id)
      .eq('store_id', storeId);
    
    if (fetchAllError) {
      console.error(`⚠️ [IMPORT-PRODUCTS] Error fetching existing products:`, fetchAllError);
    } else if (allExistingProducts) {
      const productsToDelete = allExistingProducts.filter(
        existing => !shopifyProductIds.includes(existing.shopify_id)
      );
      
      if (productsToDelete.length > 0) {
        console.log(`🗑️ [IMPORT-PRODUCTS] Found ${productsToDelete.length} products to delete:`);
        productsToDelete.forEach(p => {
          console.log(`   - ${p.title} (Shopify ID: ${p.shopify_id})`);
        });
        
        const idsToDelete = productsToDelete.map(p => p.id);
        
        // Delete related data first (variants, images)
        await supabaseServiceClient.from('product_variants').delete().in('product_id', idsToDelete);
        await supabaseServiceClient.from('product_images').delete().in('product_id', idsToDelete);
        
        // Then delete products
        const { error: deleteError } = await supabaseServiceClient
          .from('shopify_products')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error(`❌ [IMPORT-PRODUCTS] Error deleting products:`, deleteError);
        } else {
          console.log(`✅ [IMPORT-PRODUCTS] Successfully deleted ${productsToDelete.length} products`);
        }
      } else {
        console.log(`✅ [IMPORT-PRODUCTS] No products to delete`);
      }
    }

    // 🔗 Sync product-collection relationships after import (async, don't block)
    // Only if we have a token (not in service mode)
    if (token) {
      console.log(`🔗 Starting async product-collection sync for storeId: ${storeId}...`);
      supabaseClient.functions.invoke('sync-product-collections', {
        headers: { Authorization: authHeader },
        body: { storeId: storeId }
      }).then((syncResult: any) => {
        if (syncResult.error) {
          console.error('⚠️ Product-collection sync failed:', syncResult.error);
        } else {
          console.log('✅ Product-collection relationships synced:', syncResult.data);
        }
      }).catch((err: any) => console.error('⚠️ Sync error:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: products.length,
        stats: stats,
        totalShopifyProducts: totalShopifyProducts,
        variantsCount: totalVariants,
        imagesCount: totalImages,
        pagesImported: pagesImported,
        articlesImported: articlesImported,
        pagesProcessed: pageCount,
        jobId: importJob.id,
        message: `Successfully imported ${products.length} products (${stats.new} new, ${stats.updated} updated, ${stats.protected} protected) out of ${totalShopifyProducts} total products, ${totalVariants} variants, ${totalImages} images, ${pagesImported} pages, and ${articlesImported} articles. Syncing collections in background...`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    
    // Mark job as failed if it was created
    if (importJob) {
      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await supabaseServiceClient
        .from('import_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});