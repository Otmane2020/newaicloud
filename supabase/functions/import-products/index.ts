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
  sku: string;
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
}

interface ShopifyResponse {
  products: ShopifyProduct[];
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

  let importJob: any = null;

  try {
    console.log('🚀 Starting import-products function');
    
    // Authenticate user first with anon key
    const authHeader = req.headers.get('Authorization');
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

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log('🔑 Authenticating user...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
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

    const requestBody = await req.json();
    
    // Get auto-import config
    const autoImportLimit = requestBody.autoImportLimit;
    const skipNotification = requestBody.skipNotification;
    
    console.log('📦 Import config:', { autoImportLimit, skipNotification });

    // 📥 Log detailed request information
    console.log('📥 Request body received:', {
      shopName: requestBody.shopName ? `✅ Present (${requestBody.shopName})` : '❌ Missing',
      apiKey: requestBody.apiKey ? `✅ Present (length: ${requestBody.apiKey.length})` : '⚠️  Not provided (OAuth)',
      apiSecret: requestBody.apiSecret ? `✅ Present (length: ${requestBody.apiSecret.length}, starts with: ${requestBody.apiSecret.substring(0, 10)}...)` : '❌ Missing or empty',
      storeId: requestBody.storeId ? `✅ Present (${requestBody.storeId})` : '⚠️  Not provided',
      allKeys: Object.keys(requestBody)
    });

    // Validate input
    const validation = validateImportProducts(requestBody);
    if (!validation.success || !validation.data) {
      console.error('❌ Validation errors:', validation.errors);
      console.error('📋 Failed validation for:', {
        shopName: requestBody.shopName,
        apiKeyPresent: !!requestBody.apiKey,
        apiSecretPresent: !!requestBody.apiSecret,
        apiSecretType: typeof requestBody.apiSecret,
        storeId: requestBody.storeId
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
    const syncMode = requestBody.syncMode || 'smart'; // Default to smart mode
    
    console.log('🔄 Sync mode:', syncMode);
    
    // Determine authentication method
    const isManualAuth = !!apiKey;
    const authToken = apiSecret!; // apiSecret is always present (validated above)
    
    console.log('🔐 Authentication method:', {
      type: isManualAuth ? 'Manual (API Key + Secret)' : 'OAuth',
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
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

    // Fetch shop details to get currency
    let shopCurrency = 'USD';
    try {
      const shopResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2024-01/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": authToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (shopResponse.ok) {
        const shopData = await shopResponse.json();
        shopCurrency = shopData.shop?.currency || 'USD';
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

    const { data: limitsData, error: limitsError } = await supabaseServiceClient.functions.invoke(
      'check-usage-limits',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (limitsError) {
      console.error('❌ Error fetching limits:', limitsError);
      throw new Error('Failed to fetch usage limits');
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

    // Get total product count from Shopify first
    let totalShopifyProducts = 0;
    try {
      const countResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2024-01/products/count.json`,
        {
          headers: {
            "X-Shopify-Access-Token": authToken,
            "Content-Type": "application/json",
          },
        }
      );
      if (countResponse.ok) {
        const countData = await countResponse.json();
        totalShopifyProducts = countData.count || 0;
        console.log(`📊 Total products in Shopify store: ${totalShopifyProducts}`);
      }
    } catch (error) {
      console.error('Error getting product count:', error);
    }

    let allProducts: ShopifyProduct[] = [];
    let nextPageUrl: string | null = `https://${cleanShopName}.myshopify.com/admin/api/2024-01/products.json?limit=50&fields=id,title,body_html,vendor,product_type,handle,status,tags,variants(id,title,price,compare_at_price,sku,barcode,inventory_quantity,weight,weight_unit,option1,option2,option3,image_id),images,metafields_global_title_tag,metafields_global_description_tag`;
    let pageCount = 0;
    let quotaReached = false;

    console.log(`🚀 Starting import from ${cleanShopName}`);

    while (nextPageUrl && !quotaReached) {
      pageCount++;
      console.log(`Fetching page ${pageCount}: ${nextPageUrl}`);

      const shopifyResponse = await fetch(nextPageUrl, {
        headers: {
          "X-Shopify-Access-Token": authToken,
          "Content-Type": "application/json",
        },
      });

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error("Shopify API Error:", errorText);
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

      const shopifyData: ShopifyResponse = await shopifyResponse.json();
      const pageProducts = shopifyData.products || [];

      console.log(`Page ${pageCount}: Fetched ${pageProducts.length} products`);
      
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

      const linkHeader = shopifyResponse.headers.get("Link");
      const parsedNextUrl = parseLinkHeader(linkHeader);

      // Update job progress
      const estimatedTotalPages = parsedNextUrl ? pageCount + 10 : pageCount;
      await supabaseServiceClient
        .from('import_jobs')
        .update({
          current_page: pageCount,
          total_pages: estimatedTotalPages,
          products_processed: allProducts.length
        })
        .eq('id', importJob.id);

      if (parsedNextUrl) {
        nextPageUrl = parsedNextUrl;
        console.log(`Next page URL found, continuing...`);
        // Réduire le délai pour accélérer l'import
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        nextPageUrl = null;
      }
    }

    let products = allProducts;
    
    // If autoImportLimit is set (OAuth flow), limit products
    if (autoImportLimit && typeof autoImportLimit === 'number' && autoImportLimit > 0) {
      console.log(`📦 Auto-import mode: limiting to ${autoImportLimit} products (from ${products.length} fetched)`);
      products = products.slice(0, autoImportLimit);
    }
    
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
    
    const { data: existingProducts } = await supabaseServiceClient
      .from('shopify_products')
      .select('shopify_id, optimization_count, title, description, seo_title, seo_description')
      .in('shopify_id', existingProductIds)
      .eq('seller_id', user.id);
    
    const existingMap = new Map(existingProducts?.map(p => [p.shopify_id, p]) || []);
    
    console.log(`🔍 Found ${existingProducts?.length || 0} existing products in DB`);
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
    const BATCH_SIZE = 100;
    const productIdMap = new Map<number, string>();
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
        return new Response(
          JSON.stringify({ error: `Failed to save products (batch ${batchNumber}): ${insertError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Map product IDs from this batch
      if (upsertedProducts) {
        upsertedProducts.forEach((p: any) => {
          productIdMap.set(p.shopify_id, p.id);
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
      
      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < productsToInsert.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    let totalVariants = 0;
    let totalImages = 0;

    // Collect all variants and images first
    const allVariants: any[] = [];
    const allImages: any[] = [];

    for (const product of products) {
      const productId = productIdMap.get(product.id);
      if (!productId) continue;

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
            inventory_quantity: variant.inventory_quantity || 0,
            weight: variant.weight,
            weight_unit: variant.weight_unit || "kg",
            barcode: variant.barcode || "",
            currency: shopCurrency,
            image_url: variant.image_id
              ? product.images.find((img) => img.id === variant.image_id)?.src || ""
              : "",
            raw_data: variant,
          };
        });

        allVariants.push(...variantsToInsert);
      }

      if (product.images && product.images.length > 0) {
        const imagesToInsert = product.images.map((image, index) => ({
          product_id: productId,
          shopify_image_id: image.id,
          src: image.src,
          position: index + 1,
          alt_text: (image as any).alt || "",
          width: (image as any).width || null,
          height: (image as any).height || null,
        }));

        allImages.push(...imagesToInsert);
      }
    }

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

    // Insert images in batches
    if (allImages.length > 0) {
      const IMAGE_BATCH_SIZE = 500;
      const imageBatches = Math.ceil(allImages.length / IMAGE_BATCH_SIZE);
      
      console.log(`📦 Inserting ${allImages.length} images in ${imageBatches} batches`);
      
      for (let i = 0; i < allImages.length; i += IMAGE_BATCH_SIZE) {
        const batch = allImages.slice(i, i + IMAGE_BATCH_SIZE);
        const batchNumber = Math.floor(i / IMAGE_BATCH_SIZE) + 1;
        
        console.log(`🔄 Processing image batch ${batchNumber}/${imageBatches}`);
        
        const { error: imageError } = await supabaseServiceClient
          .from("product_images")
          .upsert(batch, {
            onConflict: "shopify_image_id",
            ignoreDuplicates: false,
          });

        if (imageError) {
          console.error(`❌ Image insert error in batch ${batchNumber}:`, imageError);
        } else {
          totalImages += batch.length;
          console.log(`✅ Image batch ${batchNumber}/${imageBatches} completed`);
        }
        
        if (i + IMAGE_BATCH_SIZE < allImages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    
    console.log(`📊 Import Summary:`);
    console.log(`   - Products inserted: ${productsToInsert.length}`);
    console.log(`   - Variants inserted: ${totalVariants}`);
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
      const articlesResult = await supabaseServiceClient.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: cleanShopName,
          authToken: authToken,
          storeId: storeId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
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
    console.log('🔗 Starting async product-collection sync...');
    supabaseClient.functions.invoke('sync-product-collections', {
      headers: { Authorization: authHeader }
    }).then((syncResult) => {
      if (syncResult.error) {
        console.error('⚠️ Product-collection sync failed:', syncResult.error);
      } else {
        console.log('✅ Product-collection relationships synced:', syncResult.data);
      }
    }).catch((err) => console.error('⚠️ Sync error:', err));

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