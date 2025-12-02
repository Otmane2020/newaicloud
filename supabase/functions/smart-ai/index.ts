// ============================================================================
// SMART AI – Analyse produit complète avec Vision AI, SERP, DataForSEO & Google Shopping
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
  searchQuery: string;
  brand: string | null;
  category: string;
  keywords: string[];
  description: string;
  segment: string;
  attributes: Record<string, any>;
}

interface PriceData {
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  currency: string;
  recommendedPrice: number | null;
}

interface Merchant {
  title: string;
  source: string;
  price: number | null;
  link: string;
  image?: string;
}

interface SmartAnalysisResult {
  vision: VisionAnalysis | null;
  pricing: PriceData;
  merchants: Merchant[];
  competitors: {
    name: string;
    url: string;
    price: number | null;
  }[];
  seoSuggestions: {
    title: string;
    description: string;
    keywords: string[];
  };
  confidence: number;
  sources: {
    shopping: number;
    organic: number;
    visual: number;
  };
  processingTime: number;
}

// ---------------------------------------------------------------------------
// UTIL — Convert image URL to Base64
// ---------------------------------------------------------------------------
async function fetchImageAsDataUri(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (SmartAI/1.0)" },
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
// UTIL — Parse price
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
// UTIL — Compute price stats
// ---------------------------------------------------------------------------
function priceStats(arr: number[]): PriceData {
  if (arr.length === 0) {
    return { min: null, max: null, avg: null, median: null, currency: "EUR", recommendedPrice: null };
  }

  const sorted = arr.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100;

  // Prix recommandé = médiane avec marge de 5-10%
  const recommendedPrice = Math.round(median * 1.075);

  return { min, max, avg, median, currency: "EUR", recommendedPrice };
}

// ---------------------------------------------------------------------------
// UTIL — Location Code
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
    const {
      imageUrl,
      images = [],
      productTitle,
      productDescription,
      country = "fr",
      productId,
      storeId,
    } = body;

    // Health check
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageUrl && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: "Au moins une image est requise" }), {
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
    // 1️⃣ VISION AI — Analyse complète de l'image
    // ============================================================================
    try {
      const primaryImage = imageUrl || images[0];
      const dataUri = await fetchImageAsDataUri(primaryImage);

      const visionPrompt = `Analyze this product image in detail. Extract:
{
  "title": "precise product title (max 8 words)",
  "searchQuery": "5-7 most relevant search keywords",
  "brand": "brand name if visible, else null",
  "category": "specific product category",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "description": "detailed product description (30-40 words)",
  "segment": "budget|mid-range|premium|luxury",
  "attributes": {
    "color": "color if visible",
    "material": "material if identifiable",
    "style": "modern/classic/contemporary/etc",
    "features": ["feature1", "feature2"]
  }
}

Context provided:
${productTitle ? `- Product Title: ${productTitle}` : ""}
${productDescription ? `- Description: ${productDescription}` : ""}

Return ONLY valid JSON, no markdown.`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
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
        searchQuery = vision?.searchQuery || vision?.title || searchQuery || "product";
      }
    } catch (error) {
      console.error("Vision AI error:", error);
      vision = {
        title: productTitle || "Unknown product",
        searchQuery: productTitle || "product",
        brand: null,
        category: "general",
        keywords: [],
        description: productDescription || "Product analysis",
        segment: "mid-range",
        attributes: {},
      };
    }

    // ============================================================================
    // 2️⃣ DATAFORSEO — Google Shopping + Organic Search
    // ============================================================================
    const allPrices: number[] = [];
    const allMerchants: Merchant[] = [];
    const competitors: { name: string; url: string; price: number | null }[] = [];

    let shoppingCount = 0;
    let organicCount = 0;
    let visualCount = 0;

    // Segment-based min price filtering
    const segmentMinPrice: Record<string, number> = {
      budget: 10,
      "mid-range": 50,
      premium: 150,
      luxury: 500,
    };
    const minPriceForSegment = segmentMinPrice[vision?.segment || "mid-range"] || 50;

    // Enhanced query for premium/luxury
    let enhancedQuery = searchQuery;
    if (vision?.segment === "premium" || vision?.segment === "luxury") {
      enhancedQuery += " design haut de gamme";
    }

    console.log("[SMART-AI] 🔍 Starting price analysis...");
    console.log("[SMART-AI] Search query:", enhancedQuery);
    console.log("[SMART-AI] Min price for segment:", minPriceForSegment);
    console.log("[SMART-AI] DataForSEO credentials available:", !!DATAFORSEO_LOGIN && !!DATAFORSEO_PASSWORD);
    console.log("[SMART-AI] SerpAPI key available:", !!SERPAPI_KEY);

    // DataForSEO Shopping
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      const auth = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

      try {
        console.log("[SMART-AI] 🛒 Calling DataForSEO Shopping API...");
        const r = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/regular", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              keyword: enhancedQuery,
              location_code: loc(country),
              language_code: country === "us" || country === "uk" ? "en" : country,
              depth: 30,
            },
          ]),
        });

        console.log("[SMART-AI] DataForSEO Shopping response status:", r.status);

        if (r.ok) {
          const j = await r.json();
          console.log("[SMART-AI] DataForSEO Shopping full response:", JSON.stringify(j, null, 2));
          
          // Check for API errors
          if (j.status_code && j.status_code !== 20000) {
            console.error("[SMART-AI] ❌ DataForSEO API error:", j.status_code, j.status_message);
          }
          
          const items = j.tasks?.[0]?.result?.[0]?.items || [];
          console.log("[SMART-AI] DataForSEO Shopping items found:", items.length);

          for (const it of items) {
            const price = parsePrice(it.price?.current) || parsePrice(it.price?.regular);
            console.log("[SMART-AI] Item:", it.title, "Price:", price, "Min required:", minPriceForSegment);

            if (price && price >= minPriceForSegment && price < 10000) {
              shoppingCount++;
              allPrices.push(price);
              allMerchants.push({
                title: it.title || "Product",
                source: it.seller?.name || "Google Shopping",
                price,
                link: it.url || "",
                image: it.image_url,
              });

              // Add to competitors
              if (it.seller?.name && it.url) {
                competitors.push({
                  name: it.seller.name,
                  url: it.url,
                  price,
                });
              }
            }
          }

          console.log("[SMART-AI] ✅ Shopping results: merchants =", shoppingCount, "prices =", allPrices.length);
        } else {
          const errorText = await r.text();
          console.error("[SMART-AI] ❌ DataForSEO Shopping HTTP error:", r.status, errorText);
        }
      } catch (error) {
        console.error("[SMART-AI] ❌ DataForSEO Shopping exception:", error);
      }

      // DataForSEO Organic
      try {
        console.log("[SMART-AI] 🌐 Calling DataForSEO Organic API...");
        
        // Adapt query based on language
        const priceKeyword = country === "us" || country === "uk" ? "price buy" : "prix achat";
        const organicQuery = searchQuery + " " + priceKeyword;
        
        const r = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              keyword: organicQuery,
              location_code: loc(country),
              language_code: country === "us" || country === "uk" ? "en" : country,
              depth: 20,
            },
          ]),
        });

        console.log("[SMART-AI] DataForSEO Organic response status:", r.status);

        if (r.ok) {
          const j = await r.json();
          console.log("[SMART-AI] DataForSEO Organic response:", JSON.stringify(j, null, 2));
          
          const items = j.tasks?.[0]?.result?.[0]?.items || [];
          console.log("[SMART-AI] DataForSEO Organic items found:", items.length);

          // Multi-currency price extraction regex
          const priceRegex = country === "us" ? /\$(\d+[,.]?\d*)/ : country === "uk" ? /£(\d+[,.]?\d*)/ : /(\d+[,.]?\d*)\s*€/;

          for (const it of items) {
            const match = (it.title || it.description)?.match(priceRegex);
            if (match) {
              const p = parsePrice(match[1]);
              console.log("[SMART-AI] Organic item:", it.title, "Price extracted:", p);
              
              if (p && p >= minPriceForSegment && p < 10000) {
                organicCount++;
                allPrices.push(p);
                allMerchants.push({
                  title: it.title || "Product",
                  source: it.domain || new URL(it.url || "").hostname || "Web",
                  price: p,
                  link: it.url || "",
                });
              }
            }
          }

          console.log("[SMART-AI] ✅ Organic results: merchants =", organicCount);
        } else {
          const errorText = await r.text();
          console.error("[SMART-AI] ❌ DataForSEO Organic HTTP error:", r.status, errorText);
        }
      } catch (error) {
        console.error("[SMART-AI] ❌ DataForSEO Organic exception:", error);
      }
    } else {
      console.log("[SMART-AI] ⚠️ DataForSEO credentials not available - skipping DataForSEO");
    }

    // ============================================================================
    // 3️⃣ SERPAPI — Google Shopping (PRIMARY SOURCE)
    // ============================================================================
    if (SERPAPI_KEY) {
      try {
        console.log("[SMART-AI] 🛒 Calling SerpAPI Google Shopping...");
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("api_key", SERPAPI_KEY);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("gl", country);
        url.searchParams.set("hl", country === "us" || country === "uk" ? "en" : country);
        url.searchParams.set("num", "30");

        console.log("[SMART-AI] SerpAPI URL:", url.toString());

        const r = await fetch(url.toString());
        console.log("[SMART-AI] SerpAPI response status:", r.status);
        
        const j = await r.json();
        console.log("[SMART-AI] SerpAPI full response:", JSON.stringify(j, null, 2));

        const shop = j.shopping_results || [];
        console.log("[SMART-AI] SerpAPI shopping_results found:", shop.length);

        for (const it of shop) {
          const price = it.extracted_price || parsePrice(it.price);
          console.log("[SMART-AI] SerpAPI item:", it.title, "Price:", price, "Source:", it.source);
          
          if (price && price >= minPriceForSegment && price < 10000) {
            visualCount++;
            allPrices.push(price);
            allMerchants.push({
              title: it.title || "Product",
              source: it.source || "Google Shopping",
              price,
              link: it.link || "",
            });

            // Add to competitors
            if (it.source && it.link) {
              competitors.push({
                name: it.source,
                url: it.link,
                price,
              });
            }
          }
        }

        console.log("[SMART-AI] ✅ SerpAPI Google Shopping results: merchants =", visualCount, "prices =", allPrices.length);
      } catch (error) {
        console.error("[SMART-AI] ❌ SerpAPI exception:", error);
      }
    } else {
      console.log("[SMART-AI] ⚠️ SerpAPI key not available - skipping SerpAPI");
    }

    // ============================================================================
    // 4️⃣ AI-Powered SEO Suggestions
    // ============================================================================
    let seoSuggestions = {
      title: productTitle || vision?.title || "",
      description: productDescription || vision?.description || "",
      keywords: vision?.keywords || [],
    };

    if (LOVABLE_API_KEY && vision) {
      try {
        const seoPrompt = `Based on this product analysis, generate optimal SEO content in JSON:
{
  "title": "SEO-optimized product title (max 60 chars, include main keyword)",
  "description": "SEO meta description (max 160 chars, compelling and keyword-rich)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Product: ${vision.title}
Category: ${vision.category}
Segment: ${vision.segment}
${vision.brand ? `Brand: ${vision.brand}` : ""}

Return ONLY valid JSON.`;

        const seoRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: seoPrompt }],
          }),
        });

        if (seoRes.ok) {
          const seoJson = await seoRes.json();
          const seoTxt = seoJson.choices?.[0]?.message?.content || "";
          seoSuggestions = JSON.parse(seoTxt.replace(/```json|```/g, "").trim());
        }
      } catch (error) {
        console.error("SEO AI error:", error);
      }
    }

    // ============================================================================
    // 5️⃣ Fallback if no data
    // ============================================================================
    console.log("[SMART-AI] 📊 Final stats - Prices found:", allPrices.length, "Merchants:", allMerchants.length, "Competitors:", competitors.length);
    console.log("[SMART-AI] Sources: Shopping =", shoppingCount, "Organic =", organicCount, "Visual =", visualCount);

    if (allPrices.length === 0) {
      console.log("[SMART-AI] ⚠️ No prices found - using fallback");
      const fallbackPrice = vision?.segment === "luxury" ? 999 : vision?.segment === "premium" ? 299 : 99;
      allPrices.push(fallbackPrice);
      allMerchants.push({
        title: vision?.title || "Product",
        source: "Estimation",
        price: fallbackPrice,
        link: "",
      });
    }

    // ============================================================================
    // Stats + Confidence
    // ============================================================================
    const pricing = priceStats(allPrices);

    let confidence = 0.2;
    if (vision?.title) confidence += 0.15;
    if (shoppingCount > 0) confidence += 0.3;
    if (organicCount > 1) confidence += 0.1;
    if (visualCount > 1) confidence += 0.15;
    if (vision?.attributes && Object.keys(vision.attributes).length > 0) confidence += 0.1;

    confidence = Math.min(confidence, 0.98);

    // ============================================================================
    // Final Merchants & Competitors
    // ============================================================================
    const merchants = allMerchants
      .filter((m) => m.price)
      .sort((a, b) => a.price! - b.price!)
      .slice(0, 15);

    const uniqueCompetitors = competitors
      .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
      .slice(0, 10);

    // ============================================================================
    // Save to DB
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
          await supabase.from("smart_ai_analysis").insert({
            product_id: productId,
            user_id: user.id,
            store_id: storeId,
            vision_data: vision,
            pricing_data: pricing,
            merchants: merchants.slice(0, 5),
            competitors: uniqueCompetitors,
            seo_suggestions: seoSuggestions,
            confidence,
            sources: {
              shopping: shoppingCount,
              organic: organicCount,
              visual: visualCount,
            },
            processing_time_ms: Date.now() - start,
            image_url: imageUrl,
          });
        }
      } catch (error) {
        console.error("Database save error:", error);
      }
    }

    const result: SmartAnalysisResult = {
      vision,
      pricing,
      merchants: merchants.slice(0, 10),
      competitors: uniqueCompetitors,
      seoSuggestions,
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
    console.error("Smart AI error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
