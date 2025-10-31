import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get campaign data with all relations
    const { data: campaign, error: campaignError } = await supabase
      .from("ads_campaigns")
      .select(`
        *,
        ads_campaign_collections(
          collection:shopify_collections(
            id,
            title,
            body_html,
            handle,
            image_url,
            image_alt,
            seo_title,
            seo_description
          )
        ),
        ads_campaign_products(
          product:shopify_products(
            id,
            title,
            description,
            optimized_title,
            optimized_description,
            price,
            compare_at_price,
            currency,
            image_url,
            handle,
            vendor,
            product_type,
            tags,
            seo_title,
            seo_description,
            category,
            sub_category,
            style,
            room,
            functionality,
            characteristics,
            ai_vision_analysis,
            ai_color,
            ai_material,
            ai_texture,
            ai_pattern,
            ai_finish,
            ai_shape
          )
        )
      `)
      .eq("id", campaignId)
      .single();
    
    if (campaignError) throw campaignError;
    
    // Get product images and variants
    const productIds = campaign.ads_campaign_products?.map((p: any) => p.product?.id).filter(Boolean) || [];
    
    let productImages: any[] = [];
    let productVariants: any[] = [];
    
    if (productIds.length > 0) {
      const [imagesResult, variantsResult] = await Promise.all([
        supabase.from("product_images").select("*").in("product_id", productIds).order("position"),
        supabase.from("product_variants").select("*").in("product_id", productIds)
      ]);
      
      productImages = imagesResult.data || [];
      productVariants = variantsResult.data || [];
    }

    // Prepare products data with enhanced info
    const products = campaign.ads_campaign_products?.map((p: any) => {
      const product = p.product;
      const discount = product.compare_at_price 
        ? Math.round((1 - product.price / product.compare_at_price) * 100)
        : null;

      return {
        ...product,
        discount,
        discount_amount: product.compare_at_price ? (product.compare_at_price - product.price) : null,
        images: productImages.filter((img: any) => img.product_id === product.id),
        variants: productVariants.filter((v: any) => v.product_id === product.id),
        main_image: product.image_url || (productImages.find((img: any) => img.product_id === product.id)?.src),
        has_multiple_images: productImages.filter((img: any) => img.product_id === product.id).length > 1
      };
    }) || [];

    // 🎯 PROMPT ULTRA-OPTIMISÉ - LANDING PAGE PRODUITS UNIQUE
    const prompt = `
# 🎨 MISSION : Créer une LANDING PAGE PRODUITS "GALERIE D'ART" - ZERO TEMPLATE SHOPIFY

## 🚫 STYLES STRICTEMENT INTERDITS :
- ❌ Gallery carousel horizontal basique
- ❌ Layout "Image gauche / infos droite" 
- ❌ Section description textuelle ennuyeuse
- ❌ Boutons "Add to Cart" standards
- ❌ Grid produits symétrique générique
- ❌ Fiches produits identiques
- ❌ Design template e-commerce

## ✅ STYLE OBLIGATOIRE : "GALERIE D'ART MODERNE"
- 🎭 Chaque produit = œuvre d'art unique
- 🖼️ Mise en page asymétrique et organique
- ✨ Expérience immersive et sensorielle
- 🎪 Design editorial haut de gamme

## 🏗️ ARCHITECTURE INNOVANTE :

### 1. HERO "IMMERSIF" 
- Background : Video loop produit en situation réelle OU collage artistique des produits
- Titre principal : Storytelling émotionnel "Vivez l'expérience [Brand]" 
- Navigation visuelle : Mini-grid des produits en fond avec effet parallaxe

### 2. SECTION "GALERIE EXPÉRIENTIELLE"
Layout: MASONRY ASYMÉTRIQUE avec :
- Cartes de tailles variables selon l'importance du produit
- Overlay d'informations au hover avec animation morphing
- Images en plein écran au click avec transition fluide
- Système de filtres visuels (par ambiance, style, couleur)

### 3. FICHE PRODUIT "MODE ARTISTE"
**POUR CHAQUE PRODUIT, créer un layout UNIQUE :**

**Option A - Layout "Storytelling Vertical"**
\`\`\`
🖼️ [Image principale en haut - 100% largeur]
📖 [Titre + Description courte - overlay partiel]
🎨 [Grid 3 colonnes : Couleurs + Matériaux + Dimensions]
💫 [Section "Inspiration" avec moodboard]
🛒 [CTA flottant bottom sticky]
\`\`\`

**Option B - Layout "Cinématique"**  
\`\`\`
🎬 [Video/GIF produit en situation - 60% écran]
🎪 [Infos fixes à droite avec scroll indépendant]
🌈 [Palette couleurs interactive]
📱 [Gallery empilée verticalement]
\`\`\`

**Option C - Layout "Editorial Magazine"**
\`\`\`
📰 [Titre artistique typographie creative]
🖼️ [Images full-bleed avec text overlay]
📐 [Specs techniques dans colonne latérale stylisée]
🎯 [CTA intégré dans le design editorial]
\`\`\`

### 4. INTERACTIONS AVANCÉES :
- Hover 3D tilt sur les cards
- Zoom magnifying glass sur images
- Color picker interactif
- Scroll-triggered animations
- Micro-interactions sur chaque action

## 🎨 SYSTÈME DESIGN PREMIUM :

### Palette Émotionnelle :
\`\`\`
primary: '#1A1A1A',    // Noir profond artistique
secondary: '#F5F5F5',   // Blanc galerie
accent: '#E8C4A1',      // Terre naturelle
spotlight: '#8B4513',   // Brun chaleureux
text: '#2C2C2C',        // Gris charbon
background: '#FAFAFA'   // Blanc cassé
\`\`\`

### Typographie Creative :
- Headlines: 'Playfair Display' - Serif élégant
- Subtitles: 'Cormorant Garamond' - Serif littéraire  
- Body: 'Inter' - Sans-serif lisible
- Accent: 'Montserrat' - Modern clean

### Animations Signature :
\`\`\`
- fade-in-up-stagger (entrée produits)
- morphing-overlay (hover cards)
- parallax-scroll (background)
- magnetic-cursor (boutons)
- glassmorphism-effect (modals)
\`\`\`

## 📦 PRODUITS À METTRE EN VALEUR :

${products.map((p: any, index: number) => `
### 🎁 PRODUIT ${index + 1} - "${p.title}"
**Prix :** ${p.compare_at_price ? `~~${p.compare_at_price}€~~ **${p.price}€** (${p.discount}% OFF)` : `${p.price}€`}
**Description :** ${p.optimized_description || p.description || 'Produit premium'}
**Style :** ${p.style || 'Moderne'} | **Matériau :** ${p.ai_material || 'Qualité supérieure'}
**Couleur :** ${p.ai_color || 'Élégant'} | **Texture :** ${p.ai_texture || 'Raffinée'}
**Analyse IA :** ${p.ai_vision_analysis?.substring(0, 150) || 'Design soigné et fonctionnel'}
**Images disponibles :** ${p.images?.length || 1}
**Catégorie :** ${p.category} ${p.sub_category ? `> ${p.sub_category}` : ''}

