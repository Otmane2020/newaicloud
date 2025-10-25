import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextRequest {
  imageId: string;
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

    const { imageId }: AltTextRequest = await req.json();

    if (!imageId) {
      return new Response(
        JSON.stringify({ error: "Image ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get image and product info
    const { data: image, error: imageError } = await supabaseClient
      .from("product_images")
      .select("id, src, alt_text, product_id")
      .eq("id", imageId)
      .maybeSingle();

    if (imageError || !image) {
      return new Response(
        JSON.stringify({ error: "Image not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (image.alt_text && image.alt_text.trim() !== "") {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "Image already has ALT text",
          data: { alt_text: image.alt_text }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: product } = await supabaseClient
      .from("shopify_products")
      .select("title, description, category, ai_color, ai_material")
      .eq("id", image.product_id)
      .maybeSingle();

    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating ALT text with DeepSeek for image: ${image.id}`);

    const altPrompt = `Generate an SEO-optimized ALT text for a product image.

Product Information:
- Title: ${product.title}
- Description: ${product.description || "Not provided"}
- Category: ${product.category || "Not specified"}
- Color: ${product.ai_color || "Not specified"}
- Material: ${product.ai_material || "Not specified"}

Generate a concise, descriptive ALT text that:
1. Describes what the image shows
2. Includes the product name
3. Mentions key characteristics (color, material, style)
4. Is between 10-15 words
5. Is SEO-friendly and accessible
6. In French

Provide response as JSON:
{
  "alt_text": "Your ALT text here"
}

Example:
{
  "alt_text": "Table basse en bois naturel style scandinave pour salon moderne"
}`;

    const altResponse = await callDeepSeek([
      {
        role: "system",
        content: "You are an accessibility and SEO expert. Generate concise, descriptive ALT texts. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: altPrompt,
      },
    ]);

    const altContent = altResponse.choices[0].message.content;

    let altText = "";
    try {
      const parsed = JSON.parse(altContent);
      altText = parsed.alt_text || "";
    } catch (e) {
      console.error("Failed to parse ALT text JSON:", altContent);
      altText = `${product.title} - ${product.category || 'produit'}`;
    }

    const { error: updateError } = await supabaseClient
      .from("product_images")
      .update({ alt_text: altText })
      .eq("id", imageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`ALT text generated with DeepSeek for image ${imageId}: ${altText}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "ALT text generated successfully",
        data: {
          image_id: imageId,
          alt_text: altText,
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
