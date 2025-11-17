import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      store_id,
      collection_ids = [],
      collectionTitles = [],
      keywords = [],
      productIds = [],
      articleLength = "2000",
      articleConfig = {},
      articleAngle = "guide",
      targetAudience = "general"
    } = await req.json();

    console.log("📝 [ARTICLE] Nouvelle génération:", {
      user_id,
      store_id,
      products: productIds.length,
      collections: collection_ids.length,
      keywords: keywords.length
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. GET PRODUCTS avec toutes les infos nécessaires
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select(`
        id,
        title,
        handle,
        body_html,
        product_type,
        vendor,
        tags,
        seo_title,
        seo_description,
        smart_weight,
        smart_dimensions,
        smart_material,
        smart_color,
        smart_style,
        price,
        compare_at_price,
        currency_code,
        inventory_quantity,
        images:product_images(src, alt_text, position)
      `)
      .in("id", productIds)
      .order("title");

    if (productsError) {
      console.error("❌ Erreur produits:", productsError);
      return new Response(
        JSON.stringify({ error: "Impossible de récupérer les produits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun produit trouvé pour générer l'article" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Produits récupérés:", products.length);

    // 2. GET STORE INFO
    const { data: storeData } = await supabase
      .from("shopify_connections")
      .select("shop_name")
      .eq("id", store_id)
      .single();

    const storeName = storeData?.shop_name || "notre boutique";
    const storeUrl = `https://${storeName}`;

    // 3. PREPARE CONTEXT for Gemini
    const productsContext = products.map((p, i) => {
      const mainImage = p.images?.[0]?.src || "";
      const promo = p.compare_at_price && p.compare_at_price > p.price
        ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
        : 0;

      return `
PRODUIT ${i + 1}: "${p.title}"
- URL: ${storeUrl}/products/${p.handle}
- Prix: ${p.price}${p.currency_code || "€"}${promo > 0 ? ` (PROMO -${promo}% au lieu de ${p.compare_at_price}${p.currency_code || "€"})` : ""}
- Catégorie: ${p.product_type || "Non spécifiée"}
- Marque: ${p.vendor || "Non spécifiée"}
- Matériau: ${p.smart_material || "Non spécifié"}
- Couleur: ${p.smart_color || "Non spécifiée"}
- Style: ${p.smart_style || "Non spécifié"}
- Dimensions: ${p.smart_dimensions || "Non spécifiées"}
- Poids: ${p.smart_weight || "Non spécifié"}
- Stock: ${p.inventory_quantity || 0} unités disponibles
- Image principale: ${mainImage}
- Description courte: ${p.body_html?.replace(/<[^>]*>/g, "").substring(0, 200) || "Aucune description"}
`;
    }).join("\n");

    // 4. GENERATE with Gemini via Lovable AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const articleTitle = keywords.length > 0
      ? `${keywords[0]} : le guide complet ${new Date().getFullYear()}`
      : `Guide d'achat ${products[0].product_type || "produits"} ${new Date().getFullYear()}`;

    const prompt = `Tu es un expert en rédaction d'articles SEO pour e-commerce.

MISSION: Génère un article HTML de ${articleLength} mots sur le thème: "${articleTitle}"

CONTEXT BOUTIQUE:
- Nom: ${storeName}
- URL: ${storeUrl}
- Collections: ${collectionTitles.join(", ")}
- Mots-clés principaux: ${keywords.join(", ")}
- Angle: ${articleAngle}
- Audience: ${targetAudience}

${productsContext}

INSTRUCTIONS CRITIQUES:

1. STRUCTURE HTML COMPLÈTE:
   - Commence par <article class="blog-post">
   - Utilise des balises sémantiques: <header>, <section>, <aside>
   - Inclus une table des matières cliquable
   - Termine par </article>

2. INTÉGRATION DES PRODUITS:
   - Crée UNE CARTE VISUELLE pour CHAQUE produit
   - Utilise les VRAIS PRIX indiqués
   - Affiche les VRAIES IMAGES (URLs fournies)
   - Mentionne les PROMOTIONS si présentes
   - Inclus des liens cliquables vers ${storeUrl}/products/[handle]
   - Affiche la disponibilité en stock

3. QUALITÉ DU CONTENU:
   - Écris ${articleLength} mots minimum
   - Utilise les informations RÉELLES des produits (matériaux, dimensions, poids)
   - Crée des comparaisons basées sur les VRAIES données
   - Ajoute des conseils pratiques basés sur les caractéristiques réelles
   - Intègre naturellement les mots-clés: ${keywords.join(", ")}

4. STYLE CSS INCLUS:
   Ajoute une balise <style> avec:
   - Design moderne et responsive
   - Cartes produits attractives avec hover effects
   - Grid layout pour les produits
   - Typographie professionnelle
   - Badges pour les promotions et le stock

5. FORMAT DES CARTES PRODUITS:
   Chaque carte doit contenir:
   - Image du produit (300x300px minimum)
   - Titre du produit
   - Prix actuel + prix barré si promo
   - Badge promo si applicable
   - Caractéristiques clés (matériau, dimensions, poids)
   - Badge stock (En stock / Stock limité)
   - Bouton "Voir le produit" avec lien

IMPORTANT:
- NE GÉNÈRE PAS de contenu générique
- UTILISE les VRAIES informations des produits
- MENTIONNE les produits par leur NOM EXACT
- AFFICHE les VRAIS PRIX
- CRÉE des comparaisons PERTINENTES basées sur les vraies caractéristiques

Génère maintenant l'article HTML complet:`;

    console.log("🤖 Appel Gemini...");

    const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("❌ Gemini error:", errorText);
      throw new Error("Erreur lors de la génération avec Gemini");
    }

    const geminiData = await geminiResponse.json();
    const generatedHtml = geminiData.choices?.[0]?.message?.content || "";

    if (!generatedHtml || generatedHtml.length < 1000) {
      throw new Error("Contenu généré trop court ou vide");
    }

    console.log("✅ HTML généré:", generatedHtml.length, "caractères");

    // 5. EXTRACT meta description from generated content
    const metaDescription = generatedHtml
      .replace(/<[^>]*>/g, "")
      .substring(0, 155)
      .trim() + "...";

    // 6. SAVE to database
    const { data: article, error: insertError } = await supabase
      .from("blog_articles")
      .insert({
        user_id,
        store_id,
        collection_id: collection_ids[0] || null,
        title: articleTitle,
        content: generatedHtml,
        meta_description: metaDescription,
        keywords: keywords,
        status: "draft",
        source: "ai_generated",
        featured_image: products[0]?.images?.[0]?.src || null
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erreur insertion:", insertError);
      throw new Error("Impossible de sauvegarder l'article");
    }

    console.log("✅ Article créé:", article.id);

    return new Response(
      JSON.stringify({
        success: true,
        article_id: article.id,
        article,
        products_used: products.length,
        content_length: generatedHtml.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ ERREUR FATALE:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de la génération de l'article",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
