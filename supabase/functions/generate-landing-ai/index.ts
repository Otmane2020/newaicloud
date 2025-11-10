import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        
        const { data: limitsCheck, error: limitsError } = await supabaseAdmin.functions.invoke(
          'check-usage-limits',
          { headers: { Authorization: authHeader } }
        );
        
        if (limitsError || !limitsCheck?.canUseOptimizations) {
          return new Response(
            JSON.stringify({ 
              error: 'LIMIT_REACHED',
              message: 'Limite d\'optimisations atteinte.',
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: 5
        });
      }
    }

    const body = await req.json();
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style = "moderne",
      mainColor = "#3B82F6",
      layout = "grid",
      customHighlights,
      language = "fr",
    } = body ?? {};

    if (!productTitle || !product_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // 1. ENRICH PRODUCT
    console.log("🔧 Enriching product...");
    await supabaseAdmin.functions.invoke("enrich-product", { body: { productId: product_id } });

    // 2. FETCH DATA
    console.log("📦 Fetching data...");
    const [productRes, imagesRes, variantsRes, storeRes] = await Promise.all([
      supabaseAdmin.from("shopify_products").select("*").eq("id", product_id).single(),
      supabaseAdmin.from("product_images").select("src, alt_text").eq("product_id", product_id).order("position"),
      supabaseAdmin.from("product_variants").select("title, price").eq("product_id", product_id),
      userId ? supabaseAdmin.from("shopify_connections").select("shop_domain").eq("seller_id", userId).single() : Promise.resolve({ data: null }),
    ]);
    
    const enriched = productRes.data || {};
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    const shopDomain = storeRes.data?.shop_domain || "";
    const productHandle = enriched.handle || "";
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    // 3. BUILD ATTRIBUTES
    const attrs = [];
    if (enriched.ai_color) attrs.push(`Couleur: ${enriched.ai_color}`);
    if (enriched.ai_material) attrs.push(`Matériau: ${enriched.ai_material}`);
    if (enriched.ai_shape) attrs.push(`Forme: ${enriched.ai_shape}`);
    if (enriched.ai_texture) attrs.push(`Texture: ${enriched.ai_texture}`);
    if (enriched.ai_finish) attrs.push(`Finition: ${enriched.ai_finish}`);
    if (enriched.category) attrs.push(`Catégorie: ${enriched.category}`);
    if (enriched.style) attrs.push(`Style: ${enriched.style}`);
    if (enriched.room) attrs.push(`Pièce: ${enriched.room}`);
    
    const dims = [];
    if (enriched.smart_length) dims.push(`L ${enriched.smart_length}${enriched.smart_length_unit || ""}`);
    if (enriched.smart_width) dims.push(`l ${enriched.smart_width}${enriched.smart_width_unit || ""}`);
    if (enriched.smart_height) dims.push(`H ${enriched.smart_height}${enriched.smart_height_unit || ""}`);
    if (enriched.smart_weight) dims.push(`Poids ${enriched.smart_weight}${enriched.smart_weight_unit || ""}`);

    // 4. STYLE CONFIG
    const styleGuides: Record<string, string> = {
      'moderne': 'Design épuré, gradients subtils, ombres douces, coins arrondis, espacements généreux',
      'minimaliste': 'Espace blanc, typographie épurée, lignes nettes, palette limitée',
      'scandinave': 'Tons naturels, textures organiques, simplicité fonctionnelle, ambiance chaleureuse',
      'premium': 'Contrastes élégants, typographie serif, ombres profondes, détails raffinés',
      'industriel': 'Textures brutes, tons neutres sombres, typographie bold',
      'nature': 'Tons verts terreux, textures organiques, design fluide'
    };
    const styleGuide = styleGuides[style] || styleGuides['moderne'];

    // 5. BUILD PROMPT
    const prompt = language === "en"
      ? `Create a HIGH-QUALITY product landing page with premium design.

PRODUCT:
- Title: ${productTitle}
${vendor ? `- Brand: ${vendor}` : ""}
${description ? `- Description: ${description}` : ""}
${attrs.length > 0 ? `\nATTRIBUTES:\n${attrs.join('\n')}` : ""}
${dims.length > 0 ? `\nDIMENSIONS: ${dims.join(' × ')}` : ""}
${customHighlights ? `\nKEY POINTS:\n${customHighlights}` : ""}

IMAGES (${images.length}):
${images.map((img: any) => `- ${img.src}`).join('\n')}

VARIANTS (${variants.length}):
${variants.map((v: any) => `- ${v.title}${v.price ? ` - $${v.price}` : ''}`).join('\n')}

DESIGN:
- Style: ${style} → ${styleGuide}
- Color: ${mainColor} (buttons, accents)
- Layout: ${layout}
- Product Link: ${productUrl}

SECTIONS:
1. HERO - headline, subheadline, image, CTA to ${productUrl}
2. FEATURES - 3-4 benefits with icons
3. GALLERY - ${images.length} images in ${layout}
4. SPECS - dimensions, materials
5. VARIANTS - ${variants.length} options with prices
6. TRUST - shipping, returns badges

DESIGN RULES:
- Mobile-first Tailwind CSS
- max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Buttons use ${mainColor}
- No <script> or <style>
- Clean HTML for Shopify

Return ONLY HTML.`
      : `Crée une LANDING PAGE PREMIUM de haute qualité.

PRODUIT:
- Titre: ${productTitle}
${vendor ? `- Marque: ${vendor}` : ""}
${description ? `- Description: ${description}` : ""}
${attrs.length > 0 ? `\nATTRIBUTS:\n${attrs.join('\n')}` : ""}
${dims.length > 0 ? `\nDIMENSIONS: ${dims.join(' × ')}` : ""}
${customHighlights ? `\nPOINTS CLÉS:\n${customHighlights}` : ""}

IMAGES (${images.length}):
${images.map((img: any) => `- ${img.src}`).join('\n')}

VARIANTES (${variants.length}):
${variants.map((v: any) => `- ${v.title}${v.price ? ` - ${v.price}€` : ''}`).join('\n')}

DESIGN:
- Style: ${style} → ${styleGuide}
- Couleur: ${mainColor} (boutons, accents)
- Layout: ${layout}
- Lien Produit: ${productUrl}

SECTIONS:
1. HERO - titre, sous-titre, image, CTA vers ${productUrl}
2. CARACTÉRISTIQUES - 3-4 avantages avec icônes
3. GALERIE - ${images.length} images en ${layout}
4. SPÉCIFICATIONS - dimensions, matériaux
5. VARIANTES - ${variants.length} options avec prix
6. CONFIANCE - badges livraison, retour

RÈGLES DESIGN:
- Mobile-first Tailwind CSS
- max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Boutons utilisent ${mainColor}
- Pas de <script> ou <style>
- HTML propre pour Shopify

Retourne UNIQUEMENT du HTML.`;

    // 6. GENERATE WITH AI
    console.log("🤖 Generating...");
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
            content: language === "en"
              ? "You are a professional Shopify landing page designer. Create beautiful, mobile-first HTML with conversion-optimized design."
              : "Tu es un designer expert de landing pages Shopify. Crée du HTML mobile-first avec un design optimisé pour la conversion.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4500,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("API error:", response.status, errText);
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let html = data?.choices?.[0]?.message?.content?.trim() || "";
    
    if (!html) {
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean HTML
    html = html
      .replace(/^\s*```(?:html)?/gi, "")
      .replace(/```\s*$/g, "")
      .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
      .trim();

    // Ensure responsive wrapper
    if (!html.includes('max-w-') && !html.includes('mx-auto')) {
      html = `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">${html}</div>`;
    }

    console.log("✅ Generated, length:", html.length);

    // 7. SAVE TO DATABASE
    if (userId && product_id) {
      console.log("💾 Saving...");
      
      // Update shopify_products description
      await supabaseAdmin
        .from("shopify_products")
        .update({ 
          description: html,
          title: productTitle,
          updated_at: new Date().toISOString()
        })
        .eq("id", product_id);

      // Save to product_landing_pages
      await supabaseAdmin
        .from("product_landing_pages")
        .update({ is_active: false })
        .eq("product_id", product_id)
        .eq("seller_id", userId);
      
      const { data: existingPages } = await supabaseAdmin
        .from("product_landing_pages")
        .select("version")
        .eq("product_id", product_id)
        .order("version", { ascending: false })
        .limit(1);
      
      const newVersion = existingPages && existingPages.length > 0 ? existingPages[0].version + 1 : 1;
      
      await supabaseAdmin
        .from("product_landing_pages")
        .insert({
          product_id,
          seller_id: userId,
          html_content: html,
          config: {
            language,
            vendor,
            style,
            layout,
            mainColor,
            customHighlights,
            attributes_count: attrs.length,
            images_count: images.length,
            variants_count: variants.length,
          },
          version: newVersion,
          is_active: true,
        });
      
      console.log(`✅ Saved (v${newVersion})`);
    }

    return new Response(JSON.stringify({ 
      html,
      attributes_count: attrs.length,
      images_count: images.length,
      variants_count: variants.length,
    }), {
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