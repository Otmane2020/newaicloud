import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextGenerationRequest {
  imageIds: string[];
  force?: boolean;
}

async function callGeminiVision(imageUrl: string, productTitle: string, language: string): Promise<string> {
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: "image/jpeg",
                data: await fetchImageAsBase64(imageUrl)
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 150,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const altText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  
  // Clean up alt text - remove quotes if present
  return altText.replace(/^["']|["']$/g, '').substring(0, 125);
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64;
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

    const { imageIds, force = false }: AltTextGenerationRequest = await req.json();

    if (!imageIds || imageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Image IDs are required" }),
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

    console.log(`[ALT-TEXTS] Processing ${imageIds.length} images for user ${user.id}`);

    const results: Array<{ imageId: string; success: boolean; altText?: string; error?: string; synced?: boolean }> = [];

    for (const imageId of imageIds) {
      try {
        // Get image data with product info
        const { data: image, error: imageError } = await supabaseClient
          .from("product_images")
          .select(`
            id, 
            src, 
            alt_text, 
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

        if (imageError || !image) {
          console.error(`[ALT-TEXTS] Image not found: ${imageId}`, imageError);
          results.push({ imageId, success: false, error: "Image not found" });
          continue;
        }

        const product = (image as any).shopify_products;
        
        // Verify ownership
        if (product.seller_id !== user.id) {
          results.push({ imageId, success: false, error: "Unauthorized" });
          continue;
        }

        // Skip if already has alt text and not forcing
        if (image.alt_text && image.alt_text.trim() !== '' && !force) {
          results.push({ 
            imageId, 
            success: true, 
            altText: image.alt_text,
            synced: false
          });
          continue;
        }

        // Detect language
        const storeLanguage = product.shopify_connections?.store_language || 'en-US';
        const language = storeLanguage.toLowerCase().startsWith('fr') ? 'fr' : 'en';

        console.log(`[ALT-TEXTS] Generating ALT for image ${imageId}, product: ${product.title}, language: ${language}`);

        // Generate ALT text using Gemini Vision
        const altText = await callGeminiVision(image.src, product.title, language);

        console.log(`[ALT-TEXTS] Generated ALT: "${altText}"`);

        // Update image in database
        const { error: updateError } = await supabaseClient
          .from("product_images")
          .update({
            alt_text: altText,
            last_optimization_at: new Date().toISOString(),
            optimization_count: 1,
            is_ai_generated: true // ✅ Mark as AI-generated after optimization
          })
          .eq("id", imageId);

        if (updateError) {
          console.error(`[ALT-TEXTS] Failed to update image ${imageId}:`, updateError);
          results.push({ imageId, success: false, error: updateError.message });
          continue;
        }

        // 🔄 AUTO-SYNC: Sync ALT text to Shopify automatically after generation
        let synced = false;
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
                  force: true
                }),
              }
            );
            
            if (syncResponse.ok) {
              synced = true;
              console.log(`[ALT-TEXTS] ✅ ALT text synced to Shopify for image ${imageId}`);
            } else {
              const errorText = await syncResponse.text();
              console.error(`[ALT-TEXTS] ⚠️ Failed to sync ALT to Shopify:`, errorText);
            }
          } catch (syncError) {
            console.error(`[ALT-TEXTS] ⚠️ Error during auto-sync:`, syncError);
          }
        } else {
          console.log(`[ALT-TEXTS] Image ${imageId} has no Shopify ID, skipping sync`);
        }

        results.push({ imageId, success: true, altText, synced });

        // Track usage
        await supabaseClient.rpc('increment_usage', {
          p_seller_id: product.seller_id,
          p_field: 'optimizations_count',
          p_increment: 1
        });

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

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ALT texts for ${successCount}/${imageIds.length} images, synced ${syncedCount} to Shopify`,
        results
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
