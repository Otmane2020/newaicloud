import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextRequest {
  imageId: string;
  language?: string;
  style?: 'concise' | 'descriptive' | 'seo_optimized';
}

interface AltTextResponse {
  success: boolean;
  skipped?: boolean;
  message: string;
  data?: {
    image_id: string;
    alt_text: string;
    language: string;
    style: string;
  };
  error?: string;
  metadata?: {
    processing_time: number;
    model_used: string;
  };
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  product_id: string;
}

interface ShopifyProduct {
  title: string;
  description: string | null;
  category: string | null;
  ai_color: string | null;
  ai_material: string | null;
  seller_id: string;
}

// Configuration
const CONFIG = {
  MAX_RETRIES: 2,
  TIMEOUT_MS: 30000,
  MAX_TOKENS: 300,
  TEMPERATURE: 0.5,
  MODEL: 'deepseek-chat',
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

class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

function validateRequest(data: any): asserts data is AltTextRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }
  
  if (!data.imageId || typeof data.imageId !== 'string') {
    throw new ValidationError('Image ID is required and must be a string');
  }
  
  if (data.imageId.trim().length === 0) {
    throw new ValidationError('Image ID cannot be empty');
  }
  
  if (data.language && typeof data.language !== 'string') {
    throw new ValidationError('Language must be a string');
  }
  
  if (data.style && !['concise', 'descriptive', 'seo_optimized'].includes(data.style)) {
    throw new ValidationError('Style must be one of: concise, descriptive, seo_optimized');
  }
}

async function callDeepSeek(
  messages: DeepSeekMessage[], 
  maxTokens: number = CONFIG.MAX_TOKENS,
  retryCount: number = 0
): Promise<any> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

  if (!deepseekApiKey) {
    throw new AppError('DeepSeek API key not configured', 500, 'API_KEY_MISSING');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages,
        temperature: CONFIG.TEMPERATURE,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new RateLimitError();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API error ${response.status}:`, errorText);
      throw new AppError(
        `DeepSeek API error: ${response.status}`,
        response.status,
        'API_ERROR'
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('DeepSeek API request timeout', 408, 'TIMEOUT');
    }
    
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.warn(`Retrying DeepSeek API call (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return callDeepSeek(messages, maxTokens, retryCount + 1);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(
      `DeepSeek API call failed after ${CONFIG.MAX_RETRIES} retries: ${errorMessage}`,
      500,
      'API_CALL_FAILED'
    );
  }
}

function generateAltPrompt(
  product: ShopifyProduct, 
  language: string = 'French',
  style: string = 'seo_optimized'
): string {
  const styleInstructions = {
    concise: "Be very brief and to the point (5-8 words)",
    descriptive: "Provide detailed description (15-20 words)",
    seo_optimized: "Balance description with SEO keywords (10-15 words)"
  };

  return `Génère un texte ALT optimisé pour cette image produit en COMBINANT les informations produit ET les analyses visuelles disponibles :

Produit : ${product.title}
Description : ${product.description?.substring(0, 200) || "Non fournie"}
Catégorie : ${product.category || "Non spécifiée"}

Analyses visuelles disponibles :
- Couleur : ${product.ai_color || 'non disponible'}
- Matériau : ${product.ai_material || 'non disponible'}

RÈGLES :
1. Intègre le titre du produit
2. Incorpore les couleurs, matériaux détectés
3. Décris visuellement le produit de manière naturelle
4. 10-20 mots
5. SEO-friendly et accessible
6. En français

Exemple : "Table basse ronde en bois massif naturel, style scandinave épuré avec plateau lisse"

Réponds avec UN SEUL texte ALT, pas de JSON, pas d'explication.`;
}

