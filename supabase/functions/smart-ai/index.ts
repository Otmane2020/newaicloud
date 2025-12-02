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
  weightedAvg?: number | null;
  topMatchPrice?: number | null;
  topMatchSimilarity?: number | null;
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
    title?: string;
    url: string;
    price: number | null;
    image?: string;
    thumbnail?: string;
    market?: string;
    similarityScore?: number;
    weight?: number;
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
  marketPrice: number | null; // ⬆️ AJOUTÉ
  smartPrice: number | null;  // ⬆️ AJOUTÉ
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
// UTIL — Calculate image similarity using Lovable AI Vision
// ---------------------------------------------------------------------------
async function calculateImageSimilarity(
  sourceImage: string,
  targetImage: string,
  LOVABLE_API_KEY: string
): Promise<number> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Compare these two product images and rate their visual similarity from 0 to 100.
- 95-100: Exact same product/photo
- 80-95: Same product, different angle
- 60-80: Very similar product (same style/design)
- 40-60: Similar category
- <40: Different products

Return ONLY a number between 0 and 100.`
            },
            { type: "image_url", image_url: { url: sourceImage } },
            { type: "image_url", image_url: { url: targetImage } },
          ],
        }],
      }),
    });

    const data = await response.json();
    const score = parseInt(data.choices?.[0]?.message?.content?.match(/\d+/)?.[0] || "50");
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error("[SMART-AI] Similarity calculation error:", error);
    return 50; // Default to medium similarity
  }
}

// ---------------------------------------------------------------------------
// UTIL — Get similarity weight multiplier
// ---------------------------------------------------------------------------
function getSimilarityWeight(score: number): number {
  if (score >= 95) return 5;      // Produit identique
  if (score >= 80) return 3;      // Très similaire
  if (score >= 60) return 1.5;    // Similaire
  if (score >= 40) return 1;      // Comparable
  return 0.5;                     // Peu pertinent
}

// ---------------------------------------------------------------------------
// UTIL — Compute price stats with weighted average
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
// UTIL — Compute weighted price stats (based on similarity)
// ---------------------------------------------------------------------------
function weightedPriceStats(
  competitors: { price: number; weight: number }[]
): PriceData {
  if (competitors.length === 0) {
    return { min: null, max: null, avg: null, median: null, currency: "EUR", recommendedPrice: null };
  }

  const prices = competitors.map(c => c.price);
  const weights = competitors.map(c => c.weight);

  // Moyenne pondérée
  const weightedSum = competitors.reduce((sum, c) => sum + c.price * c.weight, 0);
  const totalWeight = competitors.reduce((sum, c) => sum + c.weight, 0);
  const weightedAvg = Math.round((weightedSum / totalWeight) * 100) / 100;

  // Stats classiques
  const sorted = prices.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100;

  // Prix recommandé = moyenne pondérée (les produits similaires comptent plus)
  const recommendedPrice = Math.round(weightedAvg);

  return {
    min, max, avg, median,
    currency: "EUR",
    recommendedPrice,
    weightedAvg
  };
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
      markets = ["fr"],
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
    // 🕷️ FONCTION UTILITAIRE : Extraction de prix par crawling avec JSON-LD prioritaire
    // ============================================================================
    
    // Patterns de pages collection/catégorie à EXCLURE
    const collectionPatterns = [
      '/collections/',
      '/collection/',
      '/categories/',
      '/category/',
      '/c/',
      '/shop/',
      '/acheter-',
      '/canapes-d-angle--c',
      '-c\\d+',  // URLs avec -c111 etc
    ];

    function isProductPage(url: string): boolean {
      const urlLower = url.toLowerCase();
      return !collectionPatterns.some(pattern => 
        urlLower.includes(pattern) || new RegExp(pattern).test(urlLower)
      );
    }

    function isLikelyProductPage(html: string): boolean {
      // Indicateurs d'une vraie fiche produit
      const productIndicators = [
        /<script[^>]*type="application\/ld\+json"[^>]*>.*"@type"\s*:\s*"Product"/is,
        /itemprop="product"/i,
        /data-product-id/i,
        /add.to.cart/i,
        /buy.now/i,
        /ajouter.au.panier/i,
        /acheter/i,
      ];
      
      // Indicateurs d'une page collection
      const collectionIndicators = [
        /(\d+)\s*(produits?|articles?|résultats?)/i,
        /filter.*by/i,
        /sort.*by/i,
        /trier.*par/i,
        /filtrer/i,
      ];
      
      const hasProductIndicators = productIndicators.some(p => p.test(html));
      const hasCollectionIndicators = collectionIndicators.some(p => p.test(html));
      
      // Si clairement une collection, ne pas extraire
      if (hasCollectionIndicators && !hasProductIndicators) return false;
      
      return hasProductIndicators;
    }

    async function extractPriceFromPage(url: string): Promise<number | null> {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
        });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        
        // Vérifier si c'est une vraie page produit
        if (!isLikelyProductPage(html)) {
          console.log("[SMART-AI] ⊘ Skipping collection/category page:", url);
          return null;
        }
        
        // 1️⃣ PRIORITÉ 1 : JSON-LD Schema.org (le plus fiable)
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        if (jsonLdMatch) {
          for (const scriptTag of jsonLdMatch) {
            try {
              const jsonContent = scriptTag.replace(/<script[^>]*>|<\/script>/gi, '');
              const data = JSON.parse(jsonContent);
              
              // Product avec offers
              if (data['@type'] === 'Product' && data.offers) {
                const price = data.offers.price || data.offers[0]?.price;
                if (price && price > minPriceForSegment && price < 50000) {
                  console.log("[SMART-AI] 💰 JSON-LD price from", url, ":", price);
                  return parseFloat(price);
                }
              }
            } catch {}
          }
        }
        
        // 2️⃣ PRIORITÉ 2 : Meta tags Schema.org
        const schemaPrice = html.match(/itemprop="price"\s*content="(\d+\.?\d*)"/i);
        if (schemaPrice) {
          const price = parseFloat(schemaPrice[1]);
          if (price > minPriceForSegment && price < 50000) {
            console.log("[SMART-AI] 💰 Schema.org price from", url, ":", price);
            return price;
          }
        }
        
        // 3️⃣ PRIORITÉ 3 : Data attributes (Shopify, WooCommerce)
        const dataPrice = html.match(/data-price="(\d+\.?\d*)"/i);
        if (dataPrice) {
          const price = parseFloat(dataPrice[1]);
          if (price > minPriceForSegment && price < 50000) {
            console.log("[SMART-AI] 💰 Data attribute price from", url, ":", price);
            return price;
          }
        }
        
        // 4️⃣ PRIORITÉ 4 : Regex générique (moins fiable)
        const pricePatterns = [
          /(?:€|EUR)\s*(\d+[.,]?\d*)/gi,           // €1,799.00 or EUR 1799
          /(\d+[.,]?\d*)\s*(?:€|EUR)/gi,           // 1,799.00€ or 1799 EUR
          /"price":\s*"?(\d+\.?\d*)"?/gi,          // JSON price field
          /class="[^"]*price[^"]*"[^>]*>.*?(\d+[.,]\d{2})/gi, // Price class
        ];
        
        for (const pattern of pricePatterns) {
          const match = html.match(pattern);
          if (match) {
            const numMatch = match[0].match(/(\d+[.,]?\d*)/);
            if (numMatch) {
              const price = parseFloat(numMatch[1].replace(",", ".").replace(/\s/g, ""));
              if (price > minPriceForSegment && price < 50000) {
                console.log("[SMART-AI] 💰 Regex price from", url, ":", price);
                return price;
              }
            }
          }
        }
        return null;
      } catch (error) {
        console.error("[SMART-AI] Failed to extract price from", url, error);
        return null;
      }
    }

    // 2️⃣ SERPAPI GOOGLE LENS — Recherche visuelle par image (SOURCE PRINCIPALE)
    // ============================================================================
    const allPrices: number[] = [];
    const allMerchants: Merchant[] = [];
  const competitors: {
    name: string;
    title?: string;
    url: string;
    price: number | null;
    image?: string;
    thumbnail?: string;
    market?: string;
    similarityScore?: number;
    weight?: number;
  }[] = [];

    let shoppingCount = 0;
    let organicCount = 0;
    let visualCount = 0;

    // Segment-based min price filtering (seuils plus réalistes pour meubles)
    const segmentMinPrice: Record<string, number> = {
      budget: 100,      // Augmenté de 10 à 100
      "mid-range": 400, // Augmenté de 50 à 400
      premium: 800,     // Augmenté de 150 à 800
      luxury: 1500,     // Augmenté de 500 à 1500
    };
    const minPriceForSegment = segmentMinPrice[vision?.segment || "mid-range"] || 400;

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

    // ============================================================================
    // SERPAPI GOOGLE LENS — Recherche visuelle par image (PRIORITÉ 1)
    // Boucle sur chaque marché sélectionné
    // ============================================================================
    for (const market of markets) {
      console.log(`[SMART-AI] 🔍 Searching market: ${market}`);
      
      if (SERPAPI_KEY && imageUrl) {
        try {
          console.log(`[SMART-AI] 🔍 Calling SerpAPI Google Lens for market ${market}...`);
          const lensUrl = new URL("https://serpapi.com/search.json");
          lensUrl.searchParams.set("engine", "google_lens");
          lensUrl.searchParams.set("api_key", SERPAPI_KEY);
          lensUrl.searchParams.set("url", imageUrl);
          lensUrl.searchParams.set("gl", market);
          lensUrl.searchParams.set("hl", market === "us" || market === "uk" ? "en" : market);

          console.log(`[SMART-AI] Google Lens URL (${market}):`, lensUrl.toString());

          const r = await fetch(lensUrl.toString());
          console.log(`[SMART-AI] Google Lens response status (${market}):`, r.status);

          if (r.ok) {
            const j = await r.json();
            console.log(`[SMART-AI] Google Lens full response (${market}):`, JSON.stringify(j, null, 2));

            const visualMatches = j.visual_matches || [];
            console.log(`[SMART-AI] Google Lens visual_matches found (${market}):`, visualMatches.length);

            for (const match of visualMatches) {
              const price = match.price?.extracted_value || parsePrice(match.price?.value);

              if (match.link && match.source) {
                // Blocklist sites non-marchands
                const nonCommercialDomains = [
                  'instagram.com',
                  'facebook.com',
                  'm.facebook.com',
                  'pinterest.com',
                  'twitter.com',
                  'youtube.com',
                  'tiktok.com',
                  'wikipedia.org',
                  '.edu',
                  '.gov',
                ];
                const domain = new URL(match.link).hostname.toLowerCase();
                const isNonCommercial = nonCommercialDomains.some(d => domain.includes(d));
                
                // Vérifier si c'est une page produit (pas collection)
                const isProduct = isProductPage(match.link);
                
                console.log(`[SMART-AI] URL analysis (${market}):`, {
                  url: match.link,
                  title: match.title,
                  source: match.source,
                  isProductPage: isProduct,
                  isNonCommercial,
                  priceFromLens: price || null,
                });
                
                if (isNonCommercial) {
                  console.log(`[SMART-AI] ⊘ Skipping non-commercial site (${market}):`, domain);
                  continue;
                }
                
                if (!isProduct) {
                  console.log(`[SMART-AI] ⊘ Skipping collection/category page (${market}):`, match.link);
                  continue;
                }
                
                visualCount++;

                // Si pas de prix, tenter d'extraire par crawling
                let finalPrice = price || null;
                if (!finalPrice && match.link) {
                  console.log(`[SMART-AI] 🕷️ Crawling (${market})`, match.link, "for price...");
                  finalPrice = await extractPriceFromPage(match.link);
                }
                
                competitors.push({
                  name: match.source,
                  title: match.title || "",
                  url: match.link,
                  price: finalPrice,
                  image: match.thumbnail,
                  thumbnail: match.thumbnail,
                  market: market,
                });

                // Ajouter aux merchants si prix valide
                if (finalPrice && finalPrice >= minPriceForSegment && finalPrice < 10000) {
                  allPrices.push(finalPrice);

                  allMerchants.push({
                    title: match.title || "Product",
                    source: match.source,
                    price: finalPrice,
                    link: match.link,
                    image: match.thumbnail,
                  });
                }
              }
            }

            console.log(`[SMART-AI] ✅ Google Lens results (${market}): visual matches =`, visualMatches.length, "with prices =", allPrices.length);
          } else {
            const errorText = await r.text();
            console.error(`[SMART-AI] ❌ Google Lens HTTP error (${market}):`, r.status, errorText);
          }
        } catch (error) {
          console.error(`[SMART-AI] ❌ Google Lens exception (${market}):`, error);
        }
      } else {
        console.log(`[SMART-AI] ⚠️ SerpAPI Google Lens skipped (${market}) - key or imageUrl missing`);
      }
    }

    // ============================================================================
    // 🎯 CALCUL DE SIMILARITÉ VISUELLE pour les top résultats avec prix
    // ============================================================================
    console.log("[SMART-AI] 🎯 Calculating visual similarity scores for competitors with prices...");
    const competitorsWithPrices = competitors.filter(c => c.price && c.thumbnail).slice(0, 15);
    
    for (const competitor of competitorsWithPrices) {
      if (LOVABLE_API_KEY && imageUrl) {
        try {
          competitor.similarityScore = await calculateImageSimilarity(
            imageUrl,
            competitor.thumbnail!,
            LOVABLE_API_KEY
          );
          
          competitor.weight = getSimilarityWeight(competitor.similarityScore);
          
          console.log(`[SMART-AI] 🎯 Similarity: ${competitor.name} = ${competitor.similarityScore}% (weight: ${competitor.weight}x)`);
        } catch (error) {
          console.error(`[SMART-AI] ❌ Similarity calculation failed for ${competitor.name}:`, error);
          competitor.similarityScore = 50;
          competitor.weight = 1;
        }
      }
    }

    // ============================================================================
    // DATAFORSEO — Google Shopping + Organic Search (FALLBACK)
    // Boucle sur chaque marché sélectionné
    // ============================================================================
    // DataForSEO Shopping
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      const auth = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

      for (const market of markets) {
        try {
          console.log(`[SMART-AI] 🛒 Calling DataForSEO Shopping API for market ${market}...`);
          const r = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/advanced", {
            method: "POST",
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            body: JSON.stringify([
              {
                keyword: enhancedQuery,
                location_code: loc(market),
                language_code: market === "us" || market === "uk" ? "en" : market,
                depth: 30,
              },
            ]),
          });

          console.log(`[SMART-AI] DataForSEO Shopping response status (${market}):`, r.status);

          if (r.ok) {
            const j = await r.json();
            console.log(`[SMART-AI] DataForSEO Shopping full response (${market}):`, JSON.stringify(j, null, 2));
            
            // Check for API errors
            if (j.status_code && j.status_code !== 20000) {
              console.error(`[SMART-AI] ❌ DataForSEO API error (${market}):`, j.status_code, j.status_message);
            }
            
            const items = j.tasks?.[0]?.result?.[0]?.items || [];
            console.log(`[SMART-AI] DataForSEO Shopping items found (${market}):`, items.length);

            for (const it of items) {
              const price = parsePrice(it.price?.current) || parsePrice(it.price?.regular);
              console.log(`[SMART-AI] Item (${market}):`, it.title, "Price:", price, "Min required:", minPriceForSegment);

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
              }
            }
          }
        } catch (error) {
          console.error(`[SMART-AI] ❌ DataForSEO Shopping error (${market}):`, error);
        }
      }

      // DataForSEO Organic (pour le premier marché seulement)
      const primaryMarket = markets[0];
      try {
        console.log(`[SMART-AI] 🌐 Calling DataForSEO Organic API for primary market ${primaryMarket}...`);
        
        // Adapt query based on language
        const priceKeyword = primaryMarket === "us" || primaryMarket === "uk" ? "price buy" : "prix achat";
        const organicQuery = searchQuery + " " + priceKeyword;
        
        const r = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              keyword: organicQuery,
              location_code: loc(primaryMarket),
              language_code: primaryMarket === "us" || primaryMarket === "uk" ? "en" : primaryMarket,
              depth: 20,
            },
          ]),
        });

        console.log(`[SMART-AI] DataForSEO Organic response status (${primaryMarket}):`, r.status);

        if (r.ok) {
          const j = await r.json();
          console.log(`[SMART-AI] DataForSEO Organic response (${primaryMarket}):`, JSON.stringify(j, null, 2));
          
          const items = j.tasks?.[0]?.result?.[0]?.items || [];
          console.log(`[SMART-AI] DataForSEO Organic items found (${primaryMarket}):`, items.length);

          // Multi-currency price extraction regex
          const priceRegex = primaryMarket === "us" ? /\$(\d+[,.]?\d*)/ : primaryMarket === "uk" ? /£(\d+[,.]?\d*)/ : /(\d+[,.]?\d*)\s*€/;

          for (const it of items) {
            const match = (it.title || it.description)?.match(priceRegex);
            if (match) {
              const p = parsePrice(match[1]);
              console.log(`[SMART-AI] Organic item (${primaryMarket}):`, it.title, "Price extracted:", p);
              
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

          console.log(`[SMART-AI] ✅ Organic results (${primaryMarket}): merchants =`, organicCount);
        } else {
          const errorText = await r.text();
          console.error(`[SMART-AI] ❌ DataForSEO Organic HTTP error (${primaryMarket}):`, r.status, errorText);
        }
      } catch (error) {
        console.error(`[SMART-AI] ❌ DataForSEO Organic exception (${primaryMarket}):`, error);
      }
    } else {
      console.log("[SMART-AI] ⚠️ DataForSEO credentials not available - skipping DataForSEO");
    }

    // SERPAPI — Google Shopping (FALLBACK TEXTE TRÈS RARE)
    // On NE l'utilise que si aucun autre signal n'a été trouvé (pas de Lens, pas de DataForSEO)
    const primaryMarket = markets[0];
    if (SERPAPI_KEY && shoppingCount === 0 && allPrices.length < 3 && visualCount === 0) {
      try {
        console.log(`[SMART-AI] 🛒 Calling SerpAPI Google Shopping (last-resort text fallback) for ${primaryMarket}...`);
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("api_key", SERPAPI_KEY);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("gl", primaryMarket);
        url.searchParams.set("hl", primaryMarket === "us" || primaryMarket === "uk" ? "en" : primaryMarket);
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
            shoppingCount++;
            allPrices.push(price);
            allMerchants.push({
              title: it.title || "Product",
              source: it.source || "Google Shopping",
              price,
              link: it.link || "",
              image: it.thumbnail,
            });

            // Add to competitors
            if (it.source && it.link) {
              competitors.push({
                name: it.source,
                url: it.link,
                price,
                image: it.thumbnail,
              });
            }
          }
        }

        console.log("[SMART-AI] ✅ SerpAPI Google Shopping results: merchants =", shoppingCount, "prices =", allPrices.length);
      } catch (error) {
        console.error("[SMART-AI] ❌ SerpAPI exception:", error);
      }
    } else {
      console.log("[SMART-AI] ⚠️ SerpAPI Google Shopping skipped (key missing or other sources already provided data)");
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
    // Stats + Confidence + Weighted Pricing
    // ============================================================================
    const pricing = priceStats(allPrices);

    // Calculer le pricing pondéré basé sur les scores de similarité
    const competitorsForWeighting = competitors
      .filter(c => c.price && c.weight)
      .map(c => ({ price: c.price!, weight: c.weight! }));

    if (competitorsForWeighting.length > 0) {
      const weightedPricing = weightedPriceStats(competitorsForWeighting);
      // Enrichir pricing avec les données pondérées
      pricing.weightedAvg = weightedPricing.weightedAvg;
      pricing.recommendedPrice = weightedPricing.recommendedPrice;
      
      // Trouver le concurrent avec le meilleur score de similarité
      const topSimilarCompetitor = competitors
        .filter(c => c.price && c.similarityScore)
        .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))[0];
      
      if (topSimilarCompetitor) {
        pricing.topMatchPrice = topSimilarCompetitor.price;
        pricing.topMatchSimilarity = topSimilarCompetitor.similarityScore;
      }
      
      console.log(`[SMART-AI] 💰 Weighted pricing: avg=${pricing.avg}€, weighted=${pricing.weightedAvg}€, recommended=${pricing.recommendedPrice}€`);
      if (topSimilarCompetitor) {
        console.log(`[SMART-AI] 🎯 Top match: ${topSimilarCompetitor.name} at ${topSimilarCompetitor.price}€ (${topSimilarCompetitor.similarityScore}% similarity)`);
      }
    }

    let confidence = 0.2;
    if (vision?.title) confidence += 0.15;
    if (shoppingCount > 0) confidence += 0.3;
    if (organicCount > 1) confidence += 0.1;
    if (visualCount > 1) confidence += 0.15;
    if (vision?.attributes && Object.keys(vision.attributes).length > 0) confidence += 0.1;
    
    // Bonus confidence si on a des scores de similarité élevés
    const highSimilarityCount = competitors.filter(c => (c.similarityScore || 0) >= 80).length;
    if (highSimilarityCount > 0) confidence += 0.1;

    confidence = Math.min(confidence, 0.98);

    // ============================================================================
    // Final Merchants & Competitors — TRIER PAR SIMILARITÉ
    // ============================================================================
    const merchants = allMerchants
      .filter((m) => m.price)
      .sort((a, b) => a.price! - b.price!)
      .slice(0, 15);

    // TRIER les concurrents par similarité AVANT de dédupliquer
    const uniqueCompetitors = competitors
      .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
      .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0)) // ⬆️ Tri par similarité DESC
      .slice(0, 15); // Augmenté à 15 pour afficher plus de concurrents similaires

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

    // ============================================================================
    // 🎯 CALCULER market_price ET smart_price
    // ============================================================================
    const marketPrice = pricing.median || pricing.avg || null; // Prix médian du marché
    const smartPrice = pricing.recommendedPrice || pricing.weightedAvg || marketPrice; // Prix intelligent pondéré

    console.log(`[SMART-AI] 💰 Final Prices: market_price=${marketPrice}€, smart_price=${smartPrice}€`);

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
      marketPrice, // ⬆️ AJOUTÉ
      smartPrice,  // ⬆️ AJOUTÉ
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
