import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
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
      console.log("🧠 MODE AUTO : génération d'articles...");
      
      const { data: campaigns, error: campaignError } = await supabase
        .from("blog_campaigns")
        .select("*")
        .eq("is_active", true)
        .limit(requestData.limit || 5);

      if (campaignError) throw campaignError;
      if (!campaigns?.length) {
        return new Response(JSON.stringify({
          success: false,
          message: "Aucune campagne active."
        }), { status: 200, headers: corsHeaders });
      }

      const results = [];
      for (const campaign of campaigns) {
        const res = await generateSingleArticle({ campaign_id: campaign.id }, supabase, lovableApiKey);
        results.push(res);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${results.length} articles générés.`,
        results
      }), { status: 200, headers: corsHeaders });
    }

    const result = await generateSingleArticle(requestData, supabase, lovableApiKey);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: corsHeaders });
  }
});

async function generateSingleArticle(requestData: any, supabaseClient: any, apiKey: string) {
  try {
    const { user_id, category = "Guide", keywords = [], title } = requestData;
    
    if (!user_id) {
      throw new Error("user_id is required");
    }
    
    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`🎯 Génération article : ${articleTitle} pour user ${user_id}`);

    // Filtrer produits par catégorie si spécifiée
    let productsQuery = supabaseClient
      .from("shopify_products")
      .select("id, title, handle, price, category, description, product_type, vendor")
      .eq("seller_id", user_id);
    
    if (category && category !== "Guide" && category !== "Tous produits") {
      productsQuery = productsQuery.or(`category.ilike.%${category}%,product_type.ilike.%${category}%,vendor.ilike.%${category}%`);
    }
    
    const { data: products } = await productsQuery.limit(8);

    if (!products || products.length === 0) {
      throw new Error("Aucun produit trouvé pour cette catégorie");
    }

    const productDetails = products.map((p: any) => 
      `- ${p.title} (${p.price}€) : ${p.description?.substring(0, 100) || 'Pas de description'}`
    ).join("\n");
    
    console.log(`📦 ${products.length} produits sélectionnés`);

    // Générer l'image de couverture avec OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let imageUrl = "";
    
    if (openaiKey) {
      try {
        console.log("🎨 Génération image avec OpenAI...");
        const imagePrompt = `A professional e-commerce hero image for an article about ${category}, modern and clean design, high quality product photography style`;
        
        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024",
            quality: "high"
          })
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.data[0].url;
          console.log("✅ Image générée");
        }
      } catch (imgErr) {
        console.error("⚠️ Erreur génération image:", imgErr);
      }
    }
    
    const prompt = `Tu es un rédacteur expert en e-commerce. Rédige un article professionnel en français intitulé "${articleTitle}".

📦 PRODUITS À INTÉGRER :
${productDetails}

📝 STRUCTURE REQUISE (HTML strict) :

<article class="blog-article">
  <div class="article-hero">
    ${imageUrl ? `<img src="${imageUrl}" alt="${articleTitle}" class="hero-image" />` : ''}
    <h1 class="article-title">${articleTitle}</h1>
  </div>

  <nav class="article-toc">
    <h2>Table des matières</h2>
    <ol>
      <li><a href="#section-1">Introduction</a></li>
      <li><a href="#section-2">Les critères essentiels</a></li>
      <li><a href="#section-3">Notre sélection</a></li>
      <li><a href="#section-4">Comparatif détaillé</a></li>
      <li><a href="#section-5">Comment choisir ?</a></li>
      <li><a href="#section-6">Conclusion</a></li>
    </ol>
  </nav>

  <section id="section-1" class="article-section">
    <h2>1. Introduction</h2>
    <p>[Paragraphe d'introduction accrocheur avec mots-clés : ${targetKeywords.join(", ")}]</p>
  </section>

  <section id="section-2" class="article-section">
    <h2>2. Les critères essentiels</h2>
    <h3>2.1. Qualité et matériaux</h3>
    <p>[Contenu détaillé]</p>
    <h3>2.2. Budget et rapport qualité-prix</h3>
    <p>[Contenu détaillé]</p>
    <h3>2.3. Design et style</h3>
    <p>[Contenu détaillé]</p>
  </section>

  <section id="section-3" class="article-section">
    <h2>3. Notre sélection de produits</h2>
    [Présente CHAQUE produit avec un <h3> et paragraphe dédié]
  </section>

  <section id="section-4" class="article-section">
    <h2>4. Comparatif détaillé</h2>
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th>Prix</th>
          <th>Points forts</th>
          <th>Pour qui ?</th>
        </tr>
      </thead>
      <tbody>
        [Une ligne par produit]
      </tbody>
    </table>
  </section>

  <section id="section-5" class="article-section">
    <h2>5. Comment faire votre choix ?</h2>
    <h3>5.1. Selon votre budget</h3>
    <p>[Conseils]</p>
    <h3>5.2. Selon vos besoins</h3>
    <p>[Conseils]</p>
  </section>

  <section id="section-6" class="article-section">
    <h2>6. Conclusion</h2>
    <p>[Résumé + CTA : "Découvrez notre collection complète"]</p>
  </section>
</article>

⚠️ IMPORTANT :
- Utilise UNIQUEMENT les ${products.length} produits fournis
- Structure HTML STRICTE avec IDs pour ancres
- Table des matières cliquable
- Mots-clés : ${targetKeywords.join(", ")}
- Longueur : 1800-2500 mots
- Ton professionnel mais accessible`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Tu es un rédacteur expert en e-commerce qui génère du contenu HTML structuré et professionnel." 
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI Error: ${err}`);
    }

    const result = await aiResponse.json();
    let content = result.choices[0].message.content.trim();
    
    // Nettoyer les balises markdown si présentes
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();

    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([{
        user_id,
        title: articleTitle,
        content,
        meta_description: `Découvrez notre guide complet : ${articleTitle}. Comparatif, conseils d'experts et sélection des meilleurs produits.`,
        keywords: targetKeywords,
        status: "draft"
      }])
      .select()
      .single();

    if (saveError) {
      console.error("❌ Erreur sauvegarde:", saveError);
      throw saveError;
    }

    console.log(`✅ Article sauvegardé : ${savedArticle.id}`);
    
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: user_id,
      p_field: 'articles_count',
      p_increment: 1
    });
    
    return { success: true, article_id: savedArticle.id, article: savedArticle };

  } catch (err) {
    console.error("❌ Erreur génération:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}