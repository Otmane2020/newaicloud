import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SmartAltTextRequest {
  imageId: string;
  language?: string;
  force?: boolean;
}

interface SmartAltTextResponse {
  success: boolean;
  alt_text?: string;
  message: string;
  metadata?: {
    vision_confidence: number;
    optimized_title_used: boolean;
    processing_time: number;
  };
}

const CONFIG = {
  MAX_RETRIES: 2,
  TIMEOUT_MS: 30000,
  GEMINI_MODEL: 'gemini-2.0-flash-exp',
} as const;

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

async function callGeminiVision(imageUrl: string, productContext: string, language: string): Promise<any> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    throw new AppError('Gemini API key not configured', 500, 'API_KEY_MISSING');
  }

  const languageInstructions = {
    'fr': 'Réponds UNIQUEMENT en FRANÇAIS',
    'en': 'Reply ONLY in ENGLISH',
    'es': 'Responde SOLO en ESPAÑOL'
  };

  const instruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['fr'];

  const prompt = `${instruction}

Analyze this product image and generate a professional, SEO-optimized ALT text.

Product Context:
${productContext}

Vision Analysis Required:
1. Main colors visible
2. Materials and textures
3. Key visual features
4. Product positioning/angle

Generate ONE concise ALT text (10-20 words) following this STRICT 3-STEP PROCESS:

STEP 1 - BASE (MANDATORY):
🎯 Start with the optimized product title as your FOUNDATION
Keep key descriptive terms: type, material, color, dimensions
The product title is in the context above.

STEP 2 - VISUAL ENRICHMENT:
🔍 Add precise details from what you SEE in the image:
- Exact colors visible (e.g., "beige" not "clair")
- Visible materials/textures (e.g., "céramique", "bois")
- Key features (e.g., "pieds noirs" not just "pieds")

STEP 3 - SIMPLIFICATION:
✅ Merge into natural ALT text (10-20 words)
✅ Remove redundancy, keep essential terms
✅ Make it SEO-friendly and accessible

🚨 CRITICAL: The product title is your BASE, not optional. NEVER describe from scratch.

Example (FR): "Table basse plateau céramique effet travertin mat beige avec pieds noirs"
Example (EN): "Coffee table ceramic travertine effect matte beige top with black legs"
Example (ES): "Mesa de centro sobre cerámica efecto travertino mate beige con patas negras"

Reply with ONE ALT text only, no JSON, no explanation.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: await fetchImageAsBase64(imageUrl)
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
          }
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      throw new AppError(`Gemini API error: ${response.status}`, response.status, 'GEMINI_ERROR');
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('Gemini API request timeout', 408, 'TIMEOUT');
    }
    
    throw error;
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new AppError('Failed to fetch image', 500, 'IMAGE_FETCH_ERROR');
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new AppError('Supabase configuration missing', 500, 'CONFIG_ERROR');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AppError('No authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const requestData: SmartAltTextRequest = await req.json();
    const { imageId, language = "fr", force = false } = requestData;

    if (!imageId) {
      throw new AppError('Image ID is required', 400, 'VALIDATION_ERROR');
    }

    console.log(`🎨 Smart ALT Text generation for image: ${imageId}, language: ${language}`);

    // Get image data
    const { data: image, error: imageError } = await supabaseClient
      .from("product_images")
      .select("id, src, alt_text, product_id, optimization_count")
      .eq("id", imageId)
      .maybeSingle();

    if (imageError || !image) {
      throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
    }

    // Check if already has ALT and not forcing
    if (image.alt_text && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          alt_text: image.alt_text,
          message: "Image already has ALT text (use force=true to regenerate)"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get product data
    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, seo_title, description, category, seller_id, store_id")
      .eq("id", image.product_id)
      .maybeSingle();

    if (productError || !product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Get store language
    let storeLanguage = language;
    try {
      const { data: storeData } = await supabaseClient
        .from('shopify_connections')
        .select('store_language')
        .eq('id', product.store_id)
        .maybeSingle();
      
      if (storeData?.store_language) {
        const detectedLang = storeData.store_language.split('-')[0].toLowerCase();
        storeLanguage = ['fr', 'en', 'es'].includes(detectedLang) ? detectedLang : language;
        console.log(`🌍 Using store language: ${storeLanguage}`);
      }
    } catch (error) {
      console.warn('Could not fetch store language:', error);
    }

    // Use optimized title if available, otherwise use smart-title
    let optimizedTitle = product.seo_title || product.title;
    let usedOptimizedTitle = !!product.seo_title;

    if (!product.seo_title) {
      try {
        console.log('📝 Calling smart-title for title optimization...');
        const { data: titleData } = await supabaseClient.functions.invoke('smart-title', {
          body: { 
            productId: product.id,
            userId: user.id,
            language: storeLanguage 
          }
        });
        
        if (titleData?.optimized_title) {
          optimizedTitle = titleData.optimized_title;
          usedOptimizedTitle = true;
          console.log(`✅ Using smart-title result: ${optimizedTitle}`);
        }
      } catch (error) {
        console.warn('Could not fetch smart-title, using original:', error);
      }
    }

    // Build product context
    const productContext = `
Product Title: ${optimizedTitle}
Description: ${product.description?.substring(0, 300) || 'Not provided'}
Category: ${product.category || 'Not specified'}
`.trim();

    // Call Gemini Vision AI
    console.log('🔍 Analyzing image with Gemini Vision AI...');
    const visionResponse = await callGeminiVision(image.src, productContext, storeLanguage);

    const altText = visionResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
                    `${optimizedTitle} - ${product.category || 'product'}`;

    // Validation: Check if ALT anchors on product title
    const productKeyTerms = optimizedTitle.toLowerCase()
      .split(/[\s–-]+/)
      .filter((term: string) => term.length > 4); // Keep significant words
    
    const altLower = altText.toLowerCase();
    const anchoredTerms = productKeyTerms.filter((term: string) => altLower.includes(term));
    
    if (anchoredTerms.length < 2) {
      console.warn(`⚠️ ALT text may not be properly anchored on title.
      Title key terms: ${productKeyTerms.join(', ')}
      Anchored: ${anchoredTerms.join(', ')}
      Generated ALT: ${altText}`);
    } else {
      console.log(`✅ ALT text properly anchored. Anchored terms: ${anchoredTerms.join(', ')}`);
    }

    // Update database
    const { error: updateError } = await supabaseClient
      .from("product_images")
      .update({ 
        alt_text: altText,
        optimization_count: (image.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", imageId);

    if (updateError) {
      console.error('Database error updating ALT text:', updateError);
      throw new AppError('Failed to update ALT text', 500, 'UPDATE_ERROR');
    }

    console.log(`✅ Smart ALT text generated: ${altText}`);

    // Track usage
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 1
    });

    const processingTime = Date.now() - startTime;

    const response: SmartAltTextResponse = {
      success: true,
      alt_text: altText,
      message: "Smart ALT text generated successfully with Vision AI",
      metadata: {
        vision_confidence: 0.9,
        optimized_title_used: usedOptimizedTitle,
        processing_time: processingTime
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing request:", error);

    const processingTime = Date.now() - startTime;
    
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
          error: error.code,
          metadata: { processing_time: processingTime }
        }),
        { status: error.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred",
        error: "INTERNAL_SERVER_ERROR",
        metadata: { processing_time: processingTime }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
