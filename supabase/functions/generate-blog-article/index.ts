import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Non autorisé');
    }

    const requestData = await req.json();
    console.log('[GENERATE-BLOG-ARTICLE] Request data:', JSON.stringify(requestData, null, 2));

    const {
      opportunityData,
      formData,
      articleConfig,
      store_id,
      selectedProducts = []
    } = requestData;

    if (!store_id) {
      throw new Error('store_id is required');
    }

    // Fetch Shopify connection
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .eq('id', store_id)
      .single();

    if (connError || !connection) {
      throw new Error('Shopify connection not found');
    }

    // Fetch products if needed
    let products = selectedProducts;
    if (!products || products.length === 0) {
      const productIds = opportunityData?.product_ids || formData?.product_ids || [];
      if (productIds.length > 0) {
        const { data: fetchedProducts } = await supabaseClient
          .from('shopify_products')
          .select('*')
          .in('id', productIds);
        
        products = fetchedProducts || [];
      }
    }

    console.log('[GENERATE-BLOG-ARTICLE] Products count:', products.length);

    // Generate article title and meta
    const title = opportunityData?.article_title || formData?.title || 'Article sans titre';
    const metaDescription = opportunityData?.meta_description || formData?.meta_description || '';
    const keywords = opportunityData?.primary_keywords || formData?.keywords || [];

    // Prepare template config
    const templateConfig = {
      title,
      metaDescription,
      keywords,
      products: products.map((p: any) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image,
        price: p.price || 0,
        comparePrice: p.compare_at_price,
        url: `https://${connection.store_url}/products/${p.handle}`,
        description: p.body_html || p.seo_description || '',
        handle: p.handle
      })),
      storeName: connection.store_name || connection.store_url,
      storeUrl: connection.store_url,
      layout: articleConfig?.layout || 'magazine',
      colorScheme: articleConfig?.colorScheme || 'light',
      typography: articleConfig?.typography || 'sans-serif',
      imageIntensity: articleConfig?.imageIntensity || 'medium',
      productDisplay: articleConfig?.productDisplay || 'grid'
    };

    // Generate simple HTML template with placeholders
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${metaDescription}">
</head>
<body>
  <article>
    <h1>${title}</h1>
    <div class="introduction">[INTRODUCTION]</div>
    <section><h2>Critères de qualité</h2>[CRITERES_QUALITE]</section>
    <section><h2>Rapport qualité-prix</h2>[CRITERES_PRIX]</section>
    <section><h2>Design</h2>[CRITERES_DESIGN]</section>
    <section><h2>Comparatif</h2>[COMPARATIF]</section>
    <section><h2>Nos conseils</h2>[CONSEILS]</section>
    <section class="faq">
      <h2>Questions fréquentes</h2>
      <div>[FAQ_1]</div>
      <div>[FAQ_2]</div>
      <div>[FAQ_3]</div>
      <div>[FAQ_4]</div>
    </section>
    <div class="conclusion">[CONCLUSION]</div>
  </article>
</body>
</html>`;

    // Call Gemini to fill textual zones
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const geminiPrompt = `
Tu es un expert SEO e-commerce. Génère le contenu textuel pour un article de blog SEO optimisé.

CONTEXTE:
- Titre: ${title}
- Mots-clés: ${keywords.join(', ')}
- Nombre de produits: ${products.length}
- Type d'article: ${opportunityData?.type || 'guide'}
- Public cible: ${formData?.target_audience || 'tout public'}

INSTRUCTIONS CRITIQUES:
⚠️ NE MODIFIE PAS LE HTML, NE MODIFIE PAS LES STYLES, NE MODIFIE PAS LES CARTES PRODUITS
⚠️ Génère UNIQUEMENT les blocs de texte demandés
⚠️ Chaque bloc doit être en HTML valide (paragraphes, listes, etc.)
⚠️ Reste naturel, évite le sur-optimisation SEO
⚠️ Maximum 150 mots par bloc (sauf introduction: 200 mots)

GÉNÈRE STRICTEMENT CE FORMAT JSON:
{
  "INTRODUCTION": "Paragraphe d'introduction engageant avec le contexte...",
  "CRITERES_QUALITE": "Liste HTML des critères de qualité à considérer...",
  "CRITERES_PRIX": "Conseils sur l'analyse du rapport qualité-prix...",
  "CRITERES_DESIGN": "Importance du design et de l'esthétique...",
  "COMPARATIF": "Analyse comparative des différentes options...",
  "CONSEILS": "Conseils pratiques pour bien choisir...",
  "FAQ_1": "Réponse à: Quels sont les critères essentiels ?",
  "FAQ_2": "Réponse à: Quel budget prévoir ?",
  "FAQ_3": "Réponse à: Comment entretenir ?",
  "FAQ_4": "Réponse à: Où acheter ?",
  "CONCLUSION": "Conclusion synthétique avec appel à l'action..."
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.
`;

    console.log('[GENERATE-BLOG-ARTICLE] Calling Gemini...');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: geminiPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[GENERATE-BLOG-ARTICLE] Gemini error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('[GENERATE-BLOG-ARTICLE] Gemini response length:', generatedText.length);

    // Parse JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini');
    }

    const textBlocks = JSON.parse(jsonMatch[0]);

    // Replace placeholders in template
    let finalHtml = htmlTemplate
      .replace('[INTRODUCTION]', textBlocks.INTRODUCTION || '')
      .replace('[CRITERES_QUALITE]', textBlocks.CRITERES_QUALITE || '')
      .replace('[CRITERES_PRIX]', textBlocks.CRITERES_PRIX || '')
      .replace('[CRITERES_DESIGN]', textBlocks.CRITERES_DESIGN || '')
      .replace('[COMPARATIF]', textBlocks.COMPARATIF || '')
      .replace('[CONSEILS]', textBlocks.CONSEILS || '')
      .replace('[FAQ_1]', textBlocks.FAQ_1 || '')
      .replace('[FAQ_2]', textBlocks.FAQ_2 || '')
      .replace('[FAQ_3]', textBlocks.FAQ_3 || '')
      .replace('[FAQ_4]', textBlocks.FAQ_4 || '')
      .replace('[CONCLUSION]', textBlocks.CONCLUSION || '');

    // Generate featured image URL (first product image)
    const featuredImage = products[0]?.featured_image || null;

    // Save article to database
    const { data: article, error: insertError } = await supabaseClient
      .from('blog_articles')
      .insert({
        user_id: user.id,
        store_id: store_id,
        title,
        content: finalHtml,
        meta_description: metaDescription,
        keywords,
        featured_image: featuredImage,
        source: 'ai_generated',
        status: 'draft'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GENERATE-BLOG-ARTICLE] Insert error:', insertError);
      throw insertError;
    }

    console.log('[GENERATE-BLOG-ARTICLE] Article created:', article.id);

    // Increment usage counter
    await supabaseClient.rpc('increment_usage', {
      p_seller_id: user.id,
      p_field: 'articles_count',
      p_increment: 1
    });

    return new Response(
      JSON.stringify({
        success: true,
        article,
        message: 'Article généré avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[GENERATE-BLOG-ARTICLE] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur lors de la génération',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

