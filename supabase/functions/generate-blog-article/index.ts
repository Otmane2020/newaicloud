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
      colorPalette = "classic",
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
            smart_material,
            smart_color_name,
            smart_weight,
            smart_height,
            smart_width,
            smart_length
          `)
          .in("id", productIds)
          .eq("seller_id", user_id);

        if (error) {
          console.error("❌ Error fetching products:", error);
        } else if (data && data.length > 0) {
          products = data;
          console.log(`✅ Found ${products.length} products`);
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
            smart_material,
            smart_color_name,
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

    // Étape 3: Préparer le contexte produits pour Gemini
    const productsContext = products.length > 0
      ? products.map((p, i) => {
          const promo = p.compare_at_price && p.compare_at_price > p.price
            ? `PROMO -${Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)}%`
            : "";
          
          const dims = [p.smart_height, p.smart_width, p.smart_length]
            .filter(Boolean)
            .join(" x ");
          
          return `
**Produit ${i + 1}: ${p.title}**
- Prix: ${p.price}€ ${promo}
- URL: ${storeUrl}/products/${p.handle}
- Matériau: ${p.smart_material || "Non spécifié"}
- Couleur: ${p.smart_color_name || "Non spécifiée"}
- Dimensions: ${dims || "Non spécifiées"}
- Poids: ${p.smart_weight || "Non spécifié"}
- Stock: ${p.inventory_quantity > 0 ? `${p.inventory_quantity} unités` : "Stock limité"}
- Catégorie: ${p.category || p.product_type || "Non spécifiée"}
`.trim();
        }).join("\n\n")
      : "Aucun produit spécifique disponible - générer un article informatif général";

    console.log("📦 Products context prepared");

    // Définir le titre de l'article
    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;

    // Étape 4: Générer l'image de couverture avec Lovable AI
    let featuredImage = "";
    if (generateFeaturedImage) {
      try {
        console.log("🎨 Generating featured image with Lovable AI...");
        
        const imagePrompt = `Créez une image de couverture moderne et professionnelle pour un article sur "${articleTitle}". 
Style: photographie de haute qualité, minimaliste, épurée, professionnelle.
Thème: ${category} - ${keywords.slice(0, 3).join(', ')}
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
          const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64Image) {
            featuredImage = base64Image;
            console.log("✅ Featured image generated with Lovable AI");
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not generate featured image:", err);
      }
    }

    // Étape 5: Générer le contenu HTML avec Gemini
    
    // Layout-specific styles
    const layoutStyles: Record<string, string> = {
      editorial: `
        .article-container { max-width: 800px; margin: 0 auto; font-family: 'Georgia', serif; }
        .product-card { margin: 40px 0; padding: 30px; border-left: 4px solid #333; }
        .product-image { width: 100%; max-width: 600px; margin: 20px auto; }
      `,
      grid: `
        .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .product-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; transition: transform 0.3s; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      `,
      story: `
        .story-section { margin: 60px 0; }
        .product-inline { display: inline-block; margin: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
        .story-text { line-height: 1.8; font-size: 18px; }
      `
    };

    // Color palette styles
    const paletteStyles: Record<string, string> = {
      classic: `--color-primary: #1a1a1a; --color-secondary: #ffffff; --color-accent: #4a90e2;`,
      warm: `--color-primary: #8b4513; --color-secondary: #faf0e6; --color-accent: #d2691e;`,
      cool: `--color-primary: #2c3e50; --color-secondary: #ecf0f1; --color-accent: #3498db;`,
      elegant: `--color-primary: #2d2d2d; --color-secondary: #f5f5f5; --color-accent: #c9a961;`,
      modern: `--color-primary: #0a0a0a; --color-secondary: #ffffff; --color-accent: #00d4aa;`
    };
    
    const prompt = `Tu es un expert en rédaction d'articles SEO pour e-commerce, spécialisé dans le style New York Times.

**MISSION**: Génère un article HTML complet de ${articleLength} mots sur le sujet "${articleTitle}".

**CONTEXTE**:
- Boutique: ${storeName}
- Catégorie: ${category}
- Mots-clés: ${keywords.join(", ")}
- Public cible: ${targetAudience || "Grand public"}
- Angle: ${articleAngle || "Guide d'achat"}
- Layout: ${layout}

**PRODUITS DISPONIBLES**:
${productsContext}

**INSTRUCTIONS CRITIQUES**:
1. Structure HTML5 sémantique avec <article>, <section>, <header>
2. Typographie style New York Times: Serif professionnelle, espacements généreux
3. Layout "${layout}" avec le style approprié
4. Palette de couleurs: ${colorPalette}
5. Pour CHAQUE produit, intégration intelligente:
   ${layout === 'grid' ? '- Grille de produits avec cartes complètes' : 
     layout === 'story' ? '- Produits intégrés naturellement dans le texte avec hyperliens' :
     '- Style éditorial avec grandes images'}
6. NE PAS afficher: stock détaillé, informations techniques excessives
7. AFFICHER: Prix, caractéristiques clés, lien vers produit
8. CSS moderne inclus dans <style> avec:
   ${layoutStyles[layout] || layoutStyles.editorial}
   :root { ${paletteStyles[colorPalette] || paletteStyles.classic} }
   - Font: Georgia, Garamond, serif pour le corps
   - Titres: font-weight: 700
   - Espacement: line-height: 1.75
   - Images: Grandes, haute qualité, bien espacées
9. Contenu RICHE:
   - Introduction captivante (200 mots)
   - Sections structurées avec H2/H3
   - Paragraphes de 3-4 lignes maximum
   - Produits présentés avec hyperliens: <a href="${storeUrl}/products/[handle]">[nom produit]</a>
   - FAQ en fin d'article
10. SEO: Utilise naturellement les mots-clés "${keywords.join('", "')}"
11. Ton: Journalistique, expert, accessible

**FORMAT DE SORTIE**: HTML pur, prêt à insérer.

${layout === 'grid' ? `
**EXEMPLE GRILLE PRODUIT**:
<div class="product-grid">
  <div class="product-card">
    <img src="[image_url]" alt="[title]" />
    <h3>[Title]</h3>
    <p class="price">[price]€</p>
    <p>[Description courte]</p>
    <a href="${storeUrl}/products/[handle]" class="btn-primary">Voir le produit</a>
  </div>
</div>
` : layout === 'story' ? `
**EXEMPLE INTÉGRATION STORY**:
<p>Pour ceux qui recherchent l'élégance, le <a href="${storeUrl}/products/[handle]">[nom produit]</a> 
représente un choix idéal. Ses [caractéristiques] en font...</p>
` : `
**EXEMPLE ÉDITORIAL**:
<section class="product-feature">
  <img src="[image_url]" alt="[title]" class="featured-image" />
  <h2>[Title]</h2>
  <p class="lead">[Description riche]</p>
  <a href="${storeUrl}/products/[handle]">Découvrir ce produit</a>
</section>
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
            content: "Tu es un expert en rédaction d'articles SEO pour e-commerce. Tu génères du HTML pur et moderne."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 16000,
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
