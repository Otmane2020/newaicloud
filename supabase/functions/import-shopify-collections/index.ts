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

    const shopifyUrl = connection.store_url.replace(/\/$/, "");
    const accessToken = connection.access_token;

    let allCollections: any[] = [];
    let smartCount = 0;
    let customCount = 0;

    // Fetch Smart Collections
    console.log("📦 [IMPORT-COLLECTIONS] Fetching smart collections...");
    let smartPage = 1;
    let hasMoreSmart = true;

    while (hasMoreSmart) {
      const smartResponse = await fetch(
        `${shopifyUrl}/admin/api/2025-01/smart_collections.json?limit=250&page=${smartPage}`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!smartResponse.ok) {
        console.error(`❌ Failed to fetch smart collections page ${smartPage}`);
        break;
      }

      const smartData = await smartResponse.json();
      const smartCollections = smartData.smart_collections || [];
      
      if (smartCollections.length === 0) {
        hasMoreSmart = false;
      } else {
        allCollections = allCollections.concat(smartCollections);
        smartCount += smartCollections.length;
        smartPage++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }

    console.log(`✅ [IMPORT-COLLECTIONS] Smart collections fetched: ${smartCount}`);

    // Fetch Custom Collections
    console.log("📦 [IMPORT-COLLECTIONS] Fetching custom collections...");
    let customPage = 1;
    let hasMoreCustom = true;

    while (hasMoreCustom) {
      const customResponse = await fetch(
        `${shopifyUrl}/admin/api/2025-01/custom_collections.json?limit=250&page=${customPage}`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!customResponse.ok) {
        console.error(`❌ Failed to fetch custom collections page ${customPage}`);
        break;
      }

      const customData = await customResponse.json();
      const customCollections = customData.custom_collections || [];
      
      if (customCollections.length === 0) {
        hasMoreCustom = false;
      } else {
        allCollections = allCollections.concat(customCollections);
        customCount += customCollections.length;
        customPage++;
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
          seo_description: collection.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || null,
          image_url: collection.image?.src || null,
          image_alt: collection.image?.alt || collection.title,
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
