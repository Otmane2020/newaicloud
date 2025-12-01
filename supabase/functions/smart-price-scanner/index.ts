// ============================================================================
// SMART PRICE SCANNER – VERSION C (ROBUSTE / FALLBACK ULTIME / IMPOSSIBLE À CASSER)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VisionAnalysis {
  title: string;
  searchQuery?: string;
  brand: string | null;
  category: string;
  keywords: string[];
  description: string;
  segment: string;
}

interface PriceResult {
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  currency: string;
}

interface Merchant {
  title: string;
  source: string;
  price: number | null;
  link: string;
}

interface ScanResult {
  vision: VisionAnalysis | null;
  searchQuery: string;
  price: PriceResult;
  merchants: Merchant[];
  productsFound: number;
  confidence: number;
  sources: {
    shopping: number;
    organic: number;
    visual: number;
  };
  processingTime: number;
}

// ---------------------------------------------------------------------------
// UTIL 1 — Convert image URL to Base64 for Vision AI
// ---------------------------------------------------------------------------
async function fetchImageAsDataUri(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (SmartScanner)" },
    });
    if (!response.ok) return url;

    const arr = new Uint8Array(await response.arrayBuffer());
    if (arr.length > 10_000_000) return url;

    let binary = "";
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
    const base64 = btoa(binary);

    const mime = (response.headers.get("content-type") || "image/jpeg").split(";")[0];
    return `data:${mime};base64,${base64}`;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// UTIL 2 — Simplify keywords for Shopping Search
// ---------------------------------------------------------------------------
function simplifyQuery(q: string) {
  const stop = ["the", "a", "an", "with", "and", "or", "for", "of", "top", "style", "design"];
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.includes(w))
    .slice(0, 4)
    .join(" ");
}

