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
      articleLength = "2000",
      targetAudience,
      articleAngle
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

    // Étape 4: Générer l'image de couverture
    let featuredImage = "";
    try {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        const imagePrompt = `Create a modern, professional featured image for an article about "${title || category}". 
Style: clean, minimalist, high-quality photography or illustration. 
No text, just visual representation of the topic.`;

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1792x1024",
            quality: "standard",
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          featuredImage = imageData.data[0]?.url || "";
          console.log("✅ Featured image generated");
        }
      }
    } catch (err) {
      console.warn("⚠️ Could not generate featured image:", err);
    }

    // Étape 5: Générer le contenu HTML avec Gemini
    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    
    const prompt = `Tu es un expert en rédaction d'articles SEO pour e-commerce.

**MISSION**: Génère un article HTML complet de ${articleLength} mots sur le sujet "${articleTitle}".

**CONTEXTE**:
- Boutique: ${storeName}
- Catégorie: ${category}
- Mots-clés: ${keywords.join(", ")}
- Public cible: ${targetAudience || "Grand public"}
- Angle: ${articleAngle || "Guide d'achat"}

**PRODUITS DISPONIBLES**:
${productsContext}

**INSTRUCTIONS CRITIQUES**:
1. Structure HTML5 sémantique avec <article>, <section>, <header>
2. Table des matières cliquable en début d'article
3. Pour CHAQUE produit disponible, crée une carte produit HTML belle et moderne avec:
   - Image du produit (utilise image_url ou placeholder)
   - Titre du produit EXACT
   - Prix RÉEL avec badge promo si applicable
   - Caractéristiques techniques RÉELLES (dimensions, matériau, poids)
   - Badge de stock
   - Bouton "Voir le produit" avec lien vers ${storeUrl}/products/[handle]
4. CSS moderne inclus dans <style> avec:
   - Design responsive
   - Cartes produits attractives avec hover effects
   - Badges colorés pour promos et stock
   - Typographie professionnelle
   - Couleurs harmonieuses
5. Contenu RICHE et DÉTAILLÉ:
   - Introduction captivante
   - Sections structurées avec H2/H3
   - Conseils d'expert basés sur les produits réels
   - Comparaisons entre produits si pertinent
   - FAQ en fin d'article
6. SEO: Utilise naturellement les mots-clés "${keywords.join('", "')}"
7. Ton: Professionnel mais accessible, expert mais pas technique

**FORMAT DE SORTIE**: HTML pur sans markdown, prêt à insérer dans une page web.

**EXEMPLE DE CARTE PRODUIT**:
\`\`\`html
<div class="product-card">
  <div class="product-image">
    <img src="URL_IMAGE" alt="NOM_PRODUIT">
    <span class="promo-badge">-20%</span>
  </div>
  <div class="product-info">
    <h3 class="product-title">Nom exact du produit</h3>
    <div class="product-price">
      <span class="current-price">199€</span>
      <span class="original-price">249€</span>
    </div>
    <ul class="product-specs">
      <li>🎨 Couleur réelle</li>
      <li>📏 Dimensions réelles</li>
      <li>⚖️ Poids réel</li>
    </ul>
    <div class="stock-badge in-stock">✓ En stock (15 unités)</div>
    <a href="LIEN_PRODUIT" class="cta-button">Voir le produit</a>
  </div>
</div>
\`\`\`

Génère maintenant l'article HTML complet.`;

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
        preview: htmlContent.substring(0, 500),
      },
    };
  } catch (error) {
    console.error("❌ Error in generateArticle:", error);
    throw error;
  }
}
