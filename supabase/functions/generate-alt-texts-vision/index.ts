import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextVisionRequest {
  imageId: string;
}

async function callDeepSeekVision(imageUrl: string, productContext: string) {
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
      messages: [
        {
          role: "system",
          content: "You are an expert in e-commerce product image analysis. Analyze product images and generate SEO-optimized, accessible ALT text descriptions in French."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product image and generate an SEO-optimized ALT text.

Context:
${productContext}

Instructions:
1. Describe what you see in the image (colors, materials, shapes, textures, style)
2. Incorporate product title and variation details
3. Make it natural, descriptive and SEO-friendly
4. Keep it between 10-20 words
5. Write in French
6. Focus on visual characteristics that complement the product information

Respond ONLY with valid JSON:
{
  "alt_text": "Your descriptive ALT text here",
  "visual_analysis": "Brief description of what you see in the image"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek Vision API error: ${response.status} - ${errorText}`);
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

    const { imageId }: AltTextVisionRequest = await req.json();

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

    // Get product and variant information
    const { data: product } = await supabaseClient
      .from("shopify_products")
      .select(`
        title, 
        description, 
        category, 
        ai_color, 
        ai_material,
        ai_style,
        seller_id
      `)
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

    // Get variants for this product (for variable products)
    const { data: variants } = await supabaseClient
      .from("product_variants")
      .select("title, option1, option2, option3, ai_color, ai_material")
      .eq("product_id", image.product_id)
      .limit(5);

    // Build context
    let productContext = `Product: ${product.title}\n`;
    
    if (product.description) {
      productContext += `Description: ${product.description.substring(0, 200)}\n`;
    }
    
    if (product.category) {
      productContext += `Category: ${product.category}\n`;
    }

    if (variants && variants.length > 0) {
      productContext += `\nVariations:\n`;
      variants.forEach(v => {
        const variantDesc = [v.option1, v.option2, v.option3].filter(Boolean).join(', ');
        if (variantDesc) {
          productContext += `- ${v.title || variantDesc}\n`;
        }
        if (v.ai_color) productContext += `  Color: ${v.ai_color}\n`;
        if (v.ai_material) productContext += `  Material: ${v.ai_material}\n`;
      });
    } else {
      if (product.ai_color) productContext += `Color: ${product.ai_color}\n`;
      if (product.ai_material) productContext += `Material: ${product.ai_material}\n`;
    }

    console.log(`Analyzing image with DeepSeek Vision: ${image.id}`);

    const visionResponse = await callDeepSeekVision(image.src, productContext);
    const visionContent = visionResponse.choices[0].message.content;

    let altText = "";
    let visualAnalysis = "";
    
    try {
      const parsed = JSON.parse(visionContent);
      altText = parsed.alt_text || "";
      visualAnalysis = parsed.visual_analysis || "";
    } catch (e) {
      console.error("Failed to parse Vision JSON:", visionContent);
      // Fallback
      altText = `${product.title}${variants && variants.length > 0 ? ' - ' + variants[0].title : ''}`;
    }

    // Update image with ALT text and analysis
    const { error: updateError } = await supabaseClient
      .from("product_images")
      .update({ 
        alt_text: altText
      })
      .eq("id", imageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Vision ALT text generated for image ${imageId}: ${altText}`);

    // Track usage
    if (product?.seller_id) {
      await supabaseClient.rpc('increment_usage', {
        p_seller_id: product.seller_id,
        p_field: 'optimizations_count',
        p_increment: 1
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vision ALT text generated successfully",
        data: {
          image_id: imageId,
          alt_text: altText,
          visual_analysis: visualAnalysis,
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
