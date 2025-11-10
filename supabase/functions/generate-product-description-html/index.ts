import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WCAG contrast calculation utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccessibleText(bgColor: string): string {
  const luminance = getLuminance(bgColor);
  // If background is light (luminance > 0.5), use dark text
  // If background is dark (luminance <= 0.5), use white text
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

function generateDesignTokens(colorScheme: any) {
  const primary = colorScheme.primary || "#000000";
  const secondary = colorScheme.secondary || "#333333";
  const background = colorScheme.background || "#FFFFFF";
  const surface = colorScheme.surface || "#F5F5F5";
  const text = colorScheme.text || "#000000";
  const textMuted = colorScheme.textMuted || "#666666";

  // VALIDATION: Forcer background clair et text foncé pour WCAG AA
  const validatedBackground = getLuminance(background) > 0.5 ? background : "#FFFFFF";
  const validatedSurface = getLuminance(surface) > 0.5 ? surface : "#F5F5F5";
  const validatedText = getLuminance(text) < 0.5 ? text : "#000000";
  const validatedTextMuted = getLuminance(textMuted) < 0.5 ? textMuted : "#666666";
  
  // Ensure CTAs have accessible text color
  const ctaTextColor = ensureAccessibleText(primary);
  const contrast = calculateContrast(primary, ctaTextColor);
  
  console.log(`🎨 Design Tokens Generated (Validated):`);
  console.log(`  Primary: ${primary} | CTA Text: ${ctaTextColor} | Contrast: ${contrast.toFixed(2)}:1`);
  console.log(`  Background: ${validatedBackground} (luminance: ${getLuminance(validatedBackground).toFixed(2)})`);
  console.log(`  Text: ${validatedText} (luminance: ${getLuminance(validatedText).toFixed(2)})`);
  
  return {
    primary,
    secondary,
    background: validatedBackground,
    surface: validatedSurface,
    text: validatedText,
    textMuted: validatedTextMuted,
    ctaText: ctaTextColor,
    contrastRatio: contrast,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, existingDescription, images, visionAnalysis, dimensions, template = "ecommerce", colorScheme } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product landing page for:", title);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate design tokens with WCAG-compliant contrast
    const designTokens = generateDesignTokens(colorScheme || {});

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

    // 🔹 Prompt with strict WCAG contrast rules
    const prompt = `
You are an expert e-commerce UX copywriter and web designer.
Generate a premium, responsive, mobile-first product *landing page* in Tailwind HTML.

==============================
INPUT DATA
==============================
Title: ${title}
${existingDescription ? `Existing Description: ${existingDescription}` : ""}
${visionAnalysis ? `Internal Visual Analysis (DO NOT DISPLAY TO CUSTOMER - USE ONLY FOR CONTENT ENRICHMENT): ${JSON.stringify(visionAnalysis)}` : ""}
${dimensions ? `Dimensions: ${JSON.stringify(dimensions)}` : ""}
${images?.length ? `Product Images:\n${images.map((img: any, i: number) => `  ${i + 1}. ${img.src || img}`).join("\n")}` : "No images"}

==============================
DESIGN SYSTEM - COLORS (STRICT RULES)
==============================
Primary Accent: ${designTokens.primary}
Secondary Accent: ${designTokens.secondary}
Main Background: ${designTokens.background} (ALWAYS white/light)
Section Background: ${designTokens.surface} (light gray)
Main Text: ${designTokens.text} (dark with high contrast)
Secondary Text: ${designTokens.textMuted} (medium gray)
CTA Text on Primary: ${designTokens.ctaText} (contrast ratio: ${designTokens.contrastRatio.toFixed(1)}:1)

MANDATORY COLOR RULES (ZERO TOLERANCE - WCAG AA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ABSOLUTELY FORBIDDEN COLOR COMBINATIONS:
  1. text-white + bg-white → NEVER
  2. text-white + bg-gray-50 → NEVER
  3. text-white + bg-gray-100 → NEVER
  4. text-gray-300 + bg-white → NEVER (contrast too low)
  5. text-gray-400 + bg-gray-100 → NEVER (contrast too low)

✅ ONLY ALLOWED TEXT CLASSES:
  • On white/light backgrounds (bg-white, bg-gray-50, bg-[${designTokens.surface}]):
    → text-gray-900, text-gray-800, text-black, text-[${designTokens.text}]
  
  • On dark backgrounds (bg-gray-800, bg-gray-900, bg-black):
    → text-white, text-gray-100

🔍 VALIDATION CHECKLIST (YOU MUST FOLLOW):
  □ Every <h1>, <h2>, <h3> on light bg uses text-gray-900 or text-black
  □ Every <p> on light bg uses text-gray-700 or text-gray-800
  □ No text-white exists on any light background
  □ No text-gray-300 or text-gray-400 on white/light backgrounds

📋 CORRECT COLOR EXAMPLES:
<section class="bg-white py-12">
  <h2 class="text-3xl font-bold text-gray-900">Perfect Contrast</h2>
  <p class="text-gray-700">This has excellent readability.</p>
</section>

<section class="bg-[${designTokens.surface}] py-12">
  <h2 class="text-3xl font-bold text-[${designTokens.text}]">Using Tokens</h2>
  <p class="text-[${designTokens.textMuted}]">Also perfect.</p>
</section>

⚠️ CRITICAL: Internal Visual Analysis is for your reference ONLY.
   NEVER display this raw data to the customer in the landing page.
   Use it to inform your writing but keep it invisible.

==============================
TEMPLATE STYLE (${template.toUpperCase()})
==============================
Tone: ${selectedTemplate.tone}
Structure: ${selectedTemplate.structure}
Language: ${selectedTemplate.language}

==============================
PAGE STRUCTURE REQUIREMENTS (NO BUTTONS)
==============================
⚠️ CRITICAL: This is a PURE INFORMATIONAL landing page. DO NOT include:
  • CTA buttons ("Buy Now", "Add to Cart", "Shop Now", etc.)
  • Call-to-action elements or purchase buttons
  • Trust signals requiring action
  • Any interactive elements that suggest purchase

MANDATORY SECTIONS:
  • HERO SECTION:
    - Full-width hero image (first image)
    - Bold headline (H1) with text-gray-900 (NEVER text-white on light bg)
    - 1–2 sentence benefit statement
  
  • FEATURE SECTIONS:
    - 4–6 cards with icons/images
    - Each card: bg-white or bg-[${designTokens.surface}] with text-gray-900
    - Grid layout: grid grid-cols-2 md:grid-cols-3 gap-6
  
  • PRODUCT GALLERY:
    - Responsive grid with all images
    - 2×2 or 3×3 grid layout
    - Descriptive alt texts on every image
  
  • SPECIFICATIONS TABLE:
    - Technical details with clear typography
    - Include dimensions, materials, features
    - High contrast: text-gray-900 on bg-white
  
  • STORYTELLING SECTION:
    - Customer experience narrative
    - Use cases and scenarios
    - Benefits-focused content

REQUIRED HTML STRUCTURE:
  • Tailwind classes ONLY (NO custom CSS)
  • Semantic HTML5 tags (<header>, <main>, <section>, <article>)
  • Mobile-first responsive design
  • Proper alt attributes on ALL images

==============================
MEDIA INTEGRATION
==============================
- Use provided image URLs with <img> tags
- Responsive: w-full, h-auto, rounded-lg, shadow-md
- Center hero, grid for gallery
- Descriptive alt texts for SEO

==============================
VISUAL DESIGN
==============================
- Tailwind CSS only (no custom CSS)
- Clean, modern, premium aesthetic
- Semantic HTML5 (section, article, figure)
- Mobile-first layout (flex, grid)
- WCAG AA accessibility minimum
- Proper heading hierarchy (h1 > h2 > h3)

==============================
OUTPUT FORMAT
==============================
Return valid JSON only:
{
  "title": "Optimized product title (≤70 chars)",
  "html": "Full HTML of the landing page with WCAG-compliant contrast"
}

Do NOT wrap output in code blocks or markdown.
`;

    // 🔹 Call Lovable AI with increased token limit
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert e-commerce landing page designer with deep knowledge of WCAG accessibility standards." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 12000,
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

    // Metrics & Validation
    const mediaCount = images?.length || 0;
    const wordCount = htmlLandingPage.split(/\s+/).length;
    
    // 🔹 VALIDATION STRICTE des couleurs (post-génération)
    console.log("[VALIDATION] Checking color accessibility...");
    const colorValidation = {
      forbiddenCombos: [
        { pattern: /text-white[^"]*bg-white|bg-white[^"]*text-white/g, issue: "text-white on bg-white" },
        { pattern: /text-white[^"]*bg-gray-50|bg-gray-50[^"]*text-white/g, issue: "text-white on bg-gray-50" },
        { pattern: /text-white[^"]*bg-gray-100|bg-gray-100[^"]*text-white/g, issue: "text-white on bg-gray-100" },
        { pattern: /text-gray-300[^"]*bg-white|bg-white[^"]*text-gray-300/g, issue: "text-gray-300 on bg-white (low contrast)" },
        { pattern: /text-gray-400[^"]*bg-gray-100|bg-gray-100[^"]*text-gray-400/g, issue: "text-gray-400 on bg-gray-100 (low contrast)" },
      ],
      violations: [] as string[],
    };

    // Scanner le HTML pour détecter les violations
    colorValidation.forbiddenCombos.forEach(({ pattern, issue }) => {
      if (pattern.test(htmlLandingPage)) {
        colorValidation.violations.push(issue);
        console.error(`❌ COLOR VIOLATION: ${issue}`);
      }
    });

    // Si violations critiques, rejeter la génération
    if (colorValidation.violations.length > 0) {
      console.error("❌ Landing page failed color validation:", colorValidation.violations);
      throw new Error(`Color accessibility violations detected: ${colorValidation.violations.join(", ")}`);
    }

    console.log("✅ Color validation passed");
    console.log("✅ Landing page generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        optimizedTitle,
        html: htmlLandingPage, // Changed from htmlLandingPage to html for consistency
        mediaCount,
        mobileOptimized: true,
        wordCount,
        colorValidation: {
          passed: true,
          violations: [],
        },
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
