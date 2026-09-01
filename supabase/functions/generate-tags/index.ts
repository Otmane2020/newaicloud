import "../_shared/strict-ai-generation.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";
import { resolveLanguage } from "../_shared/language-detector.ts";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TagGenerationRequest {
  productId: string;
  force?: boolean;
}

function normalizeTag(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:cm|mm|m)\b/gi, " ")
    .replace(/[\[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter((word) => word && !/^\d+$/.test(word))
    .slice(0, 3)
    .join(" ");
}

function parseTagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(normalizeTag).filter(Boolean);
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(normalizeTag).filter(Boolean);
    if (parsed && typeof parsed === "object" && "tags" in parsed) {
      return parseTagList((parsed as Record<string, unknown>).tags);
    }
  } catch {
    // Plain comma/semicolon/new-line separated tag string.
  }

  return trimmed
    .split(/[,;\n|]+/)
    .map(normalizeTag)
    .filter(Boolean);
}

function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value);
    if (!tag || tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

function extractTagsFromAI(content: string): string[] {
  const trimmed = String(content || "").trim();
  if (!trimmed) return [];

  const candidates: string[] = [trimmed];
  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFence?.[1]) candidates.push(jsonFence[1].trim());
  const genericFence = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericFence?.[1]) candidates.push(genericFence[1].trim());
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const tags = parseTagList(
        Array.isArray(parsed)
          ? parsed
          : parsed?.tags ?? parsed?.keywords ?? parsed?.product_tags ?? parsed?.seo_tags,
      );
      if (tags.length) return uniqueTags(tags);
    } catch {
      // Try the next JSON representation.
    }
  }

  // Some providers return a correct comma-separated list without a JSON wrapper.
  return uniqueTags(parseTagList(trimmed.replace(/```(?:json)?/gi, "")));
}

function buildFallbackTags(product: any): string[] {
  const candidates: string[] = [];
  const add = (value: unknown) => {
    const tag = normalizeTag(value);
    if (tag) candidates.push(tag);
  };

  parseTagList(product.tags).forEach(add);
  [
    product.product_type,
    product.category,
    product.sub_category,
    product.ai_material,
    product.ai_color,
    product.vendor,
  ].forEach(add);

  const title = String(product.title || "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:cm|mm|m)\b/gi, " ")
    .replace(/[()]/g, " ");

  title
    .split(/\s*(?:-|–|—|,|\/|\||\bavec\b|\bwith\b|\bet\b|\band\b|&)\s*/i)
    .forEach(add);

  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !/^\d+$/.test(word));

  // Truthful n-grams from the real title give us a useful fallback without inventing attributes.
  for (let size = 3; size >= 1; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      add(words.slice(index, index + size).join(" "));
      if (uniqueTags(candidates).length >= 15) break;
    }
    if (uniqueTags(candidates).length >= 15) break;
  }

  const base = normalizeTag(product.product_type || product.category || words.slice(0, 2).join(" "));
  if (base) {
    const attributes = uniqueTags(candidates).filter((tag) => tag !== base);
    for (const attribute of attributes) {
      add(`${base} ${attribute}`);
      if (uniqueTags(candidates).length >= 15) break;
    }
  }

  return uniqueTags(candidates).slice(0, 15);
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

    const { productId, force = false }: TagGenerationRequest = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[TAGS] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: checkResult, error: checkError } = await supabaseClient
      .rpc("check_optimization_allowed", {
        p_user_id: user.id,
        p_resource_type: "product",
        p_resource_id: productId,
        p_force: force,
      });

    if (checkError) {
      console.error("Error checking optimization limits:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check optimization limits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!checkResult?.allowed) {
      return new Response(
        JSON.stringify({
          error: checkResult?.reason || "optimization_not_allowed",
          message: checkResult?.message || "Optimization is not allowed for this account.",
          limitReached: true,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, description, product_type, vendor, category, sub_category, ai_color, ai_material, tags, seller_id, optimization_count, store_id, shopify_connections!inner(store_language)")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      console.error("[TAGS] Product load error:", productError);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (product.seller_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (product.tags && product.tags.trim() !== "" && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "Product already has tags",
          data: { tags: product.tags },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawStoreLanguage = (product as any)?.shopify_connections?.store_language || "en-US";
    const language = resolveLanguage({
      contentText: `${product.title || ""} ${product.description || ""}`,
      storeLanguage: rawStoreLanguage,
    });
    console.log(`[TAGS] language=${language}, store=${rawStoreLanguage}, product="${product.title?.substring(0, 50)}"`);

    const tagPrompt = getSeoPrompt(language, "tags", {
      title: product.title,
      description: product.description,
      product_type: product.product_type,
      vendor: product.vendor,
      category: product.category,
      sub_category: product.sub_category,
      ai_color: product.ai_color,
      ai_material: product.ai_material,
    });

    const systemRole = getSystemRole(language, "tags");
    let aiProvider = "fallback";
    let aiModel = "deterministic-title-fallback";
    let aiTags: string[] = [];

    try {
      const tagResponse = await routeAI({
        messages: [
          { role: "system", content: systemRole },
          { role: "user", content: tagPrompt },
        ],
        maxTokens: 500,
        temperature: 0.2,
        preferredFreeModel: "moonshotai/kimi-k2.6:free",
      });

      aiProvider = tagResponse.provider;
      aiModel = tagResponse.model;
      aiTags = extractTagsFromAI(tagResponse.content);
      console.log(`[TAGS] AI provider=${aiProvider}, model=${aiModel}, parsed=${aiTags.length}`);
    } catch (aiError) {
      console.warn("[TAGS] AI unavailable, using safe fallback:", aiError);
    }

    const fallbackTags = buildFallbackTags(product);
    const finalTags = uniqueTags([...aiTags, ...fallbackTags]).slice(0, 15);

    if (finalTags.length < 8) {
      console.warn(`[TAGS] Only ${finalTags.length} tags available after fallback for ${productId}`);
    }

    const tags = finalTags.join(", ");
    if (!tags) {
      throw new Error("Could not generate a valid tag set for this product");
    }

    const previousHistory = product.optimization_history && typeof product.optimization_history === "object"
      ? product.optimization_history
      : {};
    const optimizationHistory = {
      ...previousHistory,
      tags_generated: new Date().toISOString(),
      tags_provider: aiProvider,
      tags_model: aiModel,
      tags_count: finalTags.length,
    };

    const { error: updateError } = await supabaseClient
      .from("shopify_products")
      .update({
        tags,
        seo_synced_to_shopify: false,
        optimization_count: (product.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        optimization_history: optimizationHistory,
      })
      .eq("id", productId);

    if (updateError) throw updateError;

    console.log(`[TAGS] Generated ${finalTags.length} tags for ${productId}: ${tags}`);

    await supabaseClient.rpc("increment_usage", {
      p_seller_id: product.seller_id,
      p_field: "optimizations_count",
      p_increment: 1,
    });

    let syncResult = { success: false, message: "" };
    try {
      const syncResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-seo-to-shopify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            productId,
            syncTags: true,
            force: true,
          }),
        }
      );

      if (syncResponse.ok) {
        syncResult = await syncResponse.json();
        console.log("[TAGS] Tags synced to Shopify successfully", syncResult);
      } else {
        const errorText = await syncResponse.text();
        console.error("[TAGS] Failed to sync tags to Shopify:", errorText);
        syncResult = { success: false, message: errorText };
      }
    } catch (syncError) {
      console.error("[TAGS] Error during auto-sync:", syncError);
      syncResult = {
        success: false,
        message: syncError instanceof Error ? syncError.message : "Unknown error",
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tags generated successfully",
        data: {
          product_id: productId,
          tags,
          tags_count: finalTags.length,
          ai_provider: aiProvider,
          ai_model: aiModel,
          fallback_used: aiTags.length < 8,
        },
        shopifySync: syncResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[TAGS] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});