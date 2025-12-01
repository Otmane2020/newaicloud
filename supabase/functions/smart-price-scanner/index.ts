// ============= BLOC 1 / 3 =============
// FULL ULTRA-PRO PRICE SCANNER (NO SERPAPI)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- HELPERS ----------
function parsePrice(str: any): number | null {
  if (!str) return null;
  if (typeof str === "number") return str;
  const cleaned = str
    .toString()
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  const match = cleaned.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function stats(prices: number[]) {
  if (prices.length === 0) {
    return { min: null, max: null, avg: null, median: null, currency: "EUR" };
  }
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return {
    min: prices[0],
    max: prices[prices.length - 1],
    avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    median: prices[mid],
    currency: "EUR",
  };
}

function loc(country: string) {
  const map: Record<string, number> = {
    fr: 2250,
    de: 2276,
    es: 2724,
    it: 2380,
    uk: 2826,
    us: 2840,
  };
  return map[country] || 2250;
}

// ---------- START FUNCTION ----------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const start = Date.now();
  const body = await req.json();
  const { imageUrl, productTitle = "", country = "fr" } = body;

  const GEMINI_KEY = Deno.env.get("LOVABLE_API_KEY");
  const DFS_LOGIN = Deno.env.get("DATAFORSEO_LOGIN");
  const DFS_PASS = Deno.env.get("DATAFORSEO_PASSWORD");

  if (!imageUrl) return new Response(JSON.stringify({ error: "imageUrl required" }), { status: 400 });

  console.log("▶ Start scan:", imageUrl.substring(0, 60));

  // ---------------- VISION AI ----------------
  let vision = null;
  let query = productTitle;

  try {
    const v = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract JSON only:
{
  "title": "",
  "searchQuery": "",
  "brand": "",
  "category": "",
  "keywords": [],
  "description": "",
  "segment": ""
}`,
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    const json = await v.json();
    const txt = json.choices?.[0]?.message?.content || "";
    vision = JSON.parse(txt.replace(/```json|```/g, ""));
    query = vision?.searchQuery || vision?.title || productTitle;

    console.log("VISION:", query);
  } catch (e) {
    console.log("Vision fail:", e);
  }

  if (!query) query = "furniture";

  // ---------- DATAFORSEO AUTH ----------
  const auth = "Basic " + btoa(`${DFS_LOGIN}:${DFS_PASS}`);

  let allPrices: number[] = [];
  let merchants: any[] = [];

  // -------------------------------------------------------
  // 1️⃣ GOOGLE SHOPPING (DataForSEO)
  // -------------------------------------------------------
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/advanced", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          keyword: query,
          location_code: loc(country),
          language_code: country,
          depth: 20,
        },
      ]),
    });
    const data = await res.json();
    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    for (const it of items) {
      const price = parsePrice(it.price?.current || it.extracted_price || it.price || null);
      if (price) {
        allPrices.push(price);
        merchants.push({
          title: it.title || "Unknown",
          source: it.seller?.name || "Google Shopping",
          price,
          link: it.url || "",
        });
      }
    }

    console.log("SHOPPING found:", allPrices.length);
  } catch (e) {
    console.log("Shopping fail:", e);
  }

  // -------------------------------------------------------
  // 2️⃣ GOOGLE ORGANIC (DataForSEO)
  // -------------------------------------------------------
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          keyword: query + " prix",
          location_code: loc(country),
          language_code: country,
          depth: 20,
        },
      ]),
    });
    const data = await res.json();
    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    for (const it of items) {
      const match = (it.title + " " + it.description).match(/(\d+[,.]?\d*)\s*€/);
      if (match) {
        const price = parsePrice(match[1]);
        if (price) {
          allPrices.push(price);
          merchants.push({
            title: it.title || "Organic Result",
            source: it.domain || "organic",
            price,
            link: it.url || "",
          });
        }
      }
    }

    console.log("ORGANIC found:", allPrices.length);
  } catch (e) {
    console.log("Organic fail:", e);
  }

  // -------------------------------------------------------
  // STOP ICI — SUITE DANS BLOC 2
  // -------------------------------------------------------

  return new Response(JSON.stringify({ part: "paste bloc 2 now" }), { headers: cors });
  // ================== BLOC 2 / 3 ==================
  // CONTINUATION - paste after Organic section

  // -------------------------------------------------------
  // 3️⃣ GOOGLE IMAGES EXTRACTOR (DataForSEO)
  //     → Find pages where similar images appear
  // -------------------------------------------------------
  try {
    console.log("IMAGES extractor…");

    const res = await fetch("https://api.dataforseo.com/v3/serp/google/images/live/advanced", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          keyword: query,
          location_code: loc(country),
          language_code: country,
          depth: 30,
        },
      ]),
    });

    const data = await res.json();
    const imgs = data.tasks?.[0]?.result?.[0]?.items || [];

    console.log("Images found:", imgs.length);

    // Extract product pages
    const productLinks: string[] = [];

    for (const it of imgs.slice(0, 15)) {
      if (it.url && it.url.startsWith("http")) {
        productLinks.push(it.url);
      }
      if (it.source_url && it.source_url.startsWith("http")) {
        productLinks.push(it.source_url);
      }
    }

    // UNIQUE clean links
    const uniqueLinks = [...new Set(productLinks)];

    console.log("Product pages candidates:", uniqueLinks.length);

    // Now extract merchant data from those pages
    for (const url of uniqueLinks.slice(0, 10)) {
      try {
        const prod = await fetch(
          "https://api.dataforseo.com/v3/dataforseo_labs/google/product_specification/live/json",
          {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify([
              {
                url,
                include_images: false,
                include_prices: true,
              },
            ]),
          },
        );

        const pdata = await prod.json();
        const info = pdata.tasks?.[0]?.result?.[0];

        if (info?.prices && Array.isArray(info.prices)) {
          for (const p of info.prices) {
            const price = parsePrice(p.price);
            if (price && price > 0 && price < 20000) {
              allPrices.push(price);
              merchants.push({
                title: info.title || p.title || "Product page",
                source: new URL(url).hostname,
                price,
                link: url,
              });
            }
          }
        }
      } catch (err) {
        console.log("Product extractor fail:", err);
      }
    }

    console.log("After product extractor, total prices:", allPrices.length);
  } catch (e) {
    console.log("Images extractor fail:", e);
  }

  // -------------------------------------------------------
  // 4️⃣ HEURISTIC FALLBACK (last resort)
  //     → If still no results, try brute-force combinations
  // -------------------------------------------------------
  if (allPrices.length === 0) {
    const fallbackQueries = [
      query,
      vision?.title,
      vision?.keywords?.slice(0, 2).join(" "),
      (vision?.category || "") + " table",
      "similar " + query,
    ].filter(Boolean);

    console.log("Fallback queries:", fallbackQueries);

    for (const fq of fallbackQueries) {
      try {
        const res = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/advanced", {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              keyword: fq,
              location_code: loc(country),
              language_code: country,
              depth: 20,
            },
          ]),
        });

        const data = await res.json();
        const items = data.tasks?.[0]?.result?.[0]?.items || [];

        for (const it of items) {
          const price = parsePrice(it.price?.current || it.extracted_price || it.price || null);
          if (price) {
            allPrices.push(price);
            merchants.push({
              title: it.title || "Fallback result",
              source: it.seller?.name || "fallback",
              price,
              link: it.url || "",
            });
          }
        }

        if (allPrices.length > 2) break;
      } catch (err) {
        console.log("Fallback fail:", err);
      }
    }
  }

  // ===============================================
  // END OF BLOC 2 — FINAL RESULT IS IN BLOC 3
  // ===============================================

  return new Response(JSON.stringify({ part: "paste bloc 3 now" }), {
    headers: cors,
  });
});
// ================== BLOC 3 / 3 ==================
// FINAL MERGE + CONFIDENCE + RESPONSE

// ---------- CLEAN PRICES ----------
const validPrices = allPrices.filter((p) => p && p > 1 && p < 20000);
validPrices.sort((a, b) => a - b);

// Anti-outliers : remove prices > 3× median
let filtered = validPrices;
if (validPrices.length > 3) {
  const mid = filtered[Math.floor(filtered.length / 2)];
  filtered = filtered.filter((p) => p <= mid * 3);
}

const priceStats = stats(filtered);

// ---------- MERCHANTS CLEAN ----------
const cleanMerchants = merchants
  .filter((m) => m.price && m.price > 1)
  .sort((a, b) => (a.price || 999999) - (b.price || 999999))
  .slice(0, 10);

// ---------- CONFIDENCE ----------
let confidence = 0.2;

if (vision?.title) confidence += 0.2;
if (vision?.brand) confidence += 0.1;

if (cleanMerchants.length >= 5) confidence += 0.35;
else if (cleanMerchants.length >= 2) confidence += 0.2;

if (priceStats.min && priceStats.max && priceStats.max < priceStats.min * 3) {
  confidence += 0.05;
}

confidence = Math.min(confidence, 0.98);

const processing = Date.now() - start;

// ---------- FINAL PAYLOAD ----------
const result = {
  vision: vision || null,
  searchQuery: query,
  price: priceStats,
  merchants: cleanMerchants.slice(0, 5),
  productsFound: cleanMerchants.length,
  confidence,
  sources: {
    shopping: merchants.length,
    organic: 0, // Organic already merged in merchants
    visual: 0, // Images extractor also merged
  },
  processingTime: processing,
};

console.log("FINAL → price:", priceStats);
console.log("FINAL merchants:", cleanMerchants.length);
console.log("CONFIDENCE:", confidence);
console.log("DONE in", processing, "ms");

return new Response(JSON.stringify(result), {
  status: 200,
  headers: {
    ...cors,
    "Content-Type": "application/json",
  },
});

// ========================================================================
// 2️⃣ DATAFORSEO SHOPPING — Progressive Search Strategy
// ========================================================================

if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
  console.log("🛒 [SHOPPING] Starting DataForSEO Shopping search...");

  const authToken = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

  const simplifiedQuery = simplifyForShopping(searchQuery);

  const searchAttempts = [
    { query: searchQuery, label: "Original query" },
    { query: simplifiedQuery, label: "Simplified query" },
  ];

  if (visionAnalysis?.category && visionAnalysis?.keywords?.length) {
    const combo = `${visionAnalysis.category} ${visionAnalysis.keywords[0]}`;
    searchAttempts.push({ query: combo, label: "Category + Keyword" });
  }

  console.log("🔍 [SHOPPING] Attempts:", searchAttempts);

  for (let i = 0; i < searchAttempts.length; i++) {
    const attempt = searchAttempts[i];

    console.log(`🚀 [SHOPPING-${i + 1}] Trying: ${attempt.label} → "${attempt.query}"`);

    try {
      const res = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/advanced", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword: attempt.query,
            location_code: getLocationCode(country),
            language_code: country === "us" || country === "uk" ? "en" : country,
            depth: 20,
            device: "desktop",
            os: "windows",
          },
        ]),
      });

      if (!res.ok) {
        console.log(`❌ [SHOPPING-${i + 1}] HTTP error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const items = data.tasks?.[0]?.result?.[0]?.items || [];

      console.log(`📦 [SHOPPING-${i + 1}] Items returned: ${items.length}`);

      for (const item of items) {
        const price =
          parsePrice(item.price?.current) ||
          parsePrice(item.price?.regular) ||
          parsePrice(item.price?.value) ||
          parsePrice(item.price_from) ||
          parsePrice(item.price);

        if (price && price > 0) {
          shoppingCount++;
          allPrices.push(price);

          if (allMerchants.length < 10) {
            allMerchants.push({
              title: item.title || "Unknown product",
              source: item.seller?.name || item.source || "Google Shopping",
              price,
              link: item.url || "",
            });
          }
        }
      }

      if (shoppingCount > 0) {
        console.log(`✅ [SHOPPING-${i + 1}] SUCCESS: Found ${shoppingCount} prices`);
        break;
      } else {
        console.log(`⚠️ [SHOPPING-${i + 1}] No prices, trying next...`);
      }
    } catch (err) {
      console.log(`❌ [SHOPPING-${i + 1}] Error:`, err);
    }
  }
} else {
  console.log("⚠️ [SHOPPING] DataForSEO credentials missing → skipping shopping search.");
}

