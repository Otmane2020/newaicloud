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
    const authHeader = req.headers.get("Authorization");
    const requestData = await req.json();

    console.log("🚀 Article generation request:", { 
      user_id: requestData.user_id,
      category: requestData.category,
      keywords: requestData.keywords 
    });

    const result = await generateArticle(requestData, supabase, lovableApiKey, authHeader);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Global error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

async function generateArticle(
  requestData: any,
  supabase: any,
  apiKey: string,
  authHeader?: string | null
) {
  try {
    const { 
      user_id, 
      store_id,
      productIds = [],
      collectionIds = [],
      category = "Guide", 
      keywords = [], 
      title, 
      articleLength = "2500",
      targetAudience,
      articleAngle,
      layout = "editorial",
      colorPalette = "neutral",
      editorialAngle = "guide",
      generateFeaturedImage = false
    } = requestData;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log("📝 Starting article generation:", { 
      user_id, 
      store_id,
      productCount: productIds?.length || 0,
      collectionCount: collectionIds?.length || 0
    });

    // Étape 1: Récupérer les produits
    let products: any[] = [];
    
    try {
      if (productIds && productIds.length > 0) {
        console.log("🔍 Fetching specific products:", productIds);
        
        // Utiliser un LEFT JOIN pour inclure les produits même sans images
        const { data, error } = await supabase
          .from("shopify_products")
          .select(`
            id,
            title,
            handle,
            price,
            compare_at_price,
            inventory_quantity,
            category,
            product_type,
            ai_material,
            ai_color,
            smart_weight,
            smart_height,
            smart_width,
            smart_length,
            description,
            image_url,
            product_images (
              src,
              alt_text,
              position
            )
          `)
          .in("id", productIds);

        if (error) {
          console.error("❌ Error fetching products:", error);
        } else if (data && data.length > 0) {
          products = data;
          console.log(`✅ Found ${products.length} products with images:`, data.map((p: any) => ({
            title: p.title,
            imageCount: p.product_images?.length || 0,
            hasImageUrl: !!p.image_url
          })));
        }
      }
      
      // Fallback: prendre des produits récents
      if (products.length === 0) {
        console.log("⚠️ No products from IDs, fetching recent products");
        
        const { data, error } = await supabase
          .from("shopify_products")
          .select(`
            id,
            title,
            handle,
            price,
            compare_at_price,
            inventory_quantity,
            category,
            product_type,
            vendor,
            tags,
            description,
            body_html,
            image_url,
            store_id,
            seller_id,
            ai_material,
            ai_color,
            smart_weight,
            smart_height,
            smart_width,
            smart_length
          `)
          .eq("seller_id", user_id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          console.error("❌ Error fetching recent products:", error);
        } else if (data) {
          products = data;
          console.log(`✅ Found ${products.length} recent products`);
        }
      }
    } catch (err) {
      console.error("❌ Exception during product fetch:", err);
    }

    // Étape 2: Récupérer les infos de la boutique
    let storeName = "votre boutique";
    let storeUrl = "";
    
    if (store_id) {
      try {
        const { data: storeData } = await supabase
          .from("shopify_connections")
          .select("store_name, store_url")
          .eq("id", store_id)
          .single();
        
        if (storeData) {
          storeName = storeData.store_name || storeName;
          storeUrl = storeData.store_url || "";
          console.log("🏪 Store info:", { storeName, storeUrl });
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch store info:", err);
      }
    }

    // Étape 3: Préparer le contexte produits pour l'IA avec analyse d'images Gemini Vision
    const productsContext = products.length > 0
      ? await Promise.all(products.map(async (p, i) => {
          const promo = p.compare_at_price && p.compare_at_price > p.price
            ? `PROMO -${Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)}%`
            : "";
          
          const dims = [p.smart_height, p.smart_width, p.smart_length]
            .filter(Boolean)
            .join(" x ");
          
          // ✅ Gérer les images : product_images OU image_url
          let images = "";
          let imageAnalysis = "";
          const productImages = p.product_images && p.product_images.length > 0 
            ? p.product_images 
            : p.image_url ? [{ src: p.image_url, alt_text: p.title }] : [];
          
          if (productImages.length > 0) {
            // Analyser les images avec Gemini Vision
            try {
              console.log(`📸 Analyzing images for product: ${p.title}`);
              const imageAnalysisResults = await Promise.all(
                productImages.slice(0, 3).map(async (img: any, idx: number) => {
                  try {
                    const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                      },
                      body: JSON.stringify({
                        model: "google/gemini-2.5-flash",
                        messages: [
                          {
                            role: "user",
                            content: [
                              {
                                type: "text",
                                text: `Analyse cette image de produit et extrais les informations visuelles détaillées: matériaux visibles, couleurs, finitions, dimensions apparentes, style, contexte d'utilisation. Réponds en JSON avec: {materials: string[], colors: string[], style: string, details: string, dimensions_visible: boolean}`
                              },
                              {
                                type: "image_url",
                                image_url: { url: img.src }
                              }
                            ]
                          }
                        ]
                      }),
                    });

                    if (visionResponse.ok) {
                      const visionData = await visionResponse.json();
                      const analysis = visionData.choices?.[0]?.message?.content || "";
                      return `Image ${idx + 1} Analysis: ${analysis}`;
                    }
                  } catch (err) {
                    console.warn(`⚠️ Vision analysis failed for image ${idx}:`, err);
                  }
                  return "";
                })
              );
              
              imageAnalysis = imageAnalysisResults.filter(Boolean).join("\n");
            } catch (err) {
              console.warn("⚠️ Could not analyze images:", err);
            }

            images = productImages
              .map((img: any, idx: number) => 
                `  Image ${idx + 1}: ${img.src}\n  Alt text: ${img.alt_text || 'Image produit'}`
              )
              .join("\n");
          } else {
            images = "⚠️ Aucune image disponible pour ce produit";
          }
          
          return `
**Produit ${i + 1}: ${p.title}**
- Prix: ${p.price}€ ${promo}
- URL: ${storeUrl}/products/${p.handle}
- Matériau: ${p.ai_material || "Non spécifié"}
- Couleur: ${p.ai_color || "Non spécifiée"}
- Dimensions: ${dims || "Non spécifiées"}
- Poids: ${p.smart_weight || "Non spécifié"}
- Stock: ${p.inventory_quantity > 0 ? `${p.inventory_quantity} unités` : "Stock limité"}
- Catégorie: ${p.category || p.product_type || "Non spécifiée"}
**Images**:
${images}
${imageAnalysis ? `\n**Analyse Visuelle (Gemini Vision)**:\n${imageAnalysis}` : ''}
`.trim();
        })).then(results => results.join("\n\n"))
      : "Aucun produit spécifique disponible - générer un article informatif général";

    console.log("📦 Products context prepared with", products.length, "products and vision analysis");

    // Étape 4: Générer un titre intelligent avec Lovable AI
    let articleTitle = title;
    if (!articleTitle) {
      try {
        console.log("🎯 Generating intelligent title with Lovable AI...");
        
        const titlePrompt = `Tu es un expert en rédaction de titres SEO concis et percutants pour des articles de blog e-commerce.

**CONTEXTE**:
- Boutique: ${storeName}
- Catégorie: ${category}
- Angle éditorial: ${editorialAngle}
- Mot-clé principal: ${keywords[0] || category}
- Nombre de produits: ${products.length}

**RÈGLES STRICTES** (IMPÉRATIF):
1. Maximum ABSOLU: 55 caractères (pas un de plus !)
2. Format naturel et engageant en français
3. AUCUNE formule générique "X Parfait" ou "X Idéal"
4. AUCUNE liste entre parenthèses
5. Style conversationnel et professionnel
6. Intégrer l'année en cours (2025) si pertinent

**FORMULES RECOMMANDÉES** selon l'angle éditorial:

GUIDE:
- "Comment Choisir [Produit]: Le Guide"
- "[Produit]: Guide d'Achat 2025"
- "Votre Guide [Produit] Complet"
- "Bien Choisir Son [Produit]"

COMPARATIF:
- "Top ${Math.min(products.length, 10)} [Produit] 2025"
- "[Produit]: Comparatif Détaillé"
- "Meilleurs [Produit]: Notre Sélection"

AVIS:
- "[Produit]: Notre Avis Complet"
- "Test & Avis [Produit]"
- "[Produit]: Ce Qu'il Faut Savoir"

TUTORIEL:
- "Installer Votre [Produit]: Guide"
- "Utiliser [Produit] Comme un Pro"
- "[Produit]: Mode d'Emploi"

**EXEMPLES PARFAITS**:
✅ "Comment Choisir Votre Canapé Velours" (37 chars)
✅ "Buffet Baroque: Guide d'Achat 2025" (35 chars)
✅ "Top 5 Canapés Scandinaves 2025" (31 chars)
✅ "Table Basse Marbre: Notre Avis" (31 chars)

**EXEMPLES INTERDITS**:
❌ "Guide: Canapé Velours Anthracite Parfait"
❌ "Le Meilleur Buffet Baroque (Marbre, Blanc)"
❌ "Canapé Parfait Pour Votre Salon"

Réponds UNIQUEMENT avec le titre optimisé, sans guillemets, sans formatage, sans explication.`;

        const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Tu es un expert en rédaction de titres SEO ultra-concis. Tu retournes UNIQUEMENT le titre, sans guillemets ni explications. Maximum 55 caractères."
              },
              {
                role: "user",
                content: titlePrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 80
          }),
        });

        if (titleResponse.ok) {
          const titleData = await titleResponse.json();
          let generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
          
          if (generatedTitle) {
            // Nettoyage agressif
            generatedTitle = generatedTitle
              .replace(/^["']|["']$/g, '')
              .replace(/^\*\*|\*\*$/g, '')
              .replace(/^Titre\s*:\s*/i, '')
              .replace(/\(.*?\)/g, '') // Supprimer tout entre parenthèses
              .trim();
            
            // Validation stricte de longueur
            if (generatedTitle.length > 55) {
              console.warn(`⚠️ Title too long (${generatedTitle.length} chars), truncating...`);
              generatedTitle = generatedTitle.substring(0, 52) + '...';
            }
            
            articleTitle = generatedTitle;
            console.log(`✅ Intelligent title generated: "${articleTitle}" (${articleTitle.length} chars)`);
          } else {
            throw new Error("No title in response");
          }
        } else {
          throw new Error(`Title generation failed: ${titleResponse.status}`);
        }
      } catch (err) {
        console.warn("⚠️ Failed to generate AI title, using fallback:", err);
        // Fallback: titre naturel si l'IA échoue
        const mainKeyword = keywords[0] || category;
        switch (editorialAngle) {
          case 'guide':
            articleTitle = `Comment Choisir Votre ${mainKeyword}`;
            break;
          case 'comparatif':
            articleTitle = `Top ${Math.min(products.length, 10)} ${mainKeyword} 2025`;
            break;
          case 'avis':
            articleTitle = `${mainKeyword}: Notre Avis Complet`;
            break;
          case 'tutoriel':
            articleTitle = `${mainKeyword}: Mode d'Emploi Complet`;
            break;
          default:
            articleTitle = `${mainKeyword}: Guide d'Achat 2025`;
        }
      }
    }

    // Étape 4: Générer l'image de couverture avec Lovable AI
    let featuredImage = "";
    if (generateFeaturedImage) {
      try {
        console.log("🎨 Generating featured image with Lovable AI...");
        
        const imagePrompt = `Créez une image de couverture moderne et professionnelle pour un article sur "${articleTitle}". 
Style: photographie de haute qualité, minimaliste, épurée, professionnelle.
Thème: ${category} - ${keywords.slice(0, 3).join(', ')}
Couleurs: harmonieuses et élégantes.
Format: 1200x630px (format Open Graph).
Aucun texte, juste une représentation visuelle du sujet.`;

        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: imagePrompt
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log("🖼️ Image API response:", JSON.stringify(imageData).substring(0, 200));
          
          const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64Image) {
            featuredImage = base64Image;
            console.log("✅ Featured image generated successfully (base64 length:", base64Image.length, ")");
          } else {
            console.warn("⚠️ No image in API response:", imageData);
          }
        } else {
          const errorText = await imageResponse.text();
          console.error("❌ Image generation failed:", imageResponse.status, errorText);
        }
      } catch (err) {
        console.error("❌ Featured image generation error:", err);
        // Ne pas bloquer la génération d'article si l'image échoue
      }
    }

    // Étape 5: Générer le contenu HTML avec Lovable AI
    
    // Layout-specific styles
    const layoutStyles: Record<string, string> = {
      editorial: `
        /* Editorial Layout - Images en vedette */
        .editorial-image {
          width: 100%;
          max-width: 800px;
          height: auto;
          display: block;
          margin: 30px auto;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .product-card {
          margin: 60px 0;
          padding: 40px;
          border-left: 4px solid var(--color-accent);
          background: white;
        }
      `,
      grid: `
        /* Grid Layout - Cartes uniformes */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin: 40px 0;
        }
        .product-card {
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s;
          background: white;
        }
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .grid-image {
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 15px;
        }
      `,
      story: `
        /* Story Layout - Images flottantes alternées */
        .story-section {
          margin: 60px 0;
          overflow: auto;
        }
        .story-image-left {
          float: left;
          width: 45%;
          max-width: 400px;
          margin: 0 30px 20px 0;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .story-image-right {
          float: right;
          width: 45%;
          max-width: 400px;
          margin: 0 0 20px 30px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .story-text {
          line-height: 1.8;
          font-size: 18px;
        }
        @media (max-width: 768px) {
          .story-image-left, .story-image-right {
            float: none;
            width: 100%;
            max-width: 100%;
            margin: 20px 0;
          }
        }
      `
    };

    // Color palette styles
    const paletteStyles: Record<string, string> = {
      modern: `--color-primary: #1a1a1a; --color-secondary: #4a4a4a; --color-tertiary: #808080; --color-border: #c0c0c0; --color-bg: #e8e8e8;`,
      earth: `--color-primary: #3d2817; --color-secondary: #6b4423; --color-tertiary: #9c8577; --color-border: #c9b5a0; --color-bg: #e8d9cc;`,
      green: `--color-primary: #1b5e20; --color-secondary: #43a047; --color-tertiary: #66bb6a; --color-border: #81c784; --color-bg: #a5d6a7;`,
      blue: `--color-primary: #003d82; --color-secondary: #0066cc; --color-tertiary: #3399ff; --color-border: #66b3ff; --color-bg: #99ccff;`,
      gold: `--color-primary: #1a1a1a; --color-secondary: #4a4a4a; --color-tertiary: #c5a647; --color-border: #d4af37; --color-bg: #f0e68c;`,
      vibrant: `--color-primary: #c62828; --color-secondary: #e53935; --color-tertiary: #ef5350; --color-border: #e57373; --color-bg: #ef9a9a;`,
      custom: `--color-primary: #000000; --color-secondary: #ffffff; --color-accent: #0066cc;` // Sera remplacé par customColors
    };

    // Si des couleurs personnalisées sont fournies, les utiliser
    const { customColors } = requestData;
    let finalPaletteStyle = paletteStyles[colorPalette] || paletteStyles.modern;
    
    if (colorPalette === 'custom' && customColors) {
      finalPaletteStyle = `--color-primary: ${customColors.primary}; --color-secondary: ${customColors.secondary}; --color-accent: ${customColors.accent};`;
    }
    
    const prompt = `Tu es un expert en rédaction d'articles SEO pour e-commerce, spécialisé dans le style New York Times.

**MISSION CRITIQUE**: Génère un article HTML complet de EXACTEMENT ${articleLength} mots sur le sujet "${articleTitle}".

⚠️ **LONGUEUR OBLIGATOIRE: ${articleLength} MOTS** ⚠️
${articleLength === '700' ? '📝 Article COURT et CONCIS (700 mots): Focus sur l\'essentiel, 3-4 sections max, style direct et impactant.' : ''}
${articleLength === '2000' ? '📚 Article APPROFONDI (2000 mots): Analyse détaillée, 6-8 sections, contenu expert, exemples multiples.' : ''}

**CONTEXTE**:
- Boutique: ${storeName}
- Catégorie: ${category}
- Mots-clés: ${keywords.join(", ")}
- Public cible: ${targetAudience || "Grand public"}
- **Angle éditorial: ${editorialAngle}** ⚠️ RESPECTER STRICTEMENT
- **Layout: ${layout}** ⚠️ APPLIQUER STRICTEMENT

**🎯 ANGLE ÉDITORIAL "${editorialAngle}" - DIRECTIVES IMPÉRATIVES**:

${editorialAngle === 'guide' ? `
📚 **GUIDE COMPLET** (STRUCTURE OBLIGATOIRE):
1. Introduction pédagogique (150 mots)
2. Pourquoi ce guide est important
3. Section 1: Comprendre les bases
4. Section 2: Critères de choix détaillés
5. Section 3: Comparatif produits avec tableau
6. Section 4: Guide d'achat pas à pas
7. Section 5: Conseils d'entretien et utilisation
8. FAQ (minimum 5 questions)
- Ton: Pédagogique, professeur bienveillant
- Inclure: Tableaux comparatifs, listes à puces, encadrés conseils
` : ''}

${editorialAngle === 'comparatif' ? `
🤝 **COMPARATIF PRODUITS** (STRUCTURE OBLIGATOIRE):
1. Introduction: Méthodologie de test (100 mots)
2. Présentation des critères d'évaluation
3. Produit 1: Analyse détaillée (avantages ✅ / inconvénients ❌)
4. Produit 2: Analyse détaillée (avantages ✅ / inconvénients ❌)
5. [Répéter pour chaque produit]
6. Tableau comparatif récapitulatif
7. Verdict final et recommandations
- Ton: Objectif, analytique, comme un testeur pro
- Inclure: Tableau avec notation, listes ✅/❌, verdicts clairs
` : ''}

${editorialAngle === 'avis' ? `
⭐ **TEST & AVIS** (STRUCTURE OBLIGATOIRE):
1. Introduction: Présentation du test (80 mots)
2. Première impression / Déballage
3. Test détaillé de chaque produit:
   - Points forts ✅ (3-5 points)
   - Points faibles ❌ (2-3 points)
   - Note /10
