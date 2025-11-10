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
    const { title, existingDescription, images, visionAnalysis, dimensions, template = "ecommerce", productId } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product landing page for:", title);

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

    // 🔹 Prompt principal
    const prompt = `
You are an expert e-commerce UX copywriter and web designer.
Generate a premium, responsive, mobile-first product *landing page* in Tailwind HTML.

==============================
INPUT DATA
==============================
Title: ${title}
${existingDescription ? `Existing Description: ${existingDescription}` : ""}
${visionAnalysis ? `Visual Analysis: ${JSON.stringify(visionAnalysis)}` : ""}
${dimensions ? `Dimensions: ${JSON.stringify(dimensions)}` : ""}
${images?.length ? `Product Images:\n${images.map((img: any, i: number) => `  ${i + 1}. ${img.src || img}`).join("\n")}` : "No images"}

==============================
TEMPLATE STYLE (${template.toUpperCase()})
==============================
Tone: ${selectedTemplate.tone}
Structure: ${selectedTemplate.structure}
Language: ${selectedTemplate.language}

==============================
PAGE STRUCTURE REQUIREMENTS
==============================
- <div> wrapper with Tailwind classes.
- HERO SECTION:
  • Full-width hero image (first image)
  • Bold headline and 1–2 sentence benefit statement
  • Prominent CTA button (e.g., “Shop Now”)
- FEATURE SECTIONS:
  • 4–6 cards highlighting benefits, each with icon or image
- PRODUCT GALLERY:
  • Responsive grid of all images with alt texts
- SPECIFICATIONS TABLE:
  • Include product dimensions if provided
  • Technical details or materials
- CUSTOMER EXPERIENCE SECTION:
  • Use storytelling tone, mention how it improves user’s life
- CTA SECTION:
  • Reassuring final CTA (“Free Shipping”, “30-Day Guarantee”, etc.)

==============================
MEDIA INTEGRATION (CRITICAL)
==============================
- Use provided image URLs with <img> tags and descriptive alt text.
- Use responsive classes (w-full, h-auto, rounded-lg, shadow-md).
- Center hero image, grid gallery for others.
- If possible, suggest placement for video or 360° media (“<video>” optional).

==============================
VISUAL DESIGN
==============================
- Use Tailwind CSS only (no custom CSS)
- Clean, modern, premium aesthetic
- Semantic HTML5 (section, article, figure)
- Mobile-first layout (flex, grid)
- Accessibility and SEO best practices
- Proper heading hierarchy

==============================
OUTPUT FORMAT
==============================
Return valid JSON only:
{
  "title": "Optimized product title (≤70 chars)",
  "html": "Full HTML of the landing page here"
}

Do NOT wrap output in code blocks or markdown.
`;

    // 🔹 Appel Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
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
