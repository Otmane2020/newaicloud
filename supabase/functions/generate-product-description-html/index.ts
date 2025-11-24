import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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
  const { 
    title, 
    existingDescription, 
    images, 
    visionAnalysis, 
    dimensions,
    userPreferences,
    productId
  } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product landing page for:", title);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch available options from database
    console.log("📋 Fetching configuration options from database...");
    const { data: configOptions } = await supabase
      .from('landing_page_config_options')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    const layouts = configOptions?.filter(opt => opt.category === 'layout') || [];
    const designStyles = configOptions?.filter(opt => opt.category === 'design_style') || [];
    const colorSchemes = configOptions?.filter(opt => opt.category === 'color_scheme') || [];
    const contentLengths = configOptions?.filter(opt => opt.category === 'content_length') || [];
    const highlightOptions = configOptions?.filter(opt => opt.category === 'highlight') || [];

    console.log(`✅ Loaded ${layouts.length} layouts, ${designStyles.length} styles, ${colorSchemes.length} color schemes`);

    // Function to convert HSL to Hex
    const hslToHex = (hsl: string): string => {
      const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!match) return hsl;
      
      const h = parseInt(match[1]);
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; }
      else if (h < 120) { r = x; g = c; }
      else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; }
      else if (h < 300) { r = x; b = c; }
      else { r = c; b = x; }
      
      const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // Function to normalize color values from various formats
    const normalizeColor = (value: string | null | undefined): string => {
      if (!value) return '#000000';
      const trimmed = value.toString().trim();
      
      // Already hex
      if (trimmed.startsWith('#')) return trimmed;
      
      // HSL with or without "hsl(" - handles formats like:
      // "221 83% 53%", "221, 83%, 53%", "hsl(221, 83%, 53%)"
      const hslMatch = trimmed.match(/(\d+)[,\s]+(\d+)%[,\s]+(\d+)%/);
      if (hslMatch) {
        const [_, h, s, l] = hslMatch;
        return hslToHex(`hsl(${h}, ${s}%, ${l}%)`);
      }
      
      // Fallback
      return trimmed;
    };

    let selectedLayout, selectedStyle, selectedLength, baseColors, selectedHighlights, selectedPalette;

    // Use user preferences if provided
    if (userPreferences) {
      console.log("✅ Utilisation des préférences utilisateur");
      
      selectedLayout = layouts.find(l => l.option_key === userPreferences.layout) || layouts[0];
      selectedStyle = designStyles.find(s => s.option_key === userPreferences.designStyle) || designStyles[0];
      selectedLength = contentLengths.find(c => c.option_key === userPreferences.contentLength) || contentLengths[0];
      
      // Find palette by paletteId for context
      selectedPalette = colorSchemes.find(c => c.option_key === userPreferences.paletteId);
      
      // Convert HSL colors to Hex with normalization
      baseColors = {
        primary: normalizeColor(userPreferences.colorScheme.primary),
        secondary: normalizeColor(userPreferences.colorScheme.secondary),
        accent: normalizeColor(userPreferences.colorScheme.accent),
        background: normalizeColor(userPreferences.colorScheme.background),
        surface: normalizeColor(userPreferences.colorScheme.surface),
        text: normalizeColor(userPreferences.colorScheme.text),
        textMuted: normalizeColor(userPreferences.colorScheme.textMuted)
      };
      
      // FIX: Use customHighlights instead of highlights
      selectedHighlights = userPreferences.customHighlights && userPreferences.customHighlights.length > 0
        ? highlightOptions.filter(h => userPreferences.customHighlights!.includes(h.option_key))
        : highlightOptions.slice(0, 3);
    } else {
      console.log("⚠️ Pas de préférences utilisateur, utilisation des défauts");
      
      selectedLayout = layouts[0];
      selectedStyle = designStyles[0];
      selectedLength = contentLengths[0];
      
      const selectedColorScheme = colorSchemes.find(c => c.option_key === 'default') || colorSchemes[0];
      selectedPalette = selectedColorScheme;
      
      // Normalize colors from config_options
      const rawColors = selectedColorScheme?.option_value || {
        primary: '#2563eb',
        secondary: '#0891b2',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#1f2937',
        textMuted: '#6b7280'
      };
      
      baseColors = {
        primary: normalizeColor(rawColors.primary),
        secondary: normalizeColor(rawColors.secondary),
        accent: normalizeColor(rawColors.accent),
        background: normalizeColor(rawColors.background),
        surface: normalizeColor(rawColors.surface),
        text: normalizeColor(rawColors.text),
        textMuted: normalizeColor(rawColors.textMuted)
      };
      
      selectedHighlights = highlightOptions.slice(0, 3);
    }

    // Build highlight → icon mapping
    const highlightIconMap = selectedHighlights.reduce((acc, h) => {
      const icon = (h.option_value as any)?.icon;
      if (icon) acc[h.option_key] = icon;
      return acc;
    }, {} as Record<string, string>);

    // Generate design tokens with WCAG-compliant contrast
    const designTokens = generateDesignTokens(baseColors);

    // Use selected style description or fallback to default
    const styleConfig = {
      tone: selectedStyle?.description || "Direct, persuasive, focused on conversion",
      layout: selectedLayout?.option_label || "Single column",
      contentStrategy: selectedLength?.description || "Balanced content",
      highlights: selectedHighlights.map(h => h.option_label).join(", ") || "Quality, shipping, warranty"
    };

    // Build comprehensive design options catalog
    const buildDesignCatalog = () => {
      let catalog = '';
      
      // Layouts
      if (layouts.length > 0) {
        catalog += `\nLAYOUTS (${layouts.length} available):\n`;
        layouts.forEach((l, i) => {
          catalog += `  ${i + 1}. ${l.option_label} (${l.option_key}): ${l.description || 'N/A'}\n`;
        });
      }
      
      // Design Styles
      if (designStyles.length > 0) {
        catalog += `\nDESIGN STYLES (${designStyles.length} available):\n`;
        designStyles.forEach((s, i) => {
          catalog += `  ${i + 1}. ${s.option_label} (${s.option_key}): ${s.description || 'N/A'}\n`;
        });
      }
      
      // Color Palettes
      if (colorSchemes.length > 0) {
        catalog += `\nCOLOR PALETTES (${colorSchemes.length} available):\n`;
        const palettesByTheme = colorSchemes.reduce((acc: any, scheme) => {
          const key = scheme.option_key;
          const theme = key.includes('blue') ? 'Blues' :
                       key.includes('green') ? 'Greens' :
                       key.includes('red') || key.includes('crimson') ? 'Reds' :
                       key.includes('purple') || key.includes('violet') ? 'Purples' :
                       key.includes('orange') || key.includes('coral') ? 'Warm' :
                       key.includes('gray') || key.includes('slate') ? 'Neutrals' : 'Other';
          if (!acc[theme]) acc[theme] = [];
          acc[theme].push(scheme);
          return acc;
        }, {});
        
        Object.entries(palettesByTheme).forEach(([theme, palettes]: [string, any]) => {
          catalog += `  ${theme}: ${palettes.map((p: any) => p.option_label).join(', ')}\n`;
        });
      }
      
      // Highlights
      if (highlightOptions.length > 0) {
        catalog += `\nAVAILABLE HIGHLIGHTS (${highlightOptions.length} options):\n`;
        highlightOptions.forEach((h, i) => {
          catalog += `  ${i + 1}. ${h.option_label} (${h.option_key}): ${h.description || 'N/A'}\n`;
        });
      }
      
      return catalog;
    };

    // 🔹 Prompt with strict WCAG contrast rules and dynamic configuration
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
AVAILABLE DESIGN OPTIONS (for context & creative inspiration)
==============================
Below is the complete design system available in our platform.
You can draw inspiration from these options to enrich your design,
but you MUST use the SELECTED CONFIGURATION specified below.
${buildDesignCatalog()}

