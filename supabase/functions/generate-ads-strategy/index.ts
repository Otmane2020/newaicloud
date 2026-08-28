import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    if (parsedBody.healthCheck === true) {
      return new Response(JSON.stringify({ status: "healthy", policy: "free-only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: searchTerms } = await supabase.from("google_ads_search_terms").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(200);
    const { data: roasData } = await supabase.from("google_ads_roas").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30);
    const { data: campaigns } = await supabase.from("google_ads_campaigns").select("*").eq("user_id", user.id);

    const totalSpend = searchTerms?.reduce((sum, t) => sum + (t.cost_micros || 0) / 1_000_000, 0) || 0;
    const totalClicks = searchTerms?.reduce((sum, t) => sum + (t.clicks || 0), 0) || 0;
    const totalConversions = searchTerms?.reduce((sum, t) => sum + (t.conversions || 0), 0) || 0;
    const avgCTR = searchTerms?.length ? searchTerms.reduce((sum, t) => sum + (t.ctr || 0), 0) / searchTerms.length : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
    const totalRevenue = roasData?.reduce((sum, r) => sum + (r.revenue || 0), 0) || 0;
    const globalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const topPerformers = searchTerms?.filter(t => t.conversions > 0).sort((a, b) => (b.conversions || 0) - (a.conversions || 0)).slice(0, 10).map(t => t.search_term) || [];
    const worstPerformers = searchTerms?.filter(t => t.conversions === 0 && t.cost_micros > 200000).sort((a, b) => (b.cost_micros || 0) - (a.cost_micros || 0)).slice(0, 10).map(t => ({ term: t.search_term, cost: (t.cost_micros || 0) / 1_000_000 })) || [];

    const context = {
      metrics: {
        totalSpend: `${totalSpend.toFixed(2)}€`, totalClicks, totalConversions,
        avgCTR: `${(avgCTR * 100).toFixed(2)}%`, avgCPC: `${avgCPC.toFixed(2)}€`,
        conversionRate: `${(conversionRate * 100).toFixed(2)}%`, globalROAS: `${globalROAS.toFixed(2)}x`, totalRevenue: `${totalRevenue.toFixed(2)}€`,
      },
      campaigns: campaigns?.length || 0,
      topPerformingKeywords: topPerformers,
      worstPerformingTerms: worstPerformers,
      uniqueSearchTerms: searchTerms?.length || 0,
    };

    let strategies: any[] = [];
    let provider = "deterministic-fallback";
    let model = "none";
    try {
      const routed = await routeAI({
        messages: [
          { role: "system", content: "You are a Google Ads optimization expert. Return valid JSON only with a strategies array. Base recommendations strictly on supplied performance data." },
          { role: "user", content: `Analyze these Google Ads metrics and return 5-8 actionable strategies. Each strategy: strategy_type, recommendation, impact_score 1-10, difficulty easy|medium|hard, current_value, suggested_value.\n${JSON.stringify(context, null, 2)}` },
        ],
        maxTokens: 2200,
        temperature: 0.35,
      });
      provider = routed.provider;
      model = routed.model;
      const match = routed.content.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
      strategies = match ? (JSON.parse(match[0]).strategies || []) : [];
    } catch (error) {
      console.warn("[generate-ads-strategy] free AI unavailable; using deterministic fallback", error);
    }

    if (!strategies.length) strategies = generateFallbackStrategies(context);

    await supabase.from("google_ads_strategies").delete().eq("user_id", user.id);
    if (strategies.length) {
      await supabase.from("google_ads_strategies").insert(strategies.map(s => ({
        user_id: user.id,
        strategy_type: s.strategy_type || "general",
        recommendation: s.recommendation || "",
        impact_score: s.impact_score || 5,
        difficulty: s.difficulty || "medium",
        current_value: s.current_value || {},
        suggested_value: s.suggested_value || {},
        is_applied: false,
      })));
    }

    return new Response(JSON.stringify({ success: true, strategies, count: strategies.length, provider, model, policy: "free-only" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function generateFallbackStrategies(context: any): any[] {
  const strategies: any[] = [];
  const roas = parseFloat(context.metrics.globalROAS) || 0;
  if (roas < 2) strategies.push({ strategy_type: "bidding", recommendation: `ROAS actuel ${context.metrics.globalROAS}: tester une cible ROAS progressive et réduire les dépenses non rentables.`, impact_score: 9, difficulty: "medium", current_value: { roas: context.metrics.globalROAS }, suggested_value: { action: "Target ROAS test" } });
  if ((parseFloat(context.metrics.avgCPC) || 0) > 1.5) strategies.push({ strategy_type: "bidding", recommendation: `CPC moyen ${context.metrics.avgCPC}: réduire les enchères sur les requêtes sans conversion.`, impact_score: 7, difficulty: "easy", current_value: { avg_cpc: context.metrics.avgCPC }, suggested_value: { action: "cap low-converting bids" } });
  if (context.worstPerformingTerms.length) strategies.push({ strategy_type: "keywords", recommendation: `${context.worstPerformingTerms.length} termes dépensent sans conversion: les analyser puis ajouter les non pertinents en négatifs.`, impact_score: 8, difficulty: "easy", current_value: { wasted_terms: context.worstPerformingTerms.length }, suggested_value: { action: "negative keywords" } });
  strategies.push({ strategy_type: "structure", recommendation: "Regrouper les mots-clés performants par intention pour améliorer pertinence annonce/landing page.", impact_score: 7, difficulty: "medium", current_value: { campaigns: context.campaigns }, suggested_value: { action: "intent-based ad groups" } });
  strategies.push({ strategy_type: "budget", recommendation: "Réallouer progressivement le budget vers les groupes avec conversions mesurées, en conservant une part de test.", impact_score: 6, difficulty: "easy", current_value: { total_spend: context.metrics.totalSpend }, suggested_value: { allocation: "performance-first" } });
  return strategies;
}
