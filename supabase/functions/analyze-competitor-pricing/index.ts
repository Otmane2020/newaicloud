import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PRODUCTS_PER_REQUEST = 5;
const DEFAULT_MARKET = "fr";

type MarketConfig = {
  code: string;
  location: string;
  gl: string;
  hl: string;
  languageCode: string;
  currency: string;
};

type PriceSource = "serpapi_shopping" | "dataforseo_shopping" | "dataforseo_serp";

type MarketPrice = {
  url: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  seller?: string;
  source: PriceSource;
  similarity?: number;
};

type CompetitorPrice = {
  url: string;
  title: string;
  price: number;
  currency: string;
  similarity: number;
  imageUrl?: string;
  source: string;
};

type ProviderDiagnostics = {
  provider: string;
  ok: boolean;
  count: number;
  error?: string;
};

function generateRequestId(): string {
  return `REQ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMarketConfig(code?: string): MarketConfig {
  const market = (code || DEFAULT_MARKET).toLowerCase();
  const configs: Record<string, MarketConfig> = {
    fr: { code: "fr", location: "France", gl: "fr", hl: "fr", languageCode: "fr", currency: "EUR" },
    be: { code: "be", location: "Belgium", gl: "be", hl: "fr", languageCode: "fr", currency: "EUR" },
    de: { code: "de", location: "Germany", gl: "de", hl: "de", languageCode: "de", currency: "EUR" },
    es: { code: "es", location: "Spain", gl: "es", hl: "es", languageCode: "es", currency: "EUR" },
    it: { code: "it", location: "Italy", gl: "it", hl: "it", languageCode: "it", currency: "EUR" },
    gb: { code: "gb", location: "United Kingdom", gl: "gb", hl: "en", languageCode: "en", currency: "GBP" },
    us: { code: "us", location: "United States", gl: "us", hl: "en", languageCode: "en", currency: "USD" },
  };
  return configs[market] || configs.fr;
}

function sanitizeUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "ref", "tag"].forEach((key) => {
      parsed.searchParams.delete(key);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/\u00a0/g, " ").replace(/[^0-9.,\s-]/g, "");
  if (!raw) return null;
  let normalized = raw.replace(/\s/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) normalized = normalized.replace(/\./g, "").replace(",", ".");
    else normalized = normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized = decimals > 0 && decimals <= 2 ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    if (decimals > 2) normalized = normalized.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPriceFromText(text: string): number | null {
  if (!text) return null;
  const matches = [
    text.match(/([0-9][0-9\s.,]{0,12})\s*(?:€|EUR)\b/i),
    text.match(/(?:€|EUR)\s*([0-9][0-9\s.,]{0,12})/i),
    text.match(/([0-9][0-9\s.,]{0,12})\s*(?:£|GBP)\b/i),
    text.match(/(?:£|GBP)\s*([0-9][0-9\s.,]{0,12})/i),
    text.match(/(?:\$|USD)\s*([0-9][0-9\s.,]{0,12})/i),
  ];
  for (const match of matches) {
    const price = safeNumber(match?.[1]);
    if (price != null && price > 1) return price;
  }
  return null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleSimilarity(productTitle: string, competitorTitle: string): number {
  const stop = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "et", "avec", "pour", "the", "and", "with", "for"]);
  const a = new Set(normalizeText(productTitle).split(" ").filter((token) => token.length > 2 && !stop.has(token)));
  const b = new Set(normalizeText(competitorTitle).split(" ").filter((token) => token.length > 2 && !stop.has(token)));
  if (!a.size || !b.size) return 0.5;
  let overlap = 0;
  a.forEach((token) => {
    if (b.has(token)) overlap += 1;
  });
  return Math.min(1, overlap / Math.max(1, Math.min(a.size, b.size)));
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 18000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      const detail = data?.error || data?.message || data?.status_message || text.slice(0, 300);
      throw new Error(`${response.status} ${detail || response.statusText}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function dedupePrices(items: MarketPrice[]): MarketPrice[] {
  const map = new Map<string, MarketPrice>();
  for (const item of items) {
    if (!Number.isFinite(item.price) || item.price <= 1 || !item.title) continue;
    const key = `${normalizeText(item.title)}|${normalizeText(item.seller || "")}|${item.price.toFixed(2)}`;
    const existing = map.get(key);
    if (!existing || (item.url && !existing.url)) map.set(key, item);
  }
  return [...map.values()];
}

async function searchSerpApiShopping(keyword: string, market: MarketConfig, requestId: string): Promise<MarketPrice[]> {
  const apiKey = Deno.env.get("SERPAPI_API_KEY") || Deno.env.get("SERP_API_KEY");
  if (!apiKey) throw new Error("SERPAPI_API_KEY non configurée");

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: keyword,
    api_key: apiKey,
    gl: market.gl,
    hl: market.hl,
    location: market.location,
  });

  console.log(`[${requestId}] SerpAPI Google Shopping: ${keyword}`);
  const data = await fetchJson(`https://serpapi.com/search.json?${params.toString()}`, { method: "GET" }, 20000);
  if (data?.error) throw new Error(String(data.error));

  const direct = Array.isArray(data?.shopping_results) ? data.shopping_results : [];
  const categorized = Array.isArray(data?.categorized_shopping_results)
    ? data.categorized_shopping_results.flatMap((group: any) => Array.isArray(group?.shopping_results) ? group.shopping_results : [])
    : [];

  return dedupePrices([...direct, ...categorized].map((item: any) => {
    const price = safeNumber(item?.extracted_price ?? item?.price);
    const title = String(item?.title || "").trim();
    const fallbackUrl = title ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title)}` : "";
    return {
      title,
      price: price || 0,
      currency: market.currency,
      url: sanitizeUrl(item?.link || item?.product_link || fallbackUrl),
      imageUrl: item?.thumbnail || item?.thumbnails?.[0],
      seller: item?.source || undefined,
      source: "serpapi_shopping" as PriceSource,
    };
  }));
}

function collectDataForSeoShoppingItems(value: any, market: MarketConfig, output: MarketPrice[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectDataForSeoShoppingItems(entry, market, output));
    return;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const price = safeNumber(value.price?.current ?? value.price);
  if (title && price != null && price > 1) {
    const seller = value.seller || value.domain || value.source || undefined;
    const fallbackUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title)}`;
    output.push({
      title,
      price,
      currency: value.currency || market.currency,
      url: sanitizeUrl(value.shopping_url || value.url || fallbackUrl),
      imageUrl: value.product_images?.[0] || value.thumbnail || value.image_url,
      seller,
      source: "dataforseo_shopping",
    });
  }

  if (Array.isArray(value.items)) collectDataForSeoShoppingItems(value.items, market, output);
}

