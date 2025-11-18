import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productIds, collectionName } = await req.json();
    
    if (!productIds || productIds.length === 0) {
      throw new Error('Product IDs are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les produits
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('title, tags, category, product_type, description, ai_material, ai_color, brand, vendor')
      .in('id', productIds);

    if (productsError) throw productsError;

    console.log(`Generating keywords for ${products.length} products`);

    // Construire le contexte produits pour l'IA
    const productsContext = products.map(p => `
- ${p.title}
  Catégorie: ${p.category || p.product_type || 'N/A'}
  Matériau: ${p.ai_material || 'N/A'}
  Couleur: ${p.ai_color || 'N/A'}
  Marque: ${p.brand || p.vendor || 'N/A'}
  Tags: ${p.tags || 'N/A'}
  Description: ${p.description?.substring(0, 200) || 'N/A'}
    `.trim()).join('\n\n');

    const prompt = `Tu es un expert SEO e-commerce. À partir de ces produits d'une collection "${collectionName || 'produits'}", génère:

1. **Short Keywords** (5-8 mots-clés courts de 1-2 mots) qui sont très recherchés en SEO e-commerce
2. **Long Phrase Keywords** (5-8 phrases longues de 3-5 mots) qui correspondent à des recherches d'intention d'achat
3. **Article Title** : un titre d'article SEO-optimisé, accrocheur et professionnel (max 60 caractères)

PRODUITS:
${productsContext}

RÈGLES:
- Les keywords doivent être pertinents pour un article de blog e-commerce
- Utilise des termes que les clients tapent réellement dans Google
- Privilégie les intentions d'achat (ex: "meilleur", "comment choisir", "guide d'achat")
- Le titre doit être engageant et inclure un keyword principal
- Évite les mots trop génériques
- Focus sur des termes SEO à fort potentiel de conversion

RÉPONDS UNIQUEMENT AVEC CE JSON (sans markdown):
{
  "shortKeywords": ["keyword1", "keyword2", ...],
  "longKeywords": ["phrase longue 1", "phrase longue 2", ...],
  "articleTitle": "Titre de l'article optimisé SEO"
}`;

    console.log('Calling Lovable AI for keyword generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API returned ${aiResponse.status}: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', aiContent);

    // Parser la réponse JSON
    let result;
    try {
      // Nettoyer la réponse si elle contient du markdown
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({
        success: true,
        shortKeywords: result.shortKeywords || [],
        longKeywords: result.longKeywords || [],
        articleTitle: result.articleTitle || ''
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-article-keywords:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
