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
    console.log("🔄 [IMPORT-COLLECTIONS] Version: 1.0.2 - Deployed: 2025-11-02T10:30:00Z");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`👤 [IMPORT-COLLECTIONS] User: ${user.id}`);

    // Get user's Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connectionError || !connection) {
      throw new Error("No active Shopify connection found");
    }

    console.log(`🏪 [IMPORT-COLLECTIONS] Store: ${connection.store_url}`);

    // Ensure URL has https:// protocol
    const storeUrl = connection.store_url.replace(/\/$/, "").trim();
    const shopifyUrl = storeUrl.startsWith('http://') || storeUrl.startsWith('https://') 
      ? storeUrl 
      : `https://${storeUrl}`;
    
    console.log(`🔗 [IMPORT-COLLECTIONS] Using URL: ${shopifyUrl}`);
    const accessToken = connection.access_token;

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
        const collectionData = {
          user_id: user.id,
          store_id: connection.id,
          shopify_collection_id: collection.id,
          title: collection.title,
          handle: collection.handle,
          body_html: collection.body_html || null,
          seo_title: collection.title, // Default to title
          seo_description: collection.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || `Collection ${collection.title}`,
          image_url: collection.image?.src || null,
          image_alt: collection.image?.alt || collection.title,
          shopify_image_id: collection.image?.id || null,
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
