import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const requestData = await req.json();

    if (requestData.mode === "auto") {
      console.log("Mode auto : génération d'articles de campagnes...");

      const now = new Date();

      // Récupérer les campagnes actives qui doivent être exécutées
      const { data: campaigns, error: campaignError } = await supabase
        .from("blog_campaigns")
        .select("*")
        .eq("is_active", true)
        .lte("next_execution_at", now.toISOString())
        .limit(requestData.limit || 10);

      if (campaignError) throw campaignError;

      if (!campaigns?.length) {
        console.log("Aucune campagne à exécuter pour le moment");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Aucune campagne à exécuter.",
            campaigns_checked: 0,
          }),
          { status: 200, headers: corsHeaders },
        );
      }

      console.log(`${campaigns.length} campagnes à traiter`);

      const results = [];
      for (const campaign of campaigns) {
        try {
          // Générer l'article avec les paramètres de la campagne
          const res = await generateSingleArticle(
            {
              user_id: campaign.user_id,
              category: campaign.topic_niche || "Guide",
              keywords: campaign.keywords || [],
              title: null,
              articleLength: "2000",
            },
            supabase,
            lovableApiKey,
          );

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            ...res,
          });

          // Mettre à jour la campagne avec la prochaine date d'exécution
          if (res.success) {
            const nextExecution = calculateNextExecution(campaign.frequency, now);

            await supabase
              .from("blog_campaigns")
              .update({
                last_generation_date: now.toISOString(),
                next_execution_at: nextExecution.toISOString(),
              })
              .eq("id", campaign.id);

            console.log(`✅ Campagne ${campaign.name} - Prochain article: ${nextExecution.toISOString()}`);
          }
        } catch (err) {
          console.error(`❌ Erreur campagne ${campaign.name}:`, err);
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${results.filter((r) => r.success).length}/${campaigns.length} articles générés.`,
          results,
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    function calculateNextExecution(frequency: string, lastExecution: Date): Date {
      const next = new Date(lastExecution);

      switch (frequency) {
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "biweekly":
          next.setDate(next.getDate() + 14);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        default:
          next.setDate(next.getDate() + 7); // Par défaut: hebdomadaire
      }

      return next;
    }

    const result = await generateSingleArticle(requestData, supabase, lovableApiKey);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

async function generateSingleArticle(requestData: any, supabaseClient: any, apiKey: string, authHeader?: string) {
  try {
    const {
      user_id,
      category = "Guide",
      keywords = [],
      title,
      articleLength = "2000",
      collectionTitle = "",
      productIds = [],
      articleConfig = {}, // 🆕 Article configuration
    } = requestData;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // ✅ AUTO-DETECT SHOP LANGUAGE FROM DATABASE
    console.log("🌍 Détection automatique de la langue de la boutique...");
    let detectedLanguage = "fr"; // Default
    
    try {
      // First, try to detect from store URL
      const { data: storeData } = await supabaseClient
        .from("shopify_connections")
        .select("store_url")
        .eq("user_id", user_id)
        .single();
      
      if (storeData?.store_url) {
        const domain = storeData.store_url.toLowerCase();
        if (domain.includes(".com") && !domain.includes(".fr")) {
          detectedLanguage = "en";
        } else if (domain.includes(".es")) {
          detectedLanguage = "es";
        } else if (domain.includes(".de")) {
          detectedLanguage = "de";
        } else if (domain.includes(".it")) {
          detectedLanguage = "it";
        }
        console.log(`✅ Langue détectée depuis l'URL: ${detectedLanguage}`);
      }

      // Fallback: detect from products titles
      if (detectedLanguage === "fr") {
        const { data: productsData } = await supabaseClient
          .from("shopify_products")
          .select("title, description")
          .eq("seller_id", user_id)
          .limit(5);
        
        if (productsData && productsData.length > 0) {
          const sampleText = productsData.map((p: any) => `${p.title} ${p.description}`).join(" ").toLowerCase();
          
          // Simple language detection patterns
          const patterns = {
            en: /\b(the|and|for|with|from|this|that)\b/g,
            es: /\b(el|la|de|con|para|este|esta)\b/g,
            de: /\b(der|die|das|und|für|mit|von)\b/g,
            it: /\b(il|la|di|con|per|questo|questa)\b/g,
          };
          
          let maxMatches = 0;
          for (const [lang, pattern] of Object.entries(patterns)) {
            const matches = (sampleText.match(pattern) || []).length;
            if (matches > maxMatches) {
              maxMatches = matches;
              detectedLanguage = lang as string;
            }
          }
          console.log(`✅ Langue détectée depuis les produits: ${detectedLanguage}`);
        }
      }
    } catch (err) {
      console.log("⚠️ Erreur détection langue, utilisation du français par défaut:", err);
    }

    // Default article config if not provided
    const config = {
      style: articleConfig.style || "magazine",
      layout: articleConfig.layout || "1-colonne",
      colorScheme: articleConfig.colorScheme || "#000000",
      contentLength: articleConfig.contentLength || "2000",
      includeTOC: articleConfig.includeTOC !== false,
      productDisplay: articleConfig.productDisplay || "grid",
      typography: articleConfig.typography || "sans-serif",
      imageIntensity: articleConfig.imageIntensity || "medium",
    };

    // Vérification des limites d'usage
    if (authHeader) {
      console.log("Vérification des limites pour user:", user_id);
      const limitResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-usage-limits`, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (limitResponse.ok) {
        const limitCheck = await limitResponse.json();
        if (!limitCheck?.canUseArticles) {
          console.log("Limite atteinte pour cet utilisateur");
          throw new Error("trial_limit_reached: Limite d'essai atteinte. Activez votre abonnement pour continuer.");
        }
        console.log("Limites OK, génération en cours");
      }
    }

    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`Génération article : ${articleTitle} pour user ${user_id}`);

    // Récupération de l'URL du store pour les liens produits
    let storeUrl = "";
    try {
      const { data: storeData } = await supabaseClient
        .from("shopify_connections")
        .select("store_url")
        .eq("user_id", user_id)
        .single();
      
      if (storeData?.store_url) {
        storeUrl = storeData.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        storeUrl = `https://${storeUrl}`;
        console.log(`✅ Store URL: ${storeUrl}`);
      }
    } catch (err) {
      console.log("⚠️ Erreur récupération store URL:", err);
    }

    // Recherche des produits
    let products: any[] = [];

    // Si des IDs de produits spécifiques sont fournis
    if (productIds && productIds.length > 0) {
      console.log(`Récupération des produits sélectionnés: ${productIds.length}`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .in("id", productIds);

      if (data && data.length > 0) {
        products = data;
        console.log(`${products.length} produits spécifiques trouvés`);
      }
    }
    // Sinon recherche par catégorie
    else if (category && category !== "Guide" && category !== "Tous produits") {
      console.log(`Recherche produits avec catégorie: ${category}`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .or(
          `category.ilike.%${category}%,product_type.ilike.%${category}%,vendor.ilike.%${category}%,title.ilike.%${category}%,description.ilike.%${category}%,tags.ilike.%${category}%`,
        )
        .limit(12);

      if (data && data.length > 0) {
        products = data;
        console.log(`${products.length} produits trouvés`);
      }
    }

    // Fallback si aucun produit trouvé
    if (products.length === 0) {
      console.log(`Aucun produit trouvé, utilisation de tous les produits`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .limit(8);

      if (data) {
        products = data;
      }
    }

    // Enrichir les produits avec les URLs complètes
    if (storeUrl && products.length > 0) {
      products = products.map(p => {
        const imageUrl = p.image_url || (p.images && p.images.length > 0 ? 
          (typeof p.images === 'string' ? JSON.parse(p.images)[0] : p.images[0]) : 
          '');
        
        return {
          ...p,
          product_url: `${storeUrl}/products/${p.handle}`,
          full_image_url: imageUrl,
        };
      });
      console.log(`✅ ${products.length} produits enrichis avec URLs`);
    }

    const hasProducts = products && products.length > 0;

    if (!hasProducts) {
      console.log("Aucun produit trouvé, génération d'un article générique");
    }

    // ✅ Génération de l'image featured avec Lovable AI (Nano banana)
    console.log("🎨 Génération image featured avec Lovable AI...");
    let featuredImage = "";

    try {
      const imagePrompt = `Professional high-quality e-commerce hero banner image for a blog article about "${mainKeyword}". 
Modern, clean, minimalist design with premium product photography aesthetic. 
Bright, well-lit scene with soft shadows. Elegant and luxurious feel. 
Perfect for a 16:9 blog header image. Ultra high resolution, sharp focus, professional commercial photography style.`;

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: imagePrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (base64Image) {
          featuredImage = base64Image;
          console.log("✅ Image featured générée avec succès via Lovable AI");
        }
      } else {
        console.error("❌ Erreur génération image:", await imageResponse.text());
      }
    } catch (imgErr) {
      console.error("❌ Erreur génération image:", imgErr);
    }

    // Génération du titre optimisé SEO
    const mainKeyword = keywords.length > 0 ? keywords[0] : category;

    const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Expert SEO spécialisé dans la création de titres percutants et optimisés. Tu dois écrire en ${lang.name}.`,
          },
          {
            role: "user",
            content: `LANGUE OBLIGATOIRE: ${lang.name.toUpperCase()}\n\nCrée un titre d'article SEO engageant EN ${lang.name.toUpperCase()} contenant "${mainKeyword}". 50-70 caractères, accrocheur. Retourne uniquement le titre EN ${lang.name.toUpperCase()}.`,
          },
        ],
      }),
    });

    const titleData = await titleResponse.json();
    const optimizedTitle = titleData.choices[0].message.content.trim().replace(/^["']|["']$/g, "");

    console.log(`Titre optimisé: ${optimizedTitle}`);

    // Récupération des pages Shopify pour netlinking
    let shopifyPages: any[] = [];
    if (user_id) {
      const { data: pagesData } = await supabaseClient
        .from("shopify_pages")
        .select("title, handle")
        .eq("user_id", user_id)
        .limit(10);

      if (pagesData && pagesData.length > 0) {
        shopifyPages = pagesData;
        console.log(`✅ ${shopifyPages.length} pages Shopify trouvées pour netlinking`);
      }
    }

    // Récupération des collections Shopify pour netlinking
    let shopifyCollections: any[] = [];
    if (user_id) {
      const { data: collData } = await supabaseClient
        .from("shopify_collections")
        .select("title, handle")
        .eq("user_id", user_id)
        .limit(10);
      
      if (collData && collData.length > 0) {
        shopifyCollections = collData;
        console.log(`✅ ${shopifyCollections.length} collections Shopify trouvées pour netlinking`);
      }
    }

    let netlinkingContext = '';
    if (shopifyPages.length > 0) {
      netlinkingContext += `\n📄 PAGES SHOPIFY POUR NETLINKING:\n${shopifyPages.map((p) => `- ${p.title}: ${storeUrl}/pages/${p.handle}`).join("\n")}`;
    }
    if (shopifyCollections.length > 0) {
      netlinkingContext += `\n🏷️ COLLECTIONS SHOPIFY POUR NETLINKING:\n${shopifyCollections.map((c) => `- ${c.title}: ${storeUrl}/collections/${c.handle}`).join("\n")}`;
    }
    if (shopifyPages.length > 0 || shopifyCollections.length > 0) {
      netlinkingContext += "\n**🔗 IMPORTANT: Intègre ces liens naturellement dans l'article pour créer du maillage interne SEO.**";
    }

    // Style guides based on config
    const styleGuides: Record<string, string> = {
      magazine:
        "Typographie large et aérée, images hero immersives, grille multi-colonnes, pull quotes, design éditorial haut de gamme",
      moderne: "Gradients subtils, ombres douces, espacements généreux, palette sobre avec accents colorés",
      minimaliste: "Beaucoup d'espace blanc, typographie épurée, 1-2 couleurs max, sans décorations",
      editorial: "Style journal premium, typographie serif, images plein écran, citations encadrées",
      premium: "Or/noir, typographie serif élégante, ombres prononcées, détails raffinés",
      coloré: "Palette vibrante, dégradés audacieux, design dynamique et énergique",
    };

    const layoutGuides: Record<string, string> = {
      "1-colonne": "max-w-4xl mx-auto (centré, responsive)",
      "2-colonnes": "Sidebar avec TOC sticky + contenu principal",
      hero: "Featured image full-width + contenu",
      "full-width": "Contenu étendu avec sections alternées",
    };

    // Génération du contenu HTML complet avec présentation améliorée
    const wordCountTarget = parseInt(config.contentLength);

    // Configuration de la langue pour le prompt
    const languageConfig: Record<
      string,
      {
        name: string;
        toc: string;
        intro: string;
        criteria: string;
        selection: string;
        comparison: string;
        advice: string;
        faq: string;
        conclusion: string;
      }
    > = {
      fr: {
        name: "français",
        toc: "Table des matières",
        intro: "Introduction",
        criteria: "Critères essentiels de choix",
        selection: "Notre sélection de produits",
        comparison: "Guide d'achat comparatif",
        advice: "Conseils d'experts",
        faq: "Questions Fréquentes",
        conclusion: "Conclusion",
      },
      en: {
        name: "English",
        toc: "Table of Contents",
        intro: "Introduction",
        criteria: "Essential Selection Criteria",
        selection: "Our Product Selection",
        comparison: "Buyer's Guide & Comparison",
        advice: "Expert Tips",
        faq: "Frequently Asked Questions",
        conclusion: "Conclusion",
      },
      es: {
        name: "español",
        toc: "Tabla de contenidos",
        intro: "Introducción",
        criteria: "Criterios esenciales de selección",
        selection: "Nuestra selección de productos",
        comparison: "Guía de compra comparativa",
        advice: "Consejos de expertos",
        faq: "Preguntas Frecuentes",
        conclusion: "Conclusión",
      },
      de: {
        name: "Deutsch",
        toc: "Inhaltsverzeichnis",
        intro: "Einführung",
        criteria: "Wesentliche Auswahlkriterien",
        selection: "Unsere Produktauswahl",
        comparison: "Kaufratgeber & Vergleich",
        advice: "Expertentipps",
        faq: "Häufig gestellte Fragen",
        conclusion: "Fazit",
      },
      it: {
        name: "italiano",
        toc: "Sommario",
        intro: "Introduzione",
        criteria: "Criteri essenziali di scelta",
        selection: "La nostra selezione di prodotti",
        comparison: "Guida all'acquisto comparativa",
        advice: "Consigli degli esperti",
        faq: "Domande Frequenti",
        conclusion: "Conclusione",
      },
    };

    const lang = languageConfig[detectedLanguage] || languageConfig.fr;
    const topicInfo = collectionTitle ? `Collection: ${collectionTitle}` : category;
    
    console.log(`📝 Génération en ${lang.name} (langue détectée: ${detectedLanguage})`);

    const prompt = `Tu es un designer UX/UI expert et rédacteur web spécialisé dans les articles e-commerce de style magazine.

🌍 LANGUE OBLIGATOIRE : ${lang.name.toUpperCase()}
⚠️ CRITIQUE : Tout le contenu (titre, texte, boutons, liens) DOIT être rédigé en ${lang.name}. AUCUN mélange de langues n'est accepté.

📰 ARTICLE À CRÉER :
- Sujet : ${topicInfo}
- Mots-clés : ${targetKeywords.join(", ")}
- Langue cible : ${lang.name}

🎨 DESIGN & STYLE :
- Style visuel : ${config.style}
  → Guide : ${styleGuides[config.style]}
- Layout : ${config.layout}
  → Structure : ${layoutGuides[config.layout]}
- Couleur principale : ${config.colorScheme}
- Typographie : ${config.typography === "serif" ? "font-serif (Georgia, Times)" : "font-sans (Inter, Helvetica)"}
- Intensité images : ${config.imageIntensity}
- Table des matières : ${config.includeTOC ? "OUI (obligatoire)" : "NON"}
- Affichage produits : ${config.productDisplay}

🏗️ STRUCTURE HTML MAGAZINE :
1. HERO IMMERSIF
   - Featured image plein écran avec overlay gradient
   - Titre H1 superposé (couleur ${config.colorScheme})
   - Sous-titre éditorial
   - Métadonnées (date, auteur, temps de lecture)

2. TABLE DES MATIÈRES ${config.includeTOC ? "(OBLIGATOIRE)" : "(optionnelle)"}
   - Design élégant avec ancres cliquables
   - Couleur principale pour les liens: ${config.colorScheme}

3. INTRODUCTION CAPTIVANTE
   - Paragraphe d'accroche journalistique
   - Pull quote mise en valeur

4. SECTIONS PRINCIPALES
   - Titres avec barre latérale colorée (${config.colorScheme})
   - Images haute qualité entre les sections
   - Citations encadrées pour les insights clés

5. PRÉSENTATION PRODUITS (Mode : ${config.productDisplay})
   ${
     config.productDisplay === "grid"
       ? "- Grille responsive avec cards élégantes"
       : config.productDisplay === "list"
         ? "- Liste détaillée avec images miniatures"
         : "- Carousel horizontal avec navigation"
   }

6. FAQ INTERACTIVE
   - Design accordéon moderne
   - Icônes et micro-animations

7. CONCLUSION ENGAGEANTE
   - CTA final avec couleur principale

📱 RESPONSIVE MOBILE-FIRST :
- Structure : <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
- Typographie adaptative : text-base sm:text-lg lg:text-xl
- Images : w-full h-auto object-cover
- Grid produits : grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

🛠️ CONTRAINTES TECHNIQUES :
✅ Tailwind CSS uniquement
✅ HTML prêt pour React dangerouslySetInnerHTML
✅ Couleur principale via style="color: ${config.colorScheme}"
❌ Pas de <html>, <head>, <body>
❌ Pas de JavaScript

🛍️ CONTRAINTE PRODUITS (CRITIQUE - OBLIGATOIRE) :
${
  hasProducts
    ? `⚠️ OBLIGATION ABSOLUE : Tu DOIS afficher TOUS les ${products.length} produits avec leurs VRAIES photos et liens cliquables.

📐 TEMPLATE ${config.productDisplay.toUpperCase()} À UTILISER :

${config.productDisplay === 'grid' ? `
<!-- TEMPLATE GRILLE (Grid) - Copie ce code exactement pour chaque produit -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
  <!-- PRODUIT 1 -->
  <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
    <a href="[PRODUCT_URL_ICI]">
      <img src="[FULL_IMAGE_URL_ICI]" alt="[TITLE_ICI]" class="w-full h-64 object-cover" />
    </a>
    <div class="p-6">
      <a href="[PRODUCT_URL_ICI]" class="block">
        <h3 class="text-xl font-bold mb-2 hover:text-primary" style="color: ${config.colorScheme}">[TITLE_ICI]</h3>
      </a>
      <p class="text-gray-600 text-sm mb-4">[DESCRIPTION_COURTE_ICI]</p>
      <div class="flex items-center justify-between">
        <span class="text-2xl font-bold" style="color: ${config.colorScheme}">[PRICE_ICI]€</span>
        <a href="[PRODUCT_URL_ICI]" class="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all" style="background-color: ${config.colorScheme}">
          ${lang.name === 'français' ? 'Voir le produit' : lang.name === 'English' ? 'View Product' : lang.name === 'español' ? 'Ver producto' : lang.name === 'Deutsch' ? 'Produkt ansehen' : 'Vedi prodotto'}
        </a>
      </div>
    </div>
  </div>
  <!-- RÉPÉTER POUR CHAQUE PRODUIT -->
</div>
` : config.productDisplay === 'carousel' ? `
<!-- TEMPLATE CAROUSEL - Affichage horizontal scrollable -->
<div class="overflow-x-auto my-8">
  <div class="flex gap-6 pb-4" style="min-width: min-content;">
    <!-- PRODUIT 1 -->
    <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex-shrink-0 w-80">
      <a href="[PRODUCT_URL_ICI]">
        <img src="[FULL_IMAGE_URL_ICI]" alt="[TITLE_ICI]" class="w-full h-56 object-cover" />
      </a>
      <div class="p-5">
        <a href="[PRODUCT_URL_ICI]">
          <h3 class="text-lg font-bold mb-2" style="color: ${config.colorScheme}">[TITLE_ICI]</h3>
        </a>
        <p class="text-gray-600 text-sm mb-3">[DESCRIPTION_COURTE_ICI]</p>
        <div class="flex items-center justify-between">
          <span class="text-xl font-bold" style="color: ${config.colorScheme}">[PRICE_ICI]€</span>
          <a href="[PRODUCT_URL_ICI]" class="px-4 py-2 rounded-lg text-white text-sm font-semibold" style="background-color: ${config.colorScheme}">
            ${lang.name === 'français' ? 'Voir' : lang.name === 'English' ? 'View' : lang.name === 'español' ? 'Ver' : lang.name === 'Deutsch' ? 'Ansehen' : 'Vedi'}
          </a>
        </div>
      </div>
    </div>
    <!-- RÉPÉTER POUR CHAQUE PRODUIT -->
  </div>
</div>
` : `
<!-- TEMPLATE SHOWCASE - Affichage détaillé produit par produit -->
<div class="space-y-8 my-8">
  <!-- PRODUIT 1 -->
  <div class="bg-white rounded-xl shadow-xl overflow-hidden">
    <div class="md:flex">
      <a href="[PRODUCT_URL_ICI]" class="md:w-1/2">
        <img src="[FULL_IMAGE_URL_ICI]" alt="[TITLE_ICI]" class="w-full h-80 object-cover" />
      </a>
      <div class="p-8 md:w-1/2">
        <a href="[PRODUCT_URL_ICI]">
          <h3 class="text-2xl font-bold mb-4 hover:text-primary" style="color: ${config.colorScheme}">[TITLE_ICI]</h3>
        </a>
        <p class="text-gray-700 mb-6 leading-relaxed">[DESCRIPTION_COMPLETE_ICI]</p>
        <div class="flex items-center gap-4 mb-6">
          <span class="text-3xl font-bold" style="color: ${config.colorScheme}">[PRICE_ICI]€</span>
          ${lang.name === 'français' ? '<span class="text-sm text-green-600">✓ Livraison offerte</span>' : ''}
        </div>
        <a href="[PRODUCT_URL_ICI]" class="inline-block px-8 py-4 rounded-lg text-white text-lg font-semibold hover:opacity-90 transition-all shadow-lg" style="background-color: ${config.colorScheme}">
          ${lang.name === 'français' ? 'Acheter maintenant' : lang.name === 'English' ? 'Buy Now' : lang.name === 'español' ? 'Comprar ahora' : lang.name === 'Deutsch' ? 'Jetzt kaufen' : 'Acquista ora'}
        </a>
      </div>
    </div>
  </div>
  <!-- RÉPÉTER POUR CHAQUE PRODUIT -->
</div>
`}

📦 PRODUITS À INTÉGRER (Remplace [PRODUCT_URL_ICI], [FULL_IMAGE_URL_ICI], etc. avec ces données) :
${products.map((p: any, i: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUIT ${i + 1}: ${p.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[PRODUCT_URL_ICI] = ${p.product_url}
[FULL_IMAGE_URL_ICI] = ${p.full_image_url || 'N/A'}
[TITLE_ICI] = ${p.title}
[PRICE_ICI] = ${p.price}
[DESCRIPTION_COURTE_ICI] = ${p.description?.substring(0, 150) || 'Produit de qualité premium'}
[DESCRIPTION_COMPLETE_ICI] = ${p.description?.substring(0, 300) || 'Produit de qualité premium avec des caractéristiques exceptionnelles'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**✅ ACTION : Copie le template ci-dessus et remplace TOUS les placeholders [XXX_ICI] avec ces valeurs**
`).join('\n')}

🚨 RÈGLES CRITIQUES (Non négociables) :
1. ✅ Utilise le template ${config.productDisplay.toUpperCase()} fourni ci-dessus
2. ✅ Remplace TOUS les placeholders [XXX_ICI] par les vraies valeurs
3. ✅ TOUTES les images doivent utiliser full_image_url (pas d'URL Unsplash)
4. ✅ TOUS les liens <a href="..."> doivent pointer vers product_url
5. ✅ TOUS les ${products.length} produits doivent apparaître dans l'article
6. ❌ NE JAMAIS inventer d'URL d'image
7. ❌ NE JAMAIS utiliser d'images de placeholder ou Unsplash pour les produits`
    : `Article informatif générique sur ${topicInfo} (sans produits)`
}
${netlinkingContext}

RETOURNE UNIQUEMENT LE HTML (sans markdown, sans explications, sans balises \`\`\`) avec environ ${wordCountTarget} mots EN ${lang.name.toUpperCase()}.
`;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Expert en rédaction e-commerce et création de contenu HTML professionnel.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI Error: ${err}`);
    }

    const result = await aiResponse.json();
    let content = result.choices[0].message.content.trim();

    // Nettoyage du contenu
    content = content
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Génération des mots-clés SEO
    const keywordsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Expert SEO pour la génération de mots-clés pertinents.",
          },
          {
            role: "user",
            content: `Génère 8-12 mots-clés SEO pour "${optimizedTitle}". Liste séparée par des virgules.`,
          },
        ],
      }),
    });

    const keywordsData = await keywordsResponse.json();
    const seoKeywords = keywordsData.choices[0].message.content
      .trim()
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean)
      .slice(0, 12);

    // Sauvegarde de l'article
    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id,
          title: optimizedTitle,
          content,
          featured_image: featuredImage,
          meta_description: `Guide complet : ${optimizedTitle}. Comparatif expert, conseils d'achat et sélection des meilleurs produits. Livraison offerte.`,
          keywords: [...targetKeywords, ...seoKeywords].slice(0, 15),
          status: "draft",
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("Erreur sauvegarde:", saveError);
      throw saveError;
    }

    console.log(`Article sauvegardé : ${savedArticle.id}`);

    // Extraction des données de netlinking
    try {
      await supabaseClient.functions.invoke("extract-netlinking-from-articles", {
        body: { article_ids: [savedArticle.id] },
      });
      console.log("Netlinking extrait avec succès");
    } catch (netlinkError) {
      console.error("Erreur extraction netlinking:", netlinkError);
    }

    // Mise à jour du compteur d'usage
    await supabaseClient.rpc("increment_usage", {
      p_seller_id: user_id,
      p_field: "articles_count",
      p_increment: 1,
    });

    return {
      success: true,
      article_id: savedArticle.id,
      article: savedArticle,
      featured_image: featuredImage,
    };
  } catch (err) {
    console.error("Erreur génération:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
