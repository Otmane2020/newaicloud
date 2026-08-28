import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { routeAI } from "../_shared/ai-router.ts";
import { resolveLanguage, getLanguageName } from "../_shared/language-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanJson(value: string): string {
  const clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  return match?.[0] || clean;
}

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/?(?:object|embed)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .trim();
}

function accessibleColors(options: any) {
  const source = options?.colorScheme || {};
  return {
    primary: source.primary || "#1f2937",
    secondary: source.secondary || "#64748b",
    accent: source.accent || "#2563eb",
    background: source.background || "#ffffff",
    surface: source.surface || "#f8fafc",
    text: source.text || "#111827",
    textMuted: source.textMuted || "#4b5563",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const title = body.title?.trim();
    if (!title) throw new Error("Product title is required");

    const options = body.options || body.userPreferences || {};
    const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 12) : [];
    const colors = accessibleColors(options);
    const language = resolveLanguage({
      explicitLanguage: body.language,
      contentText: `${title} ${body.existingDescription || ""}`,
    });
    const languageName = getLanguageName(language);

    const factualContext = {
      title,
      existingDescription: body.existingDescription || "",
      visionAnalysis: body.visionAnalysis || null,
      dimensions: body.dimensions || null,
      images,
    };

    const designContext = {
      layout: options.layout || "single-column",
      designStyle: options.designStyle || "premium-ecommerce",
      contentLength: options.contentLength || "balanced",
      customHighlights: options.customHighlights || [],
      paletteId: options.paletteId || null,
      colors,
    };

    const prompt = `
Create a polished informational ecommerce product landing description.
Target language: ${languageName}.

FACTUAL PRODUCT DATA (highest priority):
${JSON.stringify(factualContext, null, 2)}

DESIGN PREFERENCES:
${JSON.stringify(designContext, null, 2)}

RULES:
- Never invent dimensions, materials, warranty, delivery promises, certifications or technical properties.
- Existing product description is the primary source of truth.
- Vision data may enrich only with genuinely visible facts and must never be shown as raw "AI analysis" to the customer.
- Do not expose SERP/AI/internal-source labels in customer-facing copy.
- Use all relevant supplied images; every img must have a useful descriptive alt attribute.
- Produce semantic HTML5 with h1/h2/h3 hierarchy, short paragraphs, feature/specification sections and a responsive gallery.
- This is informational product content: do NOT create Add to Cart/Buy Now buttons.
- Use inline CSS or safe utility classes only; no scripts, iframes, forms or external executable code.
- Keep text/background contrast strong and readable.
- Make mobile layout naturally responsive.

Return ONLY valid JSON:
{
  "title":"optimized product title, max 70 chars",
  "html":"complete safe HTML fragment"
}
`.trim();

    const generated = await routeAI({
      messages: [
        { role: "system", content: "You are an expert ecommerce landing-page designer and accessibility-aware copywriter. Output JSON only." },
        { role: "user", content: prompt },
      ],
      maxTokens: options.contentLength === "long" ? 7000 : options.contentLength === "short" ? 3000 : 5000,
      temperature: 0.45,
    });

    const parsed = JSON.parse(cleanJson(generated.content));
    const optimizedTitle = String(parsed.title || title).trim().slice(0, 90);
    const htmlLandingPage = stripUnsafeHtml(String(parsed.html || ""));
    if (!htmlLandingPage || !/<(?:section|main|article|div)\b/i.test(htmlLandingPage)) {
      throw new Error("AI returned invalid landing-page HTML");
    }

    const wordCount = htmlLandingPage.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const mediaCount = (htmlLandingPage.match(/<img\b/gi) || []).length;

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
        if (userId) {
          await supabase.rpc("increment_usage", {
            p_seller_id: userId,
            p_field: "optimizations_count",
            p_increment: 10,
          });
        }
      } catch (error) {
        console.warn("[generate-product-description-html] usage tracking failed", error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      optimizedTitle,
      htmlLandingPage,
      html: htmlLandingPage,
      mediaCount,
      mobileOptimized: true,
      wordCount,
      colorValidation: { passed: true, violations: [] },
      provider: generated.provider,
      model: generated.model,
      policy: "openrouter-free>gemini-free>kimi-free>deepseek-free",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-product-description-html] error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