4. Comparaison avec concurrents
5. Notre verdict final
6. Pour qui est-ce fait ?
- Ton: Honnête, comme un ami qui conseille
- Inclure: Notes, encadrés avis, recommandations personnalisées
` : ''}

${editorialAngle === 'tutoriel' ? `
🎓 **TUTORIEL PRATIQUE** (STRUCTURE OBLIGATOIRE):
1. Introduction: Ce que vous allez apprendre (80 mots)
2. Prérequis et matériel nécessaire (liste)
3. **Étape 1**: [Action] - Instructions précises
4. **Étape 2**: [Action] - Instructions précises
5. [Répéter pour chaque étape numérotée]
6. Astuces de pro ✨
7. Erreurs à éviter ⚠️
8. Conclusion et prochaines étapes
- Ton: Coach encourageant, instructions claires
- Inclure: Étapes numérotées, encadrés 💡/⚠️/✨
` : ''}

**📐 LAYOUT "${layout}" - STRUCTURE VISUELLE IMPOSÉE**:

${layout === 'editorial' ? `
📰 **LAYOUT ÉDITORIAL**:
- Structure: Article classique avec grandes images en vedette
- Images: 1 grande image par produit (max-width: 800px), centrée
- Placement: Image APRÈS le titre de section, AVANT le texte descriptif
- Style: Espacé, aéré, typographie élégante
- Exemple:
  <section>
    <h2>Produit Premium</h2>
    <img src="[URL]" class="editorial-image" alt="...">
    <p>Description détaillée...</p>
  </section>