function parseAltTextResponse(content: string, fallback: string): string {
  if (!content || typeof content !== 'string') {
    console.warn('Empty or invalid content from DeepSeek');
    return fallback;
  }

  // Try to parse JSON
  try {
    const parsed = JSON.parse(content);
    if (parsed.alt_text && typeof parsed.alt_text === 'string') {
      return parsed.alt_text.trim();
    }
  } catch (e) {
    console.warn('Failed to parse JSON response, attempting text extraction');
  }

  // Fallback: Look for ALT text patterns
  const altTextMatch = content.match(/"alt_text"\s*:\s*"([^"]+)"/) || 
                       content.match(/alt_text["']?\s*:\s*["']([^"']+)["']/);
  
  if (altTextMatch && altTextMatch[1]) {
    return altTextMatch[1].trim();
  }

  // Final fallback: use the entire content if it's reasonable
  const cleanContent = content.replace(/[{}"']/g, '').replace(/alt_text\s*:/gi, '').trim();
  if (cleanContent.length > 10 && cleanContent.length < 200) {
    return cleanContent;
  }

  return fallback;
}

async function trackUsage(supabaseClient: any, sellerId: string) {
  if (!sellerId) {
    console.warn('No seller ID provided for usage tracking');
    return;
  }

  try {
    const { error } = await supabaseClient.rpc('increment_usage', {
      p_seller_id: sellerId,
      p_field: 'optimizations_count',
      p_increment: 1
    });

    if (error) {
      console.error('Failed to track usage:', error);
    } else {
      console.log(`Usage tracked for seller: ${sellerId}`);
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

function createResponse(
  data: AltTextResponse, 
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      },
    }
  );
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Validate method
  if (req.method !== "POST") {
    return createResponse({
      success: false,
      message: "Method not allowed",
      error: "Only POST requests are supported"
    }, 405);
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new AppError('Supabase configuration missing', 500, 'CONFIG_ERROR');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Parse and validate request
    let requestData: AltTextRequest;
    try {
      requestData = await req.json();
      validateRequest(requestData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid JSON in request body');
    }

    const { imageId, language = "French", style = "seo_optimized" } = requestData;

    console.log(`Processing ALT text generation for image: ${imageId}`);

    // Get image data
    const { data: image, error: imageError } = await supabaseClient
      .from("product_images")
      .select("id, src, alt_text, product_id")
      .eq("id", imageId)
      .maybeSingle();

    if (imageError) {
      console.error('Database error fetching image:', imageError);
      throw new AppError('Failed to fetch image data', 500, 'DATABASE_ERROR');
    }

    if (!image) {
      throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
    }

    // Check if ALT text already exists
    if (image.alt_text && image.alt_text.trim() !== "") {
      return createResponse({
        success: true,
        skipped: true,
        message: "Image already has ALT text",
        data: {
          image_id: imageId,
          alt_text: image.alt_text,
          language,
          style
        },
        metadata: {
          processing_time: Date.now() - startTime,
          model_used: CONFIG.MODEL
        }
      });
    }

    // Get product data with optimization count
    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("title, description, category, ai_color, ai_material, seller_id, optimization_count")
      .eq("id", image.product_id)
      .maybeSingle();

    if (productError) {
      console.error('Database error fetching product:', productError);
      throw new AppError('Failed to fetch product data', 500, 'DATABASE_ERROR');
    }

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check if product already optimized for trial users
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', product.seller_id)
      .single();

    if (profile?.subscription_status === 'trialing' && (product.optimization_count || 0) >= 1) {
      throw new AppError('Ce produit a déjà été optimisé pendant votre période d\'essai.', 403, 'TRIAL_PRODUCT_ALREADY_OPTIMIZED');
    }

    // Generate ALT text using DeepSeek
    console.log(`Generating ALT text with DeepSeek for image: ${image.id}`);

    const altPrompt = generateAltPrompt(product, language, style);
    
    const altResponse = await callDeepSeek([
      {
        role: "system",
        content: `You are an accessibility and SEO expert. Generate high-quality ALT texts in the requested language. Always respond with valid JSON only. Current language: ${language}`,
      },
      {
        role: "user",
        content: altPrompt,
      },
    ]);

    const altContent = altResponse.choices[0]?.message?.content;
    const fallbackAltText = `${product.title} - ${product.category || 'product'}`;
    
    const altText = parseAltTextResponse(altContent, fallbackAltText);

    // Update database with new ALT text
    const { error: updateError } = await supabaseClient
      .from("product_images")
      .update({ 
        alt_text: altText,
        updated_at: new Date().toISOString()
      })
      .eq("id", imageId);

    if (updateError) {
      console.error('Database error updating ALT text:', updateError);
      throw new AppError('Failed to update ALT text', 500, 'UPDATE_ERROR');
    }

    // Increment product optimization count
    await supabaseClient
      .from("shopify_products")
      .update({ optimization_count: (product.optimization_count || 0) + 1 })
      .eq("id", image.product_id);

    console.log(`ALT text generated successfully for image ${imageId}: ${altText}`);

    // Track usage
    await trackUsage(supabaseClient, product.seller_id);

    const processingTime = Date.now() - startTime;

    return createResponse({
      success: true,
      message: "ALT text generated successfully",
      data: {
        image_id: imageId,
        alt_text: altText,
        language,
        style
      },
      metadata: {
        processing_time: processingTime,
        model_used: CONFIG.MODEL
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing request:", error);

    if (error instanceof AppError) {
      return createResponse({
        success: false,
        message: error.message,
        error: error.code || 'APPLICATION_ERROR',
        metadata: {
          processing_time: processingTime,
          model_used: CONFIG.MODEL
        }
      }, error.statusCode);
    }

    return createResponse({
      success: false,
      message: "An unexpected error occurred",
      error: "INTERNAL_SERVER_ERROR",
      metadata: {
        processing_time: processingTime,
        model_used: CONFIG.MODEL
      }
    }, 500);
  }
});