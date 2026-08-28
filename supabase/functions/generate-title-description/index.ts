import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveLanguage, getLanguageName } from "../_shared/language-detector.ts";
import { routeAI, routeVision } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanJson(text: string): string {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match?.[0] || cleaned;
}

function extractDimensions(text: string): string {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i,
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return "";
}

function languageInstruction(language: string): string {
  const map: Record<string, string> = {
    fr: "Réponds intégralement en français naturel.",
    en: "Write entirely in natural English.",
    de: "Schreibe vollständig auf natürlichem Deutsch.",
    es: "Escribe íntegramente en español natural.",
    it: "Scrivi interamente in italiano naturale.",
  };
  return map[language] || map.en;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { currentTitle, imageUrl, config, customDescription, vendor, language: explicitLanguage } = body;
    if (!currentTitle?.trim()) throw new Error("Title is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const language = resolveLanguage({
      explicitLanguage,
      contentText: `${currentTitle} ${customDescription || ""}`,
    });
    const langName = getLanguageName(language);
    const dimensionsFromTitle = extractDimensions(currentTitle);
    const extractedVendor = vendor || currentTitle.match(/\b[A-Z][A-Z0-9-]{2,}\b/)?.[0] || "";

    let visionAnalysis = "";
    let visionProvider = "";
    let visionModel = "";

    if (imageUrl) {
      const { data: cached } = await supabase
        .from("vision_ai_cache")
        .select("analysis_result")
        .eq("image_url", imageUrl)
        .maybeSingle();

      if (cached?.analysis_result) {
        visionAnalysis = cached.analysis_result;
      } else {
        try {
          const vision = await routeVision([
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${languageInstruction(language)} Analyze this ecommerce product image. Describe only visible product facts: product type, colors, materials, finish, style, visible features and any explicitly readable technical dimensions. Never estimate dimensions. Return a concise factual analysis.`,
                },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ], 450);
          visionAnalysis = vision.content;
          visionProvider = vision.provider;
          visionModel = vision.model;

          if (visionAnalysis) {
            await supabase.from("vision_ai_cache").upsert(
              { image_url: imageUrl, analysis_result: visionAnalysis },
              { onConflict: "image_url" },
            );
          }
        } catch (error) {
          console.warn("[generate-title-description] Kimi vision unavailable; text generation continues without vision", error);
        }
      }
    }

    let serpInsights = "";
    try {
      const serp = await supabase.functions.invoke("analyze-serp-competitors", {
        body: { keyword: currentTitle, analysisType: "title_meta", maxResults: 5 },
      });
      if (!serp.error && serp.data?.insights) {
        serpInsights = JSON.stringify(serp.data.insights).slice(0, 3500);
      }
    } catch (error) {
      console.warn("[generate-title-description] SERP enrichment unavailable", error);
    }

    const style = config?.style || "modern";
    const layout = config?.layout || "detailed";
    const contentLength = config?.contentLength || "medium";

    const prompt = `
${languageInstruction(language)}
You are an ecommerce SEO and conversion copywriting specialist.

SOURCE PRODUCT TITLE: ${currentTitle}
${extractedVendor ? `KNOWN BRAND/VENDOR: ${extractedVendor}` : ""}
${dimensionsFromTitle ? `KNOWN DIMENSIONS FROM TITLE: ${dimensionsFromTitle}` : ""}
${customDescription ? `USER-PROVIDED FACTS: ${customDescription}` : ""}
${visionAnalysis ? `KIMI VISION FACTS: ${visionAnalysis}` : ""}
${serpInsights ? `SERP COMPETITOR INSIGHTS: ${serpInsights}` : ""}

DESIGN PREFERENCES: style=${style}, layout=${layout}, contentLength=${contentLength}

Generate:
1. seo_title: a strong Shopify/product SEO title, ideally 55-70 characters. Preserve brand/model/dimensions/material facts when known.
2. meta_description: approximately 145-160 characters, persuasive but factual.
3. html_body: semantic ecommerce HTML using H2/H3, short readable paragraphs, benefits, visible/known specifications and a concise CTA. Do not invent dimensions, materials, certifications, delivery promises or product features.

FACT PRIORITY:
- Explicit user facts and original title are authoritative.
- Explicit readable dimensions from technical imagery may be used.
- Vision may describe only what is visible; never turn guesses into facts.
- SERP data is inspiration only and must never overwrite product facts.

Return ONLY one valid JSON object exactly with keys:
{"seo_title":"...","meta_description":"...","html_body":"..."}
`.trim();

    const generated = await routeAI({
      messages: [
        { role: "system", content: `You are a careful ecommerce SEO writer. Output valid JSON only. Target language: ${langName}.` },
        { role: "user", content: prompt },
      ],
      maxTokens: contentLength === "long" ? 5000 : contentLength === "short" ? 1800 : 3200,
      temperature: 0.35,
    });

    const parsed = JSON.parse(cleanJson(generated.content));
    const seoTitle = String(parsed.seo_title || "").trim();
    const metaDescription = String(parsed.meta_description || "").trim();
    const htmlBody = String(parsed.html_body || "").trim();
    if (!seoTitle || !metaDescription || !htmlBody) throw new Error("AI returned incomplete product content");

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: products } = await supabase
          .from("shopify_products")
          .select("id, optimization_count")
          .eq("seller_id", user.id)
          .eq("title", currentTitle)
          .limit(1);

        if (products?.length) {
          const product = products[0];
          await supabase.from("shopify_products").update({
            seo_title: seoTitle,
            seo_description: metaDescription,
            optimization_count: (product.optimization_count || 0) + 1,
            last_optimization_at: new Date().toISOString(),
          }).eq("id", product.id);

          try {
            await supabase.rpc("increment_usage", {
              p_seller_id: user.id,
              p_field: "optimizations_count",
              p_increment: 2,
            });
          } catch (error) {
            console.warn("[generate-title-description] usage tracking failed", error);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      title: seoTitle,
      description: metaDescription,
      html_description: htmlBody,
      hasVisionAnalysis: Boolean(visionAnalysis),
      extractedDimensions: dimensionsFromTitle || null,
      provider: generated.provider,
      model: generated.model,
      visionProvider: visionProvider || (visionAnalysis ? "cache" : null),
      visionModel: visionModel || null,
      policy: "openrouter-free>gemini-free>kimi-free>deepseek-free; vision=kimi-free",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-title-description] error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
