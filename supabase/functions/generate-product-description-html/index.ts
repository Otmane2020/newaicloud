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
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
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
      variants 
    } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product description for:", title);
    
    // Récupérer les attributs enrichis depuis la BDD si product_id fourni
    let enrichedData: any = null;
    if (product_id) {
      console.log("📦 Fetching enriched product data from database...");
      const { data: productData } = await supabaseAdmin
        .from("shopify_products")
        .select(`
          ai_color, ai_material, ai_shape, ai_texture, ai_pattern, ai_finish, ai_design_elements,
          ai_vision_analysis, ai_presentation_quality, ai_craftsmanship_level,
          smart_length, smart_length_unit, smart_width, smart_width_unit,
          smart_height, smart_height_unit, smart_diameter, smart_diameter_unit,
          smart_depth, smart_depth_unit, smart_weight, smart_weight_unit,
          category, sub_category, style, room, functionality
        `)
        .eq("id", product_id)
        .single();
      
      if (productData) {
        enrichedData = productData;
        console.log("✅ Enriched data loaded:", Object.keys(enrichedData).length, "attributes");
      }
    }
    
    console.log("📊 Vision Analysis:", visionAnalysis ? "Available" : "Not provided");
    console.log("📐 Dimensions:", dimensions ? JSON.stringify(dimensions) : "Not provided");
    console.log("🎨 Variants:", variants ? variants.length : "0");
    console.log("🔍 Enriched attributes:", enrichedData ? "Available" : "Not provided");

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    // Template-specific tone and style
    const templateStyles = {
      ecommerce: {
        tone: "Direct, persuasive, focused on conversion and ease of use. Highlight benefits and social proof.",
        structure: "Hero with main image, feature sections with icons, specs, gallery, reviews, CTA.",
        language: "Simple, engaging, persuasive. Emphasize value, comfort, and urgency.",
      },
      luxury: {
        tone: "Elegant, emotional, sensory. Use aspirational storytelling and subtle persuasion.",
        structure: "Full-width hero, craftsmanship section, materials story, detail gallery, CTA.",
        language: "Sophisticated vocabulary. Focus on design, exclusivity, and experience.",
      },
      technical: {
        tone: "Informative, professional, and precise. Focus on data, compatibility, and performance.",
        structure: "Hero with main specs, features grid, performance table, compatibility section, CTA.",
        language: "Use technical clarity, avoid fluff, emphasize measurable performance.",
      },
    };

    const selectedTemplate = templateStyles[template as keyof typeof templateStyles] || templateStyles.ecommerce;

    // Construire le bloc d'attributs enrichis
    const buildEnrichedContext = () => {
      if (!enrichedData) return "";
      
      const sections = [];
      
      // Attributs visuels
      if (enrichedData.ai_color || enrichedData.ai_material) {
        sections.push("\n🎨 ATTRIBUTS VISUELS (UTILISER DANS CONTENU):");
        if (enrichedData.ai_color) sections.push(`- Couleur: ${enrichedData.ai_color}`);
        if (enrichedData.ai_material) sections.push(`- Matériau: ${enrichedData.ai_material}`);
        if (enrichedData.ai_shape) sections.push(`- Forme: ${enrichedData.ai_shape}`);
        if (enrichedData.ai_texture) sections.push(`- Texture: ${enrichedData.ai_texture}`);
        if (enrichedData.ai_finish) sections.push(`- Finition: ${enrichedData.ai_finish}`);
        if (enrichedData.ai_pattern) sections.push(`- Motif: ${enrichedData.ai_pattern}`);
      }
      
      // Dimensions complètes
      if (enrichedData.smart_length || enrichedData.smart_width || enrichedData.smart_height) {
        sections.push("\n📐 DIMENSIONS COMPLÈTES (CRÉER TABLEAU):");
        if (enrichedData.smart_length) 
          sections.push(`- Longueur: ${enrichedData.smart_length} ${enrichedData.smart_length_unit || 'cm'}`);
        if (enrichedData.smart_width) 
          sections.push(`- Largeur: ${enrichedData.smart_width} ${enrichedData.smart_width_unit || 'cm'}`);
        if (enrichedData.smart_height) 
          sections.push(`- Hauteur: ${enrichedData.smart_height} ${enrichedData.smart_height_unit || 'cm'}`);
        if (enrichedData.smart_weight) 
          sections.push(`- Poids: ${enrichedData.smart_weight} ${enrichedData.smart_weight_unit || 'kg'}`);
      }
      
      // Analyse Vision AI avancée
      if (enrichedData.ai_vision_analysis) {
        sections.push("\n🔍 ANALYSE DÉTAILLÉE:");
        sections.push(enrichedData.ai_vision_analysis);
        if (enrichedData.ai_craftsmanship_level) 
          sections.push(`- Niveau artisanat: ${enrichedData.ai_craftsmanship_level}`);
        if (enrichedData.ai_presentation_quality) 
          sections.push(`- Qualité: ${enrichedData.ai_presentation_quality}/10`);
      }
      
      // Contexte produit
      if (enrichedData.category || enrichedData.style) {
        sections.push("\n🏷️ CONTEXTE:");
        if (enrichedData.category) sections.push(`- Catégorie: ${enrichedData.category}`);
        if (enrichedData.sub_category) sections.push(`- Type: ${enrichedData.sub_category}`);
        if (enrichedData.style) sections.push(`- Style: ${enrichedData.style}`);
        if (enrichedData.room) sections.push(`- Pièce: ${enrichedData.room}`);
      }
      
      return sections.join("\n");
    };

    // 🔹 Enhanced prompt with Vision AI, Gallery, Dimensions, Variants, Mobile-First
    const prompt = `
You are an expert e-commerce UX copywriter and web designer specializing in mobile-first responsive design.
Generate a premium, fully responsive product description in Tailwind HTML that adapts perfectly from mobile to desktop.

==============================
INPUT DATA
==============================
Title: ${title}
${existingDescription ? `Existing Description: ${existingDescription}` : ""}
${visionAnalysis ? `\n🎨 Vision AI Analysis (USE THIS TO ENRICH CONTENT):\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${dimensions ? `\n📐 Product Dimensions:\n${JSON.stringify(dimensions, null, 2)}` : ""}
${variants?.length ? `\n🎯 Product Variants (${variants.length} options):\n${JSON.stringify(variants, null, 2)}` : ""}
${images?.length ? `\n📸 Product Images (${images.length} available):\n${images.map((img: any, i: number) => `  ${i + 1}. ${img.src || img}`).join("\n")}` : "No images"}

