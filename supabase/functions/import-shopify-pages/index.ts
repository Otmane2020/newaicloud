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
      .single();

    if (connectionError || !connection) {
      throw new Error("No active Shopify connection found");
    }

    console.log(`🏪 [IMPORT-PAGES] Store: ${connection.store_url}`);

    const shopifyUrl = connection.store_url.replace(/\/$/, "");
    const accessToken = connection.access_token;

    let allPages: any[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all pages with pagination
    while (hasMore) {
      console.log(`📄 [IMPORT-PAGES] Fetching page ${page}...`);
      
      const response = await fetch(
        `${shopifyUrl}/admin/api/2025-01/pages.json?limit=250&page=${page}`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Failed to fetch pages page ${page}`);
        break;
      }

      const data = await response.json();
      const pages = data.pages || [];
      
      if (pages.length === 0) {
        hasMore = false;
      } else {
        allPages = allPages.concat(pages);
        page++;
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
