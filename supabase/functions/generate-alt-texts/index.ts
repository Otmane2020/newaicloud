import "../_shared/strict-ai-generation.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAltWithKimi, KIMI_ALT_MODEL } from "../_shared/kimi-alt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextGenerationRequest {
  imageIds?: string[];
  imageId?: string;
  image_id?: string;
  imageType?: string;
  force?: boolean;
  language?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanFallbackAlt(value: string): string {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(alt(?: text)?\s*:?\s*|image of\s+|photo of\s+|image de\s+|photo de\s+)/i, "")
    .replace(/^[-*•]\s*/, "")
    .split(/\n|•/)[0]
    .trim()
    .slice(0, 125);
}

async function callGeminiVision(
  imageUrl: string,
  title: string,
  language: string,
  siblingAltTexts: string[] = [],
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

  const siblings = siblingAltTexts.filter(Boolean).slice(0, 10);
  const siblingContext = siblings.length
    ? `\nDo not duplicate these ALT texts already used by sibling images:\n${siblings.map((alt, index) => `${index + 1}. ${alt}`).join("\n")}`
    : "";
  const isFrench = language.toLowerCase().startsWith("fr");
  const prompt = isFrench
    ? `Génère UN SEUL texte ALT en français pour cette image e-commerce.\nTitre: ${title}\nDécris précisément CE QUI DIFFÈRE sur cette image (angle, couleur, finition, texture ou détail visible), sans inventer. 8 à 12 mots si possible, 125 caractères maximum. Ne commence pas par « Image de » ou « Photo de ».${siblingContext}\nRéponds uniquement avec le texte ALT.`
    : `Generate ONE ALT text in English for this ecommerce image.\nTitle: ${title}\nDescribe what is specific to THIS image (angle, color, finish, texture, or visible detail) without inventing details. Prefer 8-12 words, maximum 125 characters. Do not start with “Image of” or “Photo of”.${siblingContext}\nReturn only the ALT text.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const altText = cleanFallbackAlt(data?.choices?.[0]?.message?.content?.trim() || "");
  if (!altText) throw new Error("Gemini returned an empty ALT text");
  return altText;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: AltTextGenerationRequest = await req.json();
    let imageIds: string[] = [];
    if (Array.isArray(body.imageIds) && body.imageIds.length > 0) imageIds = body.imageIds;
    else if (body.imageId) imageIds = [body.imageId];
    else if (body.image_id) imageIds = [body.image_id];

    const force = body.force ?? false;
    const requestedImageType = body.imageType || "product";

    if (imageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Image IDs are required (imageIds, imageId, or image_id)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error("[ALT-TEXTS] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ALT-TEXTS] Processing ${imageIds.length} images. Primary model: ${KIMI_ALT_MODEL}`);

    const results: Array<{
      imageId: string;
      success: boolean;
      altText?: string;
      provider?: string;
      error?: string;
      synced?: boolean;
      syncError?: string;
    }> = [];

    for (let index = 0; index < imageIds.length; index++) {
      const imageId = imageIds[index];

      try {
        let image: any = null;
        let sellerId: string | null = null;
        let storeId: string | null = null;
        let storeLanguage = body.language || "en-US";
        let title = "Image";
        let description = "";
        let contentType = requestedImageType;
        let isContentImage = requestedImageType !== "product";
        let imagePosition: number | null = null;
        let siblingAltTexts: string[] = [];
        let productId: string | null = null;
        let contentId: string | null = null;

        if (!isContentImage) {
          const { data: productImage } = await supabaseClient
            .from("product_images")
            .select(`
              id, src, alt_text, optimization_count, shopify_image_id, product_id, position,
              shopify_products!inner(
                id, title, body_html, seller_id, store_id,
                shopify_connections!inner(store_language)
              )
            `)
            .eq("id", imageId)
            .maybeSingle();

          if (productImage) {
            image = productImage;
            productId = productImage.product_id;
            imagePosition = productImage.position ?? null;
            const product = (productImage as any).shopify_products;
            title = product?.title || "Product";
            description = product?.body_html || "";
            sellerId = product?.seller_id || null;
            storeId = product?.store_id || null;
            storeLanguage = body.language || product?.shopify_connections?.store_language || "en-US";
            contentType = "product";

            const { data: siblings } = await supabaseClient
              .from("product_images")
              .select("alt_text")
              .eq("product_id", productId)
              .neq("id", imageId)
              .not("alt_text", "is", null)
              .limit(10);
            siblingAltTexts = (siblings || []).map((row: any) => row.alt_text).filter(Boolean);
          }
        }

        if (!image) {
          const { data: contentImage } = await supabaseClient
            .from("content_images")
            .select("id, src, alt_text, optimization_count, shopify_image_id, content_id, content_type, user_id, store_id, position")
            .eq("id", imageId)
            .maybeSingle();

          if (contentImage) {
            image = contentImage;
            isContentImage = true;
            sellerId = contentImage.user_id;
            storeId = contentImage.store_id;
            contentId = contentImage.content_id;
            contentType = contentImage.content_type || "content";
            imagePosition = contentImage.position ?? null;

            const { data: siblings } = await supabaseClient
              .from("content_images")
              .select("alt_text")
              .eq("store_id", storeId)
              .eq("content_id", contentId)
              .eq("content_type", contentType)
              .neq("id", imageId)
              .not("alt_text", "is", null)
              .limit(10);
            siblingAltTexts = (siblings || []).map((row: any) => row.alt_text).filter(Boolean);

            if (contentType === "collection") {
              const { data: collection } = await supabaseClient
                .from("shopify_collections")
                .select("title, body_html")
                .eq("id", contentImage.content_id)
                .maybeSingle();
              title = collection?.title || "Collection";
              description = collection?.body_html || "";
            } else if (contentType === "article") {
              const { data: article } = await supabaseClient
                .from("blog_articles")
                .select("title, content")
                .eq("id", contentImage.content_id)
                .maybeSingle();
              title = article?.title || "Article";
              description = article?.content || "";
            } else if (contentType === "page") {
              const { data: page } = await supabaseClient
                .from("shopify_pages")
                .select("title, body_html")
                .eq("id", contentImage.content_id)
                .maybeSingle();
              title = page?.title || "Page";
              description = page?.body_html || "";
            } else {
              title = contentType === "homepage" ? "Homepage" : "Content";
            }

            if (storeId) {
              const { data: store } = await supabaseClient
                .from("shopify_connections")
                .select("store_language")
                .eq("id", storeId)
                .maybeSingle();
              storeLanguage = body.language || store?.store_language || "en-US";
            }
          }
        }

        if (!image) {
          results.push({ imageId, success: false, error: "Image not found" });
          continue;
        }

        if (sellerId !== user.id) {
          results.push({ imageId, success: false, error: "Unauthorized" });
          continue;
        }

        const optimizationCount = image.optimization_count ?? 0;
        if (image.alt_text?.trim() && optimizationCount > 0 && !force) {
          results.push({ imageId, success: true, altText: image.alt_text, provider: "existing", synced: false });
          continue;
        }

        let altText = "";
        let provider = "kimi";

        try {
          altText = await generateAltWithKimi({
            imageUrl: image.src,
            title,
            description,
            language: storeLanguage,
            contentType,
            imagePosition,
            siblingAltTexts,
          });
          console.log(`[ALT-TEXTS] ✅ Kimi generated ALT for ${imageId}: "${altText}"`);
        } catch (kimiError) {
          provider = "gemini-fallback";
          console.warn(`[ALT-TEXTS] ⚠️ Kimi unavailable after retry for ${imageId}; falling back to Gemini:`, kimiError);
          altText = await callGeminiVision(image.src, title, storeLanguage, siblingAltTexts);
        }

        const tableName = isContentImage ? "content_images" : "product_images";
        const { error: updateError } = await supabaseClient
          .from(tableName)
          .update({
            alt_text: altText,
            last_optimization_at: new Date().toISOString(),
            optimization_count: optimizationCount + 1,
            is_ai_generated: true,
          })
          .eq("id", imageId);

        if (updateError) {
          results.push({ imageId, success: false, error: updateError.message });
          continue;
        }

        let synced = false;
        let syncErrorMsg: string | undefined;

        if (image.shopify_image_id) {
          try {
            const syncResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-seo-to-shopify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
                body: JSON.stringify({ imageId, imageType: contentType, syncAltText: true, force: true }),
              },
            );

            if (syncResponse.ok) {
              const syncData = await syncResponse.json().catch(() => ({ success: true }));
              synced = syncData?.success !== false;
              if (!synced) syncErrorMsg = syncData?.error || syncData?.message || "Sync returned failure";
            } else {
              syncErrorMsg = await syncResponse.text();
            }
          } catch (syncError) {
            syncErrorMsg = syncError instanceof Error ? syncError.message : "Unknown sync error";
          }
        }

        results.push({ imageId, success: true, altText, provider, synced, syncError: syncErrorMsg });

        if (sellerId) {
          await supabaseClient.rpc("increment_usage", {
            p_seller_id: sellerId,
            p_field: "optimizations_count",
            p_increment: 1,
          });
        }

        if (index < imageIds.length - 1) await delay(1500);
      } catch (error) {
        console.error(`[ALT-TEXTS] Error processing image ${imageId}:`, error);
        results.push({
          imageId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const syncedCount = results.filter((r) => r.synced).length;
    const single = imageIds.length === 1 ? results[0] : undefined;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Generated ALT texts for ${successCount}/${imageIds.length} images, synced ${syncedCount} to Shopify`,
        primaryModel: KIMI_ALT_MODEL,
        results,
        shopifySynced: single?.synced ?? false,
        syncError: single?.syncError,
        altText: single?.altText,
        provider: single?.provider,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ALT-TEXTS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});