import { createClient } from "npm:@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";
import { resolveLanguage } from "../_shared/language-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TagGenerationRequest {
  productId: string;
  force?: boolean;
}

async function callLovableAI(messages: any[], maxTokens = 500) {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!lovableApiKey) {
    throw new Error('Lovable API key not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to continue.');
    }
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { productId, force = false }: TagGenerationRequest = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[TAGS] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check optimization limits using RPC
    const { data: checkResult, error: checkError } = await supabaseClient
      .rpc('check_optimization_allowed', {
        p_user_id: user.id,
        p_resource_type: 'product',
        p_resource_id: productId,
        p_force: force
      });

    if (checkError) {
      console.error('Error checking optimization limits:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check optimization limits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkResult.allowed) {
      return new Response(
        JSON.stringify({
          error: checkResult.reason,
          message: checkResult.message,
          limitReached: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, description, product_type, vendor, category, sub_category, ai_color, ai_material, tags, seller_id, optimization_count, store_id, shopify_connections!inner(store_language)")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify product belongs to user
    if (product.seller_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (product.tags && product.tags.trim() !== "" && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "Product already has tags",
          data: { tags: product.tags }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 🛡️ LANGUAGE GUARD - Detect language from content
    const rawStoreLanguage = (product as any)?.shopify_connections?.store_language || "en-US";
    const language = resolveLanguage({
      contentText: `${product.title || ""} ${product.description || ""}`,
      storeLanguage: rawStoreLanguage
    });
    console.log(`🛡️ LANGUAGE GUARD: tags - detected=${language}, store=${rawStoreLanguage}, product="${product.title?.substring(0,30)}..."`);

    console.log(`Generating tags with Lovable AI for product: ${product.title} (language: ${language})`);

    const tagPrompt = getSeoPrompt(language, 'tags', {
      title: product.title,
      description: product.description,
      product_type: product.product_type,
      vendor: product.vendor,
      category: product.category,
      sub_category: product.sub_category,
      ai_color: product.ai_color,
      ai_material: product.ai_material
    });

    const systemRole = getSystemRole(language, 'tags');

    const tagResponse = await callLovableAI([
      {
        role: "system",
        content: systemRole,
      },
      {
        role: "user",
        content: tagPrompt,
      },
    ]);

    const tagContent = tagResponse.choices[0].message.content;

    let tags = "";
    try {
      // Clean markdown code blocks if present
      let cleanedContent = tagContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      
      const parsed = JSON.parse(cleanedContent);
      tags = parsed.tags || "";
      console.log(`Successfully parsed tags: ${tags}`);
    } catch (e) {
      console.error("Failed to parse tag JSON:", tagContent);
      console.error("Parse error:", e);
      tags = product.product_type || product.category || "";
    }

    // Update optimization history
    const optimizationHistory = {
      tags_generated: new Date().toISOString()
    };

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        tags: tags,
        seo_synced_to_shopify: false,
        optimization_count: (product.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        optimization_history: optimizationHistory
      })
      .eq("id", productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Tags generated with Lovable AI for product ${productId}: ${tags}`);

    // Track usage - 1 optimization
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 1
    });

    // 🔄 AUTO-SYNC: Sync tags to Shopify automatically after generation
    let syncResult = { success: false, message: '' };
    try {
      console.log(`[TAGS] Auto-syncing tags to Shopify for product ${productId}...`);
      
      // Call sync-seo-to-shopify with syncTags flag
      const syncResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-seo-to-shopify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            productId: productId,
            syncTags: true,
            force: true
          }),
        }
      );
      
      if (syncResponse.ok) {
        syncResult = await syncResponse.json();
        console.log(`[TAGS] ✅ Tags synced to Shopify successfully:`, syncResult);
      } else {
        const errorText = await syncResponse.text();
        console.error(`[TAGS] ⚠️ Failed to sync tags to Shopify:`, errorText);
        syncResult = { success: false, message: errorText };
      }
    } catch (syncError) {
      console.error(`[TAGS] ⚠️ Error during auto-sync:`, syncError);
      syncResult = { success: false, message: syncError instanceof Error ? syncError.message : 'Unknown error' };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tags generated successfully",
        data: {
          product_id: productId,
          tags: tags,
        },
        shopifySync: syncResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);

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