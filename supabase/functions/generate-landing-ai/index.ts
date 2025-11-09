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

    // Get authenticated user
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

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

    if (!product_id)
      return new Response(JSON.stringify({ error: "Missing required field: product_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Fetch product data including handle and store domain
    console.log("📦 Fetching product data...");
    const [productRes, imagesRes, variantsRes, storeRes] = await Promise.all([
      supabaseAdmin.from("shopify_products").select("handle, shopify_product_id").eq("id", product_id).maybeSingle(),
      supabaseAdmin.from("product_images").select("src, alt_text").eq("product_id", product_id).order("position"),
      supabaseAdmin.from("product_variants").select("title, image_url, shopify_variant_id").eq("product_id", product_id),
      userId ? supabaseAdmin.from("shopify_connections").select("shop_domain").eq("seller_id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    
    const productHandle = productRes.data?.handle || "";
    const shopifyProductId = productRes.data?.shopify_product_id || "";
    const shopDomain = storeRes.data?.shop_domain || "";
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    
    console.log(`✅ Product data fetched: ${images.length} images, ${variants.length} variants, handle: ${productHandle}`);

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
              detectMeasurements: true, // Enable dimension/measurement detection
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

    // Build product URLs
    const productUrl = shopDomain && productHandle 
      ? `https://${shopDomain}/products/${productHandle}` 
      : "#";
    const variantButtons = variants.length > 0 && variants[0].shopify_variant_id
      ? variants.map(v => `data-variant-id="${v.shopify_variant_id}" data-product-id="${shopifyProductId}"`).join(" ")
      : "";
    
    const prompt =
      language === "en"
        ? `
You are a Shopify UX/UI expert and eCommerce copywriter specialized in high-converting landing pages.
Generate a **complete, professional Tailwind HTML landing page** with real functionality.

CRITICAL REQUIREMENTS:
1. **Specifications Section**: If Vision AI detected dimensions/measurements/specs, create a detailed "Technical Specifications" section with a table or grid layout
2. **Functional Buttons**: 
   - "View Product" button must link to: ${productUrl}
   - "Add to Cart" buttons must have: onclick="window.open('${productUrl}', '_blank')" 
   - All buttons must be clickable and functional
3. **Quality Content**: Write persuasive, professional copy (not generic placeholder text)
4. **Complete Sections**: Hero, Image Gallery, Vision AI Insights, Key Benefits, Technical Specs (if available), Care Instructions, Sustainability, Social Proof, FAQ, Strong CTA

Product Information:
- Title: ${productTitle}
- Brand: ${vendor}
- Description: ${description}
- Style: ${style}
- Main Color: ${mainColor}
- Layout Preference: ${layout}
- Content Length: ${length}
- Product URL: ${productUrl}

Images Available:
${imgs}

Variants Available:
${vars}

Vision AI Analysis:
${visualAnalysis}

Custom Highlights:
${customHighlights}

DESIGN CONSTRAINTS:
- Mobile-first responsive (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Responsive grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Primary color ${mainColor} for CTAs, headings, accents
- Modern shadows: shadow-lg, shadow-xl
- Smooth transitions: transition-all duration-300
- Professional typography with proper hierarchy
- No <script> or <style> tags
- Return ONLY the HTML content (no markdown wrappers)

BUTTON STRUCTURE EXAMPLE:
<a href="${productUrl}" target="_blank" rel="noopener" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  View Full Details
</a>

<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Add to Cart
</button>
`
        : `
Tu es un expert UX/UI Shopify et copywriter e-commerce spécialisé dans les landing pages à haute conversion.
Génère une **landing page HTML Tailwind complète et professionnelle** avec de vraies fonctionnalités.

EXIGENCES CRITIQUES:
1. **Section Caractéristiques**: Si la Vision AI a détecté des dimensions/mesures/specs, crée une section détaillée "Caractéristiques Techniques" avec tableau ou grille
2. **Boutons Fonctionnels**: 
   - Le bouton "Voir le Produit" doit pointer vers: ${productUrl}
   - Les boutons "Ajouter au Panier" doivent avoir: onclick="window.open('${productUrl}', '_blank')"
   - Tous les boutons doivent être cliquables et fonctionnels
3. **Contenu de Qualité**: Rédige un contenu persuasif et professionnel (pas de texte générique)
4. **Sections Complètes**: Hero, Galerie d'images, Insights Vision AI, Points Forts, Specs Techniques (si disponibles), Instructions d'Entretien, Durabilité, Preuves Sociales, FAQ, CTA Fort

Informations Produit:
- Titre: ${productTitle}
- Marque: ${vendor}
- Description: ${description}
- Style: ${style}
- Couleur Principale: ${mainColor}
- Disposition: ${layout}
- Longueur Contenu: ${length}
- URL Produit: ${productUrl}

Images Disponibles:
${imgs}

Variantes Disponibles:
${vars}

Analyse Vision AI:
${visualAnalysis}

Points Forts Personnalisés:
${customHighlights}

CONTRAINTES DESIGN:
- Responsive mobile-first (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grilles responsives: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Couleur primaire ${mainColor} pour CTAs, titres, accents
- Ombres modernes: shadow-lg, shadow-xl
- Transitions fluides: transition-all duration-300
- Typographie professionnelle avec hiérarchie claire
- Aucun tag <script> ou <style>
- Retourne UNIQUEMENT le contenu HTML (sans wrapper markdown)

STRUCTURE BOUTONS EXEMPLE:
<a href="${productUrl}" target="_blank" rel="noopener" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Voir Tous les Détails
</a>

<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Ajouter au Panier
</button>
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
                  ? "You are a professional Shopify landing page designer. You create beautiful, conversion-optimized HTML pages with real working buttons and links. You write persuasive copy and structure content for maximum engagement. Always include functional onclick handlers and href attributes for all buttons and links."
                  : "Tu es un designer professionnel de landing pages Shopify. Tu crées de belles pages HTML optimisées pour la conversion avec de vrais boutons et liens fonctionnels. Tu rédiges un contenu persuasif et structures l'information pour un engagement maximum. Inclus toujours des handlers onclick et attributs href fonctionnels pour tous les boutons et liens.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4500,
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

    // 💾 Sauvegarde dans product_landing_pages (only if user is authenticated)
    if (userId && product_id) {
      console.log("💾 Saving landing page to database...");
      
      // Désactiver les anciennes versions
      await supabaseAdmin
        .from("product_landing_pages")
        .update({ is_active: false })
        .eq("product_id", product_id)
        .eq("seller_id", userId);
      
      // Récupérer le numéro de version
      const { data: existingPages } = await supabaseAdmin
        .from("product_landing_pages")
        .select("version")
        .eq("product_id", product_id)
        .order("version", { ascending: false })
        .limit(1);
      
      const newVersion = existingPages && existingPages.length > 0 ? existingPages[0].version + 1 : 1;
      
      // Créer la nouvelle version
      const { error: saveError } = await supabaseAdmin
        .from("product_landing_pages")
        .insert({
          product_id: product_id,
          seller_id: userId,
          html_content: html,
          config: {
            language,
            vendor,
            image_url: imageUrl,
            description,
            content_length: length,
            style,
            layout,
            mainColor,
            customHighlights,
          },
          version: newVersion,
          is_active: true,
        });
      
      if (saveError) {
        console.error("❌ Save error:", saveError);
      } else {
        console.log(`✅ Landing page v${newVersion} saved successfully`);
      }
    } else {
      console.log("⚠️ Skipping save: userId or product_id not available");
    }

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
