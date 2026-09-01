import "../_shared/strict-ai-generation.ts";
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
    const { productTitle, productDescription } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Tu es un expert en création de noms de marques commerciales.

Basé sur ce produit :
- Titre: ${productTitle}
- Description: ${productDescription || 'N/A'}

GÉNÈRE un NOM DE MARQUE COMMERCIAL authentique et mémorable (1-2 mots).

RÈGLES STRICTES :
1. Le nom doit ressembler à une VRAIE MARQUE commerciale existante
2. Style : court, percutant, moderne ou élégant selon le secteur
3. PAS de mots descriptifs (éviter "Home", "Shop", "Store", "Design", "Craft")
4. PAS de mots composés avec le type de produit
5. Inspire-toi de vraies marques célèbres :
   - Mode : Zara, H&M, Mango, Sézane, Kiabi, Jules
   - Luxe : Chanel, Dior, Hermès, Cartier, Bulgari
   - Tech : Apple, Sony, Bose, Dyson, LG
   - Décoration : IKEA, Habitat, Maison, Ferm, HAY, Muuto
   - Sport : Nike, Puma, Adidas, Decathlon, Quechua
   - Bijoux : Pandora, Swarovski, Fossil, Cluse
   - Cosmétique : Nuxe, Caudalie, Kiehl's, Origins
   
6. Crée un nom ORIGINAL mais dans le même STYLE que ces marques
7. Le nom peut être : 
   - Un prénom inventé (ex: Clara, Luna, Arlo, Nova)
   - Un mot inventé court (ex: VOLT, FLUX, ZENO, KIRA)
   - Un mot étranger simple (ex: Casa, Bella, Nord, Luma)

EXEMPLES de bons noms de marque :
- Table basse → "NOMA" ou "Arlo" ou "Fern"
- Robe été → "Sézane" ou "Luna" ou "Alba"
- Lampe design → "FLOS" ou "Luma" ou "Glow"
- Bijou → "Aura" ou "Celeste" ou "Nova"
- Sneakers → "VEJA" ou "Sprint" ou "Flint"

Réponds UNIQUEMENT avec le JSON : {"vendor": "NomDeLaMarque"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI response:", content);

    // Parser le JSON de la réponse
    const jsonMatch = content.match(/\{[\s\S]*"vendor"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Clean up the vendor name - remove quotes and extra spaces
      const cleanVendor = parsed.vendor?.trim().replace(/^["']|["']$/g, '');
      console.log("Generated vendor:", cleanVendor);
      return new Response(JSON.stringify({ vendor: cleanVendor }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback si parsing échoue
    console.log("Failed to parse AI response, using fallback");
    return new Response(JSON.stringify({ vendor: "Nova" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error generating vendor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
