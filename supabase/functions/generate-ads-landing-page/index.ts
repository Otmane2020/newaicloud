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
    const googleGeminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    
    if (!googleGeminiApiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
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
            seo_description
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
            ai_shape
          )
        )
      `)
      .eq("id", campaignId)
      .single();
    
    if (campaignError) throw campaignError;
    
    // Get product images and variants
    const productIds = campaign.ads_campaign_products?.map((p: any) => p.product?.id).filter(Boolean) || [];
    
    let productImages: any[] = [];
    let productVariants: any[] = [];
    
    if (productIds.length > 0) {
      const [imagesResult, variantsResult] = await Promise.all([
        supabase.from("product_images").select("*").in("product_id", productIds).order("position"),
        supabase.from("product_variants").select("*").in("product_id", productIds)
      ]);
      
      productImages = imagesResult.data || [];
      productVariants = variantsResult.data || [];
    }

    // Prepare products data with enhanced info
    const products = campaign.ads_campaign_products?.map((p: any) => {
      const product = p.product;
      const discount = product.compare_at_price 
        ? Math.round((1 - product.price / product.compare_at_price) * 100)
        : null;

      return {
        ...product,
        discount,
        discount_amount: product.compare_at_price ? (product.compare_at_price - product.price) : null,
        images: productImages.filter((img: any) => img.product_id === product.id),
        variants: productVariants.filter((v: any) => v.product_id === product.id),
        main_image: product.image_url || (productImages.find((img: any) => img.product_id === product.id)?.src),
        has_multiple_images: productImages.filter((img: any) => img.product_id === product.id).length > 1
      };
    }) || [];

    // Amazon-style e-commerce landing page prompt
    const prompt = `You are an expert e-commerce conversion specialist. Create a COMPLETE, SELF-CONTAINED HTML landing page optimized for maximum conversions, inspired by Amazon's proven design patterns.

## CRITICAL REQUIREMENTS - READ CAREFULLY:

### 1. OUTPUT FORMAT
- Return a COMPLETE, STANDALONE HTML document
- Include ALL CSS inline in a <style> tag
- NO external dependencies, NO imports, NO React components
- Must work immediately when rendered with dangerouslySetInnerHTML
- Start directly with <!DOCTYPE html>

### 2. DESIGN SYSTEM (Amazon-inspired)
**Colors:**
- Primary CTA: #FF9900 (Amazon orange) hover #FA8900
- Secondary CTA: #146EB4 (Amazon blue) hover #0F5A8E
- Success/Trust: #067D62 white text
- Urgent/Sale: #B12704 white text
- Text: #0F1111 (dark) and #565959 (secondary)
- Background: #FFFFFF and #F7F8F8 (light gray sections)
- Borders: #D5D9D9

**Typography:**
- Headlines: font-bold, large sizes (48px for hero)
- Body: 16px, #0F1111
- Prices: 28px font-bold #B12704
- Strikethrough prices: 18px line-through #565959

### 3. PAGE STRUCTURE (Follow this exact order):

#### A. HERO SECTION (Above the fold)
- Full-width banner with gradient background
- Campaign headline: "${campaign.headline || 'Découvrez nos meilleures offres'}"
- Subheadline: "${campaign.subheadline || 'Profitez de réductions exceptionnelles'}"
- Primary CTA button: "${campaign.cta_text || 'Voir les produits'}"
- Trust badges row: ⭐⭐⭐⭐⭐ 4.8/5 (2,847 avis) | 🚚 Livraison gratuite | 🔄 Retours 30 jours

#### B. HIGHLIGHTS BAR
${campaign.highlights && Array.isArray(campaign.highlights) && campaign.highlights.length > 0 ? 
`Display these highlights as icons with text:
${campaign.highlights.map((h: any) => `- ${h.text || h}`).join('\n')}` : 
`- ✓ Livraison gratuite dès 50€
- ✓ Retours gratuits sous 30 jours  
- ✓ Garantie satisfait ou remboursé
- ✓ Paiement sécurisé`}

#### C. FEATURED PRODUCTS GRID
Display ${products.length} products in a responsive grid (2 cols mobile, 3-4 cols desktop).

**For each product, create a card with:**
1. Product image (responsive, optimized)
2. ${products[0]?.discount ? `BADGE "PROMO -${products[0].discount}%" in top-right corner (bg #B12704 white text)` : ''}
3. Product title (bold, 18px)
4. Star rating: ⭐⭐⭐⭐⭐ 4.7/5
5. Price display with comparison if available
6. CTA button "Ajouter au panier" (Amazon orange)
7. Stock indicator for urgency

