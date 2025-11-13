import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextVisionRequest {
  imageId: string;
  imageType?: 'product' | 'content';
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  
  // Pattern 1: ```json\n{...}\n```
  const jsonBlockMatch = cleaned.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  // Pattern 2: ```{...}```
  const codeBlockMatch = cleaned.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Pattern 3: Remove backticks
  return cleaned.replace(/^```json?\s*|\s*```$/g, '').trim();
}

function validateAltText(altText: string, minLength = 15, maxLength = 200): boolean {
  if (!altText || typeof altText !== 'string') {
    return false;
  }
  
  const trimmed = altText.trim();
  return (
    trimmed.length >= minLength &&
    trimmed.length <= maxLength &&
    !altText.includes('```')
  );
}

// Sleep utility for rate limiting
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Analyze title with DeepSeek to extract key SEO keywords
async function analyzeTitle(productTitle: string) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    console.warn('DeepSeek API key not configured, skipping title analysis');
    return { keywords: [], analysis: '' };
  }

  try {
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
            role: 'system',
            content: 'Tu es un expert SEO. Extrais les mots-clés importants d\'un titre produit pour optimiser le référencement.'
          },
          {
            role: 'user',
            content: `Analyse ce titre produit et extrais les mots-clés SEO importants (marque, style, matériau, fonction, couleur). Élimine les mots génériques comme "premium", "qualité", "top".

Titre: "${productTitle}"

Réponds UNIQUEMENT avec un JSON valide :
{
  "keywords": ["mot-clé 1", "mot-clé 2", ...],
  "analysis": "Brève analyse du titre en 1-2 phrases"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status);
      return { keywords: [], analysis: '' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    try {
      const cleaned = cleanJsonResponse(content);
      const parsed = JSON.parse(cleaned);
      return {
        keywords: parsed.keywords || [],
        analysis: parsed.analysis || ''
      };
    } catch (e) {
      console.error('Failed to parse DeepSeek response:', content);
      return { keywords: [], analysis: '' };
    }
  } catch (error) {
    console.error('DeepSeek analysis error:', error);
    return { keywords: [], analysis: '' };
  }
}

// Analyze image with Vision AI (Gemini)
async function callVisionAI(imageUrl: string, productContext: string, titleKeywords: string[], retryCount = 0) {
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  // Check for placeholder URLs that won't work
  if (imageUrl.includes('placeholder.com') || imageUrl.includes('via.placeholder')) {
    throw new Error('Cannot analyze placeholder images. Please use real product images.');
  }

  // Convert image to base64 efficiently
  let base64Data: string;
  if (imageUrl.startsWith('data:')) {
    base64Data = imageUrl.split(',')[1];
  } else {
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...Array.from(chunk));
      }
      base64Data = btoa(binary);
    } catch (fetchError) {
      console.error('Image fetch error:', fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      throw new Error(`Cannot access image URL: ${imageUrl}. ${errorMsg}`);
    }
  }

  // Rate limiting: wait before making request
  const minDelayBetweenRequests = 6500; // 6.5s to stay under 10 req/min
  await sleep(minDelayBetweenRequests);

  const keywordsContext = titleKeywords.length > 0 
    ? `\nMots-clés SEO du titre à intégrer : ${titleKeywords.join(', ')}`
    : '';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `🎯 MISSION : Créer un ALT text impactant en fusionnant l'analyse visuelle ET les mots-clés SEO du titre.

📊 ANALYSE VISUELLE DÉTAILLÉE (ce que tu VOIS dans l'image) :
   - Couleurs dominantes et secondaires précises
   - Matériaux visibles (bois, métal, tissu, cuir, plastique, verre)
   - Formes, dimensions apparentes, proportions
   - Textures (lisse, rugueux, brillant, mat, structuré)
   - Style visuel (moderne, vintage, minimaliste, classique, industriel)
   - Détails importants (pieds, poignées, motifs, finitions, ornements)
   - Environnement et contexte visuel

🔑 MOTS-CLÉS SEO DU TITRE À INTÉGRER :${keywordsContext}

📝 Context produit :
${productContext}

✨ FUSION INTELLIGENTE - Crée un résumé IMPACTANT :
   1. Valide que les mots-clés du titre correspondent à ce que tu vois
   2. Enrichis avec tes observations visuelles précises
   3. Crée une description fluide, naturelle et SEO-optimisée
   4. Mets en avant les points forts visuels + mots-clés importants
   5. 15-25 mots maximum, percutants et descriptifs

💎 EXEMPLES DE RÉSULTATS IMPACTANTS :
Titre: "Canapé d'angle Scandinave OSLO 5 Places Tissu Beige"
Vision: Canapé angle, tissu beige clair texturé, pieds bois clair épuré
✅ ALT: "Canapé d'angle scandinave Oslo 5 places, tissu beige texturé, pieds bois naturel, design épuré et élégant"

Titre: "Lampe Design Industriel Edison - Métal Noir Mat"
Vision: Lampe suspension métal noir mat, ampoule Edison visible, câble tressé
✅ ALT: "Lampe suspension industrielle Edison, structure métal noir mat, ampoule apparente, câble textile tressé noir"

Réponds UNIQUEMENT avec ce JSON valide :
{
  "alt_text": "Ton ALT text impactant fusionnant vision + mots-clés",
  "visual_analysis": "Description technique complète de tout ce que tu observes dans l'image (couleurs précises, matériaux, style, détails)"
}`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // Handle rate limit (429) with retry
    if (response.status === 429 && retryCount < 3) {
      console.warn(`Rate limit hit (attempt ${retryCount + 1}/3), retrying...`);
      
      // Parse retry delay from error
      let retryDelaySeconds = 30;
      try {
        const errorData = JSON.parse(errorText);
        const retryInfo = errorData.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          retryDelaySeconds = parseInt(retryInfo.retryDelay.replace('s', '')) || 30;
        }
      } catch {}
      
      console.log(`Waiting ${retryDelaySeconds}s before retry...`);
      await sleep(retryDelaySeconds * 1000);
      
      // Retry with incremented count
      return callVisionAI(imageUrl, productContext, retryCount + 1);
    }
    
    throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract text from Gemini response format
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return { text };
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

    // Get authorization header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageId, imageType = 'product' }: AltTextVisionRequest = await req.json();

    if (!imageId) {
      return new Response(
        JSON.stringify({ error: "Image ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check optimization limits using RPC
    const { data: checkResult, error: checkError } = await supabaseClient
      .rpc('check_optimization_allowed', {
        p_user_id: user.id,
        p_resource_type: 'image',
        p_resource_id: imageId,
        p_force: false
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
          message: checkResult.message
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get image info based on type
    let image: any;
    let imageError: any;
    
    if (imageType === 'content') {
      const result = await supabaseClient
        .from("content_images")
        .select("id, src, alt_text, content_type, content_id, user_id")
        .eq("id", imageId)
        .maybeSingle();
      
      image = result.data;
      imageError = result.error;
    } else {
      const result = await supabaseClient
        .from("product_images")
        .select("id, src, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();
      
      image = result.data;
      imageError = result.error;
    }

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

    // Get context based on image type
    let productContext = "";
    let userId = image.user_id;
    let productTitle = "";
    let product: any = null; // Declare product outside conditional blocks
    
    if (imageType === 'content') {
      // Get content context
      const contentType = image.content_type;
      const contentId = image.content_id;
      
      if (contentType === 'collection') {
        const { data: collection } = await supabaseClient
          .from("shopify_collections")
          .select("title, body_html")
          .eq("id", contentId)
          .maybeSingle();
        
        if (collection) {
          productTitle = collection.title;
          productContext = `Collection: ${collection.title}\n`;
          if (collection.body_html) {
            const shortDesc = collection.body_html.replace(/<[^>]*>/g, '').substring(0, 150);
            productContext += `Description: ${shortDesc}\n`;
          }
        }
      } else if (contentType === 'page') {
        const { data: page } = await supabaseClient
          .from("shopify_pages")
          .select("title, body_html")
          .eq("id", contentId)
          .maybeSingle();
        
        if (page) {
          productTitle = page.title;
          productContext = `Page: ${page.title}\n`;
        }
      } else if (contentType === 'article') {
        const { data: article } = await supabaseClient
          .from("blog_articles")
          .select("title, content")
          .eq("id", contentId)
          .maybeSingle();
        
        if (article) {
          productTitle = article.title;
          productContext = `Article: ${article.title}\n`;
          const shortContent = article.content.replace(/<[^>]*>/g, '').substring(0, 150);
          productContext += `Content: ${shortContent}\n`;
        }
      }
    } else {
      // Get product info (including title for keyword mixing and store_id for localization)
      const { data: productData, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("title, description, category, ai_color, ai_material, seller_id, store_id")
        .eq("id", image.product_id)
        .maybeSingle();

      if (productError || !productData) {
        console.error('Product not found for image:', imageId, 'product_id:', image.product_id, 'error:', productError);
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
      
      product = productData; // Assign to outer scope variable
      userId = productData.seller_id;
      productTitle = productData.title;
      storeId = productData.store_id; // Get store_id from product

      // Get variants for this product (for variable products)
      const { data: variants } = await supabaseClient
        .from("product_variants")
        .select("title, option1, option2, option3, ai_color, ai_material")
        .eq("product_id", image.product_id)
        .limit(5);

      // Build context with product title for keyword extraction
      productContext = `Titre produit: ${product.title}\n`;
      productContext += `Category: ${product.category || 'Product'}\n`;
      
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
    }

    console.log(`🎯 Vision AI Analysis for image: ${image.id}`);

    // 🌍 Get store localization for SERP analysis
    let storeCountry = 'United States';
    let storeLanguage = 'en';
    let storeId: string | null = null;
    
    // Get store_id based on image type
    if (imageType === 'content') {
      if (image.content_type === 'collection') {
        const { data: collection } = await supabaseClient
          .from("shopify_collections")
          .select("store_id")
          .eq("id", image.content_id)
          .maybeSingle();
        storeId = collection?.store_id || null;
      } else if (image.content_type === 'article') {
        const { data: article } = await supabaseClient
          .from("blog_articles")
          .select("store_id")
          .eq("id", image.content_id)
          .maybeSingle();
        storeId = article?.store_id || null;
      }
    }
    // For product images, storeId is already set above in the product block
    
    if (storeId) {
      console.log("🔍 Fetching store localization info...");
      try {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('primary_locale, country_code')
          .eq('id', storeId)
          .maybeSingle();
        
        if (storeData) {
          storeCountry = storeData.country_code || 'United States';
          storeLanguage = storeData.primary_locale?.split('-')[0] || 'en';
          console.log(`📍 Store location: ${storeCountry}, language: ${storeLanguage}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch store info, using defaults:', error);
      }
    }

    // Step 1: Analyze SERP for image visual patterns
    let serpImageInsights: any = null;
    if (productTitle) {
      console.log("🔍 Analyzing SERP for image patterns...");
      try {
        const { data: serpData, error: serpError } = await supabaseClient.functions.invoke("analyze-serp-competitors", {
          body: {
            keyword: productTitle,
            analysisType: "images",
            location: storeCountry,
            language: storeLanguage,
            maxResults: 10
          }
        });

        if (serpError) {
          console.warn("⚠️ SERP image analysis failed:", serpError);
        } else if (serpData) {
          serpImageInsights = serpData.insights;
          console.log("✅ SERP image analysis completed:", {
            dominantStyles: serpImageInsights?.dominantStyles?.length || 0,
            commonAngles: serpImageInsights?.commonAngles?.length || 0
          });
        }
      } catch (serpErr) {
        console.warn("⚠️ SERP image analysis error:", serpErr);
      }
    }

    // Step 2: Analyze title with DeepSeek to extract SEO keywords
    let titleKeywords: string[] = [];
    if (productTitle) {
      console.log(`🧠 DeepSeek - Analyzing title: "${productTitle}"`);
      const titleAnalysis = await analyzeTitle(productTitle);
      titleKeywords = titleAnalysis.keywords;
      console.log(`✅ DeepSeek - Keywords extracted: ${titleKeywords.join(', ')}`);
      
      // Enhance keywords with SERP visual insights
      if (serpImageInsights?.dominantStyles) {
        console.log(`✨ Adding SERP visual context: ${serpImageInsights.dominantStyles.slice(0, 2).join(', ')}`);
      }
    }

    // Step 3: Analyze image with Vision AI + incorporate DeepSeek keywords + SERP visual patterns
    const enhancedContext = serpImageInsights 
      ? `${productContext}\n\n🎨 SERP VISUAL PATTERNS:\n` +
        `Dominant styles: ${serpImageInsights.dominantStyles?.join(', ') || 'N/A'}\n` +
        `Common angles: ${serpImageInsights.commonAngles?.join(', ') || 'N/A'}\n` +
        `Color schemes: ${serpImageInsights.colorSchemes?.join(', ') || 'N/A'}\n` +
        `Aspect ratios: ${serpImageInsights.aspectRatios?.join(', ') || 'N/A'}`
      : productContext;

    const visionResponse = await callVisionAI(image.src, enhancedContext, titleKeywords);
    const visionContent = visionResponse.text;

    let altText = "";
    let visualAnalysis = "";
    
    try {
      const cleanedJson = cleanJsonResponse(visionContent);
      console.log('Cleaned JSON:', cleanedJson.substring(0, 100));
      
      const parsed = JSON.parse(cleanedJson);
      altText = parsed.alt_text || "";
      visualAnalysis = parsed.visual_analysis || "";
      
      if (!validateAltText(altText)) {
        throw new Error('ALT text validation failed');
      }
    } catch (e) {
      console.error('Failed to parse Vision JSON:', visionContent);
      console.error('Parse error:', e);
      
      // Fallback: extract from raw text
      const match = visionContent.match(/"alt_text":\s*"([^"]+)"/);
      if (match) {
        altText = match[1];
      } else {
        // Generic fallback based on content type
        const contextLines = productContext.split('\n');
        const firstLine = contextLines[0] || 'Image';
        altText = `${firstLine} - Image visuelle`.trim();
        visualAnalysis = 'Analyse visuelle non disponible';
      }
    }

    // Update image with ALT text and analysis
    const tableName = imageType === 'content' ? 'content_images' : 'product_images';
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({ 
        alt_text: altText
      })
      .eq("id", imageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Vision ALT text generated for image ${imageId}:`);
    console.log(`   - Title Keywords: ${titleKeywords.join(', ')}`);
    console.log(`   - ALT Text: ${altText}`);
    console.log(`   - Visual Analysis: ${visualAnalysis}`);
    console.log(`   - Character count: ${altText.length}`);

    // Track usage - Alt image counts as 3 optimizations
    if (userId) {
      await supabaseClient.rpc('increment_usage', {
        p_seller_id: userId,
        p_field: 'optimizations_count',
        p_increment: 3
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
