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
    let storeId = null; // Store the store_id for later use
    
    try {
      // First, try to detect from store URL and get store_id
      const { data: storeData } = await supabaseClient
        .from("shopify_connections")
        .select("id, store_url")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      if (storeData) {
        storeId = storeData.id; // Save store_id for article insertion
        console.log(`✅ Store ID détecté: ${storeId}`);
      
        if (storeData.store_url) {
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

    // Configuration de la langue (doit être défini tôt pour les prompts)
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
        toc: "Sommaire",
        intro: "Introduction",
        criteria: "Critères de choix essentiels",
        selection: "Notre sélection de produits",
        comparison: "Guide comparatif d'achat",
        advice: "Conseils d'experts",
        faq: "Questions Fréquentes",
        conclusion: "Conclusion",
      },
      en: {
        name: "english",
        toc: "Table of Contents",
        intro: "Introduction",
        criteria: "Key Selection Criteria",
        selection: "Our Product Selection",
        comparison: "Comparative Buying Guide",
        advice: "Expert Advice",
        faq: "Frequently Asked Questions",
        conclusion: "Conclusion",
      },
      es: {
        name: "español",
        toc: "Índice",
        intro: "Introducción",
        criteria: "Criterios esenciales de elección",
        selection: "Nuestra selección de productos",
        comparison: "Guía comparativa de compra",
        advice: "Consejos de expertos",
        faq: "Preguntas Frecuentes",
        conclusion: "Conclusión",
      },
      de: {
        name: "deutsch",
        toc: "Inhaltsverzeichnis",
        intro: "Einführung",
        criteria: "Wesentliche Auswahlkriterien",
        selection: "Unsere Produktauswahl",
        comparison: "Vergleichender Kaufratgeber",
        advice: "Expertenrat",
        faq: "Häufig gestellte Fragen",
        conclusion: "Fazit",
      },
      it: {
        name: "italiano",
        toc: "Indice",
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
    const mainKeyword = keywords.length > 0 ? keywords[0] : category;

    console.log(`Génération article : ${articleTitle} pour user ${user_id}`);

    // Récupération de l'URL du store et store_id pour les liens produits
    let storeUrl = "";
    let store_id: string | null = null;
    try {
      const { data: storeData } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, id")
        .eq("user_id", user_id)
        .single();
      
      if (storeData?.store_url) {
        storeUrl = storeData.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        storeUrl = `https://${storeUrl}`;
        store_id = storeData.id;
        console.log(`✅ Store URL: ${storeUrl}, Store ID: ${store_id}`);
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

    // 🌍 Get store localization for SERP analysis
    let storeCountry = 'United States';
    let storeLanguage = 'en';
    
    if (store_id) {
      console.log("🔍 Fetching store localization info...");
      try {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('primary_locale, country_code')
          .eq('id', store_id)
          .maybeSingle();
        
        if (storeData) {
          storeCountry = storeData.country_code || 'United States';
          storeLanguage = storeData.primary_locale?.split('-')[0] || 'en';
          console.log(`📍 Store location: ${storeCountry}, language: ${storeLanguage}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch store info, using defaults:', error);
      }
    }

    // 🔍 SERP Analysis for article structure
    console.log("🔍 Analyzing SERP competitors for article structure...");
    let serpInsights: any = null;
    
    try {
      const { data: serpData, error: serpError } = await supabaseClient.functions.invoke("analyze-serp-competitors", {
        body: {
          keyword: mainKeyword,
          analysisType: "article",
          location: storeCountry,
          language: storeLanguage,
          maxResults: 10
        }
      });

      if (serpError) {
        console.warn("⚠️ SERP analysis failed:", serpError);
      } else if (serpData) {
        serpInsights = serpData.insights;
        console.log("✅ SERP analysis completed:", {
          commonH2: serpInsights?.commonH2?.length || 0,
          topicCoverage: serpInsights?.topicCoverage?.length || 0
        });
      }
    } catch (serpErr) {
      console.warn("⚠️ SERP analysis error:", serpErr);
    }

    // Génération du titre optimisé SEO

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
    const topicInfo = collectionTitle ? `Collection: ${collectionTitle}` : category;
    
    console.log(`📝 Génération en ${lang.name} (langue détectée: ${detectedLanguage})`);

    const prompt = `Tu es un expert SEO et e-commerce Shopify spécialisé dans la rédaction d'articles PRODUIT professionnels.

🌍 LANGUE OBLIGATOIRE : ${lang.name.toUpperCase()}
⚠️ CRITIQUE : Tout le contenu (titre, texte, boutons, liens) DOIT être rédigé en ${lang.name}. AUCUN mélange de langues n'est accepté.

🎯 OBJECTIF : Créer un article PRODUIT complet (${wordCountTarget} mots) optimisé pour Shopify Blog avec :
- Structure SEO complète (H1, H2, H3)
- Galerie produit PRO avec slider + zoom
- Intégration naturelle des mots-clés : ${targetKeywords.join(", ")}
- Plusieurs blocs produits internes
- Netlinking interne Shopify
- Format HTML prêt à publier

${serpInsights ? `
🎯 ANALYSE SERP - STRUCTURE DES TOP ARTICLES :
📋 H2 Fréquents : ${serpInsights.commonH2?.slice(0, 5).join(', ')}
📚 Sujets Couverts : ${serpInsights.topicCoverage?.slice(0, 5).join(', ')}
📊 Nombre de Mots Moyen : ${serpInsights.avgWordCount || wordCountTarget} mots
` : ""}

${netlinkingContext}

📌 STRUCTURE À RESPECTER (OBLIGATOIRE) :

<h1>Titre SEO incluant le mot-clé principal : ${targetKeywords[0] || topicInfo}</h1>

<!-- INTRODUCTION (150-200 mots) -->
<div class="intro my-8">
  <p class="text-lg leading-relaxed">Explication générale du produit, mise en situation, intégration naturelle des mots-clés...</p>
</div>

<h2>Présentation du Produit</h2>

<h3>Description Générale</h3>
<p>Description détaillée du produit en ${lang.name}...</p>

<h3>Galerie Produit PRO</h3>
${hasProducts && products.length > 0 ? `
<!-- GALERIE PRODUIT PREMIUM avec slider -->
<div class="product-gallery my-8 bg-gray-50 p-6 rounded-2xl">
  <div class="main-image mb-6">
    <img src="${products[0].full_image_url || products[0].image_url}" alt="${products[0].title}" class="w-full h-96 object-cover rounded-xl shadow-lg cursor-zoom-in hover:shadow-2xl transition-shadow" />
  </div>
  <div class="thumbnail-row flex gap-4 overflow-x-auto pb-2">
    ${products.slice(0, Math.min(4, products.length)).map(p => `
    <img src="${p.full_image_url || p.image_url}" alt="${p.title}" class="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity flex-shrink-0 border-2 border-gray-200" />
    `).join('')}
  </div>
</div>
` : '<p>Galerie produit à personnaliser avec vos images...</p>'}

<h3>Fiche d'Achat</h3>
${hasProducts && products.length > 0 ? `
<div class="purchase-card my-6 p-6 bg-white rounded-xl shadow-lg border-2" style="border-color: ${config.colorScheme}">
  <p class="text-3xl font-bold mb-4" style="color: ${config.colorScheme}">${products[0].price}€</p>
  <a href="${products[0].product_url}" target="_blank" class="inline-block px-8 py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-all transform hover:scale-105" style="background-color: ${config.colorScheme}">
    ${lang.name === 'français' ? 'Voir le Produit' : 'View Product'} →
  </a>
</div>
` : '<p>Prix et CTA à personnaliser...</p>'}

<h2>Caractéristiques Techniques</h2>
${hasProducts && products.length > 0 ? `
<div class="specs-table my-6 overflow-x-auto">
  <table class="w-full border-collapse bg-white rounded-xl shadow-lg overflow-hidden">
    <thead style="background-color: ${config.colorScheme}">
      <tr>
        <th class="p-4 text-left text-white font-bold">${lang.name === 'français' ? 'Caractéristique' : 'Feature'}</th>
        <th class="p-4 text-left text-white font-bold">${lang.name === 'français' ? 'Détail' : 'Detail'}</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b">
        <td class="p-4 font-semibold">Type</td>
        <td class="p-4">${products[0].product_type || 'N/A'}</td>
      </tr>
      <tr class="border-b bg-gray-50">
        <td class="p-4 font-semibold">${lang.name === 'français' ? 'Marque' : 'Brand'}</td>
        <td class="p-4">${products[0].vendor || 'N/A'}</td>
      </tr>
      <tr class="border-b">
        <td class="p-4 font-semibold">${lang.name === 'français' ? 'Catégorie' : 'Category'}</td>
        <td class="p-4">${products[0].category || products[0].product_type || 'N/A'}</td>
      </tr>
      <tr class="border-b bg-gray-50">
        <td class="p-4 font-semibold">Prix</td>
        <td class="p-4 font-bold" style="color: ${config.colorScheme}">${products[0].price}€</td>
      </tr>
    </tbody>
  </table>
</div>
` : '<p>Tableau de spécifications à remplir...</p>'}

<h2>${lang.name === 'français' ? 'Avantages & Points Forts' : 'Advantages & Key Features'}</h2>
<h3>${lang.name === 'français' ? 'Matériaux' : 'Materials'}</h3>
<p>Description détaillée des matériaux utilisés...</p>

<h3>Style & Design</h3>
<p>Analyse du design et de l'esthétique du produit...</p>

<h3>${lang.name === 'français' ? 'Robustesse' : 'Durability'}</h3>
<p>Qualité de fabrication et durabilité...</p>

<h3>${lang.name === 'français' ? 'Pourquoi Choisir ce Produit ?' : 'Why Choose This Product?'}</h3>
<ul class="list-disc pl-6 space-y-2 my-4">
  <li>${lang.name === 'français' ? 'Avantage principal 1' : 'Main advantage 1'}</li>
  <li>${lang.name === 'français' ? 'Avantage principal 2' : 'Main advantage 2'}</li>
  <li>${lang.name === 'français' ? 'Avantage principal 3' : 'Main advantage 3'}</li>
  <li>${lang.name === 'français' ? 'Avantage principal 4' : 'Main advantage 4'}</li>
</ul>

<h2>${lang.name === 'français' ? 'Intégration dans Différents Styles Déco' : 'Integration in Different Decor Styles'}</h2>
<h3>${lang.name === 'français' ? 'Moderne / Minimaliste' : 'Modern / Minimalist'}</h3>
<p>Comment intégrer le produit dans un style moderne...</p>

<h3>${lang.name === 'français' ? 'Industriel' : 'Industrial'}</h3>
<p>Utilisation dans un décor industriel...</p>

<h3>${lang.name === 'français' ? 'Classique / Luxe' : 'Classic / Luxury'}</h3>
<p>Intégration dans un style classique élégant...</p>

<h3>${lang.name === 'français' ? 'Scandinave' : 'Scandinavian'}</h3>
<p>Adaptation au style scandinave...</p>

<h2>${lang.name === 'français' ? 'Galerie d\'Inspiration' : 'Inspiration Gallery'}</h2>
${hasProducts && products.length > 1 ? `
<div class="inspiration-gallery grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
  ${products.slice(1, Math.min(5, products.length)).map(p => `
  <div class="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
    <img src="${p.full_image_url || p.image_url}" alt="${p.title}" class="w-full h-64 object-cover" />
    <div class="p-4 bg-white">
      <p class="font-semibold">${p.title}</p>
    </div>
  </div>
  `).join('')}
</div>
` : '<p>Galerie d\'inspiration avec mises en scène du produit...</p>'}

<h2>${lang.name === 'français' ? 'Comparatif Produits Similaires' : 'Similar Products Comparison'}</h2>
${hasProducts && products.length > 1 ? `
<div class="comparison-grid grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
  ${products.slice(1, Math.min(4, products.length)).map(p => `
  <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
    <a href="${p.product_url}">
      <img src="${p.full_image_url || p.image_url}" alt="${p.title}" class="w-full h-48 object-cover" />
    </a>
    <div class="p-5">
      <a href="${p.product_url}">
        <h4 class="font-bold text-lg mb-2 hover:underline" style="color: ${config.colorScheme}">${p.title}</h4>
      </a>
      <p class="text-gray-600 text-sm mb-3">${p.description?.substring(0, 80)}...</p>
      <div class="flex items-center justify-between">
        <span class="text-xl font-bold" style="color: ${config.colorScheme}">${p.price}€</span>
        <a href="${p.product_url}" class="text-sm font-semibold hover:underline" style="color: ${config.colorScheme}">
          ${lang.name === 'français' ? 'Voir' : 'View'} →
        </a>
      </div>
    </div>
  </div>
  `).join('')}
</div>
<p class="text-center mt-6">
  <a href="${storeUrl}/collections/${products[0]?.category || 'all'}" class="inline-block px-6 py-3 rounded-xl font-semibold hover:opacity-90" style="background-color: ${config.colorScheme}; color: white;">
    ${lang.name === 'français' ? 'Voir Toute la Collection' : 'View All Collection'} →
  </a>
</p>
` : '<p>Produits similaires à comparer...</p>'}

<h2>${lang.name === 'français' ? 'Avis Clients' : 'Customer Reviews'}</h2>
<div class="reviews my-8 space-y-6">
  <div class="text-center mb-6">
    <div class="text-5xl font-bold mb-2" style="color: ${config.colorScheme}">4.8/5</div>
    <p class="text-gray-600">${lang.name === 'français' ? 'Note moyenne sur 127 avis' : 'Average rating from 127 reviews'}</p>
  </div>
  
  <div class="review-card bg-gray-50 p-6 rounded-xl">
    <div class="flex items-center mb-3">
      <div class="font-bold mr-2">Sophie M.</div>
      <div class="text-yellow-500">★★★★★</div>
    </div>
    <p class="text-gray-700">"${lang.name === 'français' ? 'Excellent produit, qualité au rendez-vous. Livraison rapide et emballage soigné.' : 'Excellent product, great quality. Fast delivery and careful packaging.'}"</p>
  </div>
  
  <div class="review-card bg-gray-50 p-6 rounded-xl">
    <div class="flex items-center mb-3">
      <div class="font-bold mr-2">Marc L.</div>
      <div class="text-yellow-500">★★★★★</div>
    </div>
    <p class="text-gray-700">"${lang.name === 'français' ? 'Très satisfait de mon achat. Le produit correspond parfaitement à la description.' : 'Very satisfied with my purchase. The product matches the description perfectly.'}"</p>
  </div>
  
  <div class="review-card bg-gray-50 p-6 rounded-xl">
    <div class="flex items-center mb-3">
      <div class="font-bold mr-2">Julie P.</div>
      <div class="text-yellow-500">★★★★☆</div>
    </div>
    <p class="text-gray-700">"${lang.name === 'français' ? 'Bon rapport qualité-prix. Je recommande sans hésiter.' : 'Good value for money. I recommend without hesitation.'}"</p>
  </div>
</div>

<h2>${lang.name === 'français' ? 'Pages Shopify Importantes' : 'Important Shopify Pages'}</h2>
<div class="shopify-links grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
  <a href="${storeUrl}/pages/contact" class="p-6 bg-white rounded-xl shadow-lg text-center hover:shadow-2xl transition-all">
    <div class="text-4xl mb-3">📞</div>
    <div class="font-bold" style="color: ${config.colorScheme}">${lang.name === 'français' ? 'Contact' : 'Contact'}</div>
  </a>
  <a href="${storeUrl}/pages/shipping" class="p-6 bg-white rounded-xl shadow-lg text-center hover:shadow-2xl transition-all">
    <div class="text-4xl mb-3">🚚</div>
    <div class="font-bold" style="color: ${config.colorScheme}">${lang.name === 'français' ? 'Livraison' : 'Shipping'}</div>
  </a>
  <a href="${storeUrl}/pages/returns" class="p-6 bg-white rounded-xl shadow-lg text-center hover:shadow-2xl transition-all">
    <div class="text-4xl mb-3">↩️</div>
    <div class="font-bold" style="color: ${config.colorScheme}">${lang.name === 'français' ? 'Retours' : 'Returns'}</div>
  </a>
  <a href="${storeUrl}/pages/about-us" class="p-6 bg-white rounded-xl shadow-lg text-center hover:shadow-2xl transition-all">
    <div class="text-4xl mb-3">ℹ️</div>
    <div class="font-bold" style="color: ${config.colorScheme}">${lang.name === 'français' ? 'À Propos' : 'About Us'}</div>
  </a>
</div>

<h2>FAQ (${lang.name === 'français' ? 'Questions Fréquentes' : 'Frequently Asked Questions'})</h2>
<div class="faq my-8 space-y-4">
  <details class="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
    <summary class="font-bold text-lg" style="color: ${config.colorScheme}">
      ${lang.name === 'français' ? '📦 Quels sont les délais de livraison ?' : '📦 What are the delivery times?'}
    </summary>
    <p class="mt-3 text-gray-700">${lang.name === 'français' ? 'Livraison standard sous 3-5 jours ouvrés. Livraison express disponible.' : 'Standard delivery within 3-5 business days. Express delivery available.'}</p>
  </details>
  
  <details class="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
    <summary class="font-bold text-lg" style="color: ${config.colorScheme}">
      ${lang.name === 'français' ? '🧼 Comment entretenir ce produit ?' : '🧼 How to maintain this product?'}
    </summary>
    <p class="mt-3 text-gray-700">${lang.name === 'français' ? 'Instructions d\'entretien détaillées fournies avec le produit.' : 'Detailed maintenance instructions provided with the product.'}</p>
  </details>
  
  <details class="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
    <summary class="font-bold text-lg" style="color: ${config.colorScheme}">
      ${lang.name === 'français' ? '🛡️ Quelle est la garantie ?' : '🛡️ What is the warranty?'}
    </summary>
    <p class="mt-3 text-gray-700">${lang.name === 'français' ? 'Garantie fabricant de 2 ans incluse.' : '2-year manufacturer warranty included.'}</p>
  </details>
  
  <details class="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
    <summary class="font-bold text-lg" style="color: ${config.colorScheme}">
      ${lang.name === 'français' ? '📏 Quelles sont les dimensions ?' : '📏 What are the dimensions?'}
    </summary>
    <p class="mt-3 text-gray-700">${lang.name === 'français' ? 'Voir le tableau des caractéristiques techniques ci-dessus.' : 'See technical specifications table above.'}</p>
  </details>
  
  <details class="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
    <summary class="font-bold text-lg" style="color: ${config.colorScheme}">
      ${lang.name === 'français' ? '♻️ De quoi est composé ce produit ?' : '♻️ What is this product made of?'}
    </summary>
    <p class="mt-3 text-gray-700">${lang.name === 'français' ? 'Matériaux de qualité premium, voir section Matériaux.' : 'Premium quality materials, see Materials section.'}</p>
  </details>
</div>

<h2>Conclusion</h2>
<div class="conclusion my-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
  <p class="text-lg leading-relaxed mb-6">${lang.name === 'français' ? 'En résumé, ce produit offre un excellent rapport qualité-prix et répond parfaitement aux attentes des clients exigeants.' : 'In summary, this product offers excellent value for money and perfectly meets the expectations of demanding customers.'}</p>
  <div class="text-center">
    ${hasProducts ? `
    <a href="${products[0].product_url}" target="_blank" class="inline-block px-10 py-5 rounded-2xl text-white font-bold text-xl hover:opacity-90 transition-all transform hover:scale-105 shadow-xl" style="background-color: ${config.colorScheme}">
      ${lang.name === 'français' ? '🛒 Voir le Produit Maintenant' : '🛒 View Product Now'} →
    </a>
    ` : ''}
  </div>
</div>

📌 RÈGLES CRITIQUES :
✅ Tout en ${lang.name.toUpperCase()}
✅ ${wordCountTarget} mots minimum
✅ Structure H1-H2-H3 stricte respectée
✅ Intégration naturelle des mots-clés : ${targetKeywords.join(", ")}
✅ Liens produits cliquables
✅ Netlinking interne Shopify
✅ Pas de <html>, <head>, <body>
✅ Tailwind CSS uniquement
✅ Couleur principale : ${config.colorScheme}
❌ ZERO phrases IA génériques
❌ Taux répétition < 5%
❌ Aucun JavaScript

📦 DONNÉES PRODUITS DISPONIBLES :
${hasProducts ? products.map((p, i) => `
PRODUIT ${i + 1}:
- Titre: ${p.title}
- Prix: ${p.price}€
- URL: ${p.product_url}
- Image: ${p.full_image_url || p.image_url}
- Description: ${p.description || 'N/A'}
- Type: ${p.product_type || 'N/A'}
- Marque: ${p.vendor || 'N/A'}
`).join('\n') : 'Aucun produit disponible - Créer un article générique'}

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
        max_tokens: 3000, // Réduit à 3000 pour éviter contenu trop long
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

     // CRITICAL: Limite drastique pour éviter erreur index DB (8191 bytes limit)
    // Réduire le contenu à 50KB maximum au lieu de 500KB
    const maxContentLength = 50000; // 50KB au lieu de 500KB
    if (content.length > maxContentLength) {
      console.warn(`⚠️ Contenu tronqué de ${content.length} à ${maxContentLength} caractères`);
      // Tronquer intelligemment au dernier paragraph complet
      const truncated = content.substring(0, maxContentLength);
      const lastParagraph = truncated.lastIndexOf('</p>');
      content = lastParagraph > 0 ? truncated.substring(0, lastParagraph + 4) : truncated;
    }

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
      .slice(0, 3); // ULTRA réduit: 3 mots-clés max

    // ULTRA AGRESSIF: Limite extrême pour respecter index DB (8191 bytes)
    const truncatedKeywords = [...targetKeywords, ...seoKeywords]
      .slice(0, 3) // Max 3 keywords total
      .map(k => k.substring(0, 15)); // Max 15 caractères par mot-clé

    const metaDescription = optimizedTitle.substring(0, 160); // Meta description = titre tronqué

    // Sauvegarde de l'article
    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id,
          store_id: storeId, // Include store_id
          title: optimizedTitle.substring(0, 200), // ULTRA réduit: 200 caractères
          content,
          featured_image: featuredImage,
          meta_description: metaDescription,
          keywords: truncatedKeywords,
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