**ALL ${products.length} PRODUCTS:**
${products.map((p: any, idx: number) => `
Product ${idx + 1}:
- Title: ${p.title}
- Price: ${p.price}€
- Compare at: ${p.compare_at_price || 'N/A'}€
- Discount: ${p.discount ? `-${p.discount}%` : 'N/A'}
- Image: ${p.main_image || '/placeholder.svg'}
- Description: ${(p.optimized_description || p.description || '').substring(0, 150)}...
- Style: ${p.style || 'Moderne'}
- Material: ${p.ai_material || 'Qualité supérieure'}
`).join('\n')}

#### D. WHY CHOOSE US SECTION
3-column grid with icons and benefits:
- 🏆 Qualité garantie | Produits vérifiés et testés
- 🚀 Livraison express | Expédition sous 24h
- 💯 Satisfait ou remboursé | Garantie 30 jours

#### E. SOCIAL PROOF SECTION  
Display 3 customer testimonials with:
- 5-star rating
- Customer name with initials in colored circles
- Review text (authentic French testimonials)

#### F. FAQ SECTION (Accordion-style)
4-5 common questions:
- Quels sont les délais de livraison ?
- Puis-je retourner un produit ?
- Les paiements sont-ils sécurisés ?
- Comment suivre ma commande ?

#### G. FINAL CTA SECTION
- Repeat main headline
- Strong CTA button "Voir tous les produits"
- Urgency text: "Offre valable jusqu'à épuisement des stocks"

### 4. TECHNICAL SPECIFICATIONS

**Include this CSS in <style> tag:**
\`\`\`css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; color: #0F1111; line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.btn-primary { background: #FF9900; color: #0F1111; padding: 12px 24px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; text-decoration: none; display: inline-block; }
.btn-primary:hover { background: #FA8900; }
.product-card { background: white; border: 1px solid #D5D9D9; border-radius: 8px; padding: 16px; transition: all 0.2s; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.price-sale { color: #B12704; font-size: 28px; font-weight: bold; }
.price-original { color: #565959; text-decoration: line-through; font-size: 18px; }
.badge-promo { background: #B12704; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; position: absolute; top: 10px; right: 10px; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin: 40px 0; }
@media (max-width: 768px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .hero h1 { font-size: 28px !important; }
}
\`\`\`

### 5. CONVERSION OPTIMIZATION
- Multiple CTAs throughout the page
- Clear visual hierarchy (large prices, bold CTAs)
- Trust signals in every section
- Social proof prominently displayed
- Urgency and scarcity indicators
- Mobile-optimized (responsive design)

### 6. NO PLACEHOLDER CONTENT
- Use REAL product data provided above
- Use REAL prices and discounts
- Create REALISTIC testimonials (French names, believable reviews)
- NO "Lorem ipsum" or "[Product Name]" placeholders

Return ONLY the complete HTML document. Start with <!DOCTYPE html>. No markdown, no backticks, no explanations.`;

    console.log("Calling Google Gemini with artistic gallery prompt...");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleGeminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 5000
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Gemini error:", response.status, errorText);
      throw new Error(`Google Gemini error: ${response.status}`);
    }
    
    const data = await response.json();
    let generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean code extraction
    const codeMatch = generatedCode.match(/```(?:tsx|typescript|jsx)?\n([\s\S]*?)```/);
    if (codeMatch) {
      generatedCode = codeMatch[1];
    }

    // Save to database
    const landingPageUrl = `/gallery/${campaignId}`;
    
    const { error: updateError } = await supabase
      .from("ads_campaigns")
      .update({ 
        landing_page_url: landingPageUrl,
        landing_page_html: generatedCode,
        updated_at: new Date().toISOString(),
        status: 'active'
      })
      .eq("id", campaignId);
    
    if (updateError) {
      console.error("Failed to save landing page:", updateError);
    }

    // Optimize SERP titles for all campaign products
    console.log(`🎯 Optimizing SERP titles for ${products.length} products...`);
    const optimizationPromises = products.map(async (product: any) => {
      try {
        const { data, error } = await supabase.functions.invoke('optimize-product-title-serp', {
          body: {
            productId: product.id,
            currentTitle: product.title,
            description: product.description || product.optimized_description,
            productType: product.product_type,
            vendor: product.vendor,
            language: 'fr'
          }
        });
        
        if (error) {
          console.error(`❌ Failed to optimize title for ${product.title}:`, error);
        } else {
          console.log(`✅ Optimized title for ${product.title}`);
        }
      } catch (err) {
        console.error(`❌ Error optimizing ${product.title}:`, err);
      }
    });

    await Promise.all(optimizationPromises);
    console.log('✅ All SERP titles optimized');

    return new Response(
      JSON.stringify({ 
        success: true,
        code: generatedCode,
        landingPageUrl,
        productsCount: products.length,
        campaignType: campaign.campaign_type,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating artistic landing page:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});