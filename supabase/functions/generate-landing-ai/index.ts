import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ✅ CORS Headers — sécurisé et compatible front
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** ----------------------------------------------------------------
 * 🧠 Function: Generate landing page HTML via Lovable AI Gateway
 * ----------------------------------------------------------------*/
serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🛡️ VÉRIFICATION DES LIMITES AVANT GÉNÉRATION
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      
      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        
        // Récupérer usage actuel
        const { data: usage } = await supabaseAdmin
          .from('usage_tracking')
          .select('optimizations_count')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        // Récupérer profil et plan
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();
        
        const { data: plan } = await supabaseAdmin
          .from('subscription_plans')
          .select('max_optimizations_monthly, trial_max_optimizations')
          .eq('id', profile?.current_plan_id || 'trial')
          .single();
        
        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations = profile?.subscription_status === 'trialing' 
          ? (plan?.trial_max_optimizations || 50)
          : (plan?.max_optimizations_monthly || 999999);
        
        console.log(`[generate-landing-ai] 🔍 Usage check: ${currentUsage}/${maxOptimizations}`);
        
        // ❌ BLOQUER si limite atteinte
        if (currentUsage >= maxOptimizations) {
          console.error(`[generate-landing-ai] ❌ LIMIT REACHED: ${currentUsage}/${maxOptimizations}`);
          return new Response(
            JSON.stringify({ 
              error: 'LIMIT_REACHED',
              message: 'Limite d\'optimisations atteinte. Passez à un plan supérieur.',
              usage: currentUsage,
              limit: maxOptimizations
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // ✅ Incrémenter IMMÉDIATEMENT (avant génération pour éviter les abus)
        const LANDING_PAGE_COST = 5; // 1 landing page = 5 optimisations (valeur augmentée car contenu riche + Vision AI + design personnalisé)
        
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: LANDING_PAGE_COST
        });
        
        console.log(`[generate-landing-ai] ✅ Usage incremented: +${LANDING_PAGE_COST} (now ${currentUsage + LANDING_PAGE_COST}/${maxOptimizations})`);
      }
    }
    
    const body = await req.json();

    const { 
      productTitle, 
      imageUrl, 
      allImages = [], 
      description, 
      vendor, 
      variants = null,
      style, 
      mainColor, 
      layout, 
      length, 
      customHighlights,
      imageAnalysis 
    } = body ?? {};

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY in environment variables");
    }

    // 🧩 Dynamic tone based on length
    const tone =
      length === "courte (400 mots)"
        ? "concis"
        : length === "moyenne (800 mots)"
          ? "équilibré"
          : "détaillé et approfondi";

    // 🔍 Use provided image analysis or empty string
    const visualAnalysis = imageAnalysis || "";
    
    // 🎨 Format variant information
    let variantInfo = "";
    if (variants && variants.length > 0) {
      const variantList = variants.map((v: any, i: number) => {
        let variantText = `${i + 1}. ${v.title}\n   - Prix: ${v.price || "N/A"}`;
        if (v.compare_at_price) variantText += `\n   - Prix barré: ${v.compare_at_price}`;
        if (v.image_url) variantText += `\n   - Image: ${v.image_url}`;
        return variantText;
      }).join("\n");
      
      variantInfo = `
📦 VARIANTES DU PRODUIT (${variants.length} variantes disponibles) :
${variantList}

⚠️ **CRITIQUE** : Tu DOIS mentionner ces variantes dans le contenu :
- Créer une section "Options disponibles" avec les variantes
- Afficher les images des variantes si disponibles
- Mettre en avant la diversité des choix
- Encourager l'utilisateur à explorer toutes les options
`;
    }

    // 🖼️ Format gallery information
    let galleryInfo = "";
    if (allImages && allImages.length > 1) {
      const imageList = allImages.map((url: string, i: number) => `${i + 1}. ${url}`).join("\n");
      galleryInfo = `
🖼️ GALERIE D'IMAGES (${allImages.length} images disponibles) :
${imageList}

⚠️ **CRITIQUE** : Tu DOIS utiliser ces images dans la landing page :
- Créer une galerie photo élégante
- Afficher plusieurs angles du produit
- Utiliser un carousel ou une grille d'images
- Permettre d'agrandir les images au clic
`;
    }

    // 🎨 STYLE GUIDES
    const styleGuides: Record<string, string> = {
      'moderne': 'Gradients subtils, ombres douces, coins arrondis (rounded-2xl), espacements généreux, typographie sans-serif (font-sans), palette noir/blanc avec accents de couleur vive',
      'minimaliste': 'Beaucoup d\'espace blanc, typographie épurée, pas de décorations superflues, 1-2 couleurs max, lignes fines (border), sans ombres ou ombres ultra-légères (shadow-sm)',
      'scandinave': 'Tons naturels (beige, blanc cassé, gris clair), bois et textures organiques suggérées, simplicité fonctionnelle, typographie claire, ambiance chaleureuse et accueillante',
      'premium': 'Or/noir/blanc, typographie serif (font-serif) pour titres, ombres prononcées (shadow-2xl), gradients métalliques, espacements larges, détails raffinés',
      'neutre': 'Gris/blanc/noir uniquement, pas de couleurs vives, design sobre, typographie classique, structure équilibrée',
      'coloré': 'Palette vibrante multi-couleurs, dégradés audacieux, énergie visuelle, contrastes forts, design dynamique'
    };

    const currentStyleGuide = styleGuides[style] || styleGuides['moderne'];

    // 🪄 ENHANCED AI PROMPT
    const prompt = `
Tu es un designer UX/UI expert et copywriter e-commerce spécialisé dans les landing pages à forte conversion.

📦 PRODUIT À METTRE EN VALEUR :
- Titre : ${productTitle}
${vendor ? `- Marque : ${vendor}` : ""}
${imageUrl ? `- Image principale : ${imageUrl}` : ""}
${description ? `- Description : ${description}` : ""}
${customHighlights ? `\n🌟 POINTS FORTS À METTRE EN AVANT (PRIORITAIRE) :\n${customHighlights.split('\n').map((h: string) => `- ${h.trim()}`).filter((h: string) => h.length > 2).join('\n')}` : ""}

${galleryInfo}
${variantInfo}

${visualAnalysis ? `
🔍 VISION AI - RÈGLE ABSOLUE :
${visualAnalysis}
⚠️ **CRITIQUE** : Tu DOIS utiliser ces informations Vision AI dans le contenu :
- Mentionner la couleur dominante dans la description
- Intégrer le style visuel identifié dans le copywriting
- Référencer les matériaux détectés
- Évoquer l'ambiance et la qualité perçue
- Adapter le ton et les bénéfices selon l'analyse visuelle
` : ""}

🎨 DESIGN & STYLE :
- Style visuel : ${style}
  → Guide : ${currentStyleGuide}
- Couleur principale (HEX) : ${mainColor}
  → **CRITIQUE** : Applique cette couleur aux boutons CTA, liens, bordures d'accent, titres importants
  → Utilise Tailwind avec style="color: ${mainColor}" ou style="background-color: ${mainColor}" ou style="border-color: ${mainColor}"
- Layout : ${layout}
- **LONGUEUR STRICTE** : ${length} (ton ${tone})
  ⚠️ **RÈGLE ABSOLUE** : Respecte EXACTEMENT la longueur demandée :
  - "courte (400 mots)" = 350-450 mots MAX
  - "moyenne (800 mots)" = 700-900 mots
  - "longue (1200 mots)" = 1100-1300 mots
  NE PAS dépasser ces limites, c'est une contrainte client non négociable.
- **DESIGN ÉLÉGANT** : Évite les icônes colorées enfantines, privilégie des icônes monochromes (text-gray-600), des formes simples et épurées, un design sophistiqué et professionnel

🧱 STRUCTURE OBLIGATOIRE :
1. HERO SECTION
   - Titre H1 avec la couleur principale (style="color: ${mainColor}")
   - Sous-titre accrocheur${vendor ? ` mentionnant "${vendor}"` : ""}
   - Image produit (si disponible) avec rounded-2xl et shadow-xl
   - CTA principal avec background de la couleur principale (style="background-color: ${mainColor}")

2. AVANTAGES (3-5 cartes)
   - **Icônes élégantes** : SVG monochromes simples (text-gray-600 ou text-gray-700), PAS de couleurs vives ou enfantines
   - Design épuré et sophistiqué
   - Titres courts et percutants
   - Descriptions de 20-30 mots${visualAnalysis ? "\n   - **Intégrer les insights Vision AI** dans les avantages (couleurs, matériaux, style)" : ""}

${galleryInfo ? "3. GALERIE D'IMAGES (OBLIGATOIRE si plusieurs images disponibles)\n   - Carousel ou grille responsive d'images\n   - Affichage de TOUTES les images disponibles\n   - Permettre d'agrandir les images\n   - Navigation fluide entre images\n" : ""}
${variantInfo ? (galleryInfo ? "4" : "3") + ". VARIANTES PRODUIT (OBLIGATOIRE si variantes disponibles)\n   - Section dédiée aux options/variantes\n   - Affichage de TOUTES les variantes avec images\n   - Prix clairement visibles\n   - Boutons de sélection interactifs (visuellement)\n" : ""}
${galleryInfo || variantInfo ? (galleryInfo && variantInfo ? "5" : "4") : "3"}. CARACTÉRISTIQUES TECHNIQUES
   - Liste structurée avec badges/pills
   - Informations concrètes${visualAnalysis ? " (utilise les insights Vision AI)" : ""}

${galleryInfo || variantInfo ? (galleryInfo && variantInfo ? "6" : "5") : "4"}. CTA FINAL
   - Bouton principal avec couleur principale
   - Message d'urgence/garantie

${galleryInfo || variantInfo ? (galleryInfo && variantInfo ? "7" : "6") : "5"}. GARANTIES / LIVRAISON
   - 3-4 éléments rassurants (livraison, retour, garantie, support)

📱 RESPONSIVE MOBILE-FIRST (CRITIQUE - RÈGLE ABSOLUE) :
⚠️ **NON NÉGOCIABLE** : Le design DOIT être PARFAIT sur mobile (320px-428px) AVANT desktop
- **Test mental** : Visualise CHAQUE élément sur un iPhone SE (320px) avant de coder
- Structure : <div class="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl">
- Hero : <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-center">
- Grid avantages : <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
- Images : <img class="w-full h-auto object-cover rounded-lg sm:rounded-xl max-w-full" />
- Texte lisible mobile : text-xs sm:text-sm md:text-base lg:text-lg (JAMAIS de texte < 12px)
- Titres adaptatifs : text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl
- Padding mobile : p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8
- Gap progressif : gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8
- Boutons pleine largeur mobile : w-full sm:w-auto py-3 (touch-friendly 44px min)
- **Pas de scroll horizontal** : overflow-x-hidden + max-w-full sur TOUS les conteneurs
- **Touch targets** : min-h-[44px] min-w-[44px] sur tous les éléments cliquables
- **Lisibilité** : line-height-relaxed (1.6) sur paragraphes, max-w-prose pour limiter longueur lignes

🛠️ CONTRAINTES TECHNIQUES :
✅ Tailwind CSS uniquement (CDN déjà chargé)
✅ Classes responsive : sm:, md:, lg:, xl:
✅ Couleur principale via style="color: ${mainColor}" ou style="background-color: ${mainColor}"
✅ Pas de <html>, <head>, <body>
✅ Pas de <style> inline (sauf pour appliquer mainColor)
✅ HTML prêt à injecter dans React dangerouslySetInnerHTML
❌ Pas de JavaScript
❌ Pas de balises <script>
❌ NE PAS UTILISER de marqueurs markdown comme \`\`\`html ou \`\`\`

💡 COPYWRITING :
- Ton ${tone}, ${vendor ? `mettant en valeur la marque "${vendor}"` : "naturel et convaincant"}
- Bénéfices avant caractéristiques
- Preuve sociale (si pertinent)
- Appels à l'action clairs et directs

🎯 RETOURNE UNIQUEMENT LE HTML (sans balises markdown, sans explications, sans balises <html>/<head>/<body>)
`;

    console.log("[generate-landing-ai] 🧠 Sending prompt to Lovable Gateway...");
    console.log("[generate-landing-ai] Request details:", { 
      productTitle, 
      style, 
      layout, 
      length,
      hasImage: !!imageUrl 
    });

    // 🔄 Retry logic for temporary failures
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[generate-landing-ai] Attempt ${attempt}/${MAX_RETRIES}`);

        // 🧠 Call Lovable AI Gateway (Gemini or GPT-based)
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
                content:
                  "Tu es un expert UX/UI designer et copywriter e-commerce. Génère des landing pages Tailwind modernes et efficaces pour Shopify.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 3000,
          }),
        });

        // 🧱 Handle API errors - retry on 503/502/504
        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate-landing-ai] ❌ API error (attempt ${attempt}):`, response.status, errText);

          // Permanent errors - don't retry
          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              error: "Rate limits exceeded. Please try again later." 
            }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (response.status === 402) {
            return new Response(JSON.stringify({ 
              error: "Payment required. Please add funds to your Lovable AI workspace." 
            }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Temporary errors (503, 502, 504) - retry
          if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue; // Try again
          }

          // Other errors or last attempt
          const errorMessage = `Lovable AI API error: ${response.status}`;
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // ✅ Success - parse response and exit retry loop
        const data = await response.json().catch(() => null);
        let html = data?.choices?.[0]?.message?.content?.trim() || "";

        // 🧹 CLEAN HTML - Remove markdown code blocks
        if (html) {
          html = html
            .replace(/^```html\s*/i, '')  // Remove ```html at start
            .replace(/^```\s*/m, '')       // Remove ``` at start
            .replace(/\s*```$/m, '')       // Remove ``` at end
            .trim();
          
          console.log("[generate-landing-ai] 🧹 HTML cleaned, final length:", html.length);
        }

        console.log("[generate-landing-ai] Response status:", response.status);
        console.log("[generate-landing-ai] AI response parsed, HTML length:", html.length);

        if (!html) {
          console.warn("[generate-landing-ai] ⚠️ Empty HTML response from AI");
          
          // If we have retries left, try again
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to empty response...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: "Aucune réponse générée par l'IA. Essayez avec un prompt plus simple ou un style différent.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Validation du HTML généré
        if (html.includes('<html') || html.includes('<head') || html.includes('<body')) {
          console.warn("[generate-landing-ai] ⚠️ HTML contains forbidden tags (html/head/body)");
          return new Response(
            JSON.stringify({
              error: "Le HTML généré contient des balises interdites. Réessayez.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (html.length < 500) {
          console.warn("[generate-landing-ai] ⚠️ Generated HTML too short:", html.length);
          
          // If we have retries left, try again
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to short content...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: "Le contenu généré est trop court. Réessayez avec plus de détails.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        console.log("[generate-landing-ai] ✅ Generated HTML length:", html.length, "chars");

        // ✅ Success
        return new Response(JSON.stringify({ html }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (networkError) {
        lastError = networkError instanceof Error ? networkError : new Error(String(networkError));
        console.error(`[generate-landing-ai] 💥 Network error (attempt ${attempt}):`, lastError);
        
        // Retry on network errors if we have attempts left
        if (attempt < MAX_RETRIES) {
          console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to network error...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    // If we get here, all retries failed
    console.error("[generate-landing-ai] ❌ All retry attempts failed");
    return new Response(
      JSON.stringify({
        error: lastError?.message || "Service temporairement indisponible. Veuillez réessayer dans quelques instants.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (err) {
    console.error("[generate-landing-ai] 💥 Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
