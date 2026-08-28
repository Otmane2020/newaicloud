import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productTitle, productDescription } = await req.json();
    if (!productTitle?.trim()) throw new Error("productTitle is required");

    const prompt = `Tu es un expert en création de noms de marques commerciales.

Basé sur ce produit :
- Titre: ${productTitle}
- Description: ${productDescription || "N/A"}

GÉNÈRE un NOM DE MARQUE COMMERCIAL authentique et mémorable (1-2 mots).

RÈGLES STRICTES :
1. Le nom doit ressembler à une vraie marque commerciale.
2. Style court, percutant, moderne ou élégant selon le secteur.
3. Pas de mots descriptifs génériques comme Home, Shop, Store, Design, Craft.
4. Pas de mot composé avec le type de produit.
5. Crée un nom original, prononçable et mémorable.
6. Ne prétends jamais qu'une marque inventée est une marque réellement existante.

Réponds UNIQUEMENT avec un JSON valide : {"vendor":"NomDeLaMarque"}`;

    const routed = await routeAI({
      messages: [
        { role: "system", content: "Return exactly one valid JSON object and no markdown." },
        { role: "user", content: prompt },
      ],
      maxTokens: 120,
      temperature: 0.6,
    });

    console.log(`[generate-vendor-name] provider=${routed.provider}, model=${routed.model}`);
    const content = routed.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const jsonMatch = content.match(/\{[\s\S]*"vendor"[\s\S]*\}/);

    if (!jsonMatch) throw new Error("AI returned an invalid vendor response");
    const parsed = JSON.parse(jsonMatch[0]);
    const cleanVendor = String(parsed.vendor || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanVendor) throw new Error("AI returned an empty vendor name");

    return new Response(
      JSON.stringify({ vendor: cleanVendor, provider: routed.provider, model: routed.model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating vendor:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
