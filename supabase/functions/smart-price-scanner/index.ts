import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionAnalysis {
  title: string;
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
    images: number;
  };
  processingTime: number;
}

// Convert image URL to base64 Data URI for reliable Vision AI processing
async function fetchImageAsDataUri(url: string): Promise<string> {
  try {
    console.log("📥 [BASE64] Downloading image for Vision AI...");
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartPriceScanner/1.0)",
      },
    });
    
    if (!response.ok) {
      console.warn(`⚠️ [BASE64] Failed to fetch image: ${response.status}, using original URL`);
      return url;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if image is too large (>10MB)
    if (uint8Array.length > 10 * 1024 * 1024) {
      console.warn("⚠️ [BASE64] Image too large, using original URL");
      return url;
    }
    
    // Convert to base64
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    // Detect MIME type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    
    console.log(`✅ [BASE64] Converted to Data URI (${Math.round(uint8Array.length / 1024)}KB, ${mimeType})`);
    
    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.warn("⚠️ [BASE64] Conversion failed, using original URL:", err instanceof Error ? err.message : "Unknown error");
    return url;
  }
}

// Extract numeric price from string
function parsePrice(str?: string | number | null): number | null {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  
  // Clean string and extract number
  const cleaned = str.toString()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[€$£]/g, "");
  
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

// Calculate price statistics
function calculatePriceStats(prices: (number | null)[]): PriceResult {
  const validPrices = prices.filter((p): p is number => p !== null && !isNaN(p) && p > 0);
  
  if (validPrices.length === 0) {
    return { min: null, max: null, avg: null, median: null, currency: "EUR" };
  }
  
  // Remove outliers (prices > 3x median)
  validPrices.sort((a, b) => a - b);
  const preliminaryMedian = validPrices[Math.floor(validPrices.length / 2)];
  const filteredPrices = validPrices.filter(p => p <= preliminaryMedian * 3);
  
  if (filteredPrices.length === 0) {
    return { min: null, max: null, avg: null, median: null, currency: "EUR" };
  }
  
  filteredPrices.sort((a, b) => a - b);
  
  const min = filteredPrices[0];
  const max = filteredPrices[filteredPrices.length - 1];
  const avg = Math.round((filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length) * 100) / 100;
  const median = filteredPrices[Math.floor(filteredPrices.length / 2)];
  
  return { min, max, avg, median, currency: "EUR" };
}

