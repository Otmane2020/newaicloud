import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionAnalysis {
  title: string;
  searchQuery?: string; // AI-optimized search query (3-5 words)
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

// Simplify query for shopping search (remove stop words, keep 4 key words)
function simplifyForShopping(query: string): string {
  const stopWords = [
    'the', 'a', 'an', 'with', 'and', 'or', 'for', 'of', 'in', 'on', 
    'top', 'base', 'style', 'design', 'room', 'living', 'bedroom'
  ];
  
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(w => !stopWords.includes(w) && w.length > 2)
    .slice(0, 4); // Max 4 words
    
  return keywords.join(' ');
}

// Extract numeric price from string with support for various formats
function parsePrice(str?: string | number | null): number | null {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  
  // Clean string and extract number - support thousand separators
  const cleaned = str.toString()
    .replace(/\s/g, "")
    .replace(/[€$£]/g, "")
    .replace(/(\d),(\d{3})/g, "$1$2") // Remove thousand separator (1,299 -> 1299)
    .replace(",", "."); // Convert decimal comma to dot
  
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
    const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
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
  "title": "full product name (max 8 words)",
  "searchQuery": "SHORT search query for shopping (3-5 MAIN keywords only, e.g. 'coffee table marble hexagonal')",
  "brand": "brand name if visible, null otherwise",
  "category": "product category (furniture, electronics, clothing, etc.)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "description": "brief description (max 20 words)",
  "segment": "price segment: budget, mid-range, premium, luxury"
}

CRITICAL: searchQuery must be SHORT (3-5 words) with MAIN keywords only for Google Shopping.
Example: "Nesting Coffee Tables with Marble Top" -> searchQuery: "coffee table marble"
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
        
        // Use AI-generated searchQuery if available, otherwise build from title
        if (!productTitle) {
          searchQuery = (visionAnalysis as any)?.searchQuery || visionAnalysis?.title || "";
        } else {
          searchQuery = productTitle;
        }
        
        console.log("✅ [VISION] Analysis complete:", visionAnalysis?.title);
        console.log("🔍 [SEARCH QUERY] AI-generated:", searchQuery);
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
    let visualSearchCount = 0;

    // =================================================================
    // 2️⃣ DATAFORSEO SHOPPING API - Progressive search strategy
    // =================================================================
    if (DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD) {
      const authToken = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);
      
      // Progressive search: 3 attempts with different query simplifications
      const searchAttempts: { query: string; label: string }[] = [];
      
      // Attempt 1: Simplified query (remove stop words, 4 words max)
      const simplifiedQuery = simplifyForShopping(searchQuery);
      if (simplifiedQuery && simplifiedQuery !== searchQuery) {
        searchAttempts.push({ query: simplifiedQuery, label: "Simplified (4 words)" });
      }
      
      // Attempt 2: Category + main keyword (2-3 words)
      if (visionAnalysis?.category && visionAnalysis?.keywords?.[0]) {
        const categoryQuery = `${visionAnalysis.category} ${visionAnalysis.keywords[0]}`.toLowerCase();
        if (categoryQuery !== simplifiedQuery) {
          searchAttempts.push({ query: categoryQuery, label: "Category + keyword" });
        }
      }
      
      // Attempt 3: Main keyword only (first word of simplified query)
      const mainKeyword = simplifiedQuery.split(" ")[0];
      if (mainKeyword && mainKeyword.length > 3 && searchAttempts.length < 3) {
        searchAttempts.push({ query: mainKeyword, label: "Main keyword only" });
      }
      
      // Always include original query as first attempt if it's different
      if (searchQuery !== simplifiedQuery) {
        searchAttempts.unshift({ query: searchQuery, label: "Original query" });
      } else {
        searchAttempts.unshift({ query: searchQuery, label: "Optimized query" });
      }
      
      console.log(`🛒 [SHOPPING] Progressive search with ${searchAttempts.length} attempts:`, searchAttempts.map(a => `${a.label}: "${a.query}"`).join(", "));
      
      // Try each query until we get results
      for (let i = 0; i < searchAttempts.length && shoppingCount === 0; i++) {
        const attempt = searchAttempts[i];
        
        try {
          console.log(`🔍 [SHOPPING-${i + 1}] Trying ${attempt.label}: "${attempt.query}"`);
          
          const shoppingResponse = await fetch(
            "https://api.dataforseo.com/v3/serp/google/shopping/live/advanced",
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${authToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify([
                {
                  keyword: attempt.query,
                  location_code: getLocationCode(country),
                  language_code: country === "uk" || country === "us" ? "en" : country,
                  device: "desktop",
                  os: "windows",
                  depth: 20,
                },
              ]),
            }
          );

          if (shoppingResponse.ok) {
            const shoppingData = await shoppingResponse.json();
            const items = shoppingData.tasks?.[0]?.result?.[0]?.items || [];
            
            console.log(`📊 [SHOPPING-${i + 1}] DataForSEO returned ${items.length} items`);
            
            items.forEach((item: any) => {
              // Enhanced price extraction supporting multiple formats
              const priceValue = 
                item.price?.current || 
                item.price?.regular || 
                item.price?.value || 
                item.price_from || 
                item.price;
              
              const price = parsePrice(priceValue);
              
              if (price && price > 0) {
                allPrices.push(price);
                shoppingCount++;
                
                if (allMerchants.length < 10) {
                  allMerchants.push({
                    title: item.title || "Unknown",
                    source: item.seller?.name || item.source || "Google Shopping",
                    price,
                    link: item.url || "",
                  });
                }
              }
            });
            
            if (shoppingCount > 0) {
              console.log(`✅ [SHOPPING-${i + 1}] Success! Found ${shoppingCount} products with "${attempt.label}"`);
              break; // Stop trying once we have results
            } else {
              console.log(`⚠️ [SHOPPING-${i + 1}] No prices found with "${attempt.label}", trying next...`);
            }
          } else {
            const errorText = await shoppingResponse.text();
            console.error(`❌ [SHOPPING-${i + 1}] API error: ${shoppingResponse.status}`, errorText.substring(0, 200));
          }
        } catch (attemptErr) {
          console.error(`❌ [SHOPPING-${i + 1}] Error:`, attemptErr instanceof Error ? attemptErr.message : "Unknown error");
        }
      }
      
      if (shoppingCount === 0) {
        console.log("⚠️ [SHOPPING] No results after all attempts");
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
          
          console.log(`📊 [ORGANIC] DataForSEO returned ${items.length} results`);
          
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
        } else {
          const errorText = await organicResponse.text();
          console.error(`❌ [ORGANIC] API error: ${organicResponse.status}`, errorText.substring(0, 200));
        }
      } catch (err) {
        console.error("❌ [ORGANIC] Error:", err instanceof Error ? err.message : "Unknown error");
      }
    }

    // =================================================================
    // 4️⃣ SERPAPI GOOGLE IMAGES — Find competitors with REAL prices (100% flexible)
    // =================================================================
    if (SERPAPI_KEY) {
      try {
        console.log("🔍 [SERPAPI] Searching Google Images for:", searchQuery);
        
        // Build SerpApi URL
        const serpApiUrl = new URL("https://serpapi.com/search.json");
        serpApiUrl.searchParams.set("api_key", SERPAPI_KEY);
        serpApiUrl.searchParams.set("engine", "google_images");
        serpApiUrl.searchParams.set("q", searchQuery);
        serpApiUrl.searchParams.set("gl", country);
        serpApiUrl.searchParams.set("hl", country === "uk" || country === "us" ? "en" : country);
        serpApiUrl.searchParams.set("ijn", "0");
        
        const serpResponse = await fetch(serpApiUrl.toString());
        
        if (serpResponse.ok) {
          const serpData = await serpResponse.json();
          
          // 1️⃣ Extract shopping_results (DIRECT PRICES from Google Shopping!)
          const shoppingItems = serpData.shopping_results || [];
          console.log(`💰 [SERPAPI] Found ${shoppingItems.length} shopping results with prices`);
          
          for (const item of shoppingItems) {
            const price = item.extracted_price || parsePrice(item.price);
            
            if (price && price > 10 && price < 10000) {
              allPrices.push(price);
              visualSearchCount++;
              shoppingCount++; // 🔥 Count as shopping result (real merchant price)
              
              allMerchants.push({
                title: item.title || "Produit similaire",
                source: item.source || "Google Shopping",
                price,
                link: item.link || "",
              });
              
              console.log(`💰 [SERPAPI] ${item.source}: ${price}€`);
            }
          }
          
          // 2️⃣ Also check images_results for product pages
          const imageItems = serpData.images_results || [];
          console.log(`🖼️ [SERPAPI] Found ${imageItems.length} image results`);
          
          for (const item of imageItems.slice(0, 10)) {
            // Check if it's marked as a product page
            if (item.is_product && item.link) {
              console.log(`📦 [SERPAPI] Product page found: ${item.source} - ${item.link}`);
            }
          }
          
          console.log(`✅ [SERPAPI] Total prices found: ${visualSearchCount}`);
        } else {
          console.error(`❌ [SERPAPI] API error: ${serpResponse.status}`);
        }
      } catch (err) {
        console.error("❌ [SERPAPI] Error:", err instanceof Error ? err.message : "Unknown error");
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
    
    // Visual search (SerpApi) = highly reliable source with real prices
    if (visualSearchCount >= 5) confidence += 0.25;
    else if (visualSearchCount >= 3) confidence += 0.15;
    else if (visualSearchCount >= 1) confidence += 0.08;
    
    if (priceStats.min && priceStats.max) {
      // Bonus if price range is coherent (max < 3x min)
      if (priceStats.max <= priceStats.min * 3) confidence += 0.05;
    }
    
    confidence = Math.min(confidence, 0.98);

    // Sort merchants by price
    allMerchants.sort((a, b) => (a.price || 999999) - (b.price || 999999));

    const processingTime = Date.now() - startTime;

    // Keep top 10 merchants for storage and top 5 for display
    const finalMerchants = allMerchants.length > 0 ? allMerchants.slice(0, 10) : [];

    const result: ScanResult = {
      vision: visionAnalysis,
      searchQuery,
      price: priceStats,
      merchants: finalMerchants.slice(0, 5),
      productsFound: finalMerchants.length,
      confidence: Math.round(confidence * 100) / 100,
      sources: {
        shopping: finalMerchants.length, // Real merchant count from all sources
        organic: organicCount,
        visual: visualSearchCount,
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
            merchants: finalMerchants,
            sources_shopping: finalMerchants.length,
            sources_organic: organicCount,
            sources_images: visualSearchCount,
            products_found: finalMerchants.length,
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