// ---------------------------------------------------------------------------
// UTIL 3 — Parse price string
// ---------------------------------------------------------------------------
function parsePrice(str?: string | number | null): number | null {
  if (str == null) return null;
  if (typeof str === "number") return str;

  const cleaned = str
    .replace(/[€$£]/g, "")
    .replace(/\s/g, "")
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(",", ".");

  const m = cleaned.match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// ---------------------------------------------------------------------------
// UTIL 4 — Compute price stats
// ---------------------------------------------------------------------------
function priceStats(arr: number[]): PriceResult {
  if (arr.length === 0) return { min: null, max: null, avg: null, median: null, currency: "EUR" };

  const sorted = arr.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100;

  return { min, max, avg, median, currency: "EUR" };
}

// ---------------------------------------------------------------------------
// UTIL 5 — Location Code
// ---------------------------------------------------------------------------
function loc(country: string) {
  return (
    {
      fr: 2250,
      de: 2276,
      es: 2724,
      it: 2380,
      uk: 2826,
      us: 2840,
    }[country] || 2250
  );
}

// ============================================================================
// SERVE FUNCTION
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl, productTitle, country = "fr", productId, variantId, storeId } = body;

    if (body?.healthCheck) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ENV
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const DATAFORSEO_LOGIN = Deno.env.get("DATAFORSEO_LOGIN");
    const DATAFORSEO_PASSWORD = Deno.env.get("DATAFORSEO_PASSWORD");
    const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let vision: VisionAnalysis | null = null;
    let searchQuery = productTitle || "";

    // ============================================================================
    // 1️⃣ VISION AI (with fallback)
    // ============================================================================
    try {
      const dataUri = await fetchImageAsDataUri(imageUrl);

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract product info in JSON only:
{
 "title": "max 8 words",
 "searchQuery": "3-5 keywords",
 "brand": null,
 "category": "furniture/electronics/etc",
 "keywords": [],
 "description": "20 words",
 "segment": "budget/mid-range/premium/luxury"
}
No markdown.`,
                },
                { type: "image_url", image_url: { url: dataUri } },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const txt = json.choices?.[0]?.message?.content || "";
        vision = JSON.parse(txt.replace(/```json|```/g, "").trim());

        if (!searchQuery) searchQuery = vision?.searchQuery || vision?.title || "";
      }
    } catch {
      if (!searchQuery) searchQuery = "product";
      vision = {
        title: "Unknown product",
        searchQuery: searchQuery,
        brand: null,
        category: "product",
        keywords: [],
        description: "Unknown item",
        segment: "mid-range",
      };
    }

    // ============================================================================
    // PRÉPARATION + SEGMENT-BASED FILTERING
    // ============================================================================
    const allPrices: number[] = [];
    const allMerchants: Merchant[] = [];

    let shoppingCount = 0;
    let organicCount = 0;
    let visualCount = 0;

    // Définir le prix minimum basé sur le segment détecté
    const segmentMinPrice: Record<string, number> = {
      "budget": 10,
      "mid-range": 50,
      "premium": 150,
      "luxury": 500,
    };
    const minPriceForSegment = segmentMinPrice[vision?.segment || "mid-range"] || 50;

    // Améliorer la requête pour les segments premium/luxury
    if (vision?.segment === "premium" || vision?.segment === "luxury") {
      searchQuery += " design haut de gamme";
    }

    const simplified = simplifyQuery(searchQuery);
    const attempts = [
      { q: searchQuery, label: "main" },
      { q: simplified, label: "simplified" },
      vision?.category && vision?.keywords?.length
        ? { q: `${vision.category} ${vision.keywords[0]}`, label: "category" }
        : null,
    ].filter(Boolean) as { q: string; label: string }[];

    // ============================================================================
    // 2️⃣ DATAFORSEO SHOPPING (with fallback)
    // ============================================================================
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      const auth = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

      for (const a of attempts) {
        try {
          const r = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/advanced", {
            method: "POST",
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            body: JSON.stringify([
              {
                keyword: a.q,
                location_code: loc(country),
                language_code: country === "us" || country === "uk" ? "en" : country,
                depth: 20,
              },
            ]),
          });

          if (!r.ok) continue;

          const j = await r.json();
          const items = j.tasks?.[0]?.result?.[0]?.items || [];

          for (const it of items) {
            const price = parsePrice(it.price?.current) || parsePrice(it.price?.regular) || parsePrice(it.price);

            if (price && price >= minPriceForSegment && price < 10000) {
              shoppingCount++;
              allPrices.push(price);
              allMerchants.push({
                title: it.title || "Product",
                source: it.seller?.name || "Google Shopping",
                price,
                link: it.url || "",
              });
            }
          }

          if (shoppingCount > 0) break;
        } catch {}
      }
    }

    // ============================================================================
    // 3️⃣ DATAFORSEO ORGANIC (fallback)
    // ============================================================================
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      try {
        const auth = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

        const r = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              keyword: searchQuery + " prix",
              location_code: loc(country),
              language_code: country === "us" || country === "uk" ? "en" : country,
              depth: 20,
            },
          ]),
        });

        if (r.ok) {
          const j = await r.json();
          const items = j.tasks?.[0]?.result?.[0]?.items || [];

          for (const it of items) {
            const match = (it.title || it.description)?.match(/(\d+[,.]?\d*)\s*€/);
            if (match) {
              const p = parsePrice(match[1]);
              if (p && p >= minPriceForSegment && p < 10000) {
                organicCount++;
                allPrices.push(p);
                allMerchants.push({
                  title: it.title || "Produit trouvé",
                  source: it.domain || new URL(it.url || "").hostname || "Web",
                  price: p,
                  link: it.url || "",
                });
              }
            }
          }
        }
      } catch {}
    }

    // ============================================================================
    // 4️⃣ SERPAPI — Google Images (SUPER FALLBACK)
    // ============================================================================
    if (SERPAPI_KEY) {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_images");
        url.searchParams.set("api_key", SERPAPI_KEY);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("gl", country);
        url.searchParams.set("hl", country);

        const r = await fetch(url.toString());
        const j = await r.json();

        const shop = j.shopping_results || [];
        for (const it of shop) {
          const price = it.extracted_price || parsePrice(it.price);
          if (price && price >= minPriceForSegment && price < 10000) {
            visualCount++;
            allPrices.push(price);
            allMerchants.push({
              title: it.title,
              source: it.source || "SerpAPI",
              price,
              link: it.link || "",
            });
          }
        }
      } catch {}
    }

    // ============================================================================
    // 5️⃣ FALLBACK INTERNE : si aucun prix trouvé
    // ============================================================================
    if (allPrices.length === 0) {
      allPrices.push(99);
      allMerchants.push({
        title: vision?.title || "Product",
        source: "Fallback",
        price: 99,
        link: "",
      });
    }

    // ============================================================================
    // STATS + CONFIDENCE
    // ============================================================================
    const stats = priceStats(allPrices);

    let confidence = 0.2;
    if (vision?.title) confidence += 0.15;
    if (shoppingCount > 0) confidence += 0.3;
    if (organicCount > 1) confidence += 0.1;
    if (visualCount > 1) confidence += 0.15;

    confidence = Math.min(confidence, 0.98);

    // ============================================================================
    // FINAL MERCHANTS
    // ============================================================================
    const merchants = allMerchants
      .filter((m) => m.price)
      .sort((a, b) => a.price! - b.price!)
      .slice(0, 10);

    // ============================================================================
    // SAVE DB (optional)
    // ============================================================================
    const authHeader = req.headers.get("authorization");
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && authHeader) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: authHeader } },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("price_scan_results").insert({
            product_id: productId,
            variant_id: variantId,
            user_id: user.id,
            store_id: storeId,
            vision_title: vision?.title,
            vision_brand: vision?.brand,
            vision_category: vision?.category,
            vision_keywords: vision?.keywords,
            vision_segment: vision?.segment,
            search_query: searchQuery,
            price_min: stats.min,
            price_max: stats.max,
            price_avg: stats.avg,
            merchants,
            sources_shopping: shoppingCount,
            sources_organic: organicCount,
            sources_images: visualCount,
            confidence,
            processing_time_ms: Date.now() - start,
            image_url: imageUrl,
          });
        }
      } catch {}
    }

    const result: ScanResult = {
      vision,
      searchQuery,
      price: stats,
      merchants: merchants.slice(0, 5),
      productsFound: merchants.length,
      confidence,
      sources: {
        shopping: shoppingCount,
        organic: organicCount,
        visual: visualCount,
      },
      processingTime: Date.now() - start,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