// Get DataForSEO location code by country
function getLocationCode(country: string): number {
  const locations: Record<string, number> = {
    fr: 2250,  // France
    de: 2276,  // Germany
    es: 2724,  // Spain
    it: 2380,  // Italy
    uk: 2826,  // United Kingdom
    us: 2840,  // United States
  };
  return locations[country.toLowerCase()] || 2250;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    
    // HealthCheck handler
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, productTitle, country = "fr", productId, variantId, storeId } = body;
    
    // Get user from authorization header
    const authHeader = req.headers.get("authorization") || "";

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const DATAFORSEO_LOGIN = Deno.env.get("DATAFORSEO_LOGIN");
    const DATAFORSEO_PASSWORD = Deno.env.get("DATAFORSEO_PASSWORD");
    const GOOGLE_CSE_API_KEY = Deno.env.get("GOOGLE_CSE_API_KEY");
    const GOOGLE_CSE_ID = Deno.env.get("GOOGLE_CSE_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("🔍 [SMART-PRICE-SCANNER] Starting analysis for:", imageUrl.substring(0, 50));

    // =================================================================
    // 1️⃣ VISION AI - Detect product type, brand, keywords
    // =================================================================
    let visionAnalysis: VisionAnalysis | null = null;
    let searchQuery = productTitle || "";

    try {
      console.log("🤖 [VISION] Analyzing image with Gemini...");
      
      // Convert image to base64 Data URI for reliable processing
      const imageDataUri = await fetchImageAsDataUri(imageUrl);
      
      const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this product image and extract:
{
  "title": "product name for search (concise, max 8 words)",
  "brand": "brand name if visible, null otherwise",
  "category": "product category (furniture, electronics, clothing, etc.)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "description": "brief description (max 20 words)",
  "segment": "price segment: budget, mid-range, premium, luxury"
}
Return ONLY valid JSON, no markdown.`,
                },
                {
                  type: "image_url",
                  image_url: { url: imageDataUri },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const content = visionData.choices?.[0]?.message?.content || "";
        
        // Clean and parse JSON
        const cleanContent = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        
        visionAnalysis = JSON.parse(cleanContent);
        
        // Build optimized search query
        searchQuery = productTitle || [
          visionAnalysis?.brand,
          visionAnalysis?.title,
          ...(visionAnalysis?.keywords?.slice(0, 2) || []),
        ].filter(Boolean).join(" ");
        
        console.log("✅ [VISION] Analysis complete:", visionAnalysis?.title);
      } else {
        console.error("❌ [VISION] API error:", visionResponse.status);
      }
    } catch (err) {
      console.error("❌ [VISION] Error:", err instanceof Error ? err.message : "Unknown error");
    }

    // If no search query, use a fallback
    if (!searchQuery) {
      searchQuery = "product";
    }

    const allPrices: (number | null)[] = [];
    const allMerchants: Merchant[] = [];
    let shoppingCount = 0;
    let organicCount = 0;
    let imagesCount = 0;

    // =================================================================
    // 2️⃣ DATAFORSEO SHOPPING API - Real prices from merchants
    // =================================================================
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      try {
        console.log("🛒 [SHOPPING] Searching DataForSEO Shopping for:", searchQuery);
        
        const authToken = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);
        
        const shoppingResponse = await fetch(
          "https://api.dataforseo.com/v3/merchant/google/products/task_post",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              {
                keyword: searchQuery,
                location_code: getLocationCode(country),
                language_code: country === "uk" || country === "us" ? "en" : country,
                priority: 2,
                depth: 20,
              },
            ]),
          }
        );

        if (shoppingResponse.ok) {
          const shoppingData = await shoppingResponse.json();
          const taskId = shoppingData.tasks?.[0]?.id;
          
          if (taskId) {
            // Wait a bit for task to complete
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Get results
            const resultsResponse = await fetch(
              `https://api.dataforseo.com/v3/merchant/google/products/task_get/advanced/${taskId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Basic ${authToken}`,
                },
              }
            );
            
            if (resultsResponse.ok) {
              const resultsData = await resultsResponse.json();
              const items = resultsData.tasks?.[0]?.result?.[0]?.items || [];
              
              items.forEach((item: any) => {
                const price = parsePrice(item.price_from || item.price);
                if (price) {
                  allPrices.push(price);
                  shoppingCount++;
                  
                  if (allMerchants.length < 10) {
                    allMerchants.push({
                      title: item.title || "Unknown",
                      source: item.seller || item.source || "Google Shopping",
                      price,
                      link: item.url || item.product_link || "",
                    });
                  }
                }
              });
              
              console.log(`✅ [SHOPPING] Found ${shoppingCount} products with prices`);
            }
          }
        }
      } catch (err) {
        console.error("❌ [SHOPPING] Error:", err instanceof Error ? err.message : "Unknown error");
      }

      // =================================================================
      // 3️⃣ DATAFORSEO ORGANIC SERP - Prices in snippets
      // =================================================================
      try {
        console.log("🔎 [ORGANIC] Searching DataForSEO Organic for:", searchQuery);
        
        const authToken = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);
        
        const organicResponse = await fetch(
          "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              {
                keyword: searchQuery + " prix",
                location_code: getLocationCode(country),
                language_code: country === "uk" || country === "us" ? "en" : country,
                depth: 20,
              },
            ]),
          }
        );

        if (organicResponse.ok) {
          const organicData = await organicResponse.json();
          const items = organicData.tasks?.[0]?.result?.[0]?.items || [];
          
          items.forEach((item: any) => {
            // Extract price from snippet or title
            const priceMatch = (item.description || item.title || "").match(/(\d+[,.]?\d*)\s*€/);
            if (priceMatch) {
              const price = parsePrice(priceMatch[1]);
              if (price && price > 1) {
                allPrices.push(price);
                organicCount++;
              }
            }
          });
          
          console.log(`✅ [ORGANIC] Found ${organicCount} price mentions`);
        }
      } catch (err) {
        console.error("❌ [ORGANIC] Error:", err instanceof Error ? err.message : "Unknown error");
      }
    }

    // =================================================================
    // 4️⃣ GOOGLE IMAGES CSE - Visual search
    // =================================================================
    if (GOOGLE_CSE_API_KEY && GOOGLE_CSE_ID) {
      try {
        console.log("🖼️ [IMAGES] Searching Google Images for:", searchQuery);
        
        const imageSearchUrl = new URL("https://www.googleapis.com/customsearch/v1");
        imageSearchUrl.searchParams.set("key", GOOGLE_CSE_API_KEY);
        imageSearchUrl.searchParams.set("cx", GOOGLE_CSE_ID);
        imageSearchUrl.searchParams.set("q", searchQuery + " prix €");
        imageSearchUrl.searchParams.set("searchType", "image");
        imageSearchUrl.searchParams.set("num", "10");
        
        const imageResponse = await fetch(imageSearchUrl.toString());
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const items = imageData.items || [];
          
          items.forEach((item: any) => {
            // Check if page snippet contains price
            const priceMatch = (item.snippet || item.title || "").match(/(\d+[,.]?\d*)\s*€/);
            if (priceMatch) {
              const price = parsePrice(priceMatch[1]);
              if (price && price > 1) {
                allPrices.push(price);
                imagesCount++;
              }
            }
          });
          
          console.log(`✅ [IMAGES] Found ${imagesCount} price mentions`);
        }
      } catch (err) {
        console.error("❌ [IMAGES] Error:", err instanceof Error ? err.message : "Unknown error");
      }
    }

    // =================================================================
    // 5️⃣ FUSION & CONFIDENCE CALCULATION
    // =================================================================
    const priceStats = calculatePriceStats(allPrices);
    
    // Calculate confidence score
    let confidence = 0.2; // Base confidence
    
    if (visionAnalysis?.title) confidence += 0.15;
    if (visionAnalysis?.brand) confidence += 0.1;
    if (shoppingCount >= 3) confidence += 0.35;
    else if (shoppingCount >= 1) confidence += 0.2;
    if (organicCount >= 2) confidence += 0.1;
    if (imagesCount >= 1) confidence += 0.05;
    if (priceStats.min && priceStats.max) {
      // Bonus if price range is coherent (max < 3x min)
      if (priceStats.max <= priceStats.min * 3) confidence += 0.05;
    }
    
    confidence = Math.min(confidence, 0.98);

    // Sort merchants by price
    allMerchants.sort((a, b) => (a.price || 999999) - (b.price || 999999));

    const processingTime = Date.now() - startTime;

    // Keep top 10 merchants for storage
    const merchantsToStore = allMerchants.slice(0, 10);

    const result: ScanResult = {
      vision: visionAnalysis,
      searchQuery,
      price: priceStats,
      merchants: allMerchants.slice(0, 5),
      productsFound: shoppingCount + organicCount + imagesCount,
      confidence: Math.round(confidence * 100) / 100,
      sources: {
        shopping: shoppingCount,
        organic: organicCount,
        images: imagesCount,
      },
      processingTime,
    };

    // Save results to database if we have Supabase credentials and user context
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && authHeader) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: authHeader } },
        });

        // Get user ID from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const scanRecord = {
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
            merchants: merchantsToStore,
            sources_shopping: shoppingCount,
            sources_organic: organicCount,
            sources_images: imagesCount,
            products_found: shoppingCount + organicCount + imagesCount,
            confidence: Math.round(confidence * 100) / 100,
            processing_time_ms: processingTime,
            image_url: imageUrl,
          };

          const { error: insertError } = await supabase
            .from("price_scan_results")
            .insert(scanRecord);

          if (insertError) {
            console.error("⚠️ [SMART-PRICE-SCANNER] Failed to save results:", insertError.message);
          } else {
            console.log("✅ [SMART-PRICE-SCANNER] Results saved to database");
          }
        }
      } catch (dbError) {
        console.error("⚠️ [SMART-PRICE-SCANNER] Database error:", dbError);
      }
    }

    console.log(`✅ [SMART-PRICE-SCANNER] Complete in ${processingTime}ms - Confidence: ${confidence}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("❌ [SMART-PRICE-SCANNER] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