async function searchDataForSeoShopping(keyword: string, market: MarketConfig, requestId: string): Promise<MarketPrice[]> {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO non configuré");

  const auth = `Basic ${btoa(`${login}:${password}`)}`;
  console.log(`[${requestId}] DataForSEO Google Shopping task: ${keyword}`);

  const post = await fetchJson(
    "https://api.dataforseo.com/v3/merchant/google/products/task_post",
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{
        keyword,
        location_name: market.location,
        language_code: market.languageCode,
        depth: 40,
        priority: 2,
      }]),
    },
    15000,
  );

  if (post?.status_code !== 20000) throw new Error(post?.status_message || "DataForSEO task_post failed");
  const task = post?.tasks?.[0];
  const taskId = task?.id;
  if (!taskId) throw new Error(task?.status_message || "DataForSEO n'a pas retourné de task id");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await delay(attempt === 0 ? 1200 : 1500);
    const get = await fetchJson(
      `https://api.dataforseo.com/v3/merchant/google/products/task_get/advanced/${encodeURIComponent(taskId)}`,
      { method: "GET", headers: { Authorization: auth, "Content-Type": "application/json" } },
      12000,
    );
    const resultTask = get?.tasks?.[0];
    if (resultTask?.status_code === 20000 && Array.isArray(resultTask?.result)) {
      const output: MarketPrice[] = [];
      collectDataForSeoShoppingItems(resultTask.result, market, output);
      return dedupePrices(output);
    }
  }

  throw new Error("DataForSEO Google Shopping: résultat non prêt dans le délai");
}

