import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeGeneratedHTML, validateHTML } from "../_shared/html-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ NOUVELLE CLASSE POUR GESTION DES ERREURS ET FALLBACK
class AIService {
  private static readonly GEMINI_MODELS = [
    "gemini-2.0-flash", // Premier choix
    "gemini-1.5-flash", // Fallback
    "gemini-1.5-pro", // Deuxième fallback
  ];

  static async generateWithFallback(prompt: string, apiKey: string, language: string): Promise<string> {
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

  private static async callGeminiAPI(prompt: string, apiKey: string, model: string, language: string): Promise<string> {
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
        const error = new Error(`API Error ${response.status}: ${errorText}`);
        (error as any).status = response.status;
        throw error;
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
}

// ✅ FONCTIONS POUR POLICES LUXUEUSES
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

.text-gradient-premium {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
      css: `
.font-modern {
  font-family: 'Manrope', sans-serif;
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
      css: `
.font-mono-minimal {
  font-family: 'Space Grotesk', monospace;
}
`,
    },
  };

  return fontConfigs[designStyle as keyof typeof fontConfigs] || fontConfigs.modern;
}

function enhanceWithPremiumTypography(html: string, designStyle: string, designTokens: any): string {
  const fontConfig = getPremiumFontConfig(designStyle);

  // Ajouter les polices dans le head
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${fontConfig.fonts}\n</head>`);
  }

  // Ajouter les variables CSS pour les couleurs HSL
  const cssVariables = `
<style>
  :root {
    --primary: ${designTokens.primary};
    --secondary: ${designTokens.secondary};
    --accent: ${designTokens.accent};
    --background: ${designTokens.background};
    --text: ${designTokens.text};
  }
  ${fontConfig.css}
</style>
`;

  // Injecter les variables CSS dans le head
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${cssVariables}\n</head>`);
  }

  // Améliorer les titres avec des classes typographiques premium
  if (designStyle === "premium") {
    html = html
      .replace(/<h1[^>]*>/g, (match) => {
        if (!match.includes('class="')) {
          return match.replace(">", ' class="hero-title text-hero font-bold tracking-luxury">');
        }
        return match.replace('class="', 'class="hero-title text-hero font-bold tracking-luxury ');
      })
      .replace(/<h2[^>]*>/g, (match) => {
        if (!match.includes('class="')) {
          return match.replace(">", ' class="elegant-serif text-display font-semibold tracking-wide">');
        }
        return match;
      })
      .replace(/<h3[^>]*>/g, (match) => {
        if (!match.includes('class="')) {
          return match.replace(">", ' class="luxury-text text-title font-medium tracking-elegant">');
        }
        return match;
      });
  }

  return html;
}

// ✅ FONCTION AMÉLIORÉE POUR TAILWIND AVEC POLICES
function ensureTailwindConfig(html: string, designStyle: string = "modern", designTokens: any = null): string {
  const fontConfig = getPremiumFontConfig(designStyle);

  // Configuration Tailwind étendue avec polices et couleurs HSL
  const tailwindConfig = `
<script src="https://cdn.tailwindcss.com"></script>
<script>
  ${fontConfig.tailwindConfig}
</script>
${
  designTokens
    ? `
<style>
  :root {
    --primary: ${designTokens.primary};
    --secondary: ${designTokens.secondary};
    --accent: ${designTokens.accent};
    --background: ${designTokens.background};
    --text: ${designTokens.text};
  }
</style>
`
    : ""
}
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
`;
    const headEnd = html.indexOf("</head>");
    if (headEnd > -1) {
      html = html.slice(0, headEnd) + tailwindScript + html.slice(headEnd);
    }
  }

  return html;
}

// ✅ FONCTION DE FALLBACK POUR QUOTA DÉPASSÉ
function generateFallbackTemplate(
  productTitle: string,
  description: string,
  designTokens: any,
  language: string,
  designStyle: string,
): string {
  console.log("🔄 Génération du template de fallback...");

  const isFrench = language === "fr";
  const title = isFrench ? "Description du Produit" : "Product Description";
  const desc = description || (isFrench ? "Description détaillée du produit." : "Detailed product description.");

  const fontConfig = getPremiumFontConfig(designStyle);

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>${productTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${fontConfig.fonts}
    <script>
      ${fontConfig.tailwindConfig}
    </script>
    <style>
      :root {
        --primary: ${designTokens.primary};
        --secondary: ${designTokens.secondary};
        --accent: ${designTokens.accent};
        --background: ${designTokens.background};
        --text: ${designTokens.text};
      }
      ${fontConfig.css}
      
      .hero-title {
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        letter-spacing: 0.05em;
        background: linear-gradient(135deg, hsl(${designTokens.primary}) 0%, hsl(${designTokens.accent}) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
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
    <section class="min-h-screen flex items-center justify-center py-20 px-4" style="background: linear-gradient(135deg, hsl(${designTokens.primary}) 0%, hsl(${designTokens.accent}) 100%);">
        <div class="container mx-auto text-center">
            <h1 class="hero-title text-6xl md:text-8xl lg:text-9xl mb-8 leading-tight">
                ${productTitle}
            </h1>
            <p class="luxury-text text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto leading-relaxed text-white">
                ${desc}
            </p>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-20" style="background-color: hsl(${designTokens.surface})">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl md:text-6xl font-bold text-center mb-16 elegant-serif" style="color: hsl(${designTokens.primary})">
                ${isFrench ? "Caractéristiques Principales" : "Key Features"}
            </h2>
            <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div class="text-center p-8 rounded-2xl shadow-xl" style="background-color: hsl(${designTokens.background})">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background-color: hsl(${designTokens.primary}); color: hsl(${designTokens.ctaText})">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Qualité" : "Quality"}</h3>
                    <p class="text-gray-600">${isFrench ? "Matériaux de première qualité et finition exceptionnelle." : "Premium materials and exceptional finish."}</p>
                </div>
                <div class="text-center p-8 rounded-2xl shadow-xl" style="background-color: hsl(${designTokens.background})">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background-color: hsl(${designTokens.primary}); color: hsl(${designTokens.ctaText})">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Design" : "Design"}</h3>
                    <p class="text-gray-600">${isFrench ? "Esthétique raffinée et contemporaine." : "Refined and contemporary aesthetics."}</p>
                </div>
                <div class="text-center p-8 rounded-2xl shadow-xl" style="background-color: hsl(${designTokens.background})">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background-color: hsl(${designTokens.primary}); color: hsl(${designTokens.ctaText})">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-semibold mb-4">${isFrench ? "Durabilité" : "Durability"}</h3>
                    <p class="text-gray-600">${isFrench ? "Conçu pour durer dans le temps." : "Built to stand the test of time."}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 text-center">
        <div class="container mx-auto px-4">
            <h2 class="text-3xl md:text-5xl font-bold mb-8">${isFrench ? "Prêt à découvrir l'excellence ?" : "Ready to discover excellence?"}</h2>
            <button class="px-8 py-4 text-lg font-semibold rounded-full transition-transform hover:scale-105" 
                    style="background-color: hsl(${designTokens.accent}); color: hsl(${designTokens.ctaText})">
                ${isFrench ? "En savoir plus" : "Learn More"}
            </button>
        </div>
    </section>
</body>
</html>`;
}

