import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Product {
  id: string;
  title: string;
  description?: string;
  product_type?: string;
  category?: string;
  sub_category?: string;
  ai_color?: string;
  ai_material?: string;
  style?: string;
  vendor?: string;
  tags?: string;
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
      temperature: 0.7,
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

    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("*")
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

    console.log(`Generating SEO with DeepSeek for product: ${product.title}`);

    const seoPrompt = `Generate optimized SEO title and meta description for this e-commerce product:

Product Information:
- Title: ${product.title}
- Description: ${product.description || "Not provided"}
- Type: ${product.product_type || "Not specified"}
- Category: ${product.category || "Not specified"}
- Sub-Category: ${product.sub_category || "Not specified"}
- Color: ${product.ai_color || "Not specified"}
- Material: ${product.ai_material || "Not specified"}
- Style: ${product.style || "Not specified"}
- Vendor: ${product.vendor || "Not specified"}
- Tags: ${product.tags || "Not specified"}

SEO Title Requirements:
- 55-60 characters maximum
- Include primary keyword (product type)
- Include 1-2 key attributes (color, material, or style)
- Natural and compelling
- NO brand name at the end
- French language

Meta Description Requirements:
- 150-160 characters maximum
- Include primary and secondary keywords naturally
- Highlight key benefits or features
- Include a subtle call-to-action
- Engaging and descriptive
- French language

Respond ONLY with valid JSON in this exact format:
{
  "seo_title": "Your SEO title here",
  "seo_description": "Your meta description here"
}

Example for a gray fabric sofa:
{
  "seo_title": "Canapé Tissu Gris Anthracite Confortable 3 Places",
  "seo_description": "Canapé moderne en tissu gris anthracite, design élégant et confortable. Assise profonde, dossier ergonomique. Idéal pour salon contemporain. Livraison rapide."
}`;

    const seoResponse = await callDeepSeek([
      {
        role: "system",
        content: "You are an SEO expert specializing in French e-commerce. Generate compelling, keyword-optimized titles and descriptions. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: seoPrompt,
      },
    ], 300);

    const seoContent = seoResponse.choices[0].message.content;

    let seoTitle = "";
    let seoDescription = "";

    try {
      const parsed = JSON.parse(seoContent);
      seoTitle = parsed.seo_title || product.title.substring(0, 60);
      seoDescription = parsed.seo_description || product.description?.substring(0, 160) || "";
    } catch (e) {
      console.error("Failed to parse SEO JSON:", seoContent);
      seoTitle = product.title.substring(0, 60);
      seoDescription = product.description?.substring(0, 160) || "";
    }

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        seo_title: seoTitle,
        seo_description: seoDescription,
        enrichment_status: 'enriched',
        seo_synced_to_shopify: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`SEO generated for product ${productId}`);

    // Track usage - 2 optimizations (title + description)
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 2
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "SEO generated successfully with DeepSeek",
        data: {
          product_id: productId,
          seo_title: seoTitle,
          seo_description: seoDescription,
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