async function searchDataForSeoSerp(keyword: string, market: MarketConfig, requestId: string): Promise<MarketPrice[]> {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO non configuré");

  console.log(`[${requestId}] DataForSEO SERP live fallback: ${keyword}`);
  const auth = `Basic ${btoa(`${login}:${password}`)}`;
  const data = await fetchJson(
    "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{
        keyword,
        location_name: market.location,
        language_code: market.languageCode,
        depth: 20,
      }]),
    },
    18000,
  );

  const task = data?.tasks?.[0];
  if (task?.status_code !== 20000) throw new Error(task?.status_message || "DataForSEO SERP failed");
  const items = task?.result?.[0]?.items || [];
  const output: MarketPrice[] = [];

  for (const item of items) {
    const structured = safeNumber(item?.price?.current ?? item?.price);
    const textPrice = extractPriceFromText(`${item?.title || ""} ${item?.description || ""}`);
    const price = structured ?? textPrice;
    if (price == null || price <= 1 || !item?.title) continue;
    output.push({
      title: item.title,
      price,
      currency: item?.currency || market.currency,
      url: sanitizeUrl(item?.url || `https://www.google.com/search?q=${encodeURIComponent(item.title)}`),
      imageUrl: item?.images?.[0]?.url || item?.image_url,
      seller: item?.domain || undefined,
      source: "dataforseo_serp",
    });
  }

  return dedupePrices(output);
}

