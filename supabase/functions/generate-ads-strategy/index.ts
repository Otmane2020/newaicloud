import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check
    const body = await req.text();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (parsed.healthCheck === true) {
          return new Response(JSON.stringify({ status: 'healthy' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch { /* Not JSON or not health check */ }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get search terms data for analysis
    const { data: searchTerms } = await supabase
      .from('google_ads_search_terms')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200);

    // Get ROAS data
    const { data: roasData } = await supabase
      .from('google_ads_roas')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);

    // Get campaigns data
    const { data: campaigns } = await supabase
      .from('google_ads_campaigns')
      .select('*')
      .eq('user_id', user.id);

    // Calculate metrics for AI analysis
    const totalSpend = searchTerms?.reduce((sum, t) => sum + (t.cost_micros || 0) / 1000000, 0) || 0;
    const totalClicks = searchTerms?.reduce((sum, t) => sum + (t.clicks || 0), 0) || 0;
    const totalConversions = searchTerms?.reduce((sum, t) => sum + (t.conversions || 0), 0) || 0;
    const avgCTR = searchTerms?.length ? searchTerms.reduce((sum, t) => sum + (t.ctr || 0), 0) / searchTerms.length : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
    
    const totalRevenue = roasData?.reduce((sum, r) => sum + (r.revenue || 0), 0) || 0;
    const globalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Top performing keywords
    const topPerformers = searchTerms
      ?.filter(t => t.conversions > 0)
      .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 10)
      .map(t => t.search_term) || [];

    // Worst performing (high cost, no conversions)
    const worstPerformers = searchTerms
      ?.filter(t => t.conversions === 0 && t.cost_micros > 200000)
      .sort((a, b) => (b.cost_micros || 0) - (a.cost_micros || 0))
      .slice(0, 10)
      .map(t => ({ term: t.search_term, cost: (t.cost_micros || 0) / 1000000 })) || [];

    // Prepare context for AI
    const analysisContext = {
      period: '30 derniers jours',
      metrics: {
        totalSpend: `${totalSpend.toFixed(2)}€`,
        totalClicks,
        totalConversions,
        avgCTR: `${(avgCTR * 100).toFixed(2)}%`,
        avgCPC: `${avgCPC.toFixed(2)}€`,
        conversionRate: `${(conversionRate * 100).toFixed(2)}%`,
        globalROAS: `${globalROAS.toFixed(2)}x`,
        totalRevenue: `${totalRevenue.toFixed(2)}€`,
      },
      campaigns: campaigns?.length || 0,
      topPerformingKeywords: topPerformers,
      worstPerformingTerms: worstPerformers,
      uniqueSearchTerms: searchTerms?.length || 0,
    };

    // Call AI for strategy generation
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
            content: `Tu es un expert Google Ads spécialisé dans l'optimisation des campagnes pour les applications SaaS Shopify.
Ton objectif est d'analyser les données de performance et de générer des recommandations stratégiques concrètes et actionnables.

Tu dois retourner EXACTEMENT un JSON valide avec le format suivant:
{
  "strategies": [
    {
      "strategy_type": "budget" | "bidding" | "keywords" | "targeting" | "structure" | "creatives",
      "recommendation": "Description détaillée de la recommandation",
      "impact_score": 1-10,
      "difficulty": "easy" | "medium" | "hard",
      "current_value": { ... données actuelles ... },
      "suggested_value": { ... valeurs recommandées ... }
    }
  ]
}

Génère 5-8 recommandations stratégiques basées sur les données fournies.`
          },
          {
            role: 'user',
            content: `Analyse ces données de performance Google Ads pour NewAI (app d'optimisation SEO Shopify) et génère des recommandations stratégiques:

${JSON.stringify(analysisContext, null, 2)}

Contexte produit: NewAI est une application Shopify qui aide les e-commerçants à optimiser leur SEO automatiquement avec l'IA. Les cibles sont les propriétaires de boutiques Shopify cherchant à améliorer leur visibilité Google.

Génère des recommandations concrètes en JSON.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate AI strategy');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let strategies: any[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        strategies = parsed.strategies || [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Generate fallback strategies based on metrics
      strategies = generateFallbackStrategies(analysisContext);
    }

    // Save strategies to database
    if (strategies.length > 0) {
      const toInsert = strategies.map(s => ({
        user_id: user.id,
        strategy_type: s.strategy_type || 'general',
        recommendation: s.recommendation || '',
        impact_score: s.impact_score || 5,
        difficulty: s.difficulty || 'medium',
        current_value: s.current_value || {},
        suggested_value: s.suggested_value || {},
        is_applied: false,
      }));

      // Delete old strategies first
      await supabase
        .from('google_ads_strategies')
        .delete()
        .eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('google_ads_strategies')
        .insert(toInsert);

      if (insertError) {
        console.error('Error inserting strategies:', insertError);
      }
    }

    console.log(`Generated ${strategies.length} strategies for user ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      strategies,
      count: strategies.length,
      message: `Generated ${strategies.length} strategic recommendations`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ads-strategy:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackStrategies(context: any): any[] {
  const strategies = [];
  const metrics = context.metrics;

  // ROAS strategy
  const roas = parseFloat(metrics.globalROAS) || 0;
  if (roas < 2) {
    strategies.push({
      strategy_type: 'bidding',
      recommendation: `ROAS actuel de ${metrics.globalROAS} est sous-optimal. Passez à une stratégie d'enchères Target ROAS avec un objectif de 3x pour améliorer la rentabilité.`,
      impact_score: 9,
      difficulty: 'medium',
      current_value: { roas: metrics.globalROAS },
      suggested_value: { target_roas: '3.0x' },
    });
  }

  // CPC strategy
  const cpc = parseFloat(metrics.avgCPC) || 0;
  if (cpc > 1.5) {
    strategies.push({
      strategy_type: 'bidding',
      recommendation: `CPC moyen de ${metrics.avgCPC} élevé. Optimisez les enchères en ciblant un CPC maximum de 1€ pour les mots-clés à faible conversion.`,
      impact_score: 7,
      difficulty: 'easy',
      current_value: { avg_cpc: metrics.avgCPC },
      suggested_value: { max_cpc: '1.00€' },
    });
  }

  // Conversion rate strategy
  const cvr = parseFloat(metrics.conversionRate) * 100 || 0;
  if (cvr < 2) {
    strategies.push({
      strategy_type: 'keywords',
      recommendation: `Taux de conversion de ${metrics.conversionRate} faible. Ajoutez des mots-clés exacts basés sur vos top performers et excluez les termes génériques.`,
      impact_score: 8,
      difficulty: 'medium',
      current_value: { conversion_rate: metrics.conversionRate },
      suggested_value: { target_conversion_rate: '3-5%' },
    });
  }

  // Negative keywords strategy
  if (context.worstPerformingTerms.length > 0) {
    strategies.push({
      strategy_type: 'keywords',
      recommendation: `${context.worstPerformingTerms.length} termes de recherche avec dépenses sans conversion détectés. Ajoutez-les en mots-clés négatifs pour économiser du budget.`,
      impact_score: 8,
      difficulty: 'easy',
      current_value: { wasted_terms: context.worstPerformingTerms.length },
      suggested_value: { action: 'Exclure les termes non performants' },
    });
  }

  // Structure strategy
  strategies.push({
    strategy_type: 'structure',
    recommendation: `Créez des groupes d'annonces thématiques basés sur vos ${context.topPerformingKeywords.length} mots-clés performants pour améliorer la pertinence et le Quality Score.`,
    impact_score: 7,
    difficulty: 'hard',
    current_value: { campaigns: context.campaigns },
    suggested_value: { structure: 'SKAG ou groupes thématiques' },
  });

  // Budget strategy
  strategies.push({
    strategy_type: 'budget',
    recommendation: `Réallouez le budget des campagnes sous-performantes vers les mots-clés avec conversions. Concentrez 70% du budget sur vos top performers.`,
    impact_score: 6,
    difficulty: 'easy',
    current_value: { total_spend: metrics.totalSpend },
    suggested_value: { allocation: '70% top performers, 30% exploration' },
  });

  return strategies;
}
