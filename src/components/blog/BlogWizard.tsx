// Dans votre fonction generate-blog-article (Edge Function)
// Ajouter cette nouvelle fonction pour les suggestions de mots-clés

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestData = await req.json();

    // ✅ NOUVELLE FONCTION POUR LES SUGGESTIONS DE MOTS-CLÉS
    if (requestData.products || requestData.categories) {
      return await generateKeywordSuggestions(requestData);
    }

    // ... reste du code existant pour generate-blog-article
  } catch (error) {
    // ... gestion d'erreur
  }
});

// ✅ NOUVELLE FONCTION POUR LES SUGGESTIONS IA
async function generateKeywordSuggestions(requestData: any) {
  const { products = [], categories = [], maxKeywords = 15 } = requestData;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  try {
    const prompt = `En tant qu'expert SEO, génère des suggestions de mots-clés pertinents pour ces produits et catégories:

PRODUITS: ${products.slice(0, 5).join(", ")}
CATÉGORIES: ${categories.join(", ")}

Génère ${maxKeywords} mots-clés variés incluant:
- Mots-clés principaux (court)
- Mots-clés longue traîne 
- Termes de recherche courants
- Mots-clés d'intention d'achat
- Mots-clés comparatifs

Retourne UNIQUEMENT une liste séparée par des virgules, sans numérotation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Expert SEO générant des listes de mots-clés optimisés.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const suggestionsText = result.choices[0].message.content.trim();

    // Nettoyer et formater les suggestions
    const suggestions = suggestionsText
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter((s) => s.length > 0)
      .slice(0, maxKeywords);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        count: suggestions.length,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error generating keyword suggestions:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        suggestions: [],
      }),
      { status: 500, headers: corsHeaders },
    );
  }
}
