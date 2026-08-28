import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Product = {
  id: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  tags: string | null;
  image_url: string | null;
};

type CollectionSuggestion = { name: string; description: string; product_ids: string[] };
type SuggestionsPayload = { collections: CollectionSuggestion[] };

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function cleanAIJson(raw: string): SuggestionsPayload {
  const clean = (raw || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match?.[0] || clean);
  if (!Array.isArray(parsed?.collections)) throw new Error("AI response does not contain a collections array");
  return {
    collections: parsed.collections.filter((item: any) => item && typeof item.name === "string").map((item: any) => ({
      name: item.name.trim().slice(0, 80),
      description: typeof item.description === "string" ? item.description.trim().slice(0, 300) : "",
      product_ids: Array.isArray(item.product_ids) ? item.product_ids.map(String) : [],
    })),
  };
}

function buildLocalFallback(products: Product[], language: string): SuggestionsPayload {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.product_type?.trim() || (language === "fr" ? "Autres produits" : "Other products");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(product);
  }
  const collections: CollectionSuggestion[] = [];
  for (const [type, items] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    for (let start = 0; start < items.length; start += 150) {
      const chunk = items.slice(start, start + 150);
      const suffix = items.length > 150 ? ` ${Math.floor(start / 150) + 1}` : "";
      collections.push({
        name: `${type}${suffix}`.slice(0, 30),
        description: language === "fr" ? `Découvrez notre sélection ${type.toLowerCase()}.`.slice(0, 150) : `Discover our ${type.toLowerCase()} selection.`.slice(0, 150),
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Supabase service is not configured" }, 500);
    const supabase = createClient(supabaseUrl, serviceKey);

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
    if (productsError) return jsonResponse({ error: "Failed to fetch products" }, 500);
    if (!products?.length) return jsonResponse({ error: "No products found to analyze" }, 400);

    const productList = (products as Product[]).map((p) => ({ id: p.id, title: p.title, type: p.product_type || "", vendor: p.vendor || "", tags: p.tags || "" }));
    const estimated = Math.min(20, Math.max(3, Math.ceil(products.length / 80)));
    const minCollections = Math.max(3, estimated - 2);
    const maxCollections = estimated + 2;

    const systemPrompt = language === "fr"
      ? `Tu es un expert e-commerce et merchandising. Regroupe les produits en collections commerciales cohérentes. Crée entre ${minCollections} et ${maxCollections} collections si le catalogue le permet. Tous les produits doivent être assignés, maximum 150 produits par collection, noms commerciaux ≤30 caractères, descriptions SEO ≤150 caractères. Utilise exactement les IDs fournis. Réponds uniquement en JSON {"collections":[{"name":"Nom","description":"Description","product_ids":["id"]}]}.`
      : `You are an ecommerce merchandising expert. Group products into coherent commercial collections. Create ${minCollections}-${maxCollections} collections when possible. Assign every product, maximum 150 products per collection, commercial names ≤30 chars, SEO descriptions ≤150 chars. Use supplied IDs exactly. Return JSON only: {"collections":[{"name":"Name","description":"Description","product_ids":["id"]}]}.`;

    const compactProducts = productList.length > 400
      ? productList.map(({ id, title, type }) => ({ id, title, type }))
      : productList;

    let suggestions: SuggestionsPayload | null = null;
    let provider = "local-fallback";
    let model = "none";
    const providerErrors: string[] = [];

    try {
      const routed = await routeAI({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${language === "fr" ? "Analyse et crée les collections" : "Analyze and create collections"}:\n${JSON.stringify(compactProducts)}` },
        ],
        maxTokens: 8000,
        temperature: 0.2,
      });
      suggestions = cleanAIJson(routed.content);
      provider = routed.provider;
      model = routed.model;
    } catch (error) {
      providerErrors.push(error instanceof Error ? error.message : String(error));
      suggestions = buildLocalFallback(products as Product[], language);
    }

    if (!suggestions?.collections?.length) suggestions = buildLocalFallback(products as Product[], language);

    const validProductIds = new Set((products as Product[]).map((p) => p.id));
    suggestions.collections = suggestions.collections.map((collection) => ({
      ...collection,
      name: collection.name.slice(0, 30),
      description: collection.description.slice(0, 150),
      product_ids: [...new Set(collection.product_ids.filter((id) => validProductIds.has(id)))].slice(0, 150),
    })).filter((collection) => collection.name && collection.product_ids.length > 0);

    const assignedIds = new Set(suggestions.collections.flatMap((c) => c.product_ids));
    const missing = (products as Product[]).filter((p) => !assignedIds.has(p.id));
    for (let start = 0; start < missing.length; start += 150) {
      const chunk = missing.slice(start, start + 150);
      suggestions.collections.push({
        name: `${language === "fr" ? "Autres produits" : "Other products"}${missing.length > 150 ? ` ${Math.floor(start / 150) + 1}` : ""}`.slice(0, 30),
        description: language === "fr" ? "Une sélection complémentaire de produits de la boutique." : "A complementary selection of store products.",
        product_ids: chunk.map((p) => p.id),
      });
    }

    const createdCollections: Array<{ id: string; name: string; productCount: number }> = [];
    for (const suggestion of suggestions.collections) {
      const handle = suggestion.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!handle) continue;

      const { data: existing } = await supabase.from("shopify_collections").select("id").eq("store_id", storeId).eq("user_id", user.id).eq("handle", handle).maybeSingle();
      if (existing) continue;

      const firstProduct = (products as Product[]).find((p) => p.id === suggestion.product_ids[0]);
      const { data: newCollection, error: insertError } = await supabase.from("shopify_collections").insert({
        title: suggestion.name,
        handle,
        body_html: `<p>${suggestion.description}</p>`,
        image_url: firstProduct?.image_url || null,
        image_alt: suggestion.name,
        user_id: user.id,
        store_id: storeId,
        shopify_collection_id: Math.floor(Math.random() * 1_000_000_000),
      }).select().single();
      if (insertError || !newCollection) continue;

      for (const productId of suggestion.product_ids) {
        const { data: productData } = await supabase.from("shopify_products").select("collection_ids").eq("id", productId).eq("store_id", storeId).eq("seller_id", user.id).maybeSingle();
        if (!productData) continue;
        const current = Array.isArray(productData.collection_ids) ? productData.collection_ids : [];
        if (!current.includes(newCollection.id)) {
          await supabase.from("shopify_products").update({ collection_ids: [...current, newCollection.id] }).eq("id", productId).eq("store_id", storeId).eq("seller_id", user.id);
        }
      }
      createdCollections.push({ id: newCollection.id, name: suggestion.name, productCount: suggestion.product_ids.length });
    }

    return jsonResponse({
      success: true,
      collections: createdCollections,
      provider,
      model,
      fallbackUsed: provider === "local-fallback",
      providerErrors: providerErrors.length ? providerErrors : undefined,
      policy: "openrouter-free>gemini-free>kimi-free>deepseek-free",
      message: language === "fr" ? `${createdCollections.length} collections créées avec succès` : `${createdCollections.length} collections created successfully`,
    });
  } catch (error) {
    console.error("[generate-ai-collections] error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
