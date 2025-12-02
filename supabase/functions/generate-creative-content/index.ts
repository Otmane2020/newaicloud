import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  title: string;
  image: string | null;
  description: string;
  price: string | null;
  compare_at_price: string | null;
  vendor: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { mode, product, template } = body as { 
      mode: 'showcase' | 'promo' | 'info' | 'enrich';
      product: Product;
      template: string;
    };

    if (!product || !mode) {
      throw new Error('Product and mode are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[CREATIVE] Generating ${mode} content for product: ${product.title}`);

    // Build the prompt based on mode
    let systemPrompt = '';
    let userPrompt = '';

    switch (mode) {
      case 'showcase':
        systemPrompt = `Tu es un expert en marketing e-commerce et création de contenu pour réseaux sociaux. 
Tu génères du contenu premium pour mettre en valeur des produits.
Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère un contenu "Product Showcase" pour ce produit:

Produit: ${product.title}
Description: ${product.description || 'Non disponible'}
Prix: ${product.price ? product.price + '€' : 'Non disponible'}
${product.compare_at_price ? `Prix barré: ${product.compare_at_price}€` : ''}

Génère en JSON:
{
  "title": "Titre SEO optimisé accrocheur (max 60 caractères)",
  "description": "Description premium et engageante (2-3 phrases)",
  "bulletPoints": ["Point fort 1", "Point fort 2", "Point fort 3", "Point fort 4"],
  "caption": "Caption Instagram/Facebook engageante avec emojis (150-200 caractères)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "ctaText": "Texte du bouton CTA"
}`;
        break;

      case 'promo':
        systemPrompt = `Tu es un expert en publicité digitale et copywriting promotionnel.
Tu crées des accroches percutantes qui convertissent.
Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère du contenu publicitaire PROMO pour ce produit:

Produit: ${product.title}
Prix actuel: ${product.price ? product.price + '€' : 'Non disponible'}
${product.compare_at_price ? `Prix barré: ${product.compare_at_price}€ (remise de ${Math.round((1 - parseFloat(product.price || '0') / parseFloat(product.compare_at_price)) * 100)}%)` : ''}

Génère en JSON:
{
  "title": "Accroche pub percutante avec urgence (max 50 caractères)",
  "caption": "Caption pub avec urgence, bénéfice et CTA fort (100-150 caractères avec emojis)",
  "adCopy": "Texte pub format Facebook Ads (3 lignes max)",
  "ctaText": "Texte CTA urgent (ex: J'EN PROFITE, -50% MAINTENANT)",
  "hashtags": ["promo", "bonplan", "reduction", "offre"],
  "videoScript": "Script vidéo 10 secondes: [0-3s] Accroche choc [3-7s] Bénéfice produit [7-10s] CTA avec prix"
}`;
        break;

      case 'info':
        systemPrompt = `Tu es un expert en content marketing et storytelling produit.
Tu crées des contenus informatifs et éducatifs engageants.
Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère un contenu informatif type carousel Instagram pour ce produit:

Produit: ${product.title}
Description: ${product.description || 'Non disponible'}

Génère en JSON:
{
  "title": "Titre du carousel accrocheur",
  "slides": [
    {"title": "Slide 1 - Hook/Question", "content": "Texte court et percutant"},
    {"title": "Slide 2 - Problème", "content": "Description du problème résolu"},
    {"title": "Slide 3 - Solution", "content": "Comment ce produit aide"},
    {"title": "Slide 4 - Bénéfices", "content": "Les avantages clés"},
    {"title": "Slide 5 - CTA", "content": "Appel à l'action"}
  ],
  "caption": "Caption pour le post carousel avec storytelling (200-250 caractères)",
  "hashtags": ["tip", "conseil", "guide", "astuce", "howto"]
}`;
        break;

      case 'enrich':
        systemPrompt = `Tu es un expert en analyse produit et Vision AI.
Tu analyses les produits pour en extraire les caractéristiques détaillées.
Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Analyse ce produit et génère des informations enrichies:

Produit: ${product.title}
Description: ${product.description || 'Non disponible'}
Image disponible: ${product.image ? 'Oui' : 'Non'}

Génère en JSON basé sur le titre et la description:
{
  "visionAnalysis": {
    "materials": ["Liste des matériaux probables"],
    "style": "Style du produit (moderne, classique, industriel, etc.)",
    "colors": ["Couleurs détectées ou probables"],
    "dimensions": "Estimation des dimensions si pertinent",
    "usps": ["USP 1", "USP 2", "USP 3"]
  },
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetAudience": "Description de l'audience cible",
  "emotionalTriggers": ["Émotion 1", "Émotion 2"],
  "title": "Titre produit enrichi et optimisé",
  "bulletPoints": ["Caractéristique enrichie 1", "Caractéristique enrichie 2", "Caractéristique enrichie 3"]
}`;
        break;
    }

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CREATIVE] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content generated by AI');
    }

    // Parse JSON response
    let parsedContent;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[CREATIVE] Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI response');
    }

    console.log(`[CREATIVE] Successfully generated ${mode} content`);

    // Flatten the response for frontend
    const result = {
      ...parsedContent,
      ...(parsedContent.visionAnalysis && { visionAnalysis: parsedContent.visionAnalysis }),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[CREATIVE] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
