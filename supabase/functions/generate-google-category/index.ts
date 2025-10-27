import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CategoryGenerationRequest {
  productId: string;
}

async function callDeepSeek(messages: any[], maxTokens = 300) {
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
      temperature: 0.3,
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
      .select("id, title, description, product_type, category, sub_category, vendor, seller_id")
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

    console.log(`Generating Google category with DeepSeek for product: ${product.title}`);

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

    const categoryResponse = await callDeepSeek([
      {
        role: "system",
        content: "You are a Google Shopping categorization expert. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: categoryPrompt,
      },
    ]);

    const categoryContent = categoryResponse.choices[0].message.content;

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
      console.error("Failed to parse category JSON:", categoryContent);
      // Keep defaults
    }

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        google_product_category: googleData.google_product_category,
        google_mpn: googleData.google_mpn,
        google_condition: googleData.google_condition,
        google_brand: googleData.google_brand,
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