${buildEnrichedContext()}

==============================
TEMPLATE STYLE (${template.toUpperCase()})
==============================
Tone: ${selectedTemplate.tone}
Structure: ${selectedTemplate.structure}
Language: ${selectedTemplate.language}

==============================
CRITICAL: MOBILE-FIRST RESPONSIVE DESIGN
==============================
**MANDATORY RESPONSIVE RULES:**
1. **Mobile base (no prefix)**: Stack vertically (flex-col), full width, touch-friendly
2. **Tablet (sm: 640px+)**: 2-column grids, improved spacing
3. **Desktop (md: 768px+)**: 3-4 column grids, horizontal layouts
4. **Large (lg: 1024px+)**: Maximum design expression

**Tailwind Responsive Examples:**
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Hero: flex flex-col md:flex-row gap-4 md:gap-8
- Gallery: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4
- Features: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6
- Text: text-2xl sm:text-3xl md:text-4xl lg:text-5xl
- Padding: px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12
- Buttons: w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4

==============================
PAGE STRUCTURE REQUIREMENTS
==============================

**1. HERO SECTION** (Responsive Layout)
- Container: max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16
- Layout: flex flex-col md:flex-row gap-6 md:gap-8
- Hero image on left/top (w-full md:w-1/2)
- Content on right/bottom (w-full md:w-1/2)
- Bold headline (text-3xl md:text-4xl lg:text-5xl)
- Benefit statement (text-base md:text-lg)
- CTA button (w-full md:w-auto)

**2. VISION AI & ENRICHED ATTRIBUTES SECTION** (MANDATORY if data available)
- Create compelling feature cards from enriched attributes
- Use ai_color, ai_material, ai_shape, ai_texture, ai_finish
- Extract style, mood, craftsmanship from Vision AI
- Layout: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6
- Each card: Icon + Title + Description (p-4 sm:p-6 rounded-lg)
- Showcase quality score if available

**3. PRODUCT GALLERY** (MANDATORY: Show all available photos)
- Section title: "Galerie Photos" or "Product Gallery" (text-2xl sm:text-3xl font-bold)
- Layout: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4
- ALL product images from the array
- Each image: aspect-square object-cover rounded-lg shadow-md hover:shadow-xl transition
- Lazy loading: loading="lazy"
- Alt text from Vision AI analysis

