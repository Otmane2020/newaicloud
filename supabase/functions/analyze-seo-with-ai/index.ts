import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multilingual translations
const TRANSLATIONS = {
  fr: {
    apiKeyNotConfigured: 'LOVABLE_API_KEY non configuré',
    rateLimitExceeded: 'Limite de taux dépassée. Veuillez réessayer plus tard.',
    paymentRequired: 'Paiement requis. Veuillez ajouter des crédits à votre espace de travail Lovable.',
    aiGatewayError: 'Erreur de passerelle IA',
    aiReturnedInvalidJson: 'L\'IA a retourné un JSON invalide',
    unknownError: 'Erreur inconnue',
    errorInAnalyze: 'Erreur dans analyze-seo-with-ai',
    callingAI: '🤖 Appel de Lovable AI pour une analyse SEO concise...',
    analysisCompleted: '✅ Analyse IA terminée',
  },
  en: {
    apiKeyNotConfigured: 'LOVABLE_API_KEY not configured',
    rateLimitExceeded: 'Rate limit exceeded. Please try again later.',
    paymentRequired: 'Payment required. Please add credits to your Lovable workspace.',
    aiGatewayError: 'AI Gateway error',
    aiReturnedInvalidJson: 'AI returned invalid JSON',
    unknownError: 'Unknown error',
    errorInAnalyze: 'Error in analyze-seo-with-ai',
    callingAI: '🤖 Calling Lovable AI for concise SEO analysis...',
    analysisCompleted: '✅ AI analysis completed',
  },
};

function detectLanguage(req: Request): 'fr' | 'en' {
  const acceptLanguage = req.headers.get('Accept-Language') || '';
  return acceptLanguage.toLowerCase().includes('fr') ? 'fr' : 'en';
}

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

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const lang = detectLanguage(req);
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error(TRANSLATIONS[lang].apiKeyNotConfigured.replace('LOVABLE_API_KEY', 'GOOGLE_GEMINI_API_KEY'));
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

    console.log(TRANSLATIONS[lang].callingAI.replace('Lovable AI', 'Google Gemini'));

    // Call Google Gemini
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Expert SEO e-commerce. Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après. SOIS CONCIS.\n\n' + analysisPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: TRANSLATIONS[lang].rateLimitExceeded }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error(`${TRANSLATIONS[lang].aiGatewayError}:`, aiResponse.status, errorText);
      throw new Error(`${TRANSLATIONS[lang].aiGatewayError}: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let analysisText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log(TRANSLATIONS[lang].analysisCompleted);

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
      throw new Error(TRANSLATIONS[lang].aiReturnedInvalidJson);
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
    const lang = detectLanguage(req);
    console.error(`${TRANSLATIONS[lang].errorInAnalyze}:`, error);
    return new Response(
      JSON.stringify({ error: error.message || TRANSLATIONS[lang].unknownError }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
