import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { routeAI } from '../_shared/ai-router.ts';

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

    if (!product || !mode) throw new Error('Product and mode are required');

    console.log(`[CREATIVE] Generating ${mode} content for product: ${product.title}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (mode) {
      case 'showcase':
        systemPrompt = `Tu es un expert en marketing e-commerce et création de contenu pour réseaux sociaux. Tu génères du contenu premium pour mettre en valeur des produits. Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère un contenu "Product Showcase" pour ce produit:\n\nProduit: ${product.title}\nDescription: ${product.description || 'Non disponible'}\nPrix: ${product.price ? product.price + '€' : 'Non disponible'}\n${product.compare_at_price ? `Prix barré: ${product.compare_at_price}€` : ''}\n\nGénère en JSON valide:\n{\n  "title": "Titre SEO optimisé accrocheur (max 60 caractères)",\n  "description": "Description premium et engageante (2-3 phrases)",\n  "bulletPoints": ["Point fort 1", "Point fort 2", "Point fort 3", "Point fort 4"],\n  "caption": "Caption Instagram/Facebook engageante avec emojis (150-200 caractères)",\n  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],\n  "ctaText": "Texte du bouton CTA"\n}`;
        break;

      case 'promo':
        systemPrompt = `Tu es un expert en publicité digitale et copywriting promotionnel. Tu crées des accroches percutantes qui convertissent. Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère du contenu publicitaire PROMO pour ce produit:\n\nProduit: ${product.title}\nPrix actuel: ${product.price ? product.price + '€' : 'Non disponible'}\n${product.compare_at_price ? `Prix barré: ${product.compare_at_price}€ (remise de ${Math.round((1 - parseFloat(product.price || '0') / parseFloat(product.compare_at_price)) * 100)}%)` : ''}\n\nGénère en JSON valide:\n{\n  "title": "Accroche pub percutante avec urgence (max 50 caractères)",\n  "caption": "Caption pub avec urgence, bénéfice et CTA fort",\n  "adCopy": "Texte pub format Facebook Ads",\n  "ctaText": "Texte CTA urgent",\n  "hashtags": ["promo", "bonplan", "reduction", "offre"],\n  "videoScript": "Script vidéo 10 secondes"\n}`;
        break;

      case 'info':
        systemPrompt = `Tu es un expert en content marketing et storytelling produit. Tu crées des contenus informatifs et éducatifs engageants. Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Génère un contenu informatif type carousel Instagram pour ce produit:\n\nProduit: ${product.title}\nDescription: ${product.description || 'Non disponible'}\n\nGénère en JSON valide:\n{\n  "title": "Titre du carousel accrocheur",\n  "slides": [\n    {"title": "Slide 1 - Hook/Question", "content": "Texte court et percutant"},\n    {"title": "Slide 2 - Problème", "content": "Description du problème résolu"},\n    {"title": "Slide 3 - Solution", "content": "Comment ce produit aide"},\n    {"title": "Slide 4 - Bénéfices", "content": "Les avantages clés"},\n    {"title": "Slide 5 - CTA", "content": "Appel à l'action"}\n  ],\n  "caption": "Caption pour le post carousel",\n  "hashtags": ["tip", "conseil", "guide", "astuce", "howto"]\n}`;
        break;

      case 'enrich':
        systemPrompt = `Tu es un expert en analyse produit. Tu analyses les informations textuelles disponibles pour en extraire les caractéristiques détaillées. Réponds UNIQUEMENT en JSON valide.`;
        userPrompt = `Analyse ce produit et génère des informations enrichies:\n\nProduit: ${product.title}\nDescription: ${product.description || 'Non disponible'}\nImage disponible: ${product.image ? 'Oui' : 'Non'}\n\nGénère en JSON valide basé uniquement sur le titre et la description:\n{\n  "visionAnalysis": {\n    "materials": ["Liste des matériaux probables"],\n    "style": "Style du produit",\n    "colors": ["Couleurs probables"],\n    "dimensions": "Estimation si pertinent",\n    "usps": ["USP 1", "USP 2", "USP 3"]\n  },\n  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],\n  "targetAudience": "Description de l'audience cible",\n  "emotionalTriggers": ["Émotion 1", "Émotion 2"],\n  "title": "Titre produit enrichi et optimisé",\n  "bulletPoints": ["Caractéristique enrichie 1", "Caractéristique enrichie 2", "Caractéristique enrichie 3"]\n}`;
        break;
    }

    const aiResult = await routeAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4000,
    });

    let parsedContent;
    try {
      const jsonMatch = aiResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiResult.content.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[CREATIVE] Failed to parse AI response:', aiResult.content);
      throw new Error('Failed to parse AI response');
    }

    console.log(`[CREATIVE] Successfully generated ${mode} content via ${aiResult.provider}`);

    const result = {
      ...parsedContent,
      ...(parsedContent.visionAnalysis && { visionAnalysis: parsedContent.visionAnalysis }),
      ai_provider: aiResult.provider,
      ai_model: aiResult.model,
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