` : ''}

${layout === 'grid' ? `
🎛️ **LAYOUT GRILLE**:
- Structure: Grille de cartes produits (2-3 colonnes)
- Images: Taille égale dans chaque carte (aspect-ratio: 1/1)
- Placement: Image EN HAUT de chaque carte
- Style: Cards compactes avec hover effects
- Exemple:
  <div class="product-grid">
    <div class="product-card">
      <img src="[URL]" class="grid-image" alt="...">
      <h3>Titre</h3>
      <p>Description courte</p>
      <span class="price">Prix</span>
    </div>
  </div>
` : ''}

${layout === 'story' ? `
📖 **LAYOUT STORYTELLING**:
- Structure: Images intégrées dans le récit
- Images: Variées (inline à gauche/droite, alternées)
- Placement: Images inline avec text-wrap, alternance gauche/droite
- Style: Fluidité narrative, images flottantes
- Exemple:
  <img src="[URL]" class="story-image-left" alt="...">
  <p>Texte qui entoure l'image...</p>
  <img src="[URL]" class="story-image-right" alt="...">
  <p>Suite du récit...</p>
` : ''}

**PRODUITS DISPONIBLES (${products.length} produits)**:
${productsContext}

**📸 INSTRUCTIONS IMAGES - POSITIONNEMENT INTELLIGENT AVEC VISION AI**:

⚠️ **UTILISE L'ANALYSE VISION AI CI-DESSUS POUR**:
1. **Choisir la meilleure image principale** pour chaque produit (celle qui montre le mieux le produit)
2. **Positionner intelligemment** selon le layout:
   - Editorial: Grande image vedette après le titre
   - Grid: Image carrée en haut de carte
   - Story: Images alternées gauche/droite selon le flow narratif
3. **Créer des galeries** pour produits avec multiples angles de vue
4. **Adapter les alt texts** selon l'analyse visuelle (matériaux, couleurs, style détectés)

⚠️ **RÈGLES ABSOLUES IMAGES**:
- COPIER EXACTEMENT les URLs du contexte produits ci-dessus
- NE JAMAIS utiliser via.placeholder.com, example.com, ou \${...}
- Si pas d'image: ne pas afficher d'image pour ce produit
- Format: <img src="[URL_EXACTE_DU_CONTEXTE]" alt="[ALT_DESCRIPTIF]" class="[CLASS_SELON_LAYOUT]">

**INSTRUCTIONS CRITIQUES**:

1. **TABLE DES MATIÈRES**: Commence par une table des matières cliquable avec ancres (#section-1, #section-2, etc.)

2. **STRUCTURE HTML5** complète avec:
   - <article> principal
   - <nav> pour la table des matières
   - <section> pour chaque partie
   - <header> pour les titres de section

3. **TYPOGRAPHIE NEW YORK TIMES**:
   - Police: Georgia, Garamond, Times New Roman, serif
   - Titres: font-weight: 700, letter-spacing: -0.02em
   - Corps: line-height: 1.75, font-size: 18px
   - Espacements généreux entre sections (60px)

 4. **PALETTE DE COULEURS ${colorPalette}** - APPLIQUE CES VARIABLES CSS:
   :root {
     ${finalPaletteStyle}
   }
   - Utilise var(--color-primary) pour les titres
   - Utilise var(--color-accent) pour les liens et boutons
   - Utilise var(--color-secondary) pour les backgrounds

5. **LAYOUT "${layout}"** avec styles spécifiques:
   ${layoutStyles[layout] || layoutStyles.editorial}

6. **IMAGES DES PRODUITS - CRITIQUEMENT IMPORTANT**:
   ⚠️ TU DOIS UTILISER UNIQUEMENT LES URLs D'IMAGES LISTÉES DANS LE CONTEXTE PRODUITS CI-DESSUS
   ⚠️ NE JAMAIS GÉNÉRER DE PLACEHOLDERS (via.placeholder.com, example.com, etc.)
   ⚠️ NE JAMAIS INVENTER D'URLs
   ⚠️ NE JAMAIS UTILISER DE TEMPLATE LITERALS COMME \${...}
   
   Pour chaque produit dans l'article :
   - Copie EXACTEMENT l'URL d'image du contexte produits (section **Images**)
   - Utilise cette structure HTML :
     <img src="https://cdn.shopify.com/..." alt="Description précise" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; margin: 20px 0;">
   
   Exemple :
   Si le contexte dit "Image 1: https://cdn.shopify.com/s/files/abc123.jpg"
   Alors écris EXACTEMENT :
   <img src="https://cdn.shopify.com/s/files/abc123.jpg" alt="Image principale" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; margin: 20px 0;">

7. **GALERIE D'IMAGES CLIQUABLE** :
   Pour créer une galerie avec PLUSIEURS images d'un produit :
   - Utilise TOUTES les URLs d'images du contexte de ce produit
   - Copie EXACTEMENT les URLs du contexte
   - Structure :
   <div class="product-gallery">
     <div class="gallery-main">
       <img src="[COPIE_URL_IMAGE_1_DU_CONTEXTE]" alt="[ALT_1]" class="gallery-image active">
       <img src="[COPIE_URL_IMAGE_2_DU_CONTEXTE]" alt="[ALT_2]" class="gallery-image">
       <img src="[COPIE_URL_IMAGE_3_DU_CONTEXTE]" alt="[ALT_3]" class="gallery-image">
     </div>
     <div class="gallery-thumbnails">
       <img src="[COPIE_URL_IMAGE_1_DU_CONTEXTE]" alt="[ALT_1]" class="thumbnail active" onclick="showImage(0)">
       <img src="[COPIE_URL_IMAGE_2_DU_CONTEXTE]" alt="[ALT_2]" class="thumbnail" onclick="showImage(1)">
       <img src="[COPIE_URL_IMAGE_3_DU_CONTEXTE]" alt="[ALT_3]" class="thumbnail" onclick="showImage(2)">
     </div>
   </div>
   
   JavaScript pour la galerie (à inclure UNE SEULE FOIS dans le HTML) :
   <script>
   function showImage(index) {
     const images = document.querySelectorAll('.gallery-image');
     const thumbs = document.querySelectorAll('.thumbnail');
     images.forEach((img, i) => {
       img.classList.toggle('active', i === index);
     });
     thumbs.forEach((thumb, i) => {
       thumb.classList.toggle('active', i === index);
     });
   }
   </script>

**RAPPEL CRITIQUE - IMAGES** :
Les URLs d'images des produits sont listées ci-dessus dans le contexte produits.
Tu DOIS copier ces URLs EXACTEMENT comme elles apparaissent.
NE GÉNÈRE JAMAIS de placeholders (via.placeholder.com, example.com, etc.).
NE JAMAIS UTILISER DE VARIABLES - copie les URLs complètes.
Si aucune image n'est disponible pour un produit, n'affiche PAS d'image pour ce produit.

7. **MENTION DE TOUS LES ${products.length} PRODUITS**:
   - Chaque produit DOIT apparaître dans l'article
   - Avec son nom cliquable vers Shopify: <a href="${storeUrl}/products/HANDLE_DU_PRODUIT" style="color: var(--color-accent); font-weight: 600;">Nom du produit</a>
   - Son prix: <span class="product-price" style="color: var(--color-accent); font-weight: 700;">[prix]€</span>
   - Sa promotion si applicable
   - Une image dans la galerie
   
   IMPORTANT: Remplace HANDLE_DU_PRODUIT par le vrai handle de chaque produit (disponible dans le contexte)

8. **NE PAS AFFICHER**:
   - Stock détaillé (juste "Disponible" ou "Stock limité")
   - Informations techniques excessives
   - Numéros de référence internes

9. **CSS COMPLET INCLUS** dans <style>:
   <style>
     ${layoutStyles[layout] || layoutStyles.editorial}
     
     :root { ${finalPaletteStyle} }
     
     body {
       font-family: Georgia, 'Times New Roman', serif;
       line-height: 1.75;
       color: var(--color-primary);
       background: var(--color-secondary);
       max-width: 1200px;
       margin: 0 auto;
       padding: 40px 20px;
     }
     
     h1, h2, h3 {
       font-weight: 700;
       color: var(--color-primary);
       letter-spacing: -0.02em;
       margin-top: 60px;
       margin-bottom: 20px;
     }
     
     h1 { font-size: 48px; }
     h2 { font-size: 36px; border-bottom: 3px solid var(--color-accent); padding-bottom: 15px; }
     h3 { font-size: 28px; }
     
     a {
       color: var(--color-accent);
       text-decoration: none;
       font-weight: 600;
       transition: opacity 0.3s;
     }
     
     a:hover { opacity: 0.7; }
     
     .toc {
       background: var(--color-secondary);
       border: 2px solid var(--color-accent);
       border-radius: 12px;
       padding: 30px;
       margin: 40px 0;
     }
     
     .toc h2 {
       margin-top: 0;
       border: none;
     }
     
     .toc ul {
       list-style: none;
       padding: 0;
     }
     
     .toc li {
       margin: 15px 0;
       font-size: 18px;
     }
     
     .product-gallery {
       margin: 40px 0;
       border: 1px solid #e0e0e0;
       border-radius: 12px;
       overflow: hidden;
       background: white;
     }
     
     .gallery-main {
       position: relative;
       width: 100%;
       height: 500px;
       overflow: hidden;
     }
     
     .gallery-image {
       position: absolute;
       width: 100%;
       height: 100%;
       object-fit: cover;
       opacity: 0;
       transition: opacity 0.5s;
     }
     
     .gallery-image.active {
       opacity: 1;
       z-index: 1;
     }
     
     .gallery-thumbnails {
       display: flex;
       gap: 10px;
       padding: 15px;
       overflow-x: auto;
     }
     
     .thumbnail {
       width: 100px;
       height: 100px;
       object-fit: cover;
       cursor: pointer;
       border: 3px solid transparent;
       border-radius: 8px;
       transition: all 0.3s;
     }
     
     .thumbnail:hover {
       border-color: var(--color-accent);
       transform: scale(1.05);
     }
     
     .thumbnail.active {
       border-color: var(--color-accent);
     }
     
     .product-price {
       color: var(--color-accent);
       font-weight: 700;
       font-size: 24px;
     }
     
     .product-card {
       background: white;
       border: 1px solid #e0e0e0;
       border-radius: 12px;
       padding: 30px;
       margin: 40px 0;
       box-shadow: 0 4px 20px rgba(0,0,0,0.08);
     }
     
     .btn-primary {
       display: inline-block;
       background: var(--color-accent);
       color: white;
       padding: 15px 30px;
       border-radius: 8px;
       font-weight: 600;
       transition: all 0.3s;
     }
     
     .btn-primary:hover {
       opacity: 0.9;
       transform: translateY(-2px);
     }
   </style>

10. **CONTENU RICHE**:
    - Introduction captivante (200 mots)
    - Table des matières complète
    - Sections structurées avec H2/H3 (minimum 5 sections)
    - Chaque section mentionne 1-2 produits avec liens et prix
    - Galeries d'images pour les produits phares
    - FAQ en fin d'article (5 questions minimum)

11. **SEO**: Utilise naturellement les mots-clés "${keywords.join('", "')}" dans les titres et le texte

12. **TON**: Journalistique, expert, accessible, enthousiaste

**FORMAT DE SORTIE**: HTML pur et complet, prêt à insérer, commençant par <!DOCTYPE html>

${layout === 'grid' ? `
**EXEMPLE GRILLE PRODUIT**:
Utilise la structure .product-grid avec cartes complètes incluant images, prix, et liens.
` : layout === 'story' ? `
**EXEMPLE INTÉGRATION STORY**:
Intègre les produits naturellement dans le récit avec des liens inline vers ${storeUrl}/products/[handle].
` : `
**EXEMPLE ÉDITORIAL**:
Présente les produits avec de grandes images en vedette et sections dédiées.
`}

Commence par <!DOCTYPE html> et génère l'article complet.`;

    console.log("🤖 Calling Gemini AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un expert en rédaction d'articles SEO pour e-commerce. Tu génères du HTML pur et moderne.
IMPÉRATIF: Respecte EXACTEMENT la longueur demandée (${articleLength} mots), le layout (${layout}), et l'angle éditorial (${editorialAngle}).`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: articleLength === '700' ? 8000 : 20000, // Ajusté selon la longueur
        }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let htmlContent = aiData.choices[0]?.message?.content || "";

    console.log("✅ Content generated, length:", htmlContent.length);

    // Nettoyer le HTML
    htmlContent = htmlContent
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    console.log("Generated article length:", htmlContent.length);
    
    // ✅ Vérifier que le HTML ne contient pas de placeholders
    if (htmlContent.includes('via.placeholder.com') || 
        htmlContent.includes('example.com') ||
        htmlContent.includes('${')) {
      console.warn('⚠️ Generated HTML contains placeholder images or template literals!');
      console.warn('HTML preview:', htmlContent.substring(0, 1000));
    }

    // ✅ Compter les images réelles
    const imageMatches = htmlContent.match(/<img[^>]+src="https:\/\/cdn\.shopify\.com[^"]*"/g);
    console.log(`✅ Found ${imageMatches?.length || 0} real Shopify images in generated HTML`);

    // Extraire la meta description
    let metaDescription = "";
    const descMatch = htmlContent.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/);
    if (descMatch) {
      metaDescription = descMatch[1];
    } else {
      // Générer une meta description simple
      const firstParagraph = htmlContent.match(/<p[^>]*>([^<]+)</);
      if (firstParagraph) {
        metaDescription = firstParagraph[1].substring(0, 160);
      }
    }

    // Étape 6: Sauvegarder l'article
    const { data: article, error: saveError } = await supabase
      .from("blog_articles")
      .insert({
        user_id,
        store_id: store_id || null,
        title: articleTitle,
        content: htmlContent,
        meta_description: metaDescription,
        keywords,
        status: "draft",
        source: "ai_generated",
        featured_image: featuredImage || null,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Erreur sauvegarde: ${saveError.message}`);
    }

    console.log("✅ Article saved:", article.id);

    return {
      success: true,
      article: {
        id: article.id,
        title: articleTitle,
        content: htmlContent,
        preview: htmlContent.substring(0, 500),
      },
    };
  } catch (error) {
    console.error("❌ Error in generateArticle:", error);
    throw error;
  }
}
