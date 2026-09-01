import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  creditErrorResponse,
  refundCredits,
  reserveCredits,
  type CreditReservation,
} from "../_shared/credit-billing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let creditReservation: CreditReservation | null = null;

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      productTitle, 
      productDescription, 
      productPrice,
      comparePrice,
      productType,
      storeName,
      topic,
      style,
      includeEmojis = true,
      includeHashtags = true,
      language = 'fr',
      tone = 'engaging',
      platform = 'facebook'
    } = body;

    const isAdminMode = !!topic && !productTitle;
    
    if (!productTitle && !topic) {
      return new Response(JSON.stringify({ error: 'Product title or topic is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    creditReservation = await reserveCredits(req, "text", {
      feature: "generate-social-caption",
      platform,
      language,
      mode: isAdminMode ? "topic" : "product",
    });

    const toneDescriptions: Record<string, { fr: string; en: string }> = {
      engaging: { 
        fr: 'engageant, dynamique et incitatif à l\'action', 
        en: 'engaging, dynamic and action-driven' 
      },
      professional: { 
        fr: 'professionnel, élégant et raffiné', 
        en: 'professional, elegant and refined' 
      },
      playful: { 
        fr: 'fun, décontracté avec des emojis', 
        en: 'fun, casual with emojis' 
      },
      luxury: { 
        fr: 'luxueux, exclusif et premium', 
        en: 'luxurious, exclusive and premium' 
      }
    };

    const selectedTone = toneDescriptions[tone] || toneDescriptions.engaging;
    const platformHashtags = platform === 'instagram' 
      ? language === 'fr' 
        ? '5-8 hashtags pertinents en français' 
        : '5-8 relevant hashtags in English'
      : language === 'fr'
        ? '2-3 hashtags pertinents'
        : '2-3 relevant hashtags';

    const hasDiscount = comparePrice && productPrice && 
      parseFloat(comparePrice.replace(/[^\d.,]/g, '').replace(',', '.')) > 
      parseFloat(productPrice.replace(/[^\d.,]/g, '').replace(',', '.'));

    const systemPrompt = language === 'fr' 
      ? `Tu es un expert en marketing social media pour e-commerce. Tu crées des captions ${selectedTone.fr} qui convertissent.`
      : `You are a social media marketing expert for e-commerce. You create ${selectedTone.en} captions that convert.`;

    const userPrompt = language === 'fr'
      ? `Génère une caption ${platform === 'instagram' ? 'Instagram' : 'Facebook'} pour ce produit:

Nom: ${productTitle}
${productDescription ? `Description: ${productDescription.substring(0, 300)}` : ''}
${productPrice ? `Prix: ${productPrice}` : ''}
${hasDiscount ? `Prix barré: ${comparePrice} (promotion!)` : ''}
${productType ? `Type: ${productType}` : ''}
${storeName ? `Boutique: ${storeName}` : ''}

Règles:
- Ton: ${selectedTone.fr}
- Commence par un hook accrocheur (question ou affirmation)
- ${hasDiscount ? 'Mets en avant la promotion et l\'urgence' : 'Mets en avant les bénéfices'}
- Inclus un call-to-action clair
- Ajoute ${platformHashtags}
- Maximum 2200 caractères
- Utilise des emojis pertinents (pas trop)
- Ne mets PAS de guillemets autour de la réponse`
      : `Generate a ${platform === 'instagram' ? 'Instagram' : 'Facebook'} caption for this product:

Name: ${productTitle}
${productDescription ? `Description: ${productDescription.substring(0, 300)}` : ''}
${productPrice ? `Price: ${productPrice}` : ''}
${hasDiscount ? `Compare price: ${comparePrice} (on sale!)` : ''}
${productType ? `Type: ${productType}` : ''}
${storeName ? `Store: ${storeName}` : ''}

Rules:
- Tone: ${selectedTone.en}
- Start with a catchy hook (question or statement)
- ${hasDiscount ? 'Highlight the promotion and urgency' : 'Highlight the benefits'}
- Include a clear call-to-action
- Add ${platformHashtags}
- Maximum 2200 characters
- Use relevant emojis (not too many)
- Do NOT put quotes around the response`;

    if (isAdminMode) {
      const styleInstructions: Record<string, string> = {
        promotional: "Create an exciting, action-oriented caption that highlights benefits and includes a call-to-action. Use persuasive language.",
        informative: "Create an educational caption that shares valuable information. Use clear, professional language.",
        engaging: "Create a conversational caption that encourages interaction. Ask questions or invite comments.",
      };

      const adminPrompt = `Generate a ${platform} post caption in French about: "${topic}"

Style: ${styleInstructions[style] || styleInstructions.promotional}

Requirements:
- Language: French
- Length: 150-300 characters for Facebook
${includeEmojis ? "- Include 3-5 relevant emojis throughout the text" : "- No emojis"}
${includeHashtags ? "- Add 3-5 relevant hashtags at the end" : "- No hashtags"}
- Make it compelling and shareable
- Focus on value proposition

Return ONLY the caption text, nothing else.`;

      console.log('Generating admin caption for topic:', topic);

      const adminResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a social media expert who creates engaging French captions for business posts. Always respond with just the caption text, no explanations.' },
            { role: 'user', content: adminPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!adminResponse.ok) {
        const errorText = await adminResponse.text();
        console.error('AI Gateway error:', adminResponse.status, errorText);
        throw new Error(`AI Gateway error: ${adminResponse.status}`);
      }

      const adminData = await adminResponse.json();
      const adminCaption = adminData.choices?.[0]?.message?.content?.trim();

      if (!adminCaption) {
        throw new Error('No caption generated');
      }

      return new Response(JSON.stringify({ 
        caption: adminCaption.replace(/^["']|["']$/g, '').trim(),
        platform,
        language: 'fr',
        style,
        credit_cost: creditReservation.cost,
        credit_balance: creditReservation.balanceAfter,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating caption for:', productTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      await refundCredits(creditReservation, `provider_http_${response.status}`);
      creditReservation = null;
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later', credits_refunded: true }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim();

    if (!caption) {
      throw new Error('No caption generated');
    }

    const cleanCaption = caption.replace(/^["']|["']$/g, '').trim();
    console.log('Generated caption length:', cleanCaption.length);

    return new Response(JSON.stringify({ 
      caption: cleanCaption,
      platform,
      language,
      tone,
      credit_cost: creditReservation.cost,
      credit_balance: creditReservation.balanceAfter,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const creditResponse = creditErrorResponse(error, corsHeaders);
    if (creditResponse) return creditResponse;

    if (creditReservation) {
      await refundCredits(
        creditReservation,
        error instanceof Error ? error.message.slice(0, 180) : 'caption_generation_failed',
      );
    }

    console.error('Error generating caption:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      credits_refunded: !!creditReservation,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});