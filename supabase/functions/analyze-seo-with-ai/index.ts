import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeoAnalysisInput {
  storeName: string;
  storeUrl: string;
  products: any[];
  collections: any[];
  articles: any[];
  pages: any[];
  homepageData: any;
  metaTitlesIssues: any;
  metaDescriptionsIssues: any;
  imageAltIssues: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisData: SeoAnalysisInput = await req.json();

    // Prepare concise analysis prompt for automated actions
    const input = {
      storeName: analysisData.storeName,
      storeUrl: analysisData.storeUrl,
      productsCount: analysisData.products.length,
      collectionsCount: analysisData.collections.length,
      articlesCount: analysisData.articles.length,
      pagesCount: analysisData.pages.length,
      metaTitles: {
        long: analysisData.metaTitlesIssues.long?.length || 0,
        short: analysisData.metaTitlesIssues.short?.length || 0,
        missing: analysisData.metaTitlesIssues.missing?.length || 0,
        duplicates: analysisData.metaTitlesIssues.duplicates?.length || 0
      },
      metaDescriptions: {
        long: analysisData.metaDescriptionsIssues.long?.length || 0,
        short: analysisData.metaDescriptionsIssues.short?.length || 0,
        missing: analysisData.metaDescriptionsIssues.missing?.length || 0,
        duplicates: analysisData.metaDescriptionsIssues.duplicates?.length || 0
      },
      imageAlt: {
        missing: analysisData.imageAltIssues.missing?.length || 0,
        optimized: analysisData.imageAltIssues.optimized?.length || 0
      },
      sampleProducts: analysisData.products.slice(0, 3),
      sampleCollections: analysisData.collections.slice(0, 3),
      sampleArticles: analysisData.articles.slice(0, 3)
    };

    const analysisPrompt = `Tu es un expert SEO pour boutiques Shopify. Analyse ces données et fournis un rapport CONCIS en français.

**Boutique:** ${input.storeName}
**Données:** ${input.productsCount} produits, ${input.collectionsCount} collections, ${input.articlesCount} articles

**Problèmes:**
- Titres: ${input.metaTitles.long} longs, ${input.metaTitles.short} courts, ${input.metaTitles.missing} manquants
- Descriptions: ${input.metaDescriptions.long} longues, ${input.metaDescriptions.short} courtes, ${input.metaDescriptions.missing} manquantes
- Images: ${input.imageAlt.missing} sans alt

**JSON à retourner (CONCIS, PROFESSIONNEL):**
{
  "diagnostic": "Diagnostic en 4-5 lignes maximum. Clair, précis, professionnel.",
  "scores": {
    "blog": { "score": 0-100, "justification": "1-2 lignes max" },
    "homepage": { "score": 0-100, "justification": "1-2 lignes max" },
    "products": { "score": 0-100, "justification": "1-2 lignes max" },
    "technical": { "score": 0-100, "justification": "1-2 lignes max" },
    "collections": { "score": 0-100, "justification": "1-2 lignes max" }
  },
  "actionsByCategory": {
    "products": [
      {
        "title": "Titre action (ex: Optimiser les titres SEO)",
        "count": "Nombre d'éléments à traiter",
        "impact": "Élevé/Modéré",
        "automated": true
      }
    ],
    "collections": [...],
    "blog": [...],
    "images": [...],
    "homepage": [...]
  }
}

RÈGLES STRICTES:
- Diagnostic: 4-5 lignes MAX
- Justifications: 1-2 lignes MAX
- Actions automatisées par NewAI (automated: true)
- Concis, professionnel, actionnable`;

    console.log('🤖 Calling Lovable AI for concise SEO analysis...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Expert SEO e-commerce. Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après. SOIS CONCIS.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let analysisText = aiResult.choices[0].message.content;
    
    console.log('✅ AI analysis completed');

    // Strip markdown code fences if present
    analysisText = analysisText.trim();
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.slice(7); // Remove ```json
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.slice(3); // Remove ```
    }
    if (analysisText.endsWith('```')) {
      analysisText = analysisText.slice(0, -3); // Remove trailing ```
    }
    analysisText = analysisText.trim();

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', analysisText);
      throw new Error('AI returned invalid JSON');
    }

    // Calculate global score
    const scores = parsedAnalysis.scores;
    const globalScore = Math.round(
      (scores.homepage.score + scores.products.score + scores.collections.score + 
       scores.blog.score + scores.technical.score) / 5
    );

    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsedAnalysis,
        globalScore
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-seo-with-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
