import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveLanguage } from "../_shared/language-detector.ts";
import {
  cleanAltText,
  generateAltWithKimi,
  isUsefulAltText,
  KIMI_ALT_MODEL,
} from "../_shared/kimi-alt.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function languageLabel(lang: string): string {
  if (lang === "fr") return "French";
  if (lang === "de") return "German";
  if (lang === "es") return "Spanish";
  if (lang === "it") return "Italian";
  return "English";
}

function siblingContext(siblingAltTexts: string[] = []): string {
  const siblings = siblingAltTexts.filter(Boolean).slice(0, 10);
  if (!siblings.length) return "";
  return `\nALT texts already used for sibling images:\n${siblings.map((alt, index) => `${index + 1}. ${alt}`).join("\n")}\nDo not duplicate them.`;
}

function buildTextPrompt(input: {
  lang: string;
  title: string;
  description: string;
  contentType: string;
  productType?: string;
  category?: string;
  imagePosition?: number | null;
  siblingAltTexts?: string[];
}): string {
  const isProduct = input.contentType === "product";
  return `You are an ecommerce SEO specialist. Generate exactly ONE ALT text in ${languageLabel(input.lang)}.

Title: ${input.title || "Untitled"}
Content type: ${input.contentType}
${input.productType ? `Product type: ${input.productType}` : ""}
${input.category ? `Category: ${input.category}` : ""}
${input.imagePosition ? `Image position: ${input.imagePosition} (context only; never write the number in the ALT)` : ""}
Description: ${input.description || "Not available"}${siblingContext(input.siblingAltTexts)}

Rules:
- Prefer 8-12 words and never exceed 125 characters.
- ${isProduct ? "Describe only this product image: visible type, material, finish, color, angle, texture or detail. If this product has several images, make this ALT specific to what differs in this exact image. Ignore staging and surrounding decor." : "Describe the main visible subject, style or purpose of this exact content image."}
- Do not invent details.
- Never reuse the exact same ALT for sibling images.
- No keyword stuffing.
- Do not start with “Image of”, “Photo of”, “Image de” or similar.
- Return only the final ALT text, with no quotes, label, list or explanation.`;
}

function buildVisionPrompt(
  lang: string,
  seed: string,
  contentType: string,
  imagePosition?: number | null,
  siblingAltTexts: string[] = [],
): string {
  return `Analyze the supplied ecommerce ${contentType} image and return exactly ONE ALT text in ${languageLabel(lang)}.
${seed ? `A text-only model suggested this starting point: ${seed}` : ""}
${imagePosition ? `This is image position ${imagePosition}; use that only as context and never write the number.` : ""}${siblingContext(siblingAltTexts)}

Rules:
- Describe what is genuinely visible in THIS image.
- Prefer 8-12 words, maximum 125 characters.
- ${contentType === "product" ? "Focus on the product itself. Distinguish this image by visible angle, color, finish, texture or detail when applicable. Ignore staging/decor unless necessary to identify it." : "Capture the key visible subject, style or purpose."}
- Do not invent materials, colors or features that are not visible.
- Never duplicate a sibling ALT exactly.
- No keyword stuffing.
- No “Image of”, “Photo of”, “Image de” or similar prefix.
- Return only the ALT text.`;
}

function buildSafeFallbackAlt(input: { lang: string; title: string; contentType: string; productType?: string; category?: string }): string {
  const clean = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (input.contentType === "homepage") return input.lang === "fr" ? "Accueil de la boutique en ligne" : "Online store homepage";
  const parts = [clean(input.title), clean(input.productType), clean(input.category)]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((other) => other.toLowerCase() === value.toLowerCase()) === index);
  const candidate = cleanAltText(parts.join(" – "));
  if (isUsefulAltText(candidate)) return candidate;
  const labels: Record<string, string> = input.lang === "fr"
    ? { product: "Produit de la boutique", collection: "Collection de produits", page: "Page de la boutique", article: "Article du blog", content: "Contenu de la boutique" }
    : { product: "Store product", collection: "Product collection", page: "Store page", article: "Blog article", content: "Store content" };
  return labels[input.contentType] || labels.content;
}

async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = await response.json();
  return cleanAltText(data?.choices?.[0]?.message?.content?.trim() || "");
}

