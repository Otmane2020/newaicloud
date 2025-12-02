// ============================================================================
// TEST SMART AI APIS – Diagnostic des APIs DataForSEO, SerpAPI et Smart AI
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApiTestResult {
  name: string;
  status: "ok" | "ko";
  details: string;
  responseTime?: number;
  data?: any;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DATAFORSEO_LOGIN = Deno.env.get("DATAFORSEO_LOGIN");
    const DATAFORSEO_PASSWORD = Deno.env.get("DATAFORSEO_PASSWORD");
    const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");

    const results: ApiTestResult[] = [];

    // ============================================================================
    // 1️⃣ Test DataForSEO Shopping API
    // ============================================================================
    console.log("[TEST] Testing DataForSEO Shopping API...");
    const dataForSeoStart = Date.now();
    
    if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
      results.push({
        name: "DataForSEO Shopping",
        status: "ko",
        details: "Credentials not configured",
        error: "DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD missing",
      });
    } else {
      try {
        const auth = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);
        const response = await fetch("https://api.dataforseo.com/v3/serp/google/shopping/live/regular", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              keyword: "table basse design",
              location_code: 2250,
              language_code: "fr",
              depth: 10,
            },
          ]),
        });

        const responseTime = Date.now() - dataForSeoStart;
        const data = await response.json();

        console.log("[TEST] DataForSEO response:", JSON.stringify(data, null, 2));

        if (data.status_code === 20000 && data.tasks?.[0]?.result?.[0]?.items?.length > 0) {
          results.push({
            name: "DataForSEO Shopping",
            status: "ok",
            details: `${data.tasks[0].result[0].items.length} products found`,
            responseTime,
            data: {
              status_code: data.status_code,
              items_count: data.tasks[0].result[0].items.length,
              sample_item: data.tasks[0].result[0].items[0],
            },
          });
        } else {
          results.push({
            name: "DataForSEO Shopping",
            status: "ko",
            details: `API error: ${data.status_message || "Unknown error"}`,
            responseTime,
            error: JSON.stringify(data),
          });
        }
      } catch (error) {
        results.push({
          name: "DataForSEO Shopping",
          status: "ko",
          details: "Request failed",
          responseTime: Date.now() - dataForSeoStart,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ============================================================================
    // 2️⃣ Test SerpAPI Google Shopping
    // ============================================================================
    console.log("[TEST] Testing SerpAPI Google Shopping...");
    const serpApiStart = Date.now();

    if (!SERPAPI_KEY) {
      results.push({
        name: "SerpAPI Shopping",
        status: "ko",
        details: "API key not configured",
        error: "SERPAPI_KEY missing",
      });
    } else {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("api_key", SERPAPI_KEY);
        url.searchParams.set("q", "table basse design");
        url.searchParams.set("gl", "fr");
        url.searchParams.set("hl", "fr");
        url.searchParams.set("num", "10");

        console.log("[TEST] SerpAPI URL:", url.toString());

        const response = await fetch(url.toString());
        const responseTime = Date.now() - serpApiStart;
        const data = await response.json();

        console.log("[TEST] SerpAPI response:", JSON.stringify(data, null, 2));

        if (data.shopping_results && data.shopping_results.length > 0) {
          results.push({
            name: "SerpAPI Shopping",
            status: "ok",
            details: `${data.shopping_results.length} products found`,
            responseTime,
            data: {
              items_count: data.shopping_results.length,
              sample_item: data.shopping_results[0],
            },
          });
        } else {
          results.push({
            name: "SerpAPI Shopping",
            status: "ko",
            details: data.error || "No shopping results found",
            responseTime,
            error: JSON.stringify(data),
          });
        }
      } catch (error) {
        results.push({
          name: "SerpAPI Shopping",
          status: "ko",
          details: "Request failed",
          responseTime: Date.now() - serpApiStart,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ============================================================================
    // 3️⃣ Test Smart AI (Vision + Shopping Combined)
    // ============================================================================
    console.log("[TEST] Testing Smart AI function...");
    const smartAiStart = Date.now();

    try {
      // Test avec une image simple
      const testImageUrl = "https://via.placeholder.com/500x500.png?text=Test+Product";
      
      const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/smart-ai`, {
        method: "POST",
        headers: {
          Authorization: req.headers.get("authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: testImageUrl,
          productTitle: "Test Product",
          country: "fr",
        }),
      });

      const responseTime = Date.now() - smartAiStart;
      const data = await response.json();

      console.log("[TEST] Smart AI response:", JSON.stringify(data, null, 2));

      if (data.vision && data.merchants) {
        results.push({
          name: "Smart AI Function",
          status: "ok",
          details: `Vision OK, ${data.merchants.length} merchants found, confidence: ${Math.round(data.confidence * 100)}%`,
          responseTime,
          data: {
            vision_title: data.vision?.title,
            merchants_count: data.merchants.length,
            confidence: data.confidence,
            sources: data.sources,
          },
        });
      } else {
        results.push({
          name: "Smart AI Function",
          status: "ko",
          details: data.error || "Incomplete response",
          responseTime,
          error: JSON.stringify(data),
        });
      }
    } catch (error) {
      results.push({
        name: "Smart AI Function",
        status: "ko",
        details: "Request failed",
        responseTime: Date.now() - smartAiStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ============================================================================
    // Return results
    // ============================================================================
    const summary = {
      timestamp: new Date().toISOString(),
      allOk: results.every(r => r.status === "ok"),
      results,
    };

    console.log("[TEST] Final summary:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TEST] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
