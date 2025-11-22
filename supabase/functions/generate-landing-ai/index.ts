import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeGeneratedHTML, validateHTML } from "../_shared/html-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ CORRECTION : Gestion améliorée des erreurs d'API et fallback
class AIService {
  private static readonly GEMINI_MODELS = [
    "gemini-2.0-flash", // Premier choix
    "gemini-1.5-flash", // Fallback
    "gemini-1.5-pro", // Deuxième fallback
  ];

  private static readonly LOVABLE_MODELS = [
    "google/gemini-2.0-flash",
    "google/gemini-1.5-flash",
    "google/gemini-1.5-pro",
  ];

  static async generateWithFallback(prompt: string, apiKey: string, language: string) {
    let lastError: any = null;

    for (const model of this.GEMINI_MODELS) {
      try {
        console.log(`🤖 Tentative avec le modèle: ${model}`);
        const result = await this.callGeminiAPI(prompt, apiKey, model, language);
        return result;
      } catch (error: any) {
        console.warn(`❌ Échec avec ${model}:`, error.message);
        lastError = error;

        // Si c'est une erreur de quota, attendre avant de réessayer
        if (error.status === 429) {
          console.log(`⏳ Attente de 2s avant prochain modèle...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        continue;
      }
    }

    throw new Error(`Tous les modèles Gemini ont échoué: ${lastError?.message}`);
  }

  private static async callGeminiAPI(prompt: string, apiKey: string, model: string, language: string) {
    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 45000); // 45s timeout

    try {
      const systemPrompt =
        language === "en"
          ? "You are a professional content writer for product landing pages. Create informative, engaging HTML content that describes products in detail. Focus on product features, specifications, and benefits. NEVER include purchase buttons, navigation menus, or call-to-action elements."
          : "Tu es un rédacteur professionnel de contenu pour des landing pages produit. Tu crées du contenu HTML informatif et engageant qui décrit les produits en détail. Concentre-toi sur les caractéristiques, spécifications et avantages du produit. N'inclus JAMAIS de boutons d'achat, menus de navigation ou éléments call-to-action.";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n" + prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16000,
            },
          }),
          signal: aiController.signal,
        },
      );

      clearTimeout(aiTimeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawHtml = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!rawHtml || rawHtml.length < 400) {
        throw new Error("Contenu généré trop court");
      }

      return rawHtml;
    } catch (error: any) {
      clearTimeout(aiTimeout);
      throw error;
    }
  }

  static async analyzeImageWithFallback(imageUrl: string, apiKey: string) {
    for (const model of this.LOVABLE_MODELS) {
      try {
        console.log(`🖼️ Analyse d'image avec: ${model}`);
        const result = await this.callLovableAPI(imageUrl, apiKey, model);
        return result;
      } catch (error: any) {
        console.warn(`❌ Échec analyse image avec ${model}:`, error.message);
        continue;
      }
    }
    throw new Error("Tous les modèles d'analyse d'image ont échoué");
  }

  private static async callLovableAPI(imageUrl: string, apiKey: string, model: string) {
    // Implémentation existante de l'analyse d'image...
    // (garder le code existant mais avec le modèle dynamique)
    const visionController = new AbortController();
    const visionTimeout = setTimeout(() => visionController.abort(), 15000);

    try {
      // ... code existant de l'analyse d'image
      return { success: true, model };
    } finally {
      clearTimeout(visionTimeout);
    }
  }
}

// ✅ NOUVELLES FONCTIONS POUR POLICES LUXUEUSES
function getPremiumFontConfig(designStyle: string) {
  const fontConfigs = {
    premium: {
      name: "ULTRA-LUXE - Polices Premium",
      fonts: `
<!-- Google Fonts pour style premium -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap" rel="stylesheet">
`,
      tailwindConfig: `
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
        'elegant': ['Cormorant Garamond', 'serif'],
      },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.1' }],
        'display': ['3.5rem', { lineHeight: '1.1' }],
        'title': ['2.5rem', { lineHeight: '1.2' }],
      },
      letterSpacing: {
        'luxury': '0.05em',
        'elegant': '0.1em',
      }
    }
  }
}
`,
      css: `
.hero-title {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.luxury-text {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.elegant-serif {
  font-family: 'Playfair Display', serif;
}
`,
    },
    modern: {
      name: "MODERNE - Polices Élégantes",
      fonts: `
<!-- Google Fonts pour style moderne -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
`,
      tailwindConfig: `
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'modern': ['Manrope', 'sans-serif'],
      }
    }
  }
}
`,
    },
    minimalist: {
      name: "MINIMALISTE - Polices Épurées",
      fonts: `
<!-- Google Fonts pour style minimaliste -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Space+Grotesk:wght@300;400;500&display=swap" rel="stylesheet">
`,
      tailwindConfig: `
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['Space Grotesk', 'monospace'],
      }
    }
  }
}
`,
    },
  };

  return fontConfigs[designStyle as keyof typeof fontConfigs] || fontConfigs.modern;
}

function enhanceWithPremiumTypography(html: string, designStyle: string): string {
  const fontConfig = getPremiumFontConfig(designStyle);

  // Ajouter les polices dans le head
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${fontConfig.fonts}\n</head>`);
  }

  // Améliorer les titres avec des classes typographiques premium
  if (designStyle === "premium") {
    html = html
      .replace(/<h1[^>]*>/g, (match) => {
        if (!match.includes('class="')) {
          return match.replace(">", ' class="hero-title">');
        }
        return match.replace('class="', 'class="hero-title ');
      })
      .replace(/<h2[^>]*>/g, (match) => {
        if (!match.includes('class="')) {
          return match.replace(">", ' class="elegant-serif text-display font-bold tracking-luxury">');
        }
        return match;
      });
  }

  return html;
}

// ✅ FONCTION AMÉLIORÉE POUR TAILWIND AVEC POLICES
function ensureTailwindConfig(html: string, designStyle: string = "modern"): string {
  const fontConfig = getPremiumFontConfig(designStyle);

  // Configuration Tailwind étendue avec polices
  const tailwindConfig = `
<script src="https://cdn.tailwindcss.com"></script>
<script>
  ${fontConfig.tailwindConfig}
</script>
<style>
  ${designStyle === "premium" ? fontConfig.css : ""}
</style>
`;

  // Vérifier et corriger la configuration Tailwind
  if (!html.includes("cdn.tailwindcss.com")) {
    console.log("⚠️ Tailwind CDN manquant, ajout avec polices premium...");
    const headEnd = html.indexOf("</head>");
    if (headEnd > -1) {
      html = html.slice(0, headEnd) + tailwindConfig + html.slice(headEnd);
    }
  } else if (!html.includes("fontFamily")) {
    // Ajouter la configuration des polices si manquante
    console.log("⚠️ Configuration polices manquante, ajout...");
    const tailwindScript = `
<script>
  ${fontConfig.tailwindConfig}
</script>
<style>
  ${designStyle === "premium" ? fontConfig.css : ""}
</style>
`;
    const headEnd = html.indexOf("</head>");
    if (headEnd > -1) {
      html = html.slice(0, headEnd) + tailwindScript + html.slice(headEnd);
    }
  }

  return html;
}

// ✅ PROMPT AMÉLIORÉ AVEC INSTRUCTIONS TYPOGRAPHIQUES PRÉCISES
function getEnhancedPrompt(
  originalPrompt: string,
  designStyle: string,
  designTokens: any,
  detectedLanguage: string,
): string {
  const fontInstructions = getPremiumFontConfig(designStyle);

  const typographyEnhancements =
    detectedLanguage === "en"
      ? `
🎨 **PREMIUM TYPOGRAPHY SYSTEM (STRICTLY ENFORCED):**

${fontInstructions.name}

🚨 CRITICAL TYPOGRAPHY RULES:
- ALWAYS use the provided font classes in your HTML
- For PREMIUM style: Use 'hero-title', 'elegant-serif', 'luxury-text' classes
- Headings: Use font-serif for premium, font-sans for modern, font-mono for minimalist
- Letter spacing: tracking-wide, tracking-wider, tracking-luxury for premium
- Font weights: Use light (300), regular (400), medium (500), semibold (600), bold (700)
- Line height: leading-tight for headings, leading-relaxed for body text

📐 TYPOGRAPHY SCALE:
- H1: text-6xl md:text-8xl lg:text-hero (premium) / text-5xl md:text-7xl (modern)
- H2: text-4xl md:text-6xl lg:text-display (premium) / text-3xl md:text-5xl (modern)  
- H3: text-2xl md:text-4xl lg:text-title (premium) / text-xl md:text-3xl (modern)
- Body: text-base md:text-lg leading-relaxed

✨ PREMIUM TEXT EFFECTS:
- Text shadows: style="text-shadow: 0 2px 4px rgba(0,0,0,0.5)"
- Gradient text: style="background: linear-gradient(135deg, hsl(${designTokens.primary}) 0%, hsl(${designTokens.accent}) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
- Letter spacing: tracking-wider, tracking-widest for luxury feel
`
      : `
🎨 **SYSTÈME TYPOGRAPHIQUE PREMIUM (STRICTEMENT APPLIQUÉ):**

${fontInstructions.name}

🚨 RÈGLES TYPOGRAPHIQUES CRITIQUES :
- TOUJOURS utiliser les classes de polices fournies dans votre HTML
- Pour le style PREMIUM : Utiliser les classes 'hero-title', 'elegant-serif', 'luxury-text'
- Titres : Utiliser font-serif pour premium, font-sans pour moderne, font-mono pour minimaliste
- Espacement des lettres : tracking-wide, tracking-wider, tracking-luxury pour premium
- Poids de police : Utiliser light (300), regular (400), medium (500), semibold (600), bold (700)
- Hauteur de ligne : leading-tight pour les titres, leading-relaxed pour le texte courant

📐 ÉCHELLE TYPOGRAPHIQUE :
- H1 : text-6xl md:text-8xl lg:text-hero (premium) / text-5xl md:text-7xl (modern)
- H2 : text-4xl md:text-6xl lg:text-display (premium) / text-3xl md:text-5xl (modern)
- H3 : text-2xl md:text-4xl lg:text-title (premium) / text-xl md:text-3xl (modern)
- Corps : text-base md:text-lg leading-relaxed

✨ EFFETS TEXTE PREMIUM :
- Ombres texte : style="text-shadow: 0 2px 4px rgba(0,0,0,0.5)"
- Texte dégradé : style="background: linear-gradient(135deg, hsl(${designTokens.primary}) 0%, hsl(${designTokens.accent}) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
- Espacement lettres : tracking-wider, tracking-widest pour effet luxueux
`;

  return originalPrompt + typographyEnhancements;
}

// 🎨 STYLES PREMIUM AMÉLIORÉS
const styleTemplates = {
  // ... [garder les styles existants mais améliorer le premium] ...
  premium: {
    name: "PREMIUM ULTRA-LUXE - Polices & Élégance",
    description: "ULTRA-LUXE: Backgrounds sombres, polices serif élégantes, typographie raffinée, effets riches",
    rules: `
🎨 STYLE PREMIUM ULTRA-LUXE (STRICTEMENT APPLIQUÉ):
================================================
POLICES & TYPOGRAPHIE - LUXUEUSES SERIF:
- ✅ Polices Google Fonts: Playfair Display + Cormorant Garamond + Inter
- ✅ Titres: font-serif (Playfair Display) avec tracking-wide
- ✅ Sous-titres: font-elegant (Cormorant Garamond) avec letter-spacing
- ✅ Corps: font-sans (Inter) pour une lisibilité parfaite
- ✅ Tailles custom: text-hero, text-display, text-title

PALETTE COULEURS - SOPHISTIQUÉE SOMBRE:
- ✅ Background SOMBRE: bg-gray-900, bg-slate-900, bg-zinc-900
- ✅ Accents métalliques: or (#D4AF37), argent, bronze
- ✅ Dégradés complexes multi-stops avec effets de brillance
- ✅ Texte sur fond sombre: text-gray-100, text-white avec ombres

EFFETS TYPOGRAPHIQUES - RICHESSE VISUELLE:
- ✅ Text shadows: text-shadow: 0 2px 4px rgba(0,0,0,0.8)
- ✅ Gradient text: bg-gradient-to-r from-gold to-silver bg-clip-text text-transparent
- ✅ Letter spacing: tracking-wider, tracking-widest, tracking-luxury
- ✅ Font weights variés: 300 (light), 400 (regular), 600 (semibold), 700 (bold)

ESPACES - TRÈS GÉNÉREUX:
- ✅ Sections: py-20 md:py-40 lg:py-52 (espacement royal)
- ✅ Entre éléments: space-y-20 md:space-y-28
- ✅ Containers: max-w-8xl avec marges luxueuses

ÉLÉMENTS VISUELS - PROFONDEUR EXTRA:
- ✅ Ombres portées multiples: shadow-2xl, shadow-3xl
- ✅ Bordures très arrondies: rounded-3xl, rounded-full
- ✅ Overlays subtils: backdrop-blur-md, bg-black/30
- ✅ Images: Cadres avec ombres et reflets subtils
- ✅ Effets de brillance: glow, shimmer avec animations

ICÔNES - COMPLEXES ET BRILLANTES:
- ✅ Taille imposante: w-14 h-14 lg:w-18 lg:h-18
- ✅ Dégradés 3+ couleurs avec effets métalliques
- ✅ Filters: feGaussianBlur, feColorMatrix pour effets luxueux
- ✅ Strokes épais: stroke-width="3.5"
- ✅ Effets de lumière: multiple layers, opacités variables
`,
  },
};

// 🎯 CODE PRINCIPAL MIS À JOUR
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // [Code d'authentification existant...]
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) userId = user.id;
    }

    const body = await req.json();
    const {
      product_id,
      productTitle: initialProductTitle,
      imageUrl,
      description,
      vendor,
      style,
      mainColor = "#3B82F6",
      colorScheme,
      layout,
      length,
      customHighlights,
      language,
      designStyle = "modern",
      imageAnalysis,
    } = body ?? {};

    let productTitle = initialProductTitle;
    const detectedLanguage = language || detectLanguage(`${productTitle || ""} ${description || ""}`);
    const designTokens = generateDesignTokens(colorScheme || { primary: mainColor });

    // ✅ CORRECTION : Gestion des erreurs de quota
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    // [Code de préparation et enrichissement existant...]

    // ✅ APPEL AI AVEC FALLBACK
    console.log("🤖 Starting AI generation with fallback system...");
    let rawHtml: string;

    try {
      rawHtml = await AIService.generateWithFallback(prompt, GOOGLE_GEMINI_API_KEY, detectedLanguage);
      console.log("✅ AI generation completed successfully");
    } catch (error: any) {
      console.error("❌ All AI models failed:", error);

      // Fallback ultime : template basique
      if (error.message.includes("quota") || error.message.includes("429")) {
        console.log("🔄 Using fallback template due to quota limits");
        rawHtml = generateFallbackTemplate(productTitle, description, designTokens, detectedLanguage, designStyle);
      } else {
        throw error;
      }
    }

    // ✅ APPLICATION DES AMÉLIORATIONS TYPOGRAPHIQUES
    let html = sanitizeGeneratedHTML(rawHtml, productTitle, detectedLanguage || "en");
    html = ensureTailwindConfig(html, designStyle);
    html = enhanceWithPremiumTypography(html, designStyle);

    // [Reste du code existant...]

    console.log("✅ Landing page generation successful with premium typography!");
    return new Response(
      JSON.stringify({
        html: finalHtml,
        enrichment_status: enrichmentStatus,
        attributes_count: attributesCount,
        ai_model: "gemini-with-fallback",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("💥 ERROR:", error.message);

    // ✅ GESTION D'ERREUR AMÉLIORÉE
    return new Response(
      JSON.stringify({
        error: error.message,
        suggestion: "Please try again in a few minutes or contact support if the issue persists.",
      }),
      {
        status: error.message.includes("quota") ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// ✅ TEMPLATE DE FALLBACK POUR QUOTA DÉPASSÉ
function generateFallbackTemplate(
  productTitle: string,
  description: string,
  designTokens: any,
  language: string,
  designStyle: string,
): string {
  console.log("🔄 Generating fallback template...");

  const isFrench = language === "fr";
  const title = isFrench ? "Description du Produit" : "Product Description";
  const desc = description || (isFrench ? "Description détaillée du produit." : "Detailed product description.");

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .hero-title {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            letter-spacing: 0.05em;
        }
        .luxury-text {
            font-family: 'Cormorant Garamond', serif;
            font-weight: 300;
            letter-spacing: 0.1em;
        }
    </style>
</head>
<body style="background-color: hsl(${designTokens.background}); color: hsl(${designTokens.text})">
    <!-- Hero Section -->
    <section class="min-h-screen flex items-center justify-center py-20">
        <div class="container mx-auto px-4 text-center">
            <h1 class="hero-title text-6xl md:text-8xl lg:text-9xl mb-8" style="color: hsl(${designTokens.primary})">
                ${productTitle}
            </h1>
            <p class="luxury-text text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto leading-relaxed">
                ${desc}
            </p>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-20" style="background-color: hsl(${designTokens.surface})">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl md:text-6xl font-bold text-center mb-16 elegant-serif">
                ${isFrench ? "Caractéristiques Principales" : "Key Features"}
            </h2>
            <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div class="text-center p-8 rounded-2xl" style="background-color: hsl(${designTokens.background})">
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Qualité" : "Quality"}</h3>
                    <p>${isFrench ? "Matériaux de première qualité et finition exceptionnelle." : "Premium materials and exceptional finish."}</p>
                </div>
                <div class="text-center p-8 rounded-2xl" style="background-color: hsl(${designTokens.background})">
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Design" : "Design"}</h3>
                    <p>${isFrench ? "Esthétique raffinée et contemporaine." : "Refined and contemporary aesthetics."}</p>
                </div>
                <div class="text-center p-8 rounded-2xl" style="background-color: hsl(${designTokens.background})">
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Durabilité" : "Durability"}</h3>
                    <p>${isFrench ? "Conçu pour durer dans le temps." : "Built to stand the test of time."}</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`;
}

// [Garder toutes les autres fonctions existantes (hexToRgb, generateDesignTokens, etc.)]