// ========================================================================
// 3️⃣ DATAFORSEO ORGANIC — Extract prices from titles/snippets
// ========================================================================

if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
  console.log("🔎 [ORGANIC] Starting DataForSEO Organic search...");

  const authToken = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword: searchQuery + " prix",
          location_code: getLocationCode(country),
          language_code: country === "us" || country === "uk" ? "en" : country,
          depth: 20,
        },
      ]),
    });

    if (!res.ok) {
      console.log("❌ [ORGANIC] HTTP Error:", res.status);
    } else {
      const json = await res.json();
      const results = json.tasks?.[0]?.result?.[0]?.items || [];

      console.log(`📄 [ORGANIC] Items returned: ${results.length}`);

      for (const item of results) {
        const txt = item.title + " " + item.description;
        const match = txt.match(/(\d+[,.]?\d*)\s*€/);

        if (match) {
          const price = parsePrice(match[1]);
          if (price) {
            organicCount++;
            allPrices.push(price);
          }
        }
      }

      console.log(`💶 [ORGANIC] Prices extracted: ${organicCount}`);
    }
  } catch (err) {
    console.log("❌ [ORGANIC] Error:", err);
  }
}

// ========================================================================
// 4️⃣ SERPAPI — Google Images + Google Shopping (true fallback)
// ========================================================================

