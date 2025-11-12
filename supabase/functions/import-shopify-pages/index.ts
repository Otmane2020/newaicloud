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
    console.log("📄 [IMPORT-PAGES] Starting import...");
    console.log("🔄 [IMPORT-PAGES] Version: 1.0.2 - Deployed: 2025-11-02T10:30:00Z");
    
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

    console.log(`👤 [IMPORT-PAGES] User: ${user.id}`);

    // Get user's Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connectionError) {
      console.error(`❌ [IMPORT-PAGES] Connection error:`, connectionError);
      throw new Error(`Failed to fetch Shopify connection: ${connectionError.message}`);
    }

    if (!connection) {
      console.error(`❌ [IMPORT-PAGES] No active connection found for user: ${user.id}`);
      throw new Error("No active Shopify connection found");
    }

    console.log(`🏪 [IMPORT-PAGES] Store: ${connection.store_url}`);

    // Ensure URL has https:// protocol
    const storeUrl = connection.store_url.replace(/\/$/, "").trim();
    const shopifyUrl = storeUrl.startsWith('http://') || storeUrl.startsWith('https://') 
      ? storeUrl 
      : `https://${storeUrl}`;
    
    console.log(`🔗 [IMPORT-PAGES] Using URL: ${shopifyUrl}`);
    const accessToken = connection.access_token;

    let allPages: any[] = [];

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

    // Fetch all pages with cursor-based pagination
    let nextUrl: string | null = `${shopifyUrl}/admin/api/2025-01/pages.json?limit=250`;
    let batchCount = 0;
    
    while (nextUrl) {
      batchCount++;
      console.log(`📄 [IMPORT-PAGES] Fetching batch ${batchCount}...`);
      
      const response = await fetch(nextUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch pages batch ${batchCount}`);
        console.error(`Status: ${response.status}, Error: ${errorText}`);
        break;
      }

      const data = await response.json();
      const pages = data.pages || [];
      
      if (pages.length > 0) {
        allPages = allPages.concat(pages);
        console.log(`  ✅ Fetched ${pages.length} pages`);
      }

      // Get next page URL from Link header
      nextUrl = getNextUrl(response.headers.get('Link'));
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }

    console.log(`✅ [IMPORT-PAGES] Fetched ${allPages.length} pages`);

    // Upsert pages to database
    let upsertedCount = 0;
    let imagesCount = 0;
    let errorCount = 0;

    for (const shopifyPage of allPages) {
      try {
        // Extract images from body_html
        const imageRegex = /<img[^>]+src="([^">]+)"/g;
        const images: string[] = [];
        let match;
        
        while ((match = imageRegex.exec(shopifyPage.body_html || '')) !== null) {
          images.push(match[1]);
        }

        const pageData = {
          user_id: user.id,
          store_id: connection.id,
          shopify_page_id: shopifyPage.id,
          title: shopifyPage.title,
          handle: shopifyPage.handle,
          body_html: shopifyPage.body_html || null,
          seo_title: shopifyPage.title, // Default to title
          seo_description: shopifyPage.body_html?.replace(/<[^>]*>/g, '').substring(0, 160) || null,
          template_suffix: shopifyPage.template_suffix || null,
          published_at: shopifyPage.published_at || null,
          updated_at: new Date().toISOString(),
        };

        // Upsert page
        const { data: upsertedPage, error: upsertError } = await supabase
          .from("shopify_pages")
          .upsert(pageData, {
            onConflict: "shopify_page_id,user_id",
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (upsertError) {
          console.error(`❌ Error upserting page ${shopifyPage.id}:`, upsertError);
          errorCount++;
          continue;
        }

        upsertedCount++;

        // Insert images if any
        if (images.length > 0 && upsertedPage) {
          console.log(`🖼️ [IMPORT-PAGES] Inserting ${images.length} images for page ${shopifyPage.title}`);
          
          for (let i = 0; i < images.length; i++) {
            const imageData = {
              user_id: user.id,
              store_id: connection.id,
              content_type: 'page',
              content_id: upsertedPage.id,
              src: images[i],
              position: i,
              alt_text: null, // Will be optimized later
            };

            const { error: imageError } = await supabase
              .from("content_images")
              .upsert(imageData, {
                onConflict: "content_id,content_type,src",
                ignoreDuplicates: true,
              });

            if (!imageError) {
              imagesCount++;
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error processing page ${shopifyPage.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✨ [IMPORT-PAGES] Import complete!`);
    console.log(`   - Pages imported: ${upsertedCount}`);
    console.log(`   - Images imported: ${imagesCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // 🧹 Cleanup: Delete pages that no longer exist in Shopify
    console.log(`🧹 [IMPORT-PAGES] Checking for deleted pages...`);
    const shopifyPageIds = allPages.map(p => p.id.toString());
    
    const { data: existingPages, error: fetchError } = await supabase
      .from('shopify_pages')
      .select('id, shopify_page_id, title')
      .eq('user_id', user.id)
      .eq('store_id', storeId);
    
    if (fetchError) {
      console.error(`⚠️ [IMPORT-PAGES] Error fetching existing pages:`, fetchError);
    } else if (existingPages) {
      const pagesToDelete = existingPages.filter(
        existing => existing.shopify_page_id && !shopifyPageIds.includes(existing.shopify_page_id)
      );
      
      if (pagesToDelete.length > 0) {
        console.log(`🗑️ [IMPORT-PAGES] Found ${pagesToDelete.length} pages to delete:`);
        pagesToDelete.forEach(p => {
          console.log(`   - ${p.title} (Shopify ID: ${p.shopify_page_id})`);
        });
        
        const idsToDelete = pagesToDelete.map(p => p.id);
        const { error: deleteError } = await supabase
          .from('shopify_pages')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error(`❌ [IMPORT-PAGES] Error deleting pages:`, deleteError);
        } else {
          console.log(`✅ [IMPORT-PAGES] Successfully deleted ${pagesToDelete.length} pages`);
        }
      } else {
        console.log(`✅ [IMPORT-PAGES] No pages to delete`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: allPages.length,
      imported: upsertedCount,
      images: imagesCount,
      errors: errorCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ [IMPORT-PAGES] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