**4. CARACTÉRISTIQUES & DIMENSIONS** (MANDATORY if enriched data available)
- Section title: "Caractéristiques Techniques" (text-2xl sm:text-3xl font-bold mb-6)
- Two-column responsive: flex flex-col lg:flex-row gap-6 lg:gap-8
- LEFT COLUMN: Key features cards from enriched attributes
  - Material, finish, texture as feature cards
  - Style, room, functionality context
- RIGHT COLUMN: Professional dimensions table
  - All smart_* fields (length, width, height, weight, diameter, etc.)
  - Responsive table: block sm:table w-full
  - Zebra stripes: even:bg-gray-50

**5. PRODUCT VARIANTS** (IF variants provided)
- Section title: "Options & Variations" (text-2xl font-bold mb-4)
- Layout: flex flex-wrap gap-2 sm:gap-3
- Each variant: Styled button with hover effect
  - Base: px-4 py-2 border rounded-md transition
  - Hover: border-primary bg-primary/10
  - Mobile friendly: min-w-[100px] text-center

**6. MATERIALS & CRAFTSMANSHIP** (IF enriched data available)
- Use ai_material, ai_finish, ai_craftsmanship_level
- Storytelling section about quality
- Two-column: Text + Detail image
- Quality score badge if available

**7. CUSTOMER EXPERIENCE SECTION**
- Storytelling copy
- Mobile: Single column text
- Desktop: Two-column with image

**8. FINAL CTA SECTION**
- Trust badges: grid grid-cols-2 md:grid-cols-4 gap-4
- Large CTA button: w-full md:w-auto
- Social proof elements

==============================
MEDIA INTEGRATION (CRITICAL)
==============================
- **ALL images** must have descriptive alt text from Vision AI
- Use provided image URLs with proper responsive classes
- Hero image: w-full h-64 md:h-96 object-cover rounded-lg
- Gallery images: aspect-square object-cover rounded-lg
- Lazy loading: loading="lazy" for performance

==============================
VISUAL DESIGN & ACCESSIBILITY (HIGH-END UX)
==============================
- **Tailwind only** (no custom CSS, no inline styles)
- **Color palette:** 
  - Primary: blue-600 / indigo-600 for CTAs
  - Neutral: gray-50 to gray-900 for backgrounds/text
  - Accent: Use product colors from ai_color if available
- **Typography hierarchy:**
  - H2: text-2xl sm:text-3xl md:text-4xl font-bold
  - H3: text-xl sm:text-2xl font-semibold
  - Body: text-base sm:text-lg text-gray-700
- **Spacing system:**
  - Section gaps: space-y-12 sm:space-y-16 md:space-y-20
  - Container padding: px-4 sm:px-6 lg:px-8
  - Element spacing: gap-4 sm:gap-6 lg:gap-8
- **Interactions:**
  - Buttons: hover:bg-opacity-90 transition-all duration-200
  - Cards: hover:shadow-xl transition-shadow
  - Images: hover:scale-105 transition-transform
- **Accessibility:**
  - Semantic HTML5 (section, article, aside)
  - ARIA labels on interactive elements
  - Focus visible: focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  - Alt text for ALL images
  - WCAG AA contrast ratios

==============================
OUTPUT FORMAT
==============================
Return valid JSON only:
{
  "title": "Optimized product title (≤70 chars)",
  "html": "Full responsive HTML of the description here"
}

**CRITICAL:** HTML must be fully responsive with mobile-first Tailwind breakpoints (sm:, md:, lg:, xl:)
Do NOT wrap output in code blocks or markdown.
`;

    // 🔹 Appel Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) throw new Error("No content generated by AI");

    // Nettoyage
    content = content
      .replace(/```json/g, "")
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Parsing JSON
    let optimizedTitle = title;
    let htmlLandingPage = content;
    try {
      const parsed = JSON.parse(content);
      optimizedTitle = parsed.title || title;
      htmlLandingPage = parsed.html || content;
    } catch {
      console.warn("⚠️ AI output not valid JSON, using raw HTML");
    }

    // Metrics
    const mediaCount = images?.length || 0;
    const wordCount = htmlLandingPage.split(/\s+/).length;

    console.log("✅ Product description generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        optimizedTitle,
        htmlLandingPage,
        mediaCount,
        mobileOptimized: true,
        wordCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error generating description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
