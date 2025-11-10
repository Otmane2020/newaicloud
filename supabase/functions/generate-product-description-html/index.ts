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
    const { title, existingDescription, images, visionAnalysis, dimensions, template = "ecommerce", variants } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product landing page for:", title);
    console.log("📊 Vision Analysis:", visionAnalysis ? "Available" : "Not provided");
    console.log("📐 Dimensions:", dimensions ? JSON.stringify(dimensions) : "Not provided");
    console.log("🎨 Variants:", variants ? variants.length : "0");

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

    // 🔹 Enhanced prompt with Vision AI, Gallery, Dimensions, Variants, Mobile-First
    const prompt = `
You are an expert e-commerce UX copywriter and web designer specializing in mobile-first responsive design.
Generate a premium, fully responsive product landing page in Tailwind HTML that adapts perfectly from mobile to desktop.

==============================
INPUT DATA
==============================
Title: ${title}
${existingDescription ? `Existing Description: ${existingDescription}` : ""}
${visionAnalysis ? `\n🎨 Vision AI Analysis (USE THIS TO ENRICH CONTENT):\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${dimensions ? `\n📐 Product Dimensions:\n${JSON.stringify(dimensions, null, 2)}` : ""}
${variants?.length ? `\n🎯 Product Variants (${variants.length} options):\n${JSON.stringify(variants, null, 2)}` : ""}
${images?.length ? `\n📸 Product Images (${images.length} available):\n${images.map((img: any, i: number) => `  ${i + 1}. ${img.src || img}`).join("\n")}` : "No images"}

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
1. **Mobile (default)**: Stack all sections vertically (flex-col), full width (w-full)
2. **Tablet (md:)**: 2-column grids for features, side-by-side layouts
3. **Desktop (lg:)**: 3-4 column grids, horizontal layouts

**Examples:**
- Hero: flex flex-col md:flex-row gap-6
- Gallery: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Features: flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-6
- Specifications: flex flex-col lg:flex-row
- Text: text-2xl md:text-3xl lg:text-4xl
- Padding: px-4 md:px-8 lg:px-16 py-6 md:py-10 lg:py-16

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

**2. VISION AI INSIGHTS SECTION** (IF visionAnalysis provided)
- Use Vision AI data to create compelling feature highlights
- Extract colors, materials, style from analysis
- Create 4-6 benefit cards based on visual analysis
- Layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

**3. PRODUCT GALLERY** (MANDATORY: Show 3-4 photos)
- Section title: "Galerie Photos" or "Product Gallery"
- Layout: grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4
- Show first 3-4 product images
- Each image: aspect-square object-cover rounded-lg shadow-md
- Responsive sizing: Images adapt height on mobile

**4. CARACTÉRISTIQUES & DIMENSIONS** (IF dimensions provided)
- Section title: "Caractéristiques Techniques"
- Two-column layout on desktop: flex flex-col lg:flex-row gap-6
- Left: Key features from Vision AI
- Right: Dimensions table (if provided)
- Table: w-full border-collapse on mobile, styled on desktop

**5. PRODUCT VARIANTS** (IF variants provided)
- Section title: "Options & Variations"
- Show available options (size, color, etc.)
- Layout: flex flex-wrap gap-2 md:gap-3
- Each variant: Button/badge style
- Interactive buttons with hover states

**6. SPECIFICATIONS TABLE**
- Full-width on mobile (overflow-x-auto)
- Styled table on desktop
- Include dimensions if provided

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
VISUAL DESIGN & ACCESSIBILITY
==============================
- Tailwind CSS only (no custom CSS)
- Color scheme: Use neutral tones (gray, slate) with accent colors
- Typography: font-sans with proper hierarchy
- Spacing: Generous padding/margins that adapt per breakpoint
- Accessibility: Proper ARIA labels, semantic HTML5
- Focus states: focus:ring-2 focus:ring-offset-2 on interactive elements
- Contrast: Ensure WCAG AA compliance

==============================
OUTPUT FORMAT
==============================
Return valid JSON only:
{
  "title": "Optimized product title (≤70 chars)",
  "html": "Full responsive HTML of the landing page here"
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

    console.log("✅ Landing page generated successfully");

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
    console.error("❌ Error generating landing page:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
