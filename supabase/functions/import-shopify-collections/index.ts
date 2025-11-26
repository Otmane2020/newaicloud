import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🏗️ [IMPORT-COLLECTIONS] Starting import...");
    console.log("🔄 [IMPORT-COLLECTIONS] Version: 1.1.0 - Fixed parameters usage");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Read request body first to check for serviceMode
    const body = await req.json().catch(() => ({}));
    const { serviceMode, userId: serviceModeUserId } = body;

    const authHeader = req.headers.get("Authorization");
    
    // Service mode: use provided userId without JWT validation
    let user: any;
    let supabase: any;
    
    if (serviceMode === true && serviceModeUserId) {
      console.log('[IMPORT-COLLECTIONS] 🔧 SERVICE MODE: Using provided userId:', serviceModeUserId);
      supabase = createClient(supabaseUrl, supabaseKey);
      user = { id: serviceModeUserId };
    } else {
      // Normal mode: require JWT authentication
      if (!authHeader) {
        throw new Error("Missing authorization header");
      }

      supabase = createClient(supabaseUrl, supabaseKey);

      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (userError || !authUser) {
        throw new Error("Unauthorized");
      }
      
      user = authUser;
    }

    console.log(`👤 [IMPORT-COLLECTIONS] User: ${user.id}`);
    const { shopName: bodyShopName, storeId: bodyStoreId } = body;
    
    console.log(`📦 [IMPORT-COLLECTIONS] Body params:`, {
      shopName: bodyShopName || 'not provided',
      storeId: bodyStoreId || 'not provided'
    });

    let connection: any;
    let shopifyUrl: string;
    let accessToken: string;

    // Use body parameters if provided, otherwise fallback to active connection
    if (bodyShopName && bodyStoreId) {
      console.log(`✅ [IMPORT-COLLECTIONS] Using provided parameters`);
      
      // Validate store belongs to user and fetch access token
      const { data: storeData, error: storeError } = await supabase
        .from("shopify_connections")
        .select("*")
        .eq("id", bodyStoreId)
        .eq("user_id", user.id)
        .single();

      if (storeError || !storeData) {
        throw new Error("Store not found or unauthorized");
      }

      connection = storeData;
      shopifyUrl = `https://${bodyShopName}.myshopify.com`;
      accessToken = storeData.access_token; // Fetch from database
      
      console.log(`🏪 [IMPORT-COLLECTIONS] Store: ${shopifyUrl}`);
    } else {
      console.log(`⚠️ [IMPORT-COLLECTIONS] Missing body params, falling back to active connection`);
      
      // Fallback: Get user's active Shopify connection
      const { data: connectionData, error: connectionError } = await supabase
        .from("shopify_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (connectionError || !connectionData) {
        throw new Error("No active Shopify connection found");
      }

      connection = connectionData;
      
      const storeUrl = connection.store_url.replace(/\/$/, "").trim();
      shopifyUrl = storeUrl.startsWith('http://') || storeUrl.startsWith('https://') 
        ? storeUrl 
        : `https://${storeUrl}`;
      accessToken = connection.access_token;
      
      console.log(`🏪 [IMPORT-COLLECTIONS] Store (fallback): ${shopifyUrl}`);
    }
    
    console.log(`🔗 [IMPORT-COLLECTIONS] Using URL: ${shopifyUrl}`);

    let allCollections: any[] = [];
    let smartCount = 0;
    let customCount = 0;

    // Helper function to extract next URL from Link header
    const getNextUrl = (linkHeader: string | null): string | null => {
      if (!linkHeader) return null;
      const links = linkHeader.split(',');
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
      }
      return null;
    };

    // Fetch Smart Collections with cursor-based pagination
    console.log("📦 [IMPORT-COLLECTIONS] Fetching smart collections...");
    let smartUrl: string | null = `${shopifyUrl}/admin/api/2025-01/smart_collections.json?limit=250`;
    let smartBatch = 0;

    while (smartUrl) {
      smartBatch++;
      console.log(`  Batch ${smartBatch}...`);
      
      const smartResponse = await fetch(smartUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!smartResponse.ok) {
        const errorText = await smartResponse.text();
        console.error(`❌ Failed to fetch smart collections batch ${smartBatch}`);
        console.error(`Status: ${smartResponse.status}, Error: ${errorText}`);
        break;
      }

      const smartData = await smartResponse.json();
      const smartCollections = smartData.smart_collections || [];
      
      if (smartCollections.length > 0) {
        allCollections = allCollections.concat(smartCollections);
        smartCount += smartCollections.length;
        console.log(`  ✅ Fetched ${smartCollections.length} smart collections`);
      }

      // Get next page URL from Link header
      smartUrl = getNextUrl(smartResponse.headers.get('Link'));
      if (smartUrl) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }

    console.log(`✅ [IMPORT-COLLECTIONS] Smart collections fetched: ${smartCount}`);

    // Fetch Custom Collections with cursor-based pagination
    console.log("📦 [IMPORT-COLLECTIONS] Fetching custom collections...");
    let customUrl: string | null = `${shopifyUrl}/admin/api/2025-01/custom_collections.json?limit=250`;
    let customBatch = 0;

    while (customUrl) {
      customBatch++;
      console.log(`  Batch ${customBatch}...`);
      
      const customResponse = await fetch(customUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!customResponse.ok) {
        const errorText = await customResponse.text();
        console.error(`❌ Failed to fetch custom collections batch ${customBatch}`);
        console.error(`Status: ${customResponse.status}, Error: ${errorText}`);
        break;
      }

      const customData = await customResponse.json();
      const customCollections = customData.custom_collections || [];
      
      if (customCollections.length > 0) {
        allCollections = allCollections.concat(customCollections);
        customCount += customCollections.length;
        console.log(`  ✅ Fetched ${customCollections.length} custom collections`);
      }

      // Get next page URL from Link header
      customUrl = getNextUrl(customResponse.headers.get('Link'));
      if (customUrl) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }

    console.log(`✅ [IMPORT-COLLECTIONS] Custom collections fetched: ${customCount}`);
    console.log(`📊 [IMPORT-COLLECTIONS] Total collections: ${allCollections.length}`);

    // Upsert collections to database
    let upsertedCount = 0;
    let errorCount = 0;

    for (const collection of allCollections) {
      try {
        // ✅ Extract Shopify image data
        const imageUrl = collection.image?.src || null;
        const imageAlt = collection.image?.alt || collection.title;
        const shopifyImageId = collection.image?.id ? String(collection.image.id) : null;

        console.log(`📸 [IMPORT-COLLECTIONS] Image data for "${collection.title}":`, {
          has_image: !!imageUrl,
          image_url: imageUrl?.substring(0, 60) + '...',
          has_alt: !!imageAlt,
          shopify_image_id: shopifyImageId
        });

        const collectionData = {
          user_id: user.id,
          store_id: connection.id,
          shopify_collection_id: collection.id,
          title: collection.title,
          handle: collection.handle,
          body_html: collection.body_html || null,
          seo_title: collection.title, // Default to title
          seo_description: collection.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || `Collection ${collection.title}`,
          image_url: imageUrl,
          image_alt: imageAlt,
          shopify_image_id: shopifyImageId,
          products_count: collection.products_count || 0,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from("shopify_collections")
          .upsert(collectionData, {
            onConflict: "shopify_collection_id,user_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`❌ Error upserting collection ${collection.id}:`, upsertError);
          errorCount++;
        } else {
          upsertedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing collection ${collection.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✨ [IMPORT-COLLECTIONS] Import complete!`);
    console.log(`   - Smart collections: ${smartCount}`);
    console.log(`   - Custom collections: ${customCount}`);
    console.log(`   - Successfully imported: ${upsertedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // 🧹 Cleanup: Delete collections that no longer exist in Shopify
    console.log(`🧹 [IMPORT-COLLECTIONS] Checking for deleted collections...`);
    const shopifyCollectionIds = allCollections.map(c => c.id);
    
    const { data: existingCollections, error: fetchError } = await supabase
      .from('shopify_collections')
      .select('id, shopify_collection_id, title')
      .eq('user_id', user.id)
      .eq('store_id', connection.id);
    
    if (fetchError) {
      console.error(`⚠️ [IMPORT-COLLECTIONS] Error fetching existing collections:`, fetchError);
    } else if (existingCollections) {
      const collectionsToDelete = existingCollections.filter(
        (existing: any) => !shopifyCollectionIds.includes(existing.shopify_collection_id)
      );
      
      if (collectionsToDelete.length > 0) {
        console.log(`🗑️ [IMPORT-COLLECTIONS] Found ${collectionsToDelete.length} collections to delete:`);
        collectionsToDelete.forEach((c: any) => {
          console.log(`   - ${c.title} (ID: ${c.shopify_collection_id})`);
        });
        
        const idsToDelete = collectionsToDelete.map((c: any) => c.id);
        const { error: deleteError } = await supabase
          .from('shopify_collections')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error(`❌ [IMPORT-COLLECTIONS] Error deleting collections:`, deleteError);
        } else {
          console.log(`✅ [IMPORT-COLLECTIONS] Successfully deleted ${collectionsToDelete.length} collections`);
        }
      } else {
        console.log(`✅ [IMPORT-COLLECTIONS] No collections to delete`);
      }
    }
    
    console.log(`📊 [IMPORT-COLLECTIONS] Summary:`);
    console.log(`   - Total collections fetched: ${allCollections.length}`);
    console.log(`   - Smart collections: ${smartCount}`);
    console.log(`   - Custom collections: ${customCount}`);
    console.log(`   - Successfully imported: ${upsertedCount}`);
    console.log(`   - Failed: ${errorCount}`);

    if (errorCount > 0) {
      console.warn(`⚠️ [IMPORT-COLLECTIONS] Some collections failed to import. Check logs above for details.`);
    }

    return new Response(JSON.stringify({
      success: true,
      total: allCollections.length,
      smart_collections: smartCount,
      custom_collections: customCount,
      imported: upsertedCount,
      errors: errorCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ [IMPORT-COLLECTIONS] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