==============================
SELECTED CONFIGURATION (MANDATORY - USE THIS)
==============================
⚠️ You MUST implement the following configuration exactly as specified:
Layout Style: ${styleConfig.layout}
Design Tone: ${styleConfig.tone}
Content Strategy: ${styleConfig.contentStrategy}
Color Palette: ${selectedPalette ? `${selectedPalette.option_label} – ${selectedPalette.description || 'N/A'}` : 'Default'}
Highlight Features: ${styleConfig.highlights}

${Object.keys(highlightIconMap).length > 0 ? `
HIGHLIGHT → ICON MAPPING (MANDATORY):
${Object.entries(highlightIconMap).map(([key, icon]) => {
  const highlight = selectedHighlights.find(h => h.option_key === key);
  return `  - ${highlight?.option_label || key} → ${icon}`;
}).join('\n')}

⚠️ CRITICAL: For each selected highlight above, you MUST render at least one feature card that uses the corresponding Lucide icon:
  <i data-lucide="${Object.values(highlightIconMap)[0] || 'sparkles'}"></i>
Use the exact icon name from the mapping above with proper sizing (w-8 h-8 minimum) and color (text-[${designTokens.primary}]).
` : ''}

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

🎨 COLOR USAGE EXAMPLES (Use these patterns extensively):

