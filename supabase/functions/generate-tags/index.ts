import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TagGenerationRequest {
  productId: string;
  force?: boolean;
}

async function callDeepSeek(messages: any[], maxTokens = 500) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.5,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
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

    // Check usage limits directly
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_status, current_plan_id, trial_ends_at')
      .eq('id', user.id)
      .single();

    const isTrialing = profile?.subscription_status === 'trialing';
    
    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: usage } = await supabaseClient
      .from('usage_tracking')
      .select('*')
      .eq('seller_id', user.id)
      .gte('month', currentMonth.toISOString().split('T')[0])
      .single();

    const currentUsage = usage || { optimizations_count: 0 };

    // For non-trial users, check optimization limits
    if (!isTrialing) {
      const { data: plan } = await supabaseClient
        .from('subscription_plans')
        .select('max_optimizations_monthly')
        .eq('id', profile?.current_plan_id || 'starter')
        .single();

      const maxOptimizations = plan?.max_optimizations_monthly || 999999;
      
      if (currentUsage.optimizations_count >= maxOptimizations) {
        return new Response(
          JSON.stringify({
            error: "Limite d'optimisations atteinte",
            limitReached: true,
            usage: currentUsage,
            shouldForcePayment: true
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, description, product_type, vendor, category, sub_category, ai_color, ai_material, tags, seller_id, optimization_count")
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

    // Check if product already optimized for trial users
    if (isTrialing && (product.optimization_count || 0) >= 1 && !force) {
      return new Response(
        JSON.stringify({ 
          error: 'trial_product_already_optimized',
          message: 'Ce produit a déjà été optimisé pendant votre période d\'essai.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Generating tags with DeepSeek for product: ${product.title}`);

    const tagPrompt = `Generate SEO-optimized product tags for this item:

Product Information:
- Title: ${product.title}
- Description: ${product.description || "Not provided"}
- Type: ${product.product_type || "Not specified"}
- Vendor: ${product.vendor || "Not specified"}
- Category: ${product.category || "Not specified"}
- Sub-Category: ${product.sub_category || "Not specified"}
- Color: ${product.ai_color || "Not specified"}
- Material: ${product.ai_material || "Not specified"}

Generate 8-15 relevant tags that:
1. Include the product type, category, and material
2. Include color if applicable
3. Include style descriptors (modern, classic, rustic, etc.)
4. Include use cases or room types
5. Are single words or short phrases (2-3 words max)
6. Are in lowercase
7. Are SEO-friendly and searchable
8. Don't repeat the same information

Provide response as a comma-separated list in JSON format:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}

Example for a wooden coffee table:
{
  "tags": "table basse, bois, salon, meuble, design moderne, rangement, naturel, scandinave"
}`;

    const tagResponse = await callDeepSeek([
      {
        role: "system",
        content: "You are a product tagging expert. Generate relevant, SEO-optimized tags. Always respond with valid JSON only.",
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

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        tags: tags,
        seo_synced_to_shopify: false,
        optimization_count: (product.optimization_count || 0) + 1
      })
      .eq("id", productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Tags generated with DeepSeek for product ${productId}: ${tags}`);

    // Track usage - 1 optimization
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 1
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tags generated successfully with DeepSeek",
        data: {
          product_id: productId,
          tags: tags,
        },
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