**LAYOUT SUGGÉRÉ :** ${index % 3 === 0 ? 'Storytelling Vertical' : index % 3 === 1 ? 'Cinématique' : 'Editorial Magazine'}
`).join('\n')}

## 🛠️ DIRECTIVES TECHNIQUES :

### Code Architecture :
\`\`\`tsx
// Composants principaux :
<ArtGalleryHero />
<MasonryProductGrid />
  <ProductCard layout="unique" />
<FloatingCart />
<StorytellingModal />
\`\`\`

### Responsive Breakpoints :
- Mobile : Stack vertical créatif
- Tablet : Grid asymétrique adaptatif  
- Desktop : Experience immersive complète

### Performance :
- Lazy loading images
- Intersection Observer animations
- CSS transforms hardware-accelerated

## 🎯 CONSIGNES FINALES CRÉATIVES :

1. **CHAQUE PRODUIT = UNE ŒUVRE** - Layout unique et mémorable
2. **ZERO SYMÉTRIE** - Asymétrie organique naturelle
3. **STORYTELLING VISUEL** - Moins de texte, plus d'émotion
4. **INTERACTION TACTILE** - Feedback immédiat sur chaque action
5. **MOBILE FIRST CREATIVE** - Adaptation innovante sur mobile

**GÉNÈRE UNIQUEMENT LE CODE REACT/TYPESCRIPT COMPLET - PAS D'EXPLICATIONS**
`;

    console.log("Calling Lovable AI with artistic gallery prompt...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 5000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }
    
    const data = await response.json();
    let generatedCode = data.choices[0]?.message?.content || "";
    
    // Clean code extraction
    const codeMatch = generatedCode.match(/```(?:tsx|typescript|jsx)?\n([\s\S]*?)```/);
    if (codeMatch) {
      generatedCode = codeMatch[1];
    }

    // Save to database
    const landingPageUrl = `/gallery/${campaignId}`;
    
    const { error: updateError } = await supabase
      .from("ads_campaigns")
      .update({ 
        landing_page_url: landingPageUrl,
        landing_page_html: generatedCode,
        updated_at: new Date().toISOString(),
        status: 'landing_page_generated'
      })
      .eq("id", campaignId);
    
    if (updateError) {
      console.error("Failed to save landing page:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        code: generatedCode,
        landingPageUrl,
        productsCount: products.length,
        campaignType: campaign.campaign_type,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating artistic landing page:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});