<!-- Hero with accent color background -->
<div class="bg-[${designTokens.primary}] text-white py-20">
  <h1 class="text-5xl font-bold">Premium Product</h1>
</div>

<!-- Feature cards with color accents -->
<div class="bg-white p-6 border-l-4 border-[${designTokens.primary}]">
  <div class="w-12 h-12 rounded-full bg-[${designTokens.primary}]/10 flex items-center justify-center mb-4">
    <svg class="w-6 h-6 text-[${designTokens.primary}]">...</svg>
  </div>
  <h3 class="text-gray-900 font-bold">Feature Title</h3>
</div>

<!-- Colored badges and tags -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[${designTokens.secondary}]/10 text-[${designTokens.secondary}]">
  New Arrival
</span>

<!-- Gradient backgrounds -->
<div class="bg-gradient-to-br from-[${designTokens.primary}] to-[${designTokens.secondary}] text-white p-12">
  <h2 class="text-3xl font-bold">Special Section</h2>
</div>

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

==============================
LUCIDE ICONS - RICH VISUAL DESIGN
==============================
⚠️ MANDATORY: Use Lucide icons extensively throughout the page for visual richness!

Available via CDN (add to <head>):
<script src="https://unpkg.com/lucide@latest"></script>
<script>lucide.createIcons();</script>

📦 RICH ICON CATALOG (use 8-12 icons minimum):

PRODUCT FEATURES:
- <i data-lucide="sparkles" class="w-8 h-8 text-[${designTokens.primary}]"></i> Premium Quality
- <i data-lucide="shield-check" class="w-8 h-8 text-[${designTokens.primary}]"></i> Warranty
- <i data-lucide="truck" class="w-8 h-8 text-[${designTokens.primary}]"></i> Fast Shipping
- <i data-lucide="leaf" class="w-8 h-8 text-[${designTokens.primary}]"></i> Eco-Friendly
- <i data-lucide="award" class="w-8 h-8 text-[${designTokens.primary}]"></i> Award Winning
- <i data-lucide="star" class="w-8 h-8 text-[${designTokens.primary}]"></i> Top Rated

TECHNICAL SPECS:
- <i data-lucide="ruler" class="w-6 h-6"></i> Dimensions
- <i data-lucide="package" class="w-6 h-6"></i> Package Contents
- <i data-lucide="droplet" class="w-6 h-6"></i> Water Resistant
- <i data-lucide="battery" class="w-6 h-6"></i> Battery Life
- <i data-lucide="zap" class="w-6 h-6"></i> Performance

