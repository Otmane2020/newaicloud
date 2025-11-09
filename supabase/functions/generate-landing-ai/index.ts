import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ✅ CORS Headers — sécurisé et compatible front
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ⚙️ Petites utils sûres
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** ----------------------------------------------------------------
 * 🧼 Sanitize: supprime scripts/styles/on* et nettoie markdown accidentel
 * ----------------------------------------------------------------*/
function sanitizeHtmlUnsafe(html: string): string {
  if (!html) return "";
  let out = html;

  // Remove markdown fences
  out = out.replace(/^\s*```(?:html)?/gi, "").replace(/```\s*$/g, "");

  // Remove forbidden tags entirely
  out = out.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "");

  // Remove on* attributes (onClick, onload, etc.)
  out = out.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");

  // Remove javascript: URLs
  out = out.replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, ' href="#"');

  // Remove tail end accidental <html>/<head>/<body>
  out = out.replace(/<\/?(html|head|body)[^>]*>/gi, "");

  // Enforce no inline <style> attributes that set arbitrary CSS except color/border/background-color we explicitly asked for mainColor
  // We keep only style properties for color/background-color/border-color to respect mainColor
  out = out.replace(/\sstyle\s*=\s*(['"])(.*?)\1/gi, (_m, q, css) => {
    const kept = css
      .split(";")
      .map((rule: string) => rule.trim())
      .filter((rule: string) => /^(color|background-color|border-color)\s*:/i.test(rule))
      .join("; ");
    return kept ? ` style=${q}${kept}${q}` : "";
  });

  return out.trim();
}

/** ----------------------------------------------------------------
 * 🧠 Build Vision Summary from attributes
 * ----------------------------------------------------------------*/
function buildVisionSummary(v: any) {
  if (!v) return "";
  const materials = Array.isArray(v.materials) ? v.materials.join(", ") : v.materials || "non détectés";
  const palette = Array.isArray(v.palette) ? v.palette.join(", ") : v.palette || v.dominantColor || "non détectée";
  const styles = Array.isArray(v.visualStyles) ? v.visualStyles.join(", ") : v.visualStyle || "non détecté";
  const moods = Array.isArray(v.moods) ? v.moods.join(", ") : v.mood || "non détectée";
  const quality = v.quality || "non détectée";
  const finishes = Array.isArray(v.finishes) ? v.finishes.join(", ") : v.finish || "—";
  const details = Array.isArray(v.details) ? v.details.join(", ") : v.details || "—";
  const usecases = Array.isArray(v.useCases) ? v.useCases.join(", ") : v.useCases || "—";

  return `
ANALYSE VISUELLE (Vision AI)
- Palette/Couleur dominante : ${palette}
- Style(s) : ${styles}
- Ambiance : ${moods}
- Matériaux visibles : ${materials}
- Finitions / Détails : ${finishes}${details !== "—" ? ` / ${details}` : ""}
- Qualité perçue : ${quality}
- Cas d’usage suggérés : ${usecases}
`.trim();
}

/** ----------------------------------------------------------------
 * 🧱 Function: Generate landing page HTML via Lovable AI Gateway
 * ----------------------------------------------------------------*/
serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🛡️ VÉRIFICATION DES LIMITES AVANT GÉNÉRATION
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        // Récupérer usage actuel
        const { data: usage } = await supabaseAdmin
          .from("usage_tracking")
          .select("optimizations_count")
          .eq("seller_id", user.id)
          .eq("month", currentMonth)
          .maybeSingle();

        // Récupérer profil et plan
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, current_plan_id")
          .eq("id", user.id)
          .single();

        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("max_optimizations_monthly, trial_max_optimizations, landing_cost")
          .eq("id", profile?.current_plan_id || "trial")
          .single();

        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations =
          profile?.subscription_status === "trialing"
            ? (plan?.trial_max_optimizations ?? 50)
            : (plan?.max_optimizations_monthly ?? 999999);

        const LANDING_PAGE_COST = clamp(Number(plan?.landing_cost ?? 5), 1, 50);

        if (currentUsage + LANDING_PAGE_COST > maxOptimizations) {
          return new Response(
            JSON.stringify({
              error: "LIMIT_REACHED",
              message: "Limite d'optimisations atteinte. Passez à un plan supérieur.",
              usage: currentUsage,
              cost: LANDING_PAGE_COST,
              limit: maxOptimizations,
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // ✅ Incrémenter IMMÉDIATEMENT (avant génération)
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: LANDING_PAGE_COST,
        });
      }
    }

    // 📨 Payload
    const body = await req.json();

    const {
      productTitle,
      imageUrl,
      description,
      vendor,
      style,
      mainColor,
      layout,
      length,
      customHighlights,
      language = "fr", // "fr" | "en"
      toneOfVoice = "moderne", // "moderne" | "premium" | "friendly" | "expert"
      audience = "grand public", // "professionnels" | "design lovers" | "familles", etc.
      abVariant = "A", // "A" | "B" — pour jouer sur micro-copies
      includeMeta = false, // si true: renvoie { html, meta, outline }
    } = body ?? {};

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY in environment variables");
    }

    // 🧩 Dynamic tone based on length
    const targetTone =
      length === "courte (400 mots)"
        ? "concis"
        : length === "moyenne (800 mots)"
          ? "équilibré"
          : "détaillé et approfondi";

    // 🔍 VISION AI ANALYSIS (enrichie)
    let visualAnalysis = "";
    if (imageUrl && authHeader) {
      try {
        const visionResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-image-with-vision`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl,
            productContext: `${productTitle}${vendor ? ` by ${vendor}` : ""}`,
            wantUseCases: true,
            wantPalette: true,
            wantFinishes: true,
          }),
        });

        if (visionResponse.ok) {
          const v = await visionResponse.json();
          const summary = buildVisionSummary(v?.attributes);
          if (summary) visualAnalysis = summary;
        }
      } catch {
        // silencieux: on continue sans vision
      }
    }

    // 🎨 STYLE GUIDES
    const styleGuides: Record<string, string> = {
      moderne:
        "Gradients subtils, ombres douces, coins arrondis (rounded-2xl), espacements généreux, typo sans-serif (font-sans), palette noir/blanc avec accents vifs",
      minimaliste:
        "Beaucoup d'espace blanc, typo épurée, 1-2 couleurs max, lignes fines (border), ombres légères (shadow-sm)",
      scandinave:
        "Tons naturels (beige, blanc cassé, gris clair), textures bois suggérées, simplicité fonctionnelle, ambiance chaleureuse",
      premium:
        "Or/noir/blanc, typo serif (font-serif) pour titres, ombres prononcées (shadow-2xl), gradients métalliques, détails raffinés",
      neutre: "Gris/blanc/noir uniquement, design sobre, typo classique, structure équilibrée",
      coloré: "Palette vibrante multi-couleurs, dégradés audacieux, contrastes forts, design dynamique",
    };

    const currentStyleGuide = styleGuides[style] || styleGuides["moderne"];

    // 🧪 Micro-variantes CTA/accroches pour A/B
    const ab = String(abVariant).toUpperCase() === "B" ? "B" : "A";
    const ctaPrimary =
      ab === "B"
        ? language === "en"
          ? "Add to cart — fast shipping"
          : "Ajouter au panier — expédition rapide"
        : language === "en"
          ? "Get yours now"
          : "Je le veux maintenant";
    const subhook =
      ab === "B"
        ? language === "en"
          ? "Loved by design enthusiasts"
          : "Plébiscité par les amateurs de design"
        : language === "en"
          ? "Built for daily comfort"
          : "Pensé pour le confort au quotidien";

    // 🧱 PROMPT enrichi (FR/EN auto)
    const loc = (fr: string, en: string) => (language === "en" ? en : fr);

    const prompt = `
You are a senior Shopify CRO/UX writer & UI designer. Generate a **high-converting Tailwind HTML block** (no <html>/<head>/<body>) for a product landing page.

LANGUAGE: ${language}
TONE OF VOICE: ${toneOfVoice} / ${targetTone}; audience: ${audience}; micro-variant: ${ab}
STRICT DESIGN RULES:
- Tailwind only (CDN already present). Use responsive classes (sm:, md:, lg:, xl:).
- Main brand color (HEX): ${mainColor || "#3B82F6"} → apply to CTA bg, key borders, underlines, accent headings using inline style="background-color: …" or style="color: …" or style="border-color: …".
- No JavaScript. No <script>. No <style> tag. No <html>/<head>/<body>.
- Mobile-first: perfect on 320–768px. Container: <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">.
- Hero layout: <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-center">.
- Cards grid: <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">.
- Images: <img class="w-full h-auto object-cover rounded-xl" />.
- Typography: titles scalable (text-xl sm:text-2xl lg:text-3xl xl:text-4xl), body (text-sm sm:text-base lg:text-lg). Generous padding & gaps.

PRODUCT CONTEXT:
- Title: ${productTitle}
${vendor ? `- Brand: ${vendor}` : ""}
${imageUrl ? `- Product image: ${imageUrl}` : ""}
${description ? `- Existing description: ${description}` : ""}
${customHighlights ? `- PRIORITY HIGHLIGHTS:\n${customHighlights}` : ""}

${visualAnalysis ? `VISION AI INSIGHTS:\n${visualAnalysis}` : ""}

STYLE GUIDE = ${style || "moderne"} → ${currentStyleGuide}

MUST-HAVE STRUCTURE (return only the HTML, respecting the order):

1) HERO
- H1 with main color (style="color: ${mainColor || "#3B82F6"}").
- Subheadline (${subhook}) mentioning ${vendor ? `"${vendor}" when relevant` : "comfort/design benefits"}.
- Product image (rounded-2xl shadow-xl) if available.
- Primary CTA (bg in main color) with microcopy "${ctaPrimary}".
- Secondary CTA as subtle link (e.g., ${loc("Découvrir les caractéristiques", "See specifications")}).

2) VALUE CARDS (3–6)
- Elegant monochrome SVG icons (text-gray-600/700) — **no colored emoji**.
- Short punchy titles + 20–30 word descriptions.
- Focus on real benefits (durability, comfort, space-saving, easy care, eco-friendly, etc.).

3) TECH SPECS / DIMENSIONS
- Pills/badges list + a two-column layout if content is long.
- If Vision AI is provided, weave materials/finish/style into copy.

