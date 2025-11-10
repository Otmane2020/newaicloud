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
- Cas d'usage : ${usecases}`;
}

function buildEnrichedAttributes(product: any, language = "fr"): string {
  if (!product) return "";
  
  const sections = [];
  
  // Visual attributes
  if (product.ai_color || product.ai_material) {
    sections.push(language === "en" ? "\nVISUAL ATTRIBUTES (MUST DISPLAY IN HTML):" : "\nATTRIBUTS VISUELS (OBLIGATOIRE À AFFICHER):");
    if (product.ai_color) sections.push(`- ${language === "en" ? "Color" : "Couleur"}: ${product.ai_color}`);
    if (product.ai_material) sections.push(`- ${language === "en" ? "Material" : "Matériau"}: ${product.ai_material}`);
    if (product.ai_shape) sections.push(`- ${language === "en" ? "Shape" : "Forme"}: ${product.ai_shape}`);
    if (product.ai_texture) sections.push(`- ${language === "en" ? "Texture" : "Texture"}: ${product.ai_texture}`);
    if (product.ai_finish) sections.push(`- ${language === "en" ? "Finish" : "Finition"}: ${product.ai_finish}`);
    if (product.ai_pattern) sections.push(`- ${language === "en" ? "Pattern" : "Motif"}: ${product.ai_pattern}`);
  }
  
  // Dimensions - CRITICAL TO DISPLAY
  if (product.smart_length || product.smart_width || product.smart_height) {
    sections.push("\n" + (language === "en" ? "DIMENSIONS (MUST CREATE SPECS TABLE):" : "DIMENSIONS (CRÉER TABLEAU CARACTÉRISTIQUES):"));
    if (product.smart_length) 
      sections.push(`- ${language === "en" ? "Length" : "Longueur"}: ${product.smart_length} ${product.smart_length_unit || 'cm'}`);
    if (product.smart_width) 
      sections.push(`- ${language === "en" ? "Width" : "Largeur"}: ${product.smart_width} ${product.smart_width_unit || 'cm'}`);
    if (product.smart_height) 
      sections.push(`- ${language === "en" ? "Height" : "Hauteur"}: ${product.smart_height} ${product.smart_height_unit || 'cm'}`);
    if (product.smart_weight) 
      sections.push(`- ${language === "en" ? "Weight" : "Poids"}: ${product.smart_weight} ${product.smart_weight_unit || 'kg'}`);
    if (product.smart_diameter) 
      sections.push(`- ${language === "en" ? "Diameter" : "Diamètre"}: ${product.smart_diameter} ${product.smart_diameter_unit || 'cm'}`);
    if (product.smart_depth) 
      sections.push(`- ${language === "en" ? "Depth" : "Profondeur"}: ${product.smart_depth} ${product.smart_depth_unit || 'cm'}`);
    if (product.smart_seat_height) 
      sections.push(`- ${language === "en" ? "Seat height" : "Hauteur d'assise"}: ${product.smart_seat_height} ${product.smart_seat_height_unit || 'cm'}`);
  }
  
  // Advanced Vision AI analysis
  if (product.ai_vision_analysis) {
    sections.push("\n" + (language === "en" ? "DETAILED ANALYSIS (USE IN DESCRIPTION):" : "ANALYSE DÉTAILLÉE (UTILISER DANS DESCRIPTION):"));
    sections.push(product.ai_vision_analysis);
    if (product.ai_craftsmanship_level) 
      sections.push(`- ${language === "en" ? "Craftsmanship" : "Artisanat"}: ${product.ai_craftsmanship_level}`);
    if (product.ai_presentation_quality) 
      sections.push(`- ${language === "en" ? "Quality" : "Qualité"}: ${product.ai_presentation_quality}/10`);
  }
  
  // Categorization
  if (product.category || product.style || product.room) {
    sections.push("\n" + (language === "en" ? "CATEGORY & CONTEXT:" : "CATÉGORIE & CONTEXTE:"));
    if (product.category) sections.push(`- ${language === "en" ? "Category" : "Catégorie"}: ${product.category}`);
    if (product.sub_category) sections.push(`- ${language === "en" ? "Type" : "Type"}: ${product.sub_category}`);
    if (product.style) sections.push(`- Style: ${product.style}`);
    if (product.room) sections.push(`- ${language === "en" ? "Room" : "Pièce"}: ${product.room}`);
    if (product.functionality) sections.push(`- ${language === "en" ? "Function" : "Fonction"}: ${product.functionality}`);
  }
  
  return sections.join("\n");
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Fetch images + variants + enriched product data in parallel
    console.log("📦 Fetching product data...");
    const [imagesRes, variantsRes, productDataRes] = await Promise.all([
      supabaseAdmin.from("product_images").select("src, alt_text").eq("product_id", product_id).order("position"),
      supabaseAdmin.from("product_variants").select("title, image_url").eq("product_id", product_id),
      supabaseAdmin.from("shopify_products").select(`
        ai_color, ai_material, ai_shape, ai_texture, ai_pattern, ai_finish, ai_design_elements,
        ai_vision_analysis, ai_presentation_quality, ai_craftsmanship_level, 
        ai_lighting_type, ai_background_style, ai_condition_notes,
        smart_length, smart_length_unit, smart_width, smart_width_unit,
        smart_height, smart_height_unit, smart_diameter, smart_diameter_unit,
        smart_depth, smart_depth_unit, smart_weight, smart_weight_unit,
        smart_seat_height, smart_seat_height_unit,
        category, sub_category, style, room, functionality, characteristics
      `).eq("id", product_id).single()
    ]);
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    const productData = productDataRes.data;
    console.log(`✅ Product data fetched: ${images.length} images, ${variants.length} variants, enriched: ${!!productData}`);

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

    // Build layout-specific instructions
    const layoutInstructions = layout === "minimal" 
      ? (language === "en" 
        ? "Layout: MINIMAL - Hero + Gallery + Specs table + CTA only. Keep it clean and focused."
        : "Layout: MINIMAL - Hero + Galerie + Tableau specs + CTA uniquement. Simple et épuré.")
      : layout === "detailed"
      ? (language === "en"
        ? "Layout: DETAILED - Include all sections with rich content, multiple feature cards, detailed specs."
        : "Layout: DETAILED - Inclure toutes les sections avec contenu riche, cartes de fonctionnalités, specs détaillées.")
      : layout === "premium"
      ? (language === "en"
        ? "Layout: PREMIUM - Luxury feel with elegant spacing, premium materials section, craftsmanship details, sustainability story."
        : "Layout: PREMIUM - Ambiance luxe avec espacement élégant, section matériaux premium, détails artisanat, histoire durabilité.")
      : (language === "en"
        ? "Layout: STANDARD - Hero, Gallery, Key Benefits, Specs, FAQ, CTA."
        : "Layout: STANDARD - Hero, Galerie, Points forts, Caractéristiques, FAQ, CTA.");

    const styleAdaptation = style
      ? (language === "en"
        ? `\nDesign Style: Adapt the tone and visual style to match "${style}" aesthetic (typography, spacing, color accents).`
        : `\nStyle Design: Adapter le ton et le style visuel pour correspondre à l'esthétique "${style}" (typographie, espacement, accents couleur).`)
      : "";

    const prompt =
      language === "en"
        ? `You are a Shopify UX/UI expert and eCommerce copywriter.

**CRITICAL MOBILE-FIRST REQUIREMENT:**
- Start with mobile base styles (no breakpoint prefix)
- Add tablet styles with sm: prefix
- Add desktop styles with md: and lg: prefixes
- Test on 375px width first, then scale up
- Use responsive text: text-2xl sm:text-3xl md:text-4xl
- Mobile padding: px-4, Desktop padding: sm:px-6 lg:px-8

Product: ${productTitle}
Brand: ${vendor}
Description: ${description}
Main Color: ${mainColor}
${layoutInstructions}${styleAdaptation}
Content Length: ${length === "short" ? "Concise, punchy" : length === "long" ? "Detailed, comprehensive" : "Balanced"}

Images Available:
${imgs}

Product Variants:
${vars}

${visualAnalysis ? `Vision AI Analysis:\n${visualAnalysis}\n` : ""}

Custom Highlights:
${customHighlights || "None provided - use product attributes"}

${buildEnrichedAttributes(productData, language)}

**MANDATORY SECTIONS TO INCLUDE:**

1. **Hero Section** (mobile-optimized)
   - Product title: text-3xl sm:text-4xl md:text-5xl font-bold
   - Subtitle with key benefit
   - Price and CTA button
   - Hero image: w-full h-64 sm:h-80 md:h-96 object-cover

2. **Image Gallery** (swipeable on mobile)
   - Grid: grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4
   - Images from the list above

3. **Key Features/Benefits Cards**
   - Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
   - Use AI attributes (color, material, style, mood, finishes)
   - Icon + Title + Description per card

4. **SPECIFICATIONS TABLE** (MANDATORY IF DIMENSIONS EXIST)
   - Responsive table: block sm:table
   - Display ALL dimensions provided above
   - 2-column layout on mobile, full table on desktop

5. **Materials & Craftsmanship** (if available)
   - Use ai_material, ai_finish, ai_craftsmanship_level
   - Quality score if provided

6. **FAQ Section** (accordion on mobile)
   - 4-6 common questions based on product type
   - Collapsible on mobile

7. **Final CTA**
   - Sticky button on mobile: fixed bottom-0 w-full
   - Use ${mainColor} for button background

**Styling Rules:**
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Section spacing: space-y-8 sm:space-y-12 md:space-y-16
- Card padding: p-4 sm:p-6
- Button: px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg
- NO <script>, NO <style> tags
- Use ${mainColor} for primary elements

Return ONLY the HTML code, nothing else.`
        : `Tu es un expert UX/UI Shopify et copywriter e-commerce.

**EXIGENCE CRITIQUE MOBILE-FIRST:**
- Commence avec styles mobile de base (sans préfixe breakpoint)
- Ajoute styles tablette avec préfixe sm:
- Ajoute styles desktop avec préfixes md: et lg:
- Teste sur largeur 375px d'abord, puis agrandit
- Texte responsive: text-2xl sm:text-3xl md:text-4xl
- Padding mobile: px-4, Desktop: sm:px-6 lg:px-8

Produit : ${productTitle}
Marque : ${vendor}
Description : ${description}
Couleur Principale : ${mainColor}
${layoutInstructions}${styleAdaptation}
Longueur Contenu : ${length === "short" ? "Concis, percutant" : length === "long" ? "Détaillé, complet" : "Équilibré"}

Images Disponibles :
${imgs}

Variantes Produit :
${vars}

${visualAnalysis ? `Analyse Vision AI :\n${visualAnalysis}\n` : ""}

Points Forts Personnalisés :
${customHighlights || "Aucun fourni - utiliser les attributs produit"}

${buildEnrichedAttributes(productData, language)}

**SECTIONS OBLIGATOIRES À INCLURE :**

1. **Section Hero** (optimisée mobile)
   - Titre produit : text-3xl sm:text-4xl md:text-5xl font-bold
   - Sous-titre avec bénéfice clé
   - Prix et bouton CTA
   - Image hero : w-full h-64 sm:h-80 md:h-96 object-cover

2. **Galerie Images** (swipe mobile)
   - Grille : grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4
   - Images de la liste ci-dessus

3. **Cartes Caractéristiques/Bénéfices**
   - Grille : grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
   - Utiliser attributs AI (couleur, matériau, style, ambiance, finitions)
   - Icône + Titre + Description par carte

4. **TABLEAU SPÉCIFICATIONS** (OBLIGATOIRE SI DIMENSIONS EXISTENT)
   - Table responsive : block sm:table
   - Afficher TOUTES les dimensions fournies ci-dessus
   - Layout 2 colonnes mobile, table complète desktop

5. **Matériaux & Artisanat** (si disponible)
   - Utiliser ai_material, ai_finish, ai_craftsmanship_level
   - Score qualité si fourni

6. **Section FAQ** (accordéon mobile)
   - 4-6 questions courantes selon type produit
   - Pliable sur mobile

7. **CTA Final**
   - Bouton sticky mobile : fixed bottom-0 w-full
   - Utiliser ${mainColor} pour fond bouton

**Règles Styling :**
- Container : max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Espacement sections : space-y-8 sm:space-y-12 md:space-y-16
- Padding cartes : p-4 sm:p-6
- Bouton : px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg
- AUCUN <script>, AUCUN <style>
- Utiliser ${mainColor} pour éléments primaires

Retourne UNIQUEMENT le code HTML, rien d'autre.`;

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