BENEFITS:
- <i data-lucide="heart" class="w-6 h-6"></i> Customer Satisfaction
- <i data-lucide="clock" class="w-6 h-6"></i> Time Saving
- <i data-lucide="thumbs-up" class="w-6 h-6"></i> Easy to Use
- <i data-lucide="lock" class="w-6 h-6"></i> Secure
- <i data-lucide="refresh-cw" class="w-6 h-6"></i> Recyclable

🎯 ICON USAGE PATTERNS (implement these):

1. Feature Grid with Icons:
<div class="grid grid-cols-2 md:grid-cols-3 gap-6">
  <div class="text-center p-6 bg-white rounded-lg shadow-sm">
    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[${designTokens.primary}]/10 flex items-center justify-center">
      <i data-lucide="sparkles" class="w-8 h-8 text-[${designTokens.primary}]"></i>
    </div>
    <h3 class="font-bold text-gray-900 mb-2">Premium Quality</h3>
    <p class="text-sm text-gray-600">Exceptional craftsmanship</p>
  </div>
  <!-- Repeat for 5-6 features -->
</div>

2. Spec List with Icons:
<div class="space-y-3">
  <div class="flex items-center gap-3">
    <i data-lucide="ruler" class="w-5 h-5 text-[${designTokens.secondary}]"></i>
    <span class="text-gray-700">Dimensions: 10x5x3 inches</span>
  </div>
  <div class="flex items-center gap-3">
    <i data-lucide="package" class="w-5 h-5 text-[${designTokens.secondary}]"></i>
    <span class="text-gray-700">Weight: 2.5 lbs</span>
  </div>
</div>

3. Benefit Cards with Large Icons:
<div class="bg-gradient-to-br from-[${designTokens.primary}]/5 to-transparent p-8 rounded-xl">
  <i data-lucide="shield-check" class="w-12 h-12 text-[${designTokens.primary}] mb-4"></i>
  <h3 class="text-xl font-bold text-gray-900 mb-2">Protected Purchase</h3>
  <p class="text-gray-600">2-year warranty included with every order</p>
</div>

⚠️ CRITICAL: Internal Visual Analysis is for your reference ONLY.
   NEVER display this raw data to the customer in the landing page.
   Use it to inform your writing but keep it invisible.

==============================
DESIGN STYLE GUIDELINES
==============================
Apply the following style: ${selectedStyle?.option_label || 'E-commerce'}
${selectedStyle?.description || ''}

Layout Configuration: ${selectedLayout?.description || 'Single column layout with clear sections'}

Content Highlights to Emphasize:
${selectedHighlights.map(h => `  • ${h.option_label}: ${h.description || ''}`).join('\n')}

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
    - Bold headline (H1) with optional icon accent
    - 1–2 sentence benefit statement with proper contrast
    - Use colored overlay or gradient backgrounds to make text pop
  
  • FEATURE SECTIONS (RICH ICONS REQUIRED):
    - 6-8 feature cards with LARGE colorful icons
    - Each card MUST have:
      * Rounded icon container with bg-[${designTokens.primary}]/10
      * Lucide icon in primary color (w-8 h-8 minimum)
      * Bold heading + short description
    - Grid layout: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6
    - Example features: Quality, Shipping, Warranty, Eco-friendly, Award, Support
  
  • PRODUCT GALLERY:
    - Responsive grid with all images
    - 2×2 or 3×3 grid layout
    - Descriptive alt texts on every image
    - Optional: Add colored borders or shadows using primary color
  
  • SPECIFICATIONS SECTION (WITH ICONS):
    - Icon + label format for each spec
    - Use icons like: ruler (dimensions), package (weight), droplet (water-resistant)
    - High contrast: text-gray-900 on bg-white
    - Consider a two-column layout with icons
  
  • BENEFITS/HIGHLIGHTS SECTION:
    - Large icon cards (3-4 cards)
    - Use gradient backgrounds: from-[${designTokens.primary}]/5 to-transparent
    - Icons: shield-check, heart, clock, thumbs-up
    - Each card: icon (w-12 h-12) + headline + description
  
  • STORYTELLING SECTION:
    - Customer experience narrative
    - Use cases with small icons inline
    - Benefits-focused content with visual hierarchy

