import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateTextRequest {
  productTitle: string;
  productDescription?: string;
  productPrice?: string;
  comparePrice?: string;
  templateType: 'classic' | 'spotlight' | 'promo' | 'feature' | 'testimonial' | 'carousel' | 'before_after';
  language?: 'fr' | 'en';
  storeName?: string;
  category?: string;
}

interface TemplateTextResponse {
  tagline: string;
  subtitle: string;
  benefits: string[];
  smartCta: string;
  urgencyText?: string;
  hashtags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      productTitle,
      productDescription = '',
      productPrice,
      comparePrice,
      templateType,
      language = 'fr',
      storeName,
      category
    }: TemplateTextRequest = body;

    if (!productTitle) {
      return new Response(
        JSON.stringify({ error: 'productTitle is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context-aware prompt
    const hasDiscount = !!(comparePrice && productPrice && parseFloat(comparePrice.replace(/[^\d.,]/g, '')) > parseFloat(productPrice.replace(/[^\d.,]/g, '')));
    const discountPercent: number = hasDiscount
      ? Math.round((1 - parseFloat(productPrice.replace(/[^\d.,]/g, '')) / parseFloat(comparePrice!.replace(/[^\d.,]/g, ''))) * 100)
      : 0;

    const templatePrompts: Record<string, string> = {
      classic: `Style élégant et lifestyle. Mets en avant l'atmosphère et l'émotion que le produit apporte.`,
      spotlight: `Style premium et moderne. Focus sur la qualité et le design unique.`,
      promo: `Style urgent et accrocheur. Crée un sentiment d'urgence pour l'offre limitée.`,
      feature: `Style informatif avec une question d'accroche. Mets en avant les caractéristiques principales.`,
      testimonial: `Style confiance et social proof. Simule un avis client enthousiaste.`,
      carousel: `Style éducatif et conseils. Propose des astuces liées au produit.`,
      before_after: `Style transformation. Mets en avant le changement positif.`
    };

    const prompt = `Tu es un expert copywriter pour les réseaux sociaux (Facebook/Instagram).
Génère du texte marketing INTELLIGENT et ÉLÉGANT pour un post social media.

PRODUIT: ${productTitle}
DESCRIPTION: ${productDescription.substring(0, 300)}
PRIX: ${productPrice || 'Non spécifié'}
${hasDiscount ? `RÉDUCTION: -${discountPercent}% (ancien prix: ${comparePrice})` : ''}
CATÉGORIE: ${category || 'Produit'}
BOUTIQUE: ${storeName || 'Notre boutique'}
STYLE TEMPLATE: ${templatePrompts[templateType] || templatePrompts.classic}
LANGUE: ${language === 'fr' ? 'Français' : 'English'}

RÈGLES IMPORTANTES:
1. Le tagline doit être COURT (max 8 mots), ACCROCHEUR et évoquer une émotion ou un bénéfice
2. Le subtitle doit donner 1-2 infos clés (matière, style, livraison, etc.)
3. Les benefits doivent être des points CONCRETS et UNIQUES (pas génériques)
4. Le CTA doit être ENGAGEANT et adapté au template
5. ${hasDiscount ? 'Inclure un texte d\'urgence car il y a une promo' : 'Pas de texte d\'urgence'}
6. Les hashtags doivent être PERTINENTS et TENDANCE

Réponds UNIQUEMENT avec ce JSON valide:
{
  "tagline": "phrase d'accroche courte et percutante",
  "subtitle": "info clé sur le produit ou la livraison",
  "benefits": ["bénéfice 1 concret", "bénéfice 2 concret"],
  "smartCta": "appel à l'action engageant →",
  ${hasDiscount ? '"urgencyText": "texte urgence promo",' : ''}
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Return fallback content
      return new Response(
        JSON.stringify(generateFallbackText(productTitle, templateType, hasDiscount, discountPercent, language)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify(generateFallbackText(productTitle, templateType, hasDiscount, discountPercent, language)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response
    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      const result = JSON.parse(jsonStr);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify(generateFallbackText(productTitle, templateType, hasDiscount, discountPercent, language)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in generate-template-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackText(
  productTitle: string, 
  templateType: string, 
  hasDiscount: boolean, 
  discountPercent: number,
  language: string
): TemplateTextResponse {
  const isFr = language === 'fr';
  
  const taglines: Record<string, string[]> = {
    classic: isFr 
      ? ['L\'élégance au quotidien', 'Un style qui vous ressemble', 'Sublimez votre intérieur']
      : ['Everyday elegance', 'Style that fits you', 'Elevate your space'],
    spotlight: isFr
      ? ['Design d\'exception', 'Le luxe accessible', 'Qualité premium']
      : ['Exceptional design', 'Accessible luxury', 'Premium quality'],
    promo: isFr
      ? ['Offre exceptionnelle !', 'Ne manquez pas !', 'Prix choc']
      : ['Exceptional offer!', 'Don\'t miss out!', 'Amazing price'],
    feature: isFr
      ? ['Découvrez pourquoi...', 'Le secret de...', 'Ce qui fait la différence']
      : ['Discover why...', 'The secret of...', 'What makes it different'],
  };

  const subtitles: Record<string, string[]> = {
    classic: isFr
      ? ['Design scandinave • Livraison offerte', 'Qualité artisanale • Stock limité']
      : ['Scandinavian design • Free shipping', 'Artisan quality • Limited stock'],
    spotlight: isFr
      ? ['Matériaux nobles • Fabrication française', 'Design primé • Garantie 5 ans']
      : ['Premium materials • Made in France', 'Award-winning design • 5-year warranty'],
  };

  const benefits: Record<string, string[][]> = {
    classic: isFr
      ? [['Confort optimal', 'Finitions soignées'], ['Design intemporel', 'Facile d\'entretien']]
      : [['Optimal comfort', 'Fine finishes'], ['Timeless design', 'Easy care']],
    promo: isFr
      ? [['Prix réduit', 'Livraison express'], ['Garantie incluse', 'Retour gratuit']]
      : [['Reduced price', 'Express delivery'], ['Warranty included', 'Free returns']],
  };

  const ctas: Record<string, string[]> = {
    classic: isFr ? ['Découvrir →', 'Voir le produit'] : ['Discover →', 'View product'],
    spotlight: isFr ? ['Je découvre', 'En savoir plus →'] : ['Learn more', 'Explore now →'],
    promo: isFr ? ['J\'en profite !', 'Acheter maintenant'] : ['Get it now!', 'Shop now'],
    feature: isFr ? ['Voir les détails', 'Explorer'] : ['View details', 'Explore'],
  };

  const type = templateType as keyof typeof taglines;
  const randomTagline = (taglines[type] || taglines.classic)[Math.floor(Math.random() * 3)];
  const randomSubtitle = (subtitles[type] || subtitles.classic)?.[Math.floor(Math.random() * 2)] || (isFr ? 'Qualité premium' : 'Premium quality');
  const randomBenefits = (benefits[type] || benefits.classic)?.[Math.floor(Math.random() * 2)] || (isFr ? ['Qualité', 'Design'] : ['Quality', 'Design']);
  const randomCta = (ctas[type] || ctas.classic)[Math.floor(Math.random() * 2)];

  const result: TemplateTextResponse = {
    tagline: randomTagline,
    subtitle: randomSubtitle,
    benefits: randomBenefits,
    smartCta: randomCta,
    hashtags: isFr 
      ? ['#decoration', '#maison', '#design', '#tendance']
      : ['#homedecor', '#interiordesign', '#trending', '#lifestyle']
  };

  if (hasDiscount) {
    result.urgencyText = isFr 
      ? `🔥 -${discountPercent}% • Stock limité`
      : `🔥 -${discountPercent}% • Limited stock`;
  }

  return result;
}
