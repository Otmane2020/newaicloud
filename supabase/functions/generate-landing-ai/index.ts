import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function sanitizeHtmlUnsafe(html: string): string {
  if (!html) return "";
  let out = html
    .replace(/^\s*```(?:html)?/gi, "")
    .replace(/```\s*$/g, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, ' href="#"')
    .replace(/<\/?(html|head|body)[^>]*>/gi, "");
  out = out.replace(/\sstyle\s*=\s*(['"])(.*?)\1/gi, (_m, q, css) => {
    const kept = css
      .split(";")
      .map((r: string) => r.trim())
      .filter((r: string) => /^(color|background-color|border-color)\s*:/i.test(r))
      .join("; ");
    return kept ? ` style=${q}${kept}${q}` : "";
  });
  return out.trim();
}

function buildVisionSummary(v: any, language = "fr") {
  if (!v) return "";
  const materials = Array.isArray(v.materials)
    ? v.materials.join(", ")
    : v.materials || (language === "en" ? "not detected" : "non détectés");
  const palette = Array.isArray(v.palette)
    ? v.palette.join(", ")
    : v.palette || v.dominantColor || (language === "en" ? "not detected" : "non détectée");
  const styles = Array.isArray(v.visualStyles)
    ? v.visualStyles.join(", ")
    : v.visualStyle || (language === "en" ? "not detected" : "non détecté");
  const moods = Array.isArray(v.moods)
    ? v.moods.join(", ")
    : v.mood || (language === "en" ? "not detected" : "non détectée");
  const quality = v.quality || (language === "en" ? "not detected" : "non détectée");
  const finishes = Array.isArray(v.finishes) ? v.finishes.join(", ") : v.finish || "—";
  const usecases = Array.isArray(v.useCases) ? v.useCases.join(", ") : v.useCases || "—";

  return language === "en"
    ? `VISION ANALYSIS (AI)
- Dominant palette: ${palette}
- Style: ${styles}
- Mood: ${moods}
- Materials: ${materials}
- Finishes: ${finishes}
- Quality: ${quality}
- Use cases: ${usecases}`
    : `ANALYSE VISUELLE (Vision AI)
- Palette dominante : ${palette}
- Style : ${styles}
- Ambiance : ${moods}
- Matériaux : ${materials}
- Finitions : ${finishes}
- Qualité : ${quality}
- Cas d’usage : ${usecases}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style,
      mainColor = "#3B82F6",
      layout,
      length,
      customHighlights,
      language = "fr",
    } = body ?? {};

    if (!productTitle)
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Fetch images + variants in parallel
    console.log("📦 Fetching product data...");
    const [imagesRes, variantsRes] = await Promise.all([
      supabaseAdmin.from("product_images").select("src, alt_text").eq("product_id", product_id).order("position"),
      supabaseAdmin.from("product_variants").select("title, image_url").eq("product_id", product_id),
    ]);
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    console.log(`✅ Product data fetched: ${images.length} images, ${variants.length} variants`);

    // Vision AI with timeout (15s) - Optional, won't block if it fails
    let visualAnalysis = "";
    if (imageUrl) {
      try {
        console.log("🔍 Starting Vision AI analysis...");
        const visionController = new AbortController();
        const visionTimeout = setTimeout(() => visionController.abort(), 15000);
        
        const { data: visionData, error: visionError } = await supabaseAdmin.functions.invoke(
          "analyze-image-with-vision",
          {
            body: {
              imageUrl,
              productContext: `${productTitle} ${vendor || ""}`,
            },
            signal: visionController.signal,
          }
        );
        
        clearTimeout(visionTimeout);
        
        if (visionError) {
          console.log("⚠️ Vision AI failed:", visionError.message);
        } else if (visionData?.attributes) {
          visualAnalysis = buildVisionSummary(visionData.attributes, language);
          console.log("✅ Vision AI analysis completed");
        }
      } catch (err) {
        console.log("⚠️ Vision AI timeout or error (continuing without it):", err.message);
      }
    } else {
      console.log("⏭️ No image URL provided, skipping Vision AI");
    }

    // --- Prompt bilingual ---
    const imgs = images.length
      ? images.map((i) => `- ${i.src}`).join("\n")
      : language === "en"
        ? "No additional image"
        : "Aucune image supplémentaire";
    const vars = variants.length
      ? variants.map((v) => `- ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ""}`).join("\n")
      : language === "en"
        ? "No variant"
        : "Aucune variante";

    const prompt =
      language === "en"
        ? `
You are a Shopify UX/UI expert and eCommerce copywriter.
Generate a **complete Tailwind HTML landing page**, mobile-first and high-converting.
Sections required: Hero, Gallery, Vision AI, Key Benefits, Specs, Care, Sustainability, Reviews, FAQ, Final CTA.

Product: ${productTitle}
Brand: ${vendor}
Description: ${description}
Style: ${style}
Main color: ${mainColor}
Layout: ${layout}
Text length: ${length}
Images:
${imgs}
Variants:
${vars}
Vision AI:
${visualAnalysis}
Highlights:
${customHighlights}

Constraints:
- Mobile-first (sm:, md:, lg:)
- Container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
- Use ${mainColor} for CTAs & titles
- No <script> or <style> tags
- Return ONLY the HTML block
`
        : `
Tu es un expert UX/UI Shopify et copywriter e-commerce.
Génère un **HTML Tailwind complet**, responsive mobile-first et à forte conversion.
Rubriques requises : Hero, Galerie, Vision AI, Points forts, Caractéristiques, Entretien, Durabilité, Avis, FAQ, CTA final.

Produit : ${productTitle}
Marque : ${vendor}
Description : ${description}
Style : ${style}
Couleur principale : ${mainColor}
Disposition : ${layout}
Longueur du texte : ${length}
Images :
${imgs}
Variantes :
${vars}
Vision AI :
${visualAnalysis}
Points forts :
${customHighlights}

Contraintes :
- Mobile-first (sm:, md:, lg:)
- Container : max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grille : grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Couleur ${mainColor} sur CTA et titres
- Aucun <script> ni <style>
- Retourne uniquement le HTML
`;

    // --- AI call with timeout (60s) ---
    console.log("🤖 Starting AI generation...");
    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 60000);
    
    let aiResponse;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                language === "en"
                  ? "You generate modern responsive Shopify landing pages in Tailwind HTML."
                  : "Tu génères des landing pages Shopify modernes et responsives en HTML Tailwind.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2500,
          temperature: 0.7,
        }),
        signal: aiController.signal,
      });
    } finally {
      clearTimeout(aiTimeout);
    }
    
    console.log("✅ AI generation completed");

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: `Lovable API ${aiResponse.status}`, detail: text }), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    let html = data?.choices?.[0]?.message?.content?.trim() || "";
    html = sanitizeHtmlUnsafe(html);

    if (!html || html.length < 400)
      return new Response(
        JSON.stringify({ error: language === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    // Cache
    console.log("💾 Caching generated HTML...");
    await supabaseAdmin.from("ai_cache").upsert({
      title: productTitle,
      html,
      created_at: new Date().toISOString(),
    });

    console.log("✅ Landing page generation successful!");
    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