REQUIRED HTML STRUCTURE:
  • Tailwind classes ONLY (NO custom CSS)
  • Semantic HTML5 tags (<header>, <main>, <section>, <article>)
  • Mobile-first responsive design
  • Proper alt attributes on ALL images

==============================
DATA SOURCE PRIORITY & COHERENCE
==============================
CRITICAL - Follow this exact priority order for product information:

1. **Product Description** (HIGHEST TRUST):
   - Use existing product description as the main source of truth
   - This is the official product information - NEVER contradict it
   - If dimensions are marked as "product_description" source, display them prominently

2. **Vision AI Insights** (SECOND PRIORITY):
   - Add visual details that complement the description
   - Highlight when Vision AI confirms what's in the description
   - Use for additional visual attributes (color, material, texture, finish)

3. **SERP Data** (THIRD PRIORITY):
   - Use to validate dimensions or add missing information
   - Mention SERP validation only if it aligns with description
   - Good for confirming specifications

4. **Estimated Data** (LAST RESORT):
   - Fill gaps only when other sources are missing
   - Mark as "estimated" when displaying

COMBINING SOURCES RULES:
- DO NOT contradict the product description
- Create a coherent narrative that prioritizes accuracy over quantity
- When displaying dimensions, add a small badge indicating source:
  * "✅ Official dimensions" for product_description
  * "📸 Vision AI analyzed" for vision
  * "🔍 Verified by SERP" for serp
  * "📊 AI estimated" for estimated

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
        // Light text on light background (existing checks)
        { pattern: /text-white[^"]*bg-white|bg-white[^"]*text-white/g, issue: "text-white on bg-white" },
        { pattern: /text-white[^"]*bg-gray-50|bg-gray-50[^"]*text-white/g, issue: "text-white on bg-gray-50" },
        { pattern: /text-white[^"]*bg-gray-100|bg-gray-100[^"]*text-white/g, issue: "text-white on bg-gray-100" },
        { pattern: /text-gray-300[^"]*bg-white|bg-white[^"]*text-gray-300/g, issue: "text-gray-300 on bg-white (low contrast)" },
        { pattern: /text-gray-400[^"]*bg-gray-100|bg-gray-100[^"]*text-gray-400/g, issue: "text-gray-400 on bg-gray-100 (low contrast)" },
        
        // NEW: Dark text on dark background checks
        { pattern: /text-gray-900[^"]*bg-gray-900|bg-gray-900[^"]*text-gray-900/g, issue: "text-gray-900 on bg-gray-900" },
        { pattern: /text-gray-900[^"]*bg-gray-800|bg-gray-800[^"]*text-gray-900/g, issue: "text-gray-900 on bg-gray-800" },
        { pattern: /text-gray-900[^"]*bg-slate-900|bg-slate-900[^"]*text-gray-900/g, issue: "text-gray-900 on bg-slate-900" },
        { pattern: /text-gray-800[^"]*bg-gray-900|bg-gray-900[^"]*text-gray-800/g, issue: "text-gray-800 on bg-gray-900" },
        { pattern: /text-gray-800[^"]*bg-slate-900|bg-slate-900[^"]*text-gray-800/g, issue: "text-gray-800 on bg-slate-900" },
        { pattern: /text-black[^"]*bg-gray-900|bg-gray-900[^"]*text-black/g, issue: "text-black on bg-gray-900" },
        { pattern: /text-black[^"]*bg-slate-900|bg-slate-900[^"]*text-black/g, issue: "text-black on bg-slate-900" },
        { pattern: /text-black[^"]*bg-gray-800|bg-gray-800[^"]*text-black/g, issue: "text-black on bg-gray-800" },
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
