import { createClient } from "npm:@supabase/supabase-js@2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CategoryGenerationRequest {
  productId: string;
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

    const { productId }: CategoryGenerationRequest = await req.json();

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
      .select("id, title, description, product_type, category, sub_category, vendor, seller_id, optimization_count")
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

    // Check if product already optimized for trial users
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', product.seller_id)
      .single();

    if (profile?.subscription_status === 'trialing' && (product.optimization_count || 0) >= 1) {
      return new Response(
        JSON.stringify({ 
          error: 'trial_product_already_optimized',
          message: 'Ce produit a déjà été optimisé pendant votre période d\'essai.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating Google category for product: ${product.title}`);

    const categoryPrompt = `You are a Google Shopping product categorization expert. Based on the product information below, generate the EXACT Google Shopping category hierarchy.

Product Information:
- Title: ${product.title}
- Description: ${product.description || "Not provided"}
- Type: ${product.product_type || "Not specified"}
- Category: ${product.category || "Not specified"}
- Sub-Category: ${product.sub_category || "Not specified"}
- Vendor: ${product.vendor || "Not specified"}

Generate the response in JSON format with:
1. google_product_category: The full hierarchical Google Shopping category (e.g., "Furniture > Tables > Coffee Tables" or "Home & Garden > Kitchen & Dining > Cookware")
2. google_mpn: The manufacturer part number (use vendor name if available, or "N/A")
3. google_condition: Product condition ("new", "refurbished", or "used")
4. google_brand: The brand name (use vendor if available)

Example response format:
{
  "google_product_category": "Furniture > Tables > Coffee Tables",
  "google_mpn": "ACME-123",
  "google_condition": "new",
  "google_brand": "ACME Furniture"
}

IMPORTANT:
- Use the official Google Shopping category taxonomy
- Be specific and accurate (3-4 levels deep when applicable)
- Default condition to "new" unless context suggests otherwise
- Use vendor as brand if no other brand information is available`;

    const categoryResponse = await routeAI({
      messages: [
        {
          role: "system",
          content: "You are a Google Shopping categorization expert. Always respond with one valid JSON object only, without markdown fences.",
        },
        {
          role: "user",
          content: categoryPrompt,
        },
      ],
      maxTokens: 500,
      temperature: 0.15,
    });

    console.log(`Google category provider: ${categoryResponse.provider}/${categoryResponse.model}`);
    const categoryContent = categoryResponse.content
      .replace(/^\`\`\`(?:json)?\\s*/i, "")
      .replace(/\\s*\`\`\`$/i, "")
      .trim();

    let googleData = {
      google_product_category: "",
      google_mpn: product.vendor || "N/A",
      google_condition: "new",
      google_brand: product.vendor || "",
    };

    try {
      const parsed = JSON.parse(categoryContent);
      googleData = {
        google_product_category: parsed.google_product_category || googleData.google_product_category,
        google_mpn: parsed.google_mpn || googleData.google_mpn,
        google_condition: parsed.google_condition || googleData.google_condition,
        google_brand: parsed.google_brand || googleData.google_brand,
      };
    } catch (e) {
      console.error("Failed to parse category JSON from AI provider", e);
      throw new Error("AI returned an invalid Google category response");
    }

    if (!googleData.google_product_category.trim()) {
      throw new Error("AI returned an empty Google product category");
    }

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        google_product_category: googleData.google_product_category,
        google_mpn: googleData.google_mpn,
        google_condition: googleData.google_condition,
        google_brand: googleData.google_brand,
        optimization_count: (product.optimization_count || 0) + 1
      })
      .eq("id", productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Google category generated for product ${productId}: ${googleData.google_product_category}`);

    // Track usage - 1 optimization
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 1
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google category generated successfully",
        data: googleData,
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

