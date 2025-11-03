import { createClient } from "npm:@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

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

    const { collection_ids, force = false }: { collection_ids: string[], force?: boolean } = await req.json();

    console.log(`🎨 Starting SEO optimization for ${collection_ids.length} collections...`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const collection_id of collection_ids) {
      try {
        // Get collection data
        const { data: collection, error: collectionError } = await supabase
          .from("shopify_collections")
          .select("*")
          .eq("id", collection_id)
          .eq("user_id", user.id)
          .single();

        if (collectionError || !collection) {
          console.error(`❌ Collection not found: ${collection_id}`);
          errorCount++;
          results.push({ collection_id, success: false, error: "Collection not found" });
          continue;
        }

        // Check optimization limits
        const { data: checkResult } = await supabase.rpc('check_optimization_allowed', {
          p_user_id: user.id,
          p_resource_type: 'collection',
          p_resource_id: collection_id,
          p_force: force
        });

        if (!checkResult?.allowed) {
          console.warn(`⚠️ Optimization not allowed for collection ${collection_id}: ${checkResult?.reason}`);
          errorCount++;
          results.push({ 
            collection_id, 
            success: false, 
            error: checkResult?.message || "Optimization limit reached" 
          });
          continue;
        }

        console.log(`🔍 Generating SEO for collection: ${collection.title} (ID: ${collection_id})`);
        console.log(`📊 Current optimization count: ${collection.optimization_count || 0}`);
        console.log(`📅 Last optimization: ${collection.last_optimization_at || 'never'}`);

        // Get store language
        let storeLanguage = 'fr';
        if (collection.store_id) {
          const { data: storeData } = await supabase
            .from('shopify_connections')
            .select('store_language')
            .eq('id', collection.store_id)
            .single();
          
          if (storeData?.store_language) {
            storeLanguage = storeData.store_language;
          }
        }

        console.log(`Using language: ${storeLanguage} for collection ${collection_id}`);

        // Get products from this collection
        const { data: products } = await supabase
          .from('shopify_products')
          .select('title')
          .contains('collection_ids', [collection_id])
          .limit(10);

        const productTitles = products?.map(p => p.title).join(', ') || '';

        // Generate SEO with Lovable AI
        const prompt = getSeoPrompt(storeLanguage, 'collection', {
          title: collection.title,
          handle: collection.handle,
          body_html: collection.body_html,
          productTitles: productTitles
        });

        const systemRole = getSystemRole(storeLanguage, 'collection');

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemRole },
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`❌ AI API error for collection ${collection_id}`);
          errorCount++;
          results.push({ collection_id, success: false, error: "AI generation failed" });
          continue;
        }

        const result = await aiResponse.json();
        const content = result.choices[0].message.content.trim();
        
        // Parse JSON response
        let seoData;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          seoData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
          console.log(`📝 Generated SEO data for ${collection_id}:`, {
            title_length: seoData.seo_title?.length || 0,
            desc_length: seoData.seo_description?.length || 0
          });
        } catch {
          console.warn(`⚠️ Failed to parse AI response for ${collection_id}, using fallback`);
          seoData = {
            seo_title: collection.title.substring(0, 60),
            seo_description: (collection.body_html || '').substring(0, 160)
          };
        }

        console.log(`💾 Updating collection ${collection_id} with SEO data...`);
        console.log(`📝 SEO Title to save: "${seoData.seo_title}"`);
        console.log(`📝 SEO Description to save: "${seoData.seo_description}"`);

        // Update collection with tracking
        const { data: updateData, error: updateError } = await supabase
          .from("shopify_collections")
          .update({
            seo_title: seoData.seo_title,
            seo_description: seoData.seo_description,
            body_html: seoData.body_html || collection.body_html,
            optimization_count: (collection.optimization_count || 0) + 1,
            last_optimization_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", collection_id)
          .select();

        if (updateError) {
          console.error(`❌ Update error for ${collection_id}:`, updateError);
          errorCount++;
          results.push({ collection_id, success: false, error: updateError.message });
          continue;
        }

        console.log(`✅ Database updated for ${collection_id}`);
        console.log(`✅ Updated data:`, updateData);
        
        // Verify the update
        const { data: verifyData } = await supabase
          .from("shopify_collections")
          .select("seo_title, seo_description, optimization_count")
          .eq("id", collection_id)
          .single();
          
        console.log(`🔍 Verification - Stored data:`, verifyData);

        // Track usage
        await supabase.rpc('increment_usage', {
          p_seller_id: user.id,
          p_field: 'optimizations_count',
          p_increment: 1
        });

        console.log(`✅ Successfully optimized collection: ${collection_id}`);
        successCount++;
        results.push({ collection_id, success: true, seo_data: seoData });

      } catch (error) {
        console.error(`❌ Error processing collection ${collection_id}:`, error);
        errorCount++;
        results.push({ 
          collection_id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    console.log(`✨ Collection SEO Optimization complete: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      success_count: successCount,
      error_count: errorCount,
      results
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