if (SERPAPI_KEY) {
  console.log("🖼️ [SERPAPI] Starting SerpAPI image search...");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("api_key", SERPAPI_KEY);
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("gl", country);
  url.searchParams.set("hl", country === "us" || country === "uk" ? "en" : country);
  url.searchParams.set("ijn", "0");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.log("❌ [SERPAPI] HTTP Error:", res.status);
    } else {
      const json = await res.json();

      // Shopping results (direct prices)
      const shoppingResults = json.shopping_results || [];
      console.log(`🛍️ [SERPAPI] Shopping results found: ${shoppingResults.length}`);

      for (const result of shoppingResults) {
        const price = result.extracted_price || parsePrice(result.price);

        if (price && price > 10 && price < 20000) {
          visualSearchCount++;
          allPrices.push(price);

          allMerchants.push({
            title: result.title || "Produit similaire",
            source: result.source || "Google Shopping",
            price,
            link: result.link || "",
          });
        }
      }

      // Images results — not used for price but logged
      const imageResults = json.images_results || [];
      console.log(`🖼️ [SERPAPI] Image results: ${imageResults.length}`);
    }
  } catch (err) {
    console.log("❌ [SERPAPI] Error:", err);
  }
} else {
  console.log("⚠️ [SERPAPI] SERPAPI_KEY missing → skipping SerpAPI search.");
}

// ========================================================================
// 5️⃣ FUSION DES RÉSULTATS
// ========================================================================

console.log("📊 FUSION DES RESULTATS…");
console.log("🔢 Prices collected:", allPrices);
console.log("🏪 Merchants collected:", allMerchants.length);
// ========================================================================
// 6️⃣ CALCUL DES STATISTIQUES DE PRIX
// ========================================================================

const priceStats = calculatePriceStats(allPrices);
console.log("📈 Price Stats:", priceStats);

// ========================================================================
// 7️⃣ CONSTRUCTION LISTE MARCHANDS FINALE
// ========================================================================

const finalMerchants = allMerchants
  .filter((m) => m.price && m.price > 0)
  .sort((a, b) => a.price! - b.price!)
  .slice(0, 10);

console.log("🏪 Final merchants:", finalMerchants);

// ========================================================================
// 8️⃣ SCORE DE CONFIANCE
// ========================================================================

let confidence = 0.2;

if (visionAnalysis?.title) confidence += 0.15;
if (visionAnalysis?.brand) confidence += 0.1;

if (shoppingCount >= 3) confidence += 0.35;
else if (shoppingCount >= 1) confidence += 0.2;

if (organicCount >= 2) confidence += 0.1;

if (visualSearchCount >= 3) confidence += 0.15;
else if (visualSearchCount >= 1) confidence += 0.08;

if (priceStats.min && priceStats.max && priceStats.max <= priceStats.min * 3) {
  confidence += 0.05;
}

confidence = Math.min(confidence, 0.98);

console.log("🔒 Confidence score:", confidence);

// ========================================================================
// 9️⃣ BUILD DU RESULTAT FINAL
// ========================================================================

const result: ScanResult = {
  vision: visionAnalysis,
  searchQuery,
  price: priceStats,
  merchants: finalMerchants.slice(0, 5),
  productsFound: finalMerchants.length,
  confidence: Math.round(confidence * 100) / 100,
  sources: {
    shopping: shoppingCount,
    organic: organicCount,
    visual: visualSearchCount,
  },
  processingTime: Date.now() - startTime,
};

console.log("📦 FINAL RESULT:", result);

// ========================================================================
// 🔟 SAUVEGARDE DANS SUPABASE
// ========================================================================

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && authHeader) {
  try {
    console.log("🗄️ Saving to Supabase...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const record = {
        product_id: productId || null,
        variant_id: variantId || null,
        user_id: user.id,
        store_id: storeId || null,

        vision_title: visionAnalysis?.title || null,
        vision_brand: visionAnalysis?.brand || null,
        vision_category: visionAnalysis?.category || null,
        vision_keywords: visionAnalysis?.keywords || [],
        vision_segment: visionAnalysis?.segment || null,

        search_query: searchQuery,

        price_min: priceStats.min,
        price_max: priceStats.max,
        price_avg: priceStats.avg,
        price_median: priceStats.median,

        currency: priceStats.currency,

        merchants: finalMerchants,

        sources_shopping: shoppingCount,
        sources_organic: organicCount,
        sources_images: visualSearchCount,

        products_found: finalMerchants.length,
        confidence: Math.round(confidence * 100) / 100,

        processing_time_ms: result.processingTime,
        image_url: imageUrl,
      };

      const { error } = await supabase.from("price_scan_results").insert(record);

      if (error) console.log("❌ Supabase save error:", error.message);
      else console.log("✅ Saved to Supabase");
    }
  } catch (err) {
    console.log("❌ Supabase Error:", err);
  }
}

// ========================================================================
// 1️⃣1️⃣ RETURN FINAL → JSON CLEAN
// ========================================================================

return new Response(JSON.stringify(result), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
}); // ← **FINALE ET UNIQUE FERMETURE**
