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
  const cleaned = str.toString()
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
    fr: 2250, de: 2276, es: 2724, it: 2380,
    uk: 2826, us: 2840,
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
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract JSON only:
{
  "title": "",
  "searchQuery": "",
  "brand": "",
  "category": "",
  "keywords": [],
  "description": "",
  "segment": ""
}` },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }]
      })
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
    const res = await fetch(
      "https://api.dataforseo.com/v3/serp/google/shopping/live/advanced",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([{
          keyword: query,
          location_code: loc(country),
          language_code: country,
          depth: 20
        }])
      }
    );
    const data = await res.json();
    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    for (const it of items) {
      const price = parsePrice(
        it.price?.current || it.extracted_price || it.price || null
      );
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
    const res = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([{
          keyword: query + " prix",
          location_code: loc(country),
          language_code: country,
          depth: 20
        }])
      }
    );
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
});
// ================== BLOC 2 / 3 ==================
// CONTINUATION - paste after Organic section

  // -------------------------------------------------------
  // 3️⃣ GOOGLE IMAGES EXTRACTOR (DataForSEO)
  //     → Find pages where similar images appear
  // -------------------------------------------------------
  try {
    console.log("IMAGES extractor…");

    const res = await fetch(
      "https://api.dataforseo.com/v3/serp/google/images/live/advanced",
      {
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
      }
    );

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
          }
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
        const res = await fetch(
          "https://api.dataforseo.com/v3/serp/google/shopping/live/advanced",
          {
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
          }
        );

        const data = await res.json();
        const items = data.tasks?.[0]?.result?.[0]?.items || [];

        for (const it of items) {
          const price = parsePrice(
            it.price?.current ||
            it.extracted_price ||
            it.price ||
            null
          );
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
      organic: 0,      // Organic already merged in merchants
      visual: 0,       // Images extractor also merged
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
});