// [GARDER TOUTES LES AUTRES FONCTIONS EXISTANTES (hexToRgb, generateDesignTokens, etc.)]
// ... (toutes les fonctions utilitaires existantes restent inchangées)

// ✅ MODIFICATION DE LA FONCTION PRINCIPALE
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

    console.log("📥 Request parameters:", {
      product_id,
      productTitle: productTitle?.substring(0, 50),
      designStyle,
      hasColorScheme: !!colorScheme,
      language,
    });

    // Auto-detect language from product title and description if not provided
    const detectedLanguage = language || detectLanguage(`${productTitle || ""} ${description || ""}`);

    // Generate design tokens
    const designTokens = generateDesignTokens(colorScheme || { primary: mainColor });

    if (!productTitle)
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!product_id)
      return new Response(JSON.stringify({ error: "Missing required field: product_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // [RESTE DU CODE EXISTANT POUR L'ENRICHISSEMENT ET LA RÉCUPÉRATION DES DONNÉES...]
    // ... (garder tout le code existant pour l'enrichissement, images, variants, etc.)

    // ✅ CORRECTION : APPEL AI AVEC SYSTÈME DE FALLBACK
    console.log("🤖 Starting AI generation with fallback system...");
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

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
    html = ensureTailwindConfig(html, designStyle, designTokens);
    html = enhanceWithPremiumTypography(html, designStyle, designTokens);

    // [RESTE DU CODE EXISTANT POUR LES DIMENSIONS, SAUVEGARDE, ETC...]
    // ... (garder tout le code existant pour les dimensions, insertion, sauvegarde)

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

// [GARDER TOUTES LES FONCTIONS EXISTANTES (clamp, hexToRgb, generateDesignTokens, etc.)]
// ... (toutes les autres fonctions restent inchangées)
