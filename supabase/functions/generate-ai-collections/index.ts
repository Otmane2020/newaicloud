import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  tags: string | null;
  image_url: string | null;
}

interface CollectionSuggestion {
  name: string;
  description: string;
  product_ids: string[];
}

type SuggestionsPayload = { collections: CollectionSuggestion[] };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function cleanAIJson(raw: string): SuggestionsPayload {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "").trim();

  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.collections)) {
    throw new Error("AI response does not contain a collections array");
  }

  return {
    collections: parsed.collections
      .filter((item: any) => item && typeof item.name === "string")
      .map((item: any) => ({
        name: item.name.trim().slice(0, 80),
        description: typeof item.description === "string" ? item.description.trim().slice(0, 300) : "",
        product_ids: Array.isArray(item.product_ids) ? item.product_ids.map(String) : [],
      })),
  };
}

function buildLocalFallback(products: Product[], language: string): SuggestionsPayload {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const rawType = (product.product_type || "").trim();
    const key = rawType || (language === "fr" ? "Autres produits" : "Other products");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(product);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const collections: CollectionSuggestion[] = [];

  for (const [type, items] of sorted) {
    for (let start = 0; start < items.length; start += 150) {
      const chunk = items.slice(start, start + 150);
      const suffix = items.length > 150 ? ` ${Math.floor(start / 150) + 1}` : "";
      const name = `${type}${suffix}`.slice(0, 30);
      collections.push({
        name,
        description: language === "fr"
          ? `Découvrez notre sélection ${type.toLowerCase()} choisie pour votre boutique.`.slice(0, 150)
          : `Discover our ${type.toLowerCase()} selection curated for your store.`.slice(0, 150),
        product_ids: chunk.map((p) => p.id),
      });
    }
  }

  return { collections: collections.slice(0, 30) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const storeId = body?.storeId;
    const language = body?.language || "fr";

    if (!storeId) return jsonResponse({ error: "storeId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "Supabase service is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization required" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("id, title, product_type, vendor, tags, image_url")
      .eq("store_id", storeId)
      .eq("seller_id", user.id);

    if (productsError) {
      console.error("[generate-ai-collections] Product fetch failed", productsError);
      return jsonResponse({ error: "Failed to fetch products" }, 500);
    }

    if (!products?.length) return jsonResponse({ error: "No products found to analyze" }, 400);

    console.log(`[generate-ai-collections] Analyzing ${products.length} products`);

    const productList = products.map((p: Product) => ({
      id: p.id,
      title: p.title,
      type: p.product_type || "",
      vendor: p.vendor || "",
      tags: p.tags || "",
    }));

    const targetProductsPerCollection = 80;
    const estimatedCollections = Math.min(20, Math.max(5, Math.ceil(products.length / targetProductsPerCollection)));

    let productDataForAI: string;
    if (products.length > 200) {
      const typeGroups: Record<string, { count: number; sample_titles: string[]; vendors: Set<string> }> = {};

      for (const p of productList) {
        const key = p.type || (language === "fr" ? "Non catégorisé" : "Uncategorized");
        if (!typeGroups[key]) typeGroups[key] = { count: 0, sample_titles: [], vendors: new Set() };
        typeGroups[key].count++;
        if (typeGroups[key].sample_titles.length < 5) typeGroups[key].sample_titles.push(p.title);
        if (p.vendor) typeGroups[key].vendors.add(p.vendor);
      }

      productDataForAI = JSON.stringify({
        total_products: products.length,
        groups: Object.entries(typeGroups).map(([type, data]) => ({
          type,
          count: data.count,
          sample_titles: data.sample_titles,
          vendors: Array.from(data.vendors).slice(0, 5),
        })),
        products: productList.map((p) => ({ id: p.id, title: p.title, type: p.type })),
      });
    } else {
      productDataForAI = JSON.stringify(productList);
    }

    const minCollections = Math.max(3, estimatedCollections - 2);
    const maxCollections = estimatedCollections + 2;
    const systemPrompt = language === "fr"
      ? `Tu es un expert e-commerce et merchandising. Regroupe les produits en collections commerciales cohérentes.\nRÈGLES:\n- Crée entre ${minCollections} et ${maxCollections} collections quand le catalogue le permet.\n- Tous les produits doivent être assignés à au moins une collection.\n- Maximum 150 produits par collection.\n- Nom court, commercial, maximum 30 caractères.\n- Description SEO: une phrase, maximum 150 caractères.\n- Utilise exactement les IDs fournis.\n- Réponds uniquement avec un objet JSON valide: {"collections":[{"name":"Nom","description":"Description","product_ids":["id"]}]}`
      : `You are an e-commerce merchandising expert. Group products into coherent commercial collections.\nRULES:\n- Create between ${minCollections} and ${maxCollections} collections when the catalog allows it.\n- Every product must belong to at least one collection.\n- Maximum 150 products per collection.\n- Short commercial name, maximum 30 characters.\n- SEO description: one sentence, maximum 150 characters.\n- Use the supplied product IDs exactly.\n- Return only a valid JSON object: {"collections":[{"name":"Name","description":"Description","product_ids":["id"]}]}`;

    const userPrompt = language === "fr"
      ? `Analyse ces ${products.length} produits et crée les collections:\n${productDataForAI}`
      : `Analyze these ${products.length} products and create the collections:\n${productDataForAI}`;

    const providerErrors: string[] = [];
    let suggestions: SuggestionsPayload | null = null;
    let provider = "local-fallback";
    let aiModel: string | undefined;

    try {
      console.log("[generate-ai-collections] Routing with OpenAI -> Gemini -> Kimi -> DeepSeek -> OpenRouter");
      const aiResult = await routeAI({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 8000,
      });
      suggestions = cleanAIJson(aiResult.content);
      provider = aiResult.provider;
      aiModel = aiResult.model;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      providerErrors.push(message);
      console.error("[generate-ai-collections] All AI providers failed, using local fallback", message);
    }

    if (!suggestions?.collections?.length) {
      suggestions = buildLocalFallback(products as Product[], language);
      provider = "local-fallback";
    }

    const validProductIds = new Set(products.map((p: Product) => p.id));
    suggestions.collections = suggestions.collections
      .map((collection) => ({
        ...collection,
        product_ids: [...new Set(collection.product_ids.filter((id) => validProductIds.has(id)))],
      }))
      .filter((collection) => collection.name && collection.product_ids.length > 0);

    const assignedIds = new Set(suggestions.collections.flatMap((c) => c.product_ids));
    const missingProducts = products.filter((p: Product) => !assignedIds.has(p.id));
    if (missingProducts.length) {
      const fallbackName = language === "fr" ? "Autres produits" : "Other products";
      for (let start = 0; start < missingProducts.length; start += 150) {
        const chunk = missingProducts.slice(start, start + 150);
        const suffix = missingProducts.length > 150 ? ` ${Math.floor(start / 150) + 1}` : "";
        suggestions.collections.push({
          name: `${fallbackName}${suffix}`.slice(0, 30),
          description: language === "fr" ? "Une sélection complémentaire de produits de la boutique." : "A complementary selection of store products.",
          product_ids: chunk.map((p: Product) => p.id),
        });
      }
    }

    const createdCollections: Array<{ id: string; name: string; productCount: number }> = [];

    for (const suggestion of suggestions.collections) {
      const handle = suggestion.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (!handle) continue;

      const { data: existingCollection } = await supabase
        .from("shopify_collections")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .eq("handle", handle)
        .maybeSingle();

      if (existingCollection) continue;

      const firstProduct = products.find((p: Product) => p.id === suggestion.product_ids[0]);
      const { data: newCollection, error: insertError } = await supabase
        .from("shopify_collections")
        .insert({
          title: suggestion.name,
          handle,
          body_html: `<p>${suggestion.description}</p>`,
          image_url: firstProduct?.image_url || null,
          image_alt: suggestion.name,
          user_id: user.id,
          store_id: storeId,
          shopify_collection_id: Math.floor(Math.random() * 1000000000),
        })
        .select()
        .single();

      if (insertError || !newCollection) {
        console.error(`[generate-ai-collections] Failed to create ${suggestion.name}`, insertError);
        continue;
      }

      for (const productId of suggestion.product_ids) {
        const { data: productData } = await supabase
          .from("shopify_products")
          .select("collection_ids")
          .eq("id", productId)
          .eq("store_id", storeId)
          .eq("seller_id", user.id)
          .maybeSingle();

        if (!productData) continue;
        const currentCollections = Array.isArray(productData.collection_ids) ? productData.collection_ids : [];
        if (!currentCollections.includes(newCollection.id)) {
          await supabase
            .from("shopify_products")
            .update({ collection_ids: [...currentCollections, newCollection.id] })
            .eq("id", productId)
            .eq("store_id", storeId)
            .eq("seller_id", user.id);
        }
      }

      createdCollections.push({
        id: newCollection.id,
        name: suggestion.name,
        productCount: suggestion.product_ids.length,
      });
    }

    console.log(`[generate-ai-collections] Created ${createdCollections.length} collections via ${provider}`);

    return jsonResponse({
      success: true,
      collections: createdCollections,
      provider,
      aiModel,
      fallbackUsed: provider !== "openai",
      providerErrors: providerErrors.length ? providerErrors : undefined,
      message: language === "fr"
        ? `${createdCollections.length} collections créées avec succès`
        : `${createdCollections.length} collections created successfully`,
    });
  } catch (error) {
    console.error("[generate-ai-collections] Unexpected error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});