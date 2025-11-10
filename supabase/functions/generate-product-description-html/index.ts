import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) userId = user.id;
    }

    const {
      product_id,
      title,
      existingDescription,
      images,
      visionAnalysis,
      dimensions,
      template = "ecommerce",
      variants,
      vendor,
      style,
      mainColor = "#3B82F6",
      layout = "grid",
      contentLength = "medium",
      customHighlights,
      language = "fr",
    } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product description for:", title);

    // Récupérer les données complètes du produit
    let enrichedData: any = null;
    let productImages: any[] = [];
    let productVariants: any[] = [];
    let shopDomain = "";
    let productHandle = "";

    if (product_id) {
      console.log("📦 Fetching complete product data from database...");

      // Récupérer les données du produit
      const { data: productData } = await supabaseAdmin
        .from("shopify_products")
        .select(
          `
          *,
          product_images (src, alt_text, position, width, height),
          product_variants (title, image_url, shopify_variant_id, price, sku)
        `,
        )
        .eq("id", product_id)
        .single();

      if (productData) {
        enrichedData = productData;
        productImages = productData.product_images || [];
        productVariants = productData.product_variants || [];
        productHandle = productData.handle || "";
        console.log("✅ Product data loaded:", {
          images: productImages.length,
          variants: productVariants.length,
          handle: productHandle,
        });
      }

      // Récupérer le domaine de la boutique
      if (userId) {
        const { data: storeData } = await supabaseAdmin
          .from("shopify_connections")
          .select("shop_domain")
          .eq("seller_id", userId)
          .single();

        shopDomain = storeData?.shop_domain || "";
      }
    }

    // Utiliser les données fournies en priorité, sinon les données de la BDD
    const finalImages = images?.length ? images : productImages;
    const finalVariants = variants?.length ? variants : productVariants;
    const finalVendor = vendor || enrichedData?.vendor || "";

    console.log("📊 Final data:", {
      images: finalImages.length,
      variants: finalVariants.length,
      vendor: finalVendor,
      style,
      layout,
      contentLength,
      hasCustomHighlights: !!customHighlights,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Construire le contexte enrichi
    const buildEnrichedContext = () => {
      if (!enrichedData) return "";

      const sections = [];

      // Attributs visuels
      if (enrichedData.ai_color || enrichedData.ai_material) {
        sections.push("\n🎨 ATTRIBUTS VISUELS:");
        if (enrichedData.ai_color) sections.push(`- Couleur dominante: ${enrichedData.ai_color}`);
        if (enrichedData.ai_material) sections.push(`- Matériau principal: ${enrichedData.ai_material}`);
        if (enrichedData.ai_shape) sections.push(`- Forme: ${enrichedData.ai_shape}`);
        if (enrichedData.ai_texture) sections.push(`- Texture: ${enrichedData.ai_texture}`);
        if (enrichedData.ai_finish) sections.push(`- Finition: ${enrichedData.ai_finish}`);
        if (enrichedData.ai_pattern) sections.push(`- Motif: ${enrichedData.ai_pattern}`);
      }

      // Dimensions complètes
      if (enrichedData.smart_length || enrichedData.smart_width || enrichedData.smart_height) {
        sections.push("\n📐 DIMENSIONS PRÉCISES:");
        if (enrichedData.smart_length)
          sections.push(`- Longueur: ${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}`);
        if (enrichedData.smart_width)
          sections.push(`- Largeur: ${enrichedData.smart_width} ${enrichedData.smart_width_unit || "cm"}`);
        if (enrichedData.smart_height)
          sections.push(`- Hauteur: ${enrichedData.smart_height} ${enrichedData.smart_height_unit || "cm"}`);
        if (enrichedData.smart_weight)
          sections.push(`- Poids: ${enrichedData.smart_weight} ${enrichedData.smart_weight_unit || "kg"}`);
        if (enrichedData.smart_diameter)
          sections.push(`- Diamètre: ${enrichedData.smart_diameter} ${enrichedData.smart_diameter_unit || "cm"}`);
      }

      // Contexte produit
      if (enrichedData.category || enrichedData.style) {
        sections.push("\n🏷️ CONTEXTE PRODUIT:");
        if (enrichedData.category) sections.push(`- Catégorie: ${enrichedData.category}`);
        if (enrichedData.sub_category) sections.push(`- Sous-catégorie: ${enrichedData.sub_category}`);
        if (enrichedData.style) sections.push(`- Style: ${enrichedData.style}`);
        if (enrichedData.room) sections.push(`- Pièce recommandée: ${enrichedData.room}`);
        if (enrichedData.functionality) sections.push(`- Fonctionnalité: ${enrichedData.functionality}`);
      }

      return sections.join("\n");
    };

    // 🔹 PROMPT CORRIGÉ POUR DESCRIPTION PRODUIT SIMPLE
    const prompt =
      language === "en"
        ? `
You are an expert Shopify product description writer. Create a CLEAN, PROFESSIONAL HTML product description that will be inserted into Shopify's description field.

🚫 IMPORTANT: This is a PRODUCT DESCRIPTION only. NO prices, NO "Add to Cart" buttons, NO e-commerce functionality.

📦 PRODUCT DATA:
- Title: ${title}
${finalVendor ? `- Brand: ${finalVendor}` : ""}
${existingDescription ? `- Existing Description: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 KEY FEATURES:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 IMAGES (${finalImages.length} available):
${finalImages.map((img: any, index: number) => `- ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 VISION ANALYSIS:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

🎨 DESIGN REQUIREMENTS:
- Clean, professional appearance
- Simple responsive layout
- Use color ${mainColor} for headings and accents
- Focus on readability and content presentation
- Mobile-friendly design

📱 SIMPLE RESPONSIVE STRUCTURE:

1. PRODUCT INTRODUCTION
   - Clean heading with product name
   - Brief compelling description
   - Focus on main benefits

2. VISUAL FEATURES
   ${
     enrichedData.ai_color || enrichedData.ai_material
       ? `
   - Highlight key visual attributes
   - Simple badge-style presentation
   `
       : ""
   }

3. IMAGE GALLERY
   - Display all ${finalImages.length} images
   - Simple grid: grid-cols-2 md:grid-cols-3 gap-4
   - Clean image presentation

4. TECHNICAL SPECIFICATIONS
   ${
     enrichedData.smart_length || enrichedData.smart_width
       ? `
   - Clean specifications table
   - Simple two-column layout
   - Include all available dimensions
   `
       : ""
   }

5. MATERIALS & CRAFTSMANSHIP
   ${
     enrichedData.ai_material || enrichedData.ai_finish
       ? `
   - Detail materials and quality
   - Focus on durability and construction
   `
       : ""
   }

6. USAGE & BENEFITS
   - Practical applications
   - Customer benefits
   - Simple bullet points

🎨 SIMPLE TAILWIND CLASSES:
- Container: max-w-4xl mx-auto px-4
- Grid: grid-cols-2 md:grid-cols-3 gap-4
- Text: text-base md:text-lg
- Colors: text-[${mainColor}] for accents
- Spacing: my-6, py-4, etc.

🚫 STRICTLY PROHIBITED:
- NO "Add to Cart" buttons
- NO pricing information
- NO checkout functionality
- NO complex JavaScript
- NO external stylesheets
- NO iframes or embedded content

✅ REQUIRED OUTPUT:
- Pure HTML with simple Tailwind classes
- Clean, semantic structure
- Mobile-responsive design
- Professional product presentation
- All images from provided list
- Comprehensive product information

Example image grid:
<div class="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-auto rounded-lg shadow-sm" loading="lazy">`).join("\n  ")}
</div>

Example specifications:
<div class="bg-gray-50 rounded-lg p-6 my-8">
  <h3 class="text-xl font-semibold mb-4 text-[${mainColor}]">Technical Specifications</h3>
  <div class="space-y-2">
    ${enrichedData.smart_length ? `<div class="flex justify-between py-2 border-b"><span>Length</span><span>${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span></div>` : ""}
    ${enrichedData.smart_width ? `<div class="flex justify-between py-2 border-b"><span>Width</span><span>${enrichedData.smart_width} ${enrichedData.smart_width_unit || "cm"}</span></div>` : ""}
    ${enrichedData.smart_height ? `<div class="flex justify-between py-2 border-b"><span>Height</span><span>${enrichedData.smart_height} ${enrichedData.smart_height_unit || "cm"}</span></div>` : ""}
  </div>
</div>

Return ONLY clean HTML without markdown or code blocks.
`
        : `
Tu es un expert en rédaction de descriptions produit Shopify. Crée une DESCRIPTION DE PRODUIT HTML PROPRE et PROFESSIONNELLE qui sera insérée dans le champ description de Shopify.

🚫 IMPORTANT: Ceci est une DESCRIPTION DE PRODUIT uniquement. PAS de prix, PAS de boutons "Ajouter au Panier", PAS de fonctionnalité e-commerce.

📦 DONNÉES PRODUIT:
- Titre: ${title}
${finalVendor ? `- Marque: ${finalVendor}` : ""}
${existingDescription ? `- Description existante: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 CARACTÉRISTIQUES PRINCIPALES:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 IMAGES (${finalImages.length} disponibles):
${finalImages.map((img: any, index: number) => `- ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 ANALYSE VISION AI:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

🎨 EXIGENCES DESIGN:
- Apparence propre et professionnelle
- Layout responsive simple
- Utiliser la couleur ${mainColor} pour titres et accents
- Focus sur la lisibilité et présentation du contenu
- Design mobile-friendly

📱 STRUCTURE RESPONSIVE SIMPLE:

1. INTRODUCTION PRODUIT
   - Titre propre avec nom du produit
   - Description brève et convaincante
   - Focus sur bénéfices principaux

2. CARACTÉRISTIQUES VISUELLES
   ${
     enrichedData.ai_color || enrichedData.ai_material
       ? `
   - Met en avant attributs visuels clés
   - Présentation style badges simple
   `
       : ""
   }

3. GALERIE IMAGES
   - Afficher les ${finalImages.length} images
   - Grille simple: grid-cols-2 md:grid-cols-3 gap-4
   - Présentation image propre

4. CARACTÉRISTIQUES TECHNIQUES
   ${
     enrichedData.smart_length || enrichedData.smart_width
       ? `
   - Tableau spécifications propre
   - Layout deux colonnes simple
   - Inclure toutes dimensions disponibles
   `
       : ""
   }

5. MATÉRIAUX & QUALITÉ
   ${
     enrichedData.ai_material || enrichedData.ai_finish
       ? `
   - Détail matériaux et qualité
   - Focus sur durabilité et construction
   `
       : ""
   }

6. UTILISATION & AVANTAGES
   - Applications pratiques
   - Bénéfices clients
   - Points simples sous forme liste

🎨 CLASSES TAILWIND SIMPLES:
- Container: max-w-4xl mx-auto px-4
- Grille: grid-cols-2 md:grid-cols-3 gap-4
- Texte: text-base md:text-lg
- Couleurs: text-[${mainColor}] pour accents
- Espacement: my-6, py-4, etc.

🚫 STRICTEMENT INTERDIT:
- PAS de boutons "Ajouter au Panier"
- PAS d'informations de prix
- PAS de fonctionnalité checkout
- PAS de JavaScript complexe
- PAS de feuilles de style externes
- PAS d'iframes ou contenu embarqué

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind simples
- Structure sémantique propre
- Design responsive mobile
- Présentation produit professionnelle
- Toutes images de la liste fournie
- Informations produit complètes

Exemple grille images:
<div class="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-auto rounded-lg shadow-sm" loading="lazy">`).join("\n  ")}
</div>

Exemple spécifications:
<div class="bg-gray-50 rounded-lg p-6 my-8">
  <h3 class="text-xl font-semibold mb-4 text-[${mainColor}]">Caractéristiques Techniques</h3>
  <div class="space-y-2">
    ${enrichedData.smart_length ? `<div class="flex justify-between py-2 border-b"><span>Longueur</span><span>${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span></div>` : ""}
    ${enrichedData.smart_width ? `<div class="flex justify-between py-2 border-b"><span>Largeur</span><span>${enrichedData.smart_width} ${enrichedData.smart_width_unit || "cm"}</span></div>` : ""}
    ${enrichedData.smart_height ? `<div class="flex justify-between py-2 border-b"><span>Hauteur</span><span>${enrichedData.smart_height} ${enrichedData.smart_height_unit || "cm"}</span></div>` : ""}
  </div>
</div>

Retourne UNIQUEMENT du HTML propre sans markdown ou blocs de code.
`;

    // 🔹 Appel Lovable AI avec modèle GPT-4
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4", // ✅ Changement vers GPT-4
        messages: [
          {
            role: "system",
            content:
              language === "en"
                ? "You are a professional Shopify product description writer. You create clean, professional HTML product descriptions using simple Tailwind CSS. You focus on presenting product information clearly without any e-commerce functionality. No prices, no add to cart buttons, just beautiful product presentation that works well in Shopify's description field."
                : "Tu es un rédacteur professionnel de descriptions produit Shopify. Tu crées des descriptions de produit HTML propres et professionnelles avec Tailwind CSS simple. Tu te concentres sur la présentation claire des informations produit sans aucune fonctionnalité e-commerce. Pas de prix, pas de boutons ajouter au panier, juste une belle présentation produit qui fonctionne bien dans le champ description de Shopify.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("No content generated by AI");

    // Nettoyage du contenu
    content = content
      .replace(/```(?:json|html)?/g, "")
      .replace(/^[\s\S]*?<html>/i, "")
      .replace(/<\/html>[\s\S]*$/i, "")
      .trim();

    console.log("✅ Product description generated successfully");

    // Métriques
    const mediaCount = finalImages.length;
    const variantCount = finalVariants.length;
    const wordCount = content.split(/\s+/).length;

    return new Response(
      JSON.stringify({
        success: true,
        htmlLandingPage: content,
        optimizedTitle: title,
        mediaCount,
        variantCount,
        mobileOptimized: true,
        wordCount,
        config: {
          style,
          layout,
          mainColor,
          contentLength,
          language,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error generating product description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
