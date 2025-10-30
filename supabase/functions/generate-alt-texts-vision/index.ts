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
              text: `Analyse UNIQUEMENT ce que tu VOIS dans cette image de produit e-commerce.

RÈGLES ABSOLUES - ANALYSE VISUELLE PURE :
1. Base-toi UNIQUEMENT sur ce qui est VISIBLE dans l'image
2. Décris les couleurs dominantes et secondaires que tu vois
3. Identifie les matériaux visibles (bois, métal, tissu, cuir, plastique, verre, etc.)
4. Décris les formes et dimensions apparentes
5. Note les textures visibles (lisse, rugueux, brillant, mat, texturé)
6. Identifie le style visuel (moderne, vintage, minimaliste, classique, industriel)
7. Décris les détails importants (pieds, poignées, motifs, finitions, décoration)

⚠️ INTERDIT :
- Ne reprends PAS le titre tel quel
- N'invente PAS d'informations non visibles
- Ne mentionne PAS le titre produit directement

Context produit (POUR RÉFÉRENCE UNIQUEMENT) :
${productContext}

FORMAT DE RÉPONSE - 10 à 20 mots maximum :
- Commence par la catégorie visuelle du produit (chaise, table, lampe, etc.)
- Ajoute les couleurs dominantes observées
- Mentionne les matériaux visibles
- Décris le style ou les caractéristiques visuelles distinctives

Exemples corrects :
❌ MAUVAIS : "Canapé Scandinave Premium 3 Places" (reprend le titre)
✅ BON : "Canapé 3 places tissu gris clair, pieds bois naturel, style scandinave épuré"
✅ BON : "Chaise design noire métal et bois, assise rembourrée, pieds croisés"

Réponds UNIQUEMENT avec ce JSON valide :
{
  "alt_text": "Ta description visuelle pure (PAS le titre produit)",
  "visual_analysis": "Description technique complète de ce que tu vois réellement dans l'image"
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
      .select(`
        id, 
        src, 
        alt_text, 
        product_id,
        product:shopify_products(
          title, 
          description, 
          category, 
          ai_color, 
          ai_material,
          ai_style,
          seller_id
        )
      `)
      .eq("id", imageId)
      .maybeSingle();

    if (imageError || !image) {
      console.error('Image not found:', imageError);
      return new Response(
        JSON.stringify({ error: "Image not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!image.product) {
      console.error('Product not found for image:', imageId, 'product_id:', image.product_id);
      return new Response(
        JSON.stringify({ 
          error: "Product not found for this image. The product may have been deleted.",
          imageId: imageId,
          productId: image.product_id
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Type assertion: product is a single object, not an array
    const product = Array.isArray(image.product) ? image.product[0] : image.product;
    
    if (!product) {
      console.error('Product data is invalid for image:', imageId);
      return new Response(
        JSON.stringify({ error: "Invalid product data" }),
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

    // Build minimal context (for reference only, not to be copied)
    let productContext = `Category: ${product.category || 'Product'}\n`;
    
    if (product.description) {
      const shortDesc = product.description.substring(0, 150);
      productContext += `Description hint: ${shortDesc}\n`;
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
      
      // ✅ Vérifier que l'altText contient bien du contenu visuel
      if (!altText || altText.length < 15) {
        throw new Error('ALT text trop court');
      }
    } catch (e) {
      console.error("Failed to parse or validate Vision JSON:", visionContent);
      
      // ✅ Fallback qui tente d'extraire l'analyse du texte brut
      const match = visionContent.match(/"alt_text":\s*"([^"]+)"/);
      if (match) {
        altText = match[1];
      } else {
        // ❌ Dernier recours (mais avertir l'utilisateur)
        altText = `${product.title}${variants && variants.length > 0 ? ' - ' + variants[0].title : ''} (analyse visuelle échouée)`;
        console.error('❌ Vision AI failed to provide visual analysis');
      }
    }

    // ✅ Valider que l'ALT contient plus que juste le titre
    if (altText === product.title || altText.length < 20) {
      console.warn('⚠️ ALT text seems to lack visual description');
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

    console.log(`✅ Vision ALT text generated for image ${imageId}:`);
    console.log(`   - ALT Text: ${altText}`);
    console.log(`   - Visual Analysis: ${visualAnalysis}`);
    console.log(`   - Character count: ${altText.length}`);

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
