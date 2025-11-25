import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const { elementType, pageContext } = body;
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    console.log(`[GENERATE-SEO-ELEMENT] Generating ${elementType} for user ${user.id}`);

    let prompt = '';
    
    if (elementType === 'title') {
      prompt = `Génère un titre SEO optimisé (max 60 caractères) pour une page d'accueil e-commerce. 
      Contexte: URL=${pageContext.url}, H2s existants=${pageContext.h2s.join(', ')}. 
      Le titre doit être accrocheur, contenir des mots-clés pertinents et inciter au clic. Réponds UNIQUEMENT avec le titre, sans guillemets ni explication.`;
    } else if (elementType === 'metaDescription') {
      prompt = `Génère une meta description SEO optimisée (max 160 caractères) pour une page d'accueil e-commerce. 
      Contexte: URL=${pageContext.url}, Titre=${pageContext.existingTitle}, H2s=${pageContext.h2s.join(', ')}. 
      La description doit être engageante, contenir des mots-clés et inciter à visiter le site. Réponds UNIQUEMENT avec la description, sans guillemets ni explication.`;
    } else if (elementType === 'h1') {
      prompt = `Génère un H1 (titre principal) optimisé SEO (max 70 caractères) pour une page d'accueil e-commerce. 
      Contexte: URL=${pageContext.url}, Titre=${pageContext.existingTitle}, H2s=${pageContext.h2s.join(', ')}. 
      Le H1 doit être clair, descriptif et contenir le mot-clé principal. Réponds UNIQUEMENT avec le H1, sans guillemets ni explication.`;
    } else {
      throw new Error('Invalid element type');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE-SEO-ELEMENT] AI Gateway error:`, errorText);
      throw new Error(`Failed to generate content: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    console.log(`[GENERATE-SEO-ELEMENT] Successfully generated ${elementType}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        generatedText
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GENERATE-SEO-ELEMENT] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to generate SEO element"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
