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

    console.log(`[ALT-TEXTS] Processing ${imageIds.length} images. Vision policy: Kimi free only (${KIMI_ALT_MODEL})`);

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

        if (!isContentImage) {
          const { data: productImage } = await supabaseClient
            .from("product_images")
            .select(`
              id, src, alt_text, optimization_count, shopify_image_id, product_id,
              shopify_products!inner(
                id, title, body_html, seller_id, store_id,
                shopify_connections!inner(store_language)
              )
            `)
            .eq("id", imageId)
            .maybeSingle();

          if (productImage) {
            image = productImage;
            const product = (productImage as any).shopify_products;
            title = product?.title || "Product";
            description = product?.body_html || "";
            sellerId = product?.seller_id || null;
            storeId = product?.store_id || null;
            storeLanguage = body.language || product?.shopify_connections?.store_language || "en-US";
            contentType = "product";
          }
        }

        if (!image) {
          const { data: contentImage } = await supabaseClient
            .from("content_images")
            .select("id, src, alt_text, optimization_count, shopify_image_id, content_id, content_type, user_id, store_id")
            .eq("id", imageId)
            .maybeSingle();

          if (contentImage) {
            image = contentImage;
            isContentImage = true;
            sellerId = contentImage.user_id;
            storeId = contentImage.store_id;
            contentType = contentImage.content_type || "content";

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

        // Vision rule: Kimi free only. No Lovable/Gemini paid-credit fallback.
        const altText = await generateAltWithKimi({
          imageUrl: image.src,
          title,
          description,
          language: storeLanguage,
          contentType,
        });
        const provider = "kimi-free";
        console.log(`[ALT-TEXTS] ✅ Kimi free generated ALT for ${imageId}: "${altText}"`);

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
                headers: { "Content-Type": "application/json", Authorization: authHeader },
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
