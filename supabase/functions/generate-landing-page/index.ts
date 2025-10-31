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
          collection:shopify_collections(
            id,
            title,
            body_html,
            handle,
            image_url,
            image_alt,
            seo_title,
            seo_description,
            optimization_count,
            last_optimization_at
          )
        ),
        ads_campaign_products(
          product:shopify_products(
            id,
            title,
            description,
            optimized_title,
            optimized_description,
            price,
            compare_at_price,
            currency,
            image_url,
            handle,
            vendor,
            product_type,
            tags,
            seo_title,
            seo_description,
            category,
            sub_category,
            style,
            room,
            functionality,
            characteristics,
            ai_vision_analysis,
            ai_color,
            ai_material,
            ai_texture,
            ai_pattern,
            ai_finish,
            ai_shape,
            optimization_count,
            last_optimization_at
          )
        )
      `)
      .eq("id", campaignId)
      .single();
    
    if (campaignError) throw campaignError;
    
    // Get user's store info with all details
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", campaign.user_id)
      .single();
    
    // Get product images for all campaign products
    const productIds = campaign.ads_campaign_products?.map((p: any) => p.product?.id).filter(Boolean) || [];
    let productImages: any[] = [];
    if (productIds.length > 0) {
      const { data: images } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds)
        .order("position");
      productImages = images || [];
    }
    
    // Get product variants for pricing info
    let productVariants: any[] = [];
    if (productIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("*")
        .in("product_id", productIds);
      productVariants = variants || [];
    }
    
    // Prepare data for AI with full details
    const collections = campaign.ads_campaign_collections?.map((c: any) => ({
      ...c.collection,
      images: [],
    })) || [];
    
    const products = campaign.ads_campaign_products?.map((p: any) => {
      const product = p.product;
      return {
        ...product,
        images: productImages.filter((img: any) => img.product_id === product.id),
        variants: productVariants.filter((v: any) => v.product_id === product.id),
      };
    }) || [];
    
    // Build detailed prompt with all data
    const collectionsDetails = collections.map((c: any) => `
      - ${c.title}
        Description: ${c.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || 'N/A'}
        SEO Title: ${c.seo_title || 'N/A'}
        SEO Description: ${c.seo_description || 'N/A'}
        Image: ${c.image_url || 'N/A'}
    `).join('\n');
    
    const productsDetails = products.slice(0, 10).map((p: any) => `
      - ${p.title} (${p.price || 'N/A'} ${p.currency || 'EUR'})
        Description: ${(p.optimized_description || p.description || '').substring(0, 300)}
        Catégorie: ${p.category || 'N/A'} ${p.sub_category ? `> ${p.sub_category}` : ''}
        Style: ${p.style || 'N/A'}
        Vendor: ${p.vendor || 'N/A'}
        Tags: ${p.tags || 'N/A'}
        AI Analysis: ${p.ai_vision_analysis?.substring(0, 200) || 'N/A'}
        Couleur: ${p.ai_color || 'N/A'}
        Matériau: ${p.ai_material || 'N/A'}
        Prix normal: ${p.price || 'N/A'} ${p.currency || 'EUR'}
        ${p.compare_at_price ? `Prix barré: ${p.compare_at_price} ${p.currency}` : ''}
        Images: ${p.images?.length || 0} disponible(s)
        Variants: ${p.variants?.length || 0} disponible(s)
    `).join('\n');
    
    const storeDetails = store ? `
INFORMATIONS BOUTIQUE COMPLÈTES:
- Nom: ${store.store_name || 'N/A'}
- URL: ${store.store_url || 'N/A'}
- Connexion type: ${store.connection_type || 'N/A'}
- Active depuis: ${store.connected_at || store.created_at}
- Dernière sync: ${store.last_sync_at || 'N/A'}
    ` : '';

    const prompt = `Tu es un expert UX/UI designer et copywriter spécialisé en landing pages à haute conversion.

MISSION: Génère une landing page React/TypeScript moderne et attractive pour une campagne e-commerce.

DONNÉES DE LA CAMPAGNE:
- Type: ${campaign.campaign_type}
- Nom: ${campaign.name}
- Titre: ${campaign.headline}
- Sous-titre: ${campaign.subheadline || "N/A"}
- CTA: ${campaign.cta_text}
- Status: ${campaign.status}
- Créée le: ${campaign.created_at}
- Highlights: ${JSON.stringify(campaign.highlights || [])}
- Résumé boutique (généré par IA): ${campaign.store_summary || "N/A"}

${storeDetails}

${collections.length > 0 ? `COLLECTIONS DÉTAILLÉES (${collections.length}):
${collectionsDetails}` : 'Aucune collection sélectionnée'}

${products.length > 0 ? `PRODUITS DÉTAILLÉS (${products.length}):
${productsDetails}` : 'Aucun produit sélectionné'}

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