import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      productTitle, 
      imageUrl, 
      description, 
      style, 
      mainColor, 
      layout, 
      length 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Tu es un designer et copywriter expert en e-commerce.

Ta mission est de générer une landing page complète pour un produit Shopify à partir des données suivantes :

- Titre du produit : ${productTitle}
- Image du produit : ${imageUrl || "aucune"}
- Description existante : ${description || "aucune"}
- Style souhaité : ${style}
- Couleur principale : ${mainColor}
- Layout souhaité : ${layout}
- Longueur de texte : ${length}

Ta sortie doit être un HTML clair, responsive et SEO-friendly :
- Inclure sections : titre accrocheur, sous-titre engageant, image principale, 3-5 avantages clés avec icônes, caractéristiques techniques, CTA clair et répété.
- Design neutre et élégant, compatible avec la couleur principale fournie.
- Utilisable sur fond blanc ou gris clair.
- Utilise Tailwind CSS pour le style (classes uniquement).
- Responsive mobile-first avec gap-4, padding-6, rounded-xl, shadow-lg pour un rendu moderne.
- Sections bien espacées avec titres en font-bold text-2xl ou text-3xl.
- Retourne UNIQUEMENT le HTML (sans balise <html>, <head> ni <body>), prêt à être injecté dans React.

Structure recommandée :
1. Hero section avec titre H1 + sous-titre + image
2. Section avantages avec 3-5 cartes (icônes + texte)
3. Section caractéristiques détaillées
4. Section CTA final avec bouton prominent
5. Section garanties/livraison

Utilise un ton ${style}, ${length === 'courte (400 mots)' ? 'concis' : length === 'moyenne (800 mots)' ? 'équilibré' : 'détaillé et approfondi'}.`;

    console.log('[generate-landing-ai] Calling Lovable AI Gateway...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Tu es un expert UX/UI designer et copywriter spécialisé en e-commerce. Tu génères des landing pages HTML modernes, responsive et optimisées pour la conversion." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error('[generate-landing-ai] AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const html = data.choices?.[0]?.message?.content || "";

    console.log('[generate-landing-ai] Generated HTML length:', html.length);

    return new Response(
      JSON.stringify({ html }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error('[generate-landing-ai] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
