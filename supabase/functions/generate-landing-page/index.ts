import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get campaign data with all relations
    const { data: campaign, error: campaignError } = await supabase
      .from("ads_campaigns")
      .select(`
        *,
        ads_campaign_collections(
          collection:shopify_collections(*)
        ),
        ads_campaign_products(
          product:shopify_products(*)
        )
      `)
      .eq("id", campaignId)
      .single();
    
    if (campaignError) throw campaignError;
    
    // Get user's store info
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("store_name, store_url")
      .eq("user_id", campaign.user_id)
      .single();
    
    // Prepare data for AI
    const collections = campaign.ads_campaign_collections?.map((c: any) => c.collection) || [];
    const products = campaign.ads_campaign_products?.map((p: any) => p.product) || [];
    
    const prompt = `Tu es un expert UX/UI designer et copywriter spécialisé en landing pages à haute conversion.

MISSION: Génère une landing page React/TypeScript moderne et attractive pour une campagne e-commerce.

DONNÉES DE LA CAMPAGNE:
- Type: ${campaign.campaign_type}
- Nom: ${campaign.name}
- Titre: ${campaign.headline}
- Sous-titre: ${campaign.subheadline || ""}
- CTA: ${campaign.cta_text}
- Highlights: ${JSON.stringify(campaign.highlights || [])}
- Résumé boutique: ${campaign.store_summary || ""}
- Boutique: ${store?.store_name || ""}
${collections.length > 0 ? `- Collections: ${collections.map((c: any) => c.title).join(", ")}` : ""}
${products.length > 0 ? `- Produits (${products.length}): ${products.slice(0, 5).map((p: any) => p.title).join(", ")}` : ""}

STRUCTURE OBLIGATOIRE:

1. HERO SECTION (Impact maximal):
   - Background moderne (gradient ou image)
   - Titre émotionnel et bénéfice-centré (pas juste le titre brut)
   - Sous-titre percutant
   - CTA principal ultra-visible avec micro-copy
   - Animation subtile au scroll

2. SECTION HIGHLIGHTS (Si disponibles):
   - Affiche les points forts avec icônes
   - Design moderne avec cards ou grid
   - Visuellement attractif

3. SECTION PRODUITS/COLLECTIONS:
   - Grid responsive moderne
   - Cards avec hover effects
   - Images, titres, prix si disponibles
   - CTA sur chaque produit

4. SECTION CONFIANCE (Si résumé boutique):
   - Storytelling de la marque
   - Design épuré et élégant

5. CTA FINAL:
   - Répétition CTA avec urgence/scarcité si pertinent
   - Design impactant

CONTRAINTES TECHNIQUES:
- React + TypeScript
- Tailwind CSS avec tokens sémantiques (primary, secondary, accent)
- 100% responsive
- Animations Tailwind (animate-fade-in, animate-slide-up, etc.)
- Images optimisées avec lazy loading
- Accessibility (aria-labels, alt texts)

STYLE:
- Moderne, clean, espacé
- Couleurs cohérentes (utilise primary/secondary)
- Typography hiérarchisée
- Hover effects partout
- Micro-interactions

CODE ATTENDU:
Génère UNIQUEMENT le composant React complet, avec imports nécessaires.
Format: \`\`\`tsx
// Code ici
\`\`\`

IMPORTANT:
- Ne génère PAS de mock data, utilise les vraies données fournies
- Sois créatif sur le copy (améliore les textes pour maximiser conversion)
- Design HIGH-END, pas générique
- Utilise les vraies images des produits/collections`;

    console.log("Calling Lovable AI for landing page generation...");
    
    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }
    
    const data = await response.json();
    const generatedCode = data.choices[0]?.message?.content || "";
    
    // Extract code from markdown if present
    let code = generatedCode;
    const codeMatch = generatedCode.match(/```(?:tsx|typescript|jsx)?\n([\s\S]*?)```/);
    if (codeMatch) {
      code = codeMatch[1];
    }
    
    // Update campaign with landing page code and URL
    const landingPageUrl = `/landing/${campaign.id}`;
    
    await supabase
      .from("ads_campaigns")
      .update({ 
        landing_page_url: landingPageUrl,
        // Store the generated code in a new field (we'll need to add this column)
      })
      .eq("id", campaignId);
    
    return new Response(
      JSON.stringify({ 
        code,
        landingPageUrl,
        campaign,
        collections,
        products
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});