async function callGeminiVision(imageUrl: string, prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Image fetch failed: ${imageResponse.status}`);

  const mimeType = (imageResponse.headers.get("content-type") || "image/jpeg").split(";")[0];
  const base64 = arrayBufferToBase64(await imageResponse.arrayBuffer());
  const configuredModel = Deno.env.get("GEMINI_ALT_MODEL")?.trim();
  const models = [...new Set([configuredModel, "gemini-3.6-flash", "gemini-2.5-flash"].filter(Boolean) as string[])];
  const errors: string[] = [];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100,
          },
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      const text = cleanAltText(data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "");
      if (isUsefulAltText(text)) return text;
      errors.push(`${model}: empty/generic response`);
      continue;
    }

    errors.push(`${model} ${response.status}: ${(await response.text()).slice(0, 180)}`);
  }

  throw new Error(`Gemini fallback failed: ${errors.join(" | ")}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true, primaryModel: KIMI_ALT_MODEL, fallbackModels: ["gemini-3.6-flash", "gemini-2.5-flash"] }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { image_id, imageType = "product", force = false } = body;
    if (!image_id) throw new Error("image_id missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isContentImage = imageType !== "product";
    let image: any;
    let sellerId = "";
    let storeId = "";
    let title = "";
    let description = "";
    let productType = "";
    let category = "";
    let contentType = isContentImage ? imageType : "product";
    let imagePosition: number | null = null;
    let siblingAltTexts: string[] = [];

    if (isContentImage) {
      const { data: contentImage, error } = await supabase
        .from("content_images")
        .select("id, src, alt_text, optimization_count, shopify_image_id, content_id, content_type, store_id, user_id, position")
        .eq("id", image_id)
        .single();

      if (error || !contentImage) throw new Error("Content image not found");
      image = contentImage;
      sellerId = contentImage.user_id;
      storeId = contentImage.store_id;
      contentType = contentImage.content_type || imageType || "content";
      imagePosition = contentImage.position ?? null;

      const { data: siblings } = await supabase
        .from("content_images")
        .select("alt_text")
        .eq("store_id", storeId)
        .eq("content_id", contentImage.content_id)
        .eq("content_type", contentType)
        .neq("id", image_id)
        .not("alt_text", "is", null)
        .limit(10);
      siblingAltTexts = (siblings || []).map((row: any) => row.alt_text).filter(Boolean);

      if (contentType === "collection") {
        const { data } = await supabase
          .from("shopify_collections")
          .select("title, body_html")
          .eq("id", contentImage.content_id)
          .maybeSingle();
        title = data?.title || "Collection";
        description = data?.body_html || "";
      } else if (contentType === "article") {
        const { data } = await supabase
          .from("blog_articles")
          .select("title, content")
          .eq("id", contentImage.content_id)
          .maybeSingle();
        title = data?.title || "Article";
        description = data?.content || "";
      } else if (contentType === "page") {
        const { data } = await supabase
          .from("shopify_pages")
          .select("title, body_html")
          .eq("id", contentImage.content_id)
          .maybeSingle();
        title = data?.title || "Page";
        description = data?.body_html || "";
      } else {
        title = contentType === "homepage" ? "Homepage" : "Content";
      }
    } else {
      const { data: productImage, error } = await supabase
        .from("product_images")
        .select("id, src, alt_text, optimization_count, shopify_image_id, product_id, position")
        .eq("id", image_id)
        .single();

      if (error || !productImage) throw new Error("Product image not found");
      image = productImage;
      imagePosition = productImage.position ?? null;

      const { data: product, error: productError } = await supabase
        .from("shopify_products")
        .select("id, title, body_html, product_type, category, seller_id, store_id")
        .eq("id", productImage.product_id)
        .single();

      if (productError || !product) throw new Error("Product not found");
      sellerId = product.seller_id;
      storeId = product.store_id;
      title = product.title || "Product";
      description = product.body_html || "";
      productType = product.product_type || "";
      category = product.category || "";
      contentType = "product";

      const { data: siblings } = await supabase
        .from("product_images")
        .select("alt_text")
        .eq("product_id", product.id)
        .neq("id", image_id)
        .not("alt_text", "is", null)
        .limit(10);
      siblingAltTexts = (siblings || []).map((row: any) => row.alt_text).filter(Boolean);
    }

    if (image.alt_text?.trim() && (image.optimization_count ?? 0) > 0 && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          alt: image.alt_text,
          provider: "existing",
          skipped: true,
          shopifySynced: false,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const { data: store } = await supabase
      .from("shopify_connections")
      .select("store_language")
      .eq("id", storeId)
      .maybeSingle();

    const rawStoreLanguage = store?.store_language || "en-US";
    const plainDescription = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 500);
    const lang = resolveLanguage({
      contentText: `${title} ${plainDescription}`,
      storeLanguage: rawStoreLanguage,
    });

    console.log(`[smart-alt-text] ${image_id}: Kimi-first (${KIMI_ALT_MODEL}), language=${lang}, type=${contentType}, position=${imagePosition ?? "n/a"}`);

    let finalAlt = "";
    let provider = "kimi";

    try {
      finalAlt = await generateAltWithKimi({
        imageUrl: image.src,
        title,
        description: plainDescription,
        language: lang,
        contentType,
        imagePosition,
        siblingAltTexts,
      });
      console.log(`[smart-alt-text] ✅ Kimi ALT: "${finalAlt}"`);
    } catch (kimiError) {
      console.warn("[smart-alt-text] ⚠️ Kimi unavailable after retry; using DeepSeek/Gemini fallback:", kimiError);
      provider = "gemini-fallback";

      const textPrompt = buildTextPrompt({
        lang,
        title,
        description: plainDescription,
        contentType,
        productType,
        category,
        imagePosition,
        siblingAltTexts,
      });

      let seed = "";
      try {
        seed = await callDeepSeek(textPrompt);
      } catch (deepSeekError) {
        console.warn("[smart-alt-text] DeepSeek seed failed; Gemini will work from image/context only:", deepSeekError);
      }

      try {
        finalAlt = await callGeminiVision(image.src, buildVisionPrompt(lang, seed, contentType, imagePosition, siblingAltTexts));
      } catch (geminiError) {
        if (isUsefulAltText(seed)) {
          provider = "deepseek-fallback";
          finalAlt = seed;
          console.warn("[smart-alt-text] Gemini failed; using DeepSeek seed:", geminiError);
        } else {
          provider = "safe-fallback";
          finalAlt = buildSafeFallbackAlt({ lang, title, contentType, productType, category });
          console.warn("[smart-alt-text] Gemini/DeepSeek unavailable; using safe contextual fallback:", geminiError);
        }
      }
    }

    finalAlt = cleanAltText(finalAlt);
    if (!isUsefulAltText(finalAlt)) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate valid ALT text", generatedText: finalAlt }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const tableName = isContentImage ? "content_images" : "product_images";
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        alt_text: finalAlt,
        optimization_count: (image.optimization_count ?? 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ai_generated: true,
      })
      .eq("id", image.id);

    if (updateError) throw updateError;

    if (sellerId) {
      await supabase.rpc("increment_usage", {
        p_seller_id: sellerId,
        p_field: "optimizations_count",
        p_increment: 3,
      });
    }

    let shopifySynced = false;
    let syncError = "";

    if (image.shopify_image_id) {
      try {
        const syncResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-seo-to-shopify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              imageId: image_id,
              imageType: contentType,
              serviceMode: true,
              userId: sellerId,
              syncAltText: true,
              force: true,
            }),
          },
        );

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json().catch(() => ({ success: true }));
          shopifySynced = syncResult?.success !== false;
          if (!shopifySynced) syncError = syncResult?.error || syncResult?.message || "Sync returned failure";
        } else {
          syncError = `HTTP ${syncResponse.status}: ${(await syncResponse.text()).slice(0, 500)}`;
        }
      } catch (error) {
        syncError = error instanceof Error ? error.message : "Unknown sync error";
      }
    } else {
      syncError = "Image has no Shopify ID";
    }

    return new Response(
      JSON.stringify({
        success: true,
        alt: finalAlt,
        altText: finalAlt,
        provider,
        primaryModel: KIMI_ALT_MODEL,
        shopifySynced,
        syncError: syncError || undefined,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[smart-alt-text] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});