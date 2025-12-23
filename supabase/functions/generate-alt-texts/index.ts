import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextGenerationRequest {
  imageIds?: string[];
  imageId?: string;      // Support single image ID
  image_id?: string;     // Support snake_case variant
  imageType?: 'product' | 'content';  // Support image type for content_images
  force?: boolean;
  language?: string;
}

// Helper to add delay between API calls to avoid rate limits
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convert ArrayBuffer to base64 without stack overflow (chunked approach)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768; // Process in 32KB chunks to avoid stack overflow
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

async function callGeminiVision(imageUrl: string, productTitle: string, language: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const languageInstructions = language === 'fr' 
    ? 'Génère un texte ALT en FRANÇAIS pour cette image de produit.'
    : 'Generate an ALT text in ENGLISH for this product image.';

  const prompt = `${languageInstructions}
  
Produit: ${productTitle}

Le texte ALT doit:
- Décrire précisément ce qui est visible dans l'image
- Inclure le nom du produit
- Être concis (max 125 caractères)
- Être optimisé pour le SEO
- Ne PAS commencer par "Image de" ou "Photo de"

Réponds UNIQUEMENT avec le texte ALT, sans guillemets ni explication.`;

  // Use Lovable AI Gateway instead of direct Gemini API
  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const altText = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Clean up alt text - remove quotes if present
  return altText.replace(/^["']|["']$/g, '').substring(0, 125);
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
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

    const body: AltTextGenerationRequest = await req.json();
    
    // Normalize: accept imageIds array, imageId, or image_id (single)
    let imageIds: string[] = [];
    if (body.imageIds && Array.isArray(body.imageIds) && body.imageIds.length > 0) {
      imageIds = body.imageIds;
    } else if (body.imageId) {
      imageIds = [body.imageId];
    } else if (body.image_id) {
      imageIds = [body.image_id];
    }

    const force = body.force ?? false;
    const imageType = body.imageType || 'product';

    if (imageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Image IDs are required (imageIds, imageId, or image_id)" }),
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
      console.error('[ALT-TEXTS] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ALT-TEXTS] Processing ${imageIds.length} images for user ${user.id}, imageType: ${imageType}`);

    const results: Array<{ imageId: string; success: boolean; altText?: string; error?: string; synced?: boolean; syncError?: string }> = [];

    for (const imageId of imageIds) {
      try {
        let image: any = null;
        let contentData: any = null;
        let storeLanguage = 'en-US';
        let sellerId: string | null = null;
        let storeId: string | null = null;
        let productTitle = 'Image';
        let isContentImage = imageType === 'content';

        // Try product_images first if imageType is 'product' or unspecified
        if (!isContentImage) {
          const { data: productImage, error: productImageError } = await supabaseClient
            .from("product_images")
            .select(`
              id, 
              src, 
              alt_text,
              optimization_count,
              shopify_image_id,
              product_id,
              shopify_products!inner(
                id,
                title,
                seller_id,
                store_id,
                shopify_connections!inner(store_language)
              )
            `)
            .eq("id", imageId)
            .maybeSingle();

          if (productImage) {
            image = productImage;
            const product = (productImage as any).shopify_products;
            productTitle = product.title;
            sellerId = product.seller_id;
            storeId = product.store_id;
            storeLanguage = product.shopify_connections?.store_language || 'en-US';
          }
        }

        // If not found in product_images or imageType is 'content', try content_images
        if (!image) {
          const { data: contentImage, error: contentImageError } = await supabaseClient
            .from("content_images")
            .select(`
              id,
              src,
              alt_text,
              optimization_count,
              shopify_image_id,
              content_id,
              content_type,
              user_id,
              store_id
            `)
            .eq("id", imageId)
            .maybeSingle();

          if (contentImage) {
            image = contentImage;
            isContentImage = true;
            sellerId = contentImage.user_id;
            storeId = contentImage.store_id;
            
            // Get content title based on content_type
            const contentType = contentImage.content_type;
            if (contentType === 'collection') {
              const { data: collection } = await supabaseClient
                .from("shopify_collections")
                .select("title")
                .eq("id", contentImage.content_id)
                .maybeSingle();
              productTitle = collection?.title || 'Collection';
            } else if (contentType === 'article') {
              const { data: article } = await supabaseClient
                .from("blog_articles")
                .select("title")
                .eq("id", contentImage.content_id)
                .maybeSingle();
              productTitle = article?.title || 'Article';
            } else {
              productTitle = contentType === 'page' ? 'Page' : contentType === 'homepage' ? 'Homepage' : 'Content';
            }
            
            // Get store language
            if (storeId) {
              const { data: store } = await supabaseClient
                .from("shopify_connections")
                .select("store_language")
                .eq("id", storeId)
                .maybeSingle();
              storeLanguage = store?.store_language || 'en-US';
            }
          }
        }

        if (!image) {
          console.error(`[ALT-TEXTS] Image not found in both tables: ${imageId}`);
          results.push({ imageId, success: false, error: "Image not found" });
          continue;
        }

        const optimizationCount = image.optimization_count ?? 0;

        // Verify ownership
        if (sellerId !== user.id) {
          results.push({ imageId, success: false, error: "Unauthorized" });
          continue;
        }

        // Skip ONLY if already AI-optimized (optimization_count > 0) and not forcing.
        if (image.alt_text && image.alt_text.trim() !== '' && optimizationCount > 0 && !force) {
          results.push({
            imageId,
            success: true,
            altText: image.alt_text,
            synced: false
          });
          continue;
        }

        // Detect language
        const language = storeLanguage.toLowerCase().startsWith('fr') ? 'fr' : 'en';

        console.log(`[ALT-TEXTS] Generating ALT for ${isContentImage ? 'content' : 'product'} image ${imageId}, title: ${productTitle}, language: ${language}`);

        // Generate ALT text using Gemini Vision
        const altText = await callGeminiVision(image.src, productTitle, language);

        console.log(`[ALT-TEXTS] Generated ALT: "${altText}"`);

        // Update image in the correct table
        const tableName = isContentImage ? "content_images" : "product_images";
        const { error: updateError } = await supabaseClient
          .from(tableName)
          .update({
            alt_text: altText,
            last_optimization_at: new Date().toISOString(),
            optimization_count: optimizationCount + 1,
            is_ai_generated: true
          })
          .eq("id", imageId);

        if (updateError) {
          console.error(`[ALT-TEXTS] Failed to update image ${imageId}:`, updateError);
          results.push({ imageId, success: false, error: updateError.message });
          continue;
        }

        // 🔄 AUTO-SYNC: Sync ALT text to Shopify automatically after generation
        let synced = false;
        let syncErrorMsg: string | undefined;

        if (image.shopify_image_id) {
          try {
            console.log(`[ALT-TEXTS] Auto-syncing ALT text to Shopify for image ${imageId}...`);

            const syncResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-seo-to-shopify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authHeader,
                },
                body: JSON.stringify({
                  imageId: imageId,
                  syncAltText: true,
                  force: true,
                }),
              }
            );

            if (syncResponse.ok) {
              synced = true;
              console.log(`[ALT-TEXTS] ✅ ALT text synced to Shopify for image ${imageId}`);
            } else {
              const errorText = await syncResponse.text();
              syncErrorMsg = errorText;
              console.error(`[ALT-TEXTS] ⚠️ Failed to sync ALT to Shopify:`, errorText);
            }
          } catch (syncError) {
            syncErrorMsg = syncError instanceof Error ? syncError.message : 'Unknown sync error';
            console.error(`[ALT-TEXTS] ⚠️ Error during auto-sync:`, syncError);
          }
        } else {
          console.log(`[ALT-TEXTS] Image ${imageId} has no Shopify ID, skipping sync`);
        }

        results.push({ imageId, success: true, altText, synced, syncError: syncErrorMsg });

        // Track usage
        await supabaseClient.rpc('increment_usage', {
          p_seller_id: sellerId,
          p_field: 'optimizations_count',
          p_increment: 1
        });

        // Add delay between images to avoid rate limits (1.5 seconds)
        if (imageIds.indexOf(imageId) < imageIds.length - 1) {
          console.log(`[ALT-TEXTS] Waiting 1.5s before next image to avoid rate limits...`);
          await delay(1500);
        }

      } catch (error) {
        console.error(`[ALT-TEXTS] Error processing image ${imageId}:`, error);
        results.push({
          imageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const syncedCount = results.filter(r => r.synced).length;
    const single = imageIds.length === 1 ? results[0] : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ALT texts for ${successCount}/${imageIds.length} images, synced ${syncedCount} to Shopify`,
        results,
        // Compatibility fields expected by the frontend bulk processor (single-image calls)
        shopifySynced: single?.synced ?? false,
        syncError: single?.syncError,
        altText: single?.altText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[ALT-TEXTS] Error:", error);

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
