import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { elementType, pageContext } = body;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    let prompt = '';
    if (elementType === 'title') {
      prompt = `Génère un titre SEO optimisé (max 60 caractères) pour une page d'accueil e-commerce. Contexte: URL=${pageContext.url}, H2s existants=${pageContext.h2s.join(', ')}. Le titre doit être accrocheur, contenir des mots-clés pertinents et inciter au clic. Réponds UNIQUEMENT avec le titre.`;
    } else if (elementType === 'metaDescription') {
      prompt = `Génère une meta description SEO optimisée (max 160 caractères) pour une page d'accueil e-commerce. Contexte: URL=${pageContext.url}, Titre=${pageContext.existingTitle}, H2s=${pageContext.h2s.join(', ')}. La description doit être engageante et inciter à visiter le site. Réponds UNIQUEMENT avec la description.`;
    } else if (elementType === 'h1') {
      prompt = `Génère un H1 optimisé SEO (max 70 caractères) pour une page d'accueil e-commerce. Contexte: URL=${pageContext.url}, Titre=${pageContext.existingTitle}, H2s=${pageContext.h2s.join(', ')}. Réponds UNIQUEMENT avec le H1.`;
    } else {
      throw new Error('Invalid element type');
    }

    const aiResult = await routeAI({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 300,
    });
    const generatedText = aiResult.content.trim().replace(/^["']|["']$/g, '');

    return new Response(JSON.stringify({
      success: true,
      generatedText,
      ai_provider: aiResult.provider,
      ai_model: aiResult.model,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[GENERATE-SEO-ELEMENT] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Failed to generate SEO element"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