4) USE-CASES / LIFESTYLE
- 3–4 scenarios showing real-life usage (e.g., small apartments, family life, modern office).
- Include one "pro tip" or setup advice.

5) CARE & MAINTENANCE
- Concise steps to clean/maintain (incl. material-specific tips from Vision AI if present).

6) SUSTAINABILITY / RESPONSIBILITY
- Materials origin / durability / repairability notions (no greenwashing; stay realistic).

7) BRAND STORY (if brand exists)
- 2–3 sentences about ${vendor || "the brand"} values & design philosophy.

8) SOCIAL PROOF (REVIEWS)
- Elegant block with 3 short review snippets (realistic tone) + a link "read all".
- **No stars emoji**, use badge/chips and neutral icons.

9) FAQ (5 items)
- Practical, objection-handling (delivery, returns, assembly, warranty, compatibility).

10) TRUST / DELIVERY / RETURNS
- 3–4 reassuring points (secure payment, shipping times, returns, support).

11) FINAL CTA
- Strong CTA (main color) + urgency/guarantee microcopy.

12) UPSELL / CROSS-SELL PLACEHOLDERS
- A small section titled ${loc("À compléter", "To complete the look")} with 3 cards placeholders.
- Each card uses data attributes for later hydration:
  <div data-cross-sell="1" data-handle="REPLACE_HANDLE" data-price="REPLACE_PRICE" ...>

ACCESSIBILITY:
- Use semantic headings (H1/H2/H3), alt text on images, adequate contrasts, focus states via Tailwind.

OUTPUT:
- Return ONLY the HTML block. No markdown. No explanations. No scripts. No inline CSS except color/border/background-color for the main color accents.

`.trim();

    // 🔄 Retry logic for temporary failures
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let lastError: Error | null = null;
    let finalHtml = "";
    let meta: { title?: string; description?: string } = {};
    let outline: string[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  "Tu es un expert UX/UI & CRO Shopify. Tu génères un HTML Tailwind propre, responsive, sans <script>/<style>, optimisé conversion.",
              },
              { role: "user", content: prompt },
              includeMeta
                ? {
                    role: "user",
                    content:
                      'Après le HTML, fournis **en plus** une ligne JSON unique commençant par META:: avec {"title":"...","description":"...","outline":[...]} (sans backticks).',
                  }
                : { role: "user", content: "" },
            ],
            max_tokens: 3200,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          // Permanent errors
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required for Lovable workspace." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Retry on 502/503/504
          if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
            continue;
          }
          return new Response(JSON.stringify({ error: `Lovable AI API error: ${response.status}`, detail: errText }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json().catch(() => null);
        let raw = data?.choices?.[0]?.message?.content?.trim() || "";

        if (!raw) {
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
            continue;
          }
          return new Response(
            JSON.stringify({
              error:
                language === "en"
                  ? "No content generated. Try a simpler prompt or a different style."
                  : "Aucun contenu généré. Essayez un prompt plus simple ou un style différent.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Si includeMeta: chercher la ligne META:: JSON en fin de sortie
        if (includeMeta) {
          const metaMatch = raw.match(/META::\s*(\{[\s\S]*\})\s*$/m);
          if (metaMatch) {
            try {
              const j = JSON.parse(metaMatch[1]);
              meta = { title: j?.title, description: j?.description };
              if (Array.isArray(j?.outline)) outline = j.outline.filter((x: any) => typeof x === "string");
              raw = raw.replace(metaMatch[0], "").trim();
            } catch {
              // ignore parsing errors, still return html
            }
          }
        }

        // Nettoyage/Sécurité
        raw = sanitizeHtmlUnsafe(raw);

        if (raw.length < 800) {
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
            continue;
          }
          return new Response(
            JSON.stringify({
              error:
                language === "en"
                  ? "Generated content too short. Please add more details."
                  : "Contenu généré trop court. Ajoutez plus de détails.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Validation basique
        if (/<(html|head|body)\b/i.test(raw)) {
          return new Response(
            JSON.stringify({
              error:
                language === "en"
                  ? "Output contains forbidden tags (<html>/<head>/<body>)."
                  : "Le HTML généré contient des balises interdites (<html>/<head>/<body>).",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        finalHtml = raw;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    if (!finalHtml) {
      return new Response(
        JSON.stringify({
          error:
            lastError?.message ||
            (language === "en" ? "Service temporarily unavailable." : "Service temporairement indisponible."),
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ✅ Success
    const payload = includeMeta ? { html: finalHtml, meta, outline } : { html: finalHtml };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
