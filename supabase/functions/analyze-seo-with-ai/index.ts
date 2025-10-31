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

    // Prepare detailed analysis prompt
    const analysisPrompt = `Tu es un expert SEO spécialisé dans l'analyse de boutiques e-commerce Shopify. Analyse en profondeur les données suivantes et génère un rapport SEO actionnable.

# DONNÉES DE LA BOUTIQUE

## Informations générales
- Nom: ${analysisData.storeName}
- URL: ${analysisData.storeUrl}
- Nombre de produits: ${analysisData.products.length}
- Nombre de collections: ${analysisData.collections.length}
- Nombre d'articles blog: ${analysisData.articles.length}
- Nombre de pages: ${analysisData.pages.length}

## Page d'accueil
${JSON.stringify(analysisData.homepageData, null, 2)}

## Problèmes Meta Titles
- Titres trop longs: ${analysisData.metaTitlesIssues.long?.length || 0}
- Titres trop courts: ${analysisData.metaTitlesIssues.short?.length || 0}
- Titres manquants: ${analysisData.metaTitlesIssues.missing?.length || 0}
- Titres dupliqués: ${analysisData.metaTitlesIssues.duplicates?.length || 0}

## Problèmes Meta Descriptions
- Descriptions trop longues: ${analysisData.metaDescriptionsIssues.long?.length || 0}
- Descriptions trop courtes: ${analysisData.metaDescriptionsIssues.short?.length || 0}
- Descriptions manquantes: ${analysisData.metaDescriptionsIssues.missing?.length || 0}
- Descriptions dupliquées: ${analysisData.metaDescriptionsIssues.duplicates?.length || 0}

## Images ALT
- Images sans ALT: ${analysisData.imageAltIssues.missing?.length || 0}
- Images optimisées: ${analysisData.imageAltIssues.optimized?.length || 0}

## Échantillon de produits (premiers 5)
${JSON.stringify(analysisData.products.slice(0, 5), null, 2)}

## Échantillon de collections (premiers 3)
${JSON.stringify(analysisData.collections.slice(0, 3), null, 2)}

## Échantillon d'articles blog (premiers 3)
${JSON.stringify(analysisData.articles.slice(0, 3), null, 2)}

# TA MISSION

Analyse ces données et génère un rapport SEO complet comprenant:

1. **DIAGNOSTIC GLOBAL** (2-3 paragraphes)
   - État actuel du SEO de la boutique
   - Points forts identifiés
   - Problèmes critiques détectés
   
2. **SCORES DÉTAILLÉS** (sur 100 pour chaque catégorie)
   - Homepage: score + justification
   - Produits: score + justification
   - Collections: score + justification
   - Blog: score + justification
   - Technique: score + justification
   
3. **PROBLÈMES CRITIQUES** (top 5-7)
   - Identifier les problèmes les plus graves
   - Expliquer leur impact sur le référencement
   - Chiffrer l'impact potentiel (trafic perdu estimé)
   
4. **OPPORTUNITÉS QUICK WINS** (top 3-5)
   - Actions à faible effort / fort impact
   - Temps estimé pour chaque action
   - Gain SEO attendu
   
5. **PLAN D'ACTION PRIORISÉ** (10-15 actions)
   - Actions classées par priorité (Haute/Moyenne/Basse)
   - Pour chaque action:
     * Titre court et clair
     * Description détaillée (comment faire)
     * Impact SEO estimé
     * Effort requis (heures)
     * Catégorie (Technique, Contenu, Liens, etc.)
     
6. **PRÉDICTIONS & OBJECTIFS**
   - Estimation du trafic organique dans 3 mois si les actions sont réalisées
   - Objectifs de ranking pour les mots-clés principaux
   - ROI estimé de l'optimisation SEO

Réponds UNIQUEMENT en JSON avec cette structure exacte:
{
  "diagnostic": "string (2-3 paragraphes détaillés)",
  "scores": {
    "homepage": {"score": number, "justification": "string"},
    "products": {"score": number, "justification": "string"},
    "collections": {"score": number, "justification": "string"},
    "blog": {"score": number, "justification": "string"},
    "technical": {"score": number, "justification": "string"}
  },
  "criticalIssues": [
    {
      "title": "string",
      "description": "string",
      "impact": "string",
      "estimatedTrafficLoss": "string"
    }
  ],
  "quickWins": [
    {
      "title": "string",
      "description": "string",
      "estimatedTime": "string",
      "expectedGain": "string"
    }
  ],
  "actionPlan": [
    {
      "title": "string",
      "description": "string",
      "priority": "Haute" | "Moyenne" | "Basse",
      "category": "string",
      "estimatedImpact": "string",
      "effortHours": number
    }
  ],
  "predictions": {
    "trafficIn3Months": "string",
    "keywordGoals": ["string"],
    "estimatedROI": "string"
  }
}`;

    console.log('🤖 Calling Lovable AI for deep SEO analysis...');

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
            content: 'Tu es un expert SEO spécialisé dans l\'optimisation de boutiques e-commerce Shopify. Tu fournis des analyses détaillées, actionnables et mesurables.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        response_format: { type: 'json_object' }
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
    const analysisText = aiResult.choices[0].message.content;
    
    console.log('✅ AI analysis completed');

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