async function searchMarket(keyword: string, market: MarketConfig, requestId: string) {
  const diagnostics: ProviderDiagnostics[] = [];
  const all: MarketPrice[] = [];
  const serpApiConfigured = Boolean(Deno.env.get("SERPAPI_API_KEY") || Deno.env.get("SERP_API_KEY"));
  const dataForSeoConfigured = Boolean(Deno.env.get("DATAFORSEO_LOGIN") && Deno.env.get("DATAFORSEO_PASSWORD"));

  if (serpApiConfigured) {
    try {
      const results = await searchSerpApiShopping(keyword, market, requestId);
      all.push(...results);
      diagnostics.push({ provider: "SerpAPI Google Shopping", ok: true, count: results.length });
    } catch (error) {
      diagnostics.push({ provider: "SerpAPI Google Shopping", ok: false, count: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (all.length < 5 && dataForSeoConfigured) {
    try {
      const results = await searchDataForSeoShopping(keyword, market, requestId);
      all.push(...results);
      diagnostics.push({ provider: "DataForSEO Google Shopping", ok: true, count: results.length });
    } catch (error) {
      diagnostics.push({ provider: "DataForSEO Google Shopping", ok: false, count: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (all.length < 5 && dataForSeoConfigured) {
    try {
      const results = await searchDataForSeoSerp(keyword, market, requestId);
      all.push(...results);
      diagnostics.push({ provider: "DataForSEO SERP", ok: true, count: results.length });
    } catch (error) {
      diagnostics.push({ provider: "DataForSEO SERP", ok: false, count: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { prices: dedupePrices(all), diagnostics, serpApiConfigured, dataForSeoConfigured };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function filterOutliers(values: MarketPrice[]): MarketPrice[] {
  if (values.length < 5) return values;
  const sorted = [...values].sort((a, b) => a.price - b.price);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)].price;
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)].price;
  const iqr = q3 - q1;
  const min = Math.max(1, q1 - iqr * 1.5);
  const max = q3 + iqr * 1.5;
  return values.filter((item) => item.price >= min && item.price <= max);
}

function psychologicalPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  const rounded = Math.round(value);
  if (rounded < 20) return Math.max(1, Math.floor(value) + 0.99);
  return Math.max(1, Math.ceil(value) - 0.1);
}

function calculatePricing(
  productTitle: string,
  currentPrice: number,
  costPrice: number,
  shippingCost: number,
  taxRate: number,
  rawPrices: MarketPrice[],
) {
  const ranked = rawPrices
    .map((item) => ({ ...item, similarity: titleSimilarity(productTitle, item.title) }))
    .filter((item) => item.similarity >= 0.2)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  const filtered = filterOutliers(ranked).slice(0, 20);
  const marketPrice = median(filtered.map((item) => item.price));
  if (marketPrice == null) return null;

  const taxMultiplier = 1 + Math.max(0, taxRate) / 100;
  const minimumPriceForMargin = costPrice > 0
    ? costPrice * 1.3 * taxMultiplier + Math.max(0, shippingCost)
    : 0;
  const recommendedBase = Math.max(marketPrice, minimumPriceForMargin);
  const smartPrice = psychologicalPrice(recommendedBase);

  const competitors: CompetitorPrice[] = filtered.slice(0, 15).map((item) => ({
    url: item.url,
    title: item.title,
    price: Math.round(item.price * 100) / 100,
    currency: item.currency,
    similarity: Math.round((item.similarity || 0.5) * 100) / 100,
    imageUrl: item.imageUrl,
    source: `${item.seller || (item.source === "serpapi_shopping" ? "Google Shopping" : "Google")} · ${item.source === "serpapi_shopping" ? "SerpAPI" : "DataForSEO"}`,
  }));

  const gap = currentPrice > 0 ? ((currentPrice - marketPrice) / marketPrice) * 100 : null;
  const sources = [...new Set(filtered.map((item) => item.source === "serpapi_shopping" ? "SerpAPI Shopping" : item.source === "dataforseo_shopping" ? "DataForSEO Shopping" : "DataForSEO SERP"))];
  const reasoning = `Médiane marché ${marketPrice.toFixed(2)} ${filtered[0]?.currency || "EUR"} sur ${filtered.length} résultats réels (${sources.join(", ")}).${gap == null ? "" : ` Prix actuel ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}% vs marché.`}${minimumPriceForMargin > 0 ? ` Plancher marge 30%: ${minimumPriceForMargin.toFixed(2)}.` : ""}`;

  return {
    marketPrice: Math.round(marketPrice * 100) / 100,
    smartPrice: Math.round(smartPrice * 100) / 100,
    reasoning,
    competitors,
    competitorCount: competitors.length,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true, engine: "pricing-market-v2" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = generateRequestId();
  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const productIds = Array.isArray(body?.productIds) ? body.productIds.filter(Boolean) : [];
    if (!productIds.length) throw new Error("No products specified");

    const serpApiConfigured = Boolean(Deno.env.get("SERPAPI_API_KEY") || Deno.env.get("SERP_API_KEY"));
    const dataForSeoConfigured = Boolean(Deno.env.get("DATAFORSEO_LOGIN") && Deno.env.get("DATAFORSEO_PASSWORD"));
    if (!serpApiConfigured && !dataForSeoConfigured) {
      throw new Error("Aucun moteur de recherche marché configuré. Ajoutez SERPAPI_API_KEY ou DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD dans Supabase Secrets.");
    }

    const requestedMarkets = Array.isArray(body?.markets) && body.markets.length ? body.markets : [DEFAULT_MARKET];
    const market = getMarketConfig(requestedMarkets[0]);
    const taxRate = Number.isFinite(Number(body?.taxRate)) ? Number(body.taxRate) : 20;
    const idsToProcess = productIds.slice(0, MAX_PRODUCTS_PER_REQUEST);
    const truncated = productIds.length > idsToProcess.length;

    console.log(`[${requestId}] Pricing market v2: ${idsToProcess.length}/${productIds.length} products, market=${market.code}, SerpAPI=${serpApiConfigured}, DataForSEO=${dataForSeoConfigured}`);

    const results: any[] = [];

    for (const productId of idsToProcess) {
      try {
        const { data: product, error: productError } = await supabase
          .from("shopify_products")
          .select(`
            id,title,vendor,image_url,price,cost_price,shipping_cost,currency,seller_id,
            product_variants!product_id(id,title,sku,price,cost_price)
          `)
          .eq("id", productId)
          .eq("seller_id", user.id)
          .single();

        if (productError || !product) throw new Error("Produit introuvable ou non autorisé");

        const variants = Array.isArray((product as any).product_variants) ? (product as any).product_variants : [];
        const variantCosts = variants.map((variant: any) => safeNumber(variant?.cost_price)).filter((value: number | null): value is number => value != null && value > 0);
        const avgVariantCost = variantCosts.length ? variantCosts.reduce((sum: number, value: number) => sum + value, 0) / variantCosts.length : 0;
        const costPrice = safeNumber((product as any).cost_price) ?? avgVariantCost;
        const currentPrice = safeNumber((product as any).price) ?? safeNumber(variants?.[0]?.price) ?? 0;
        const shippingCost = safeNumber((product as any).shipping_cost) ?? 0;
        const query = [product.title, product.vendor].filter(Boolean).join(" ").trim();

        const marketSearch = await searchMarket(query, market, requestId);
        const pricing = calculatePricing(product.title, currentPrice, costPrice, shippingCost, taxRate, marketSearch.prices);

        if (!pricing) {
          const providerErrors = marketSearch.diagnostics.filter((entry) => !entry.ok).map((entry) => `${entry.provider}: ${entry.error}`).join(" | ");
          throw new Error(providerErrors || "Aucun prix concurrent réel trouvé");
        }

        const netMargin = pricing.smartPrice > 0
          ? (pricing.smartPrice - shippingCost) / (1 + taxRate / 100) - costPrice
          : null;

        const dbUpdate = {
          market_price: pricing.marketPrice,
          smart_price: pricing.smartPrice,
          ai_reasoning: pricing.reasoning,
          competitors: pricing.competitors,
          last_pricing_analysis: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
          .from("shopify_products")
          .update(dbUpdate)
          .eq("id", product.id)
          .eq("seller_id", user.id);
        if (updateError) console.error(`[${requestId}] DB update failed for ${product.id}: ${updateError.message}`);

        results.push({
          productId: product.id,
          title: product.title,
          currentPrice,
          costPrice,
          shippingCost,
          marketPrice: pricing.marketPrice,
          smartPrice: pricing.smartPrice,
          netMargin: netMargin == null ? null : Math.round(netMargin * 100) / 100,
          reasoning: pricing.reasoning,
          competitors: pricing.competitors,
          competitorCount: pricing.competitorCount,
          providers: marketSearch.diagnostics,
          confidence: {
            score: Math.min(100, 35 + Math.min(45, pricing.competitorCount * 5) + (marketSearch.diagnostics.some((entry) => entry.ok && entry.provider.includes("Shopping")) ? 20 : 0)),
            breakdown: {
              competitors: pricing.competitorCount,
              shopping: marketSearch.diagnostics.some((entry) => entry.ok && entry.provider.includes("Shopping")) ? 20 : 0,
            },
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${requestId}] Product ${productId} failed: ${message}`);
        results.push({
          productId,
          error: message,
          marketPrice: null,
          smartPrice: null,
          reasoning: message,
          competitors: [],
          competitorCount: 0,
          confidence: { score: 0, breakdown: {} },
        });
      }
    }

    const analyzed = results.filter((result) => !result.error).length;
    const failed = results.length - analyzed;
    if (analyzed === 0) {
      const firstError = results.find((result) => result.error)?.error || "Analyse marché impossible";
      throw new Error(firstError);
    }

    return new Response(JSON.stringify({
      success: true,
      requestId,
      results,
      providerConfig: { serpApi: serpApiConfigured, dataForSeo: dataForSeoConfigured },
      summary: {
        totalRequested: productIds.length,
        processed: idsToProcess.length,
        analyzed,
        failed,
        truncated,
        maxProductsPerRequest: MAX_PRODUCTS_PER_REQUEST,
        totalTimeMs: Date.now() - startedAt,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Fatal pricing analysis error: ${message}`);
    return new Response(JSON.stringify({ success: false, requestId, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
