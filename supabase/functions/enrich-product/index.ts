import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EnrichmentRequest {
  productId: string;
}

async function callDeepSeek(messages: any[], maxTokens = 500) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  try {
    console.log(`🔁 DeepSeek API call`);

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error calling DeepSeek:', error);
    throw error;
  }
}

function parseAIResponse(responseContent: string): any {
  console.log("🔧 Parsing AI response...");

  if (!responseContent || responseContent.trim() === '') {
    console.error("❌ Empty response content");
    return null;
  }

  try {
    return JSON.parse(responseContent);
  } catch (directError) {
    console.log("Direct parse failed, trying to extract JSON...");

    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,
      /```\s*([\s\S]*?)\s*```/,
      /\{[\s\S]*\}/
    ];

    for (const pattern of patterns) {
      const match = responseContent.match(pattern);
      if (match) {
        try {
          const jsonContent = match[1] || match[0];
          console.log("✅ Extracted JSON with pattern");
          return JSON.parse(jsonContent);
        } catch (e) {
          console.log("Pattern failed, trying next...");
          continue;
        }
      }
    }

    try {
      const cleaned = responseContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (finalError) {
      console.error("❌ All parsing attempts failed");
      console.error("Raw content:", responseContent.substring(0, 200));
      return null;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🎯 Edge Function: enrich-product called");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { productId }: EnrichmentRequest = await req.json();

    if (!productId) {
      throw new Error("Missing productId");
    }

    console.log(`📦 Processing product: ${productId}`);

    // Fetch product data
    const { data: product, error: fetchError } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error(`Product not found: ${productId}`);
    }

    console.log(`✅ Product fetched: ${product.title}`);

    // Check if product already optimized for trial users
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', product.seller_id)
      .single();

    if (profile?.subscription_status === 'trialing' && (product.optimization_count || 0) >= 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'trial_product_already_optimized',
          message: 'Ce produit a déjà été optimisé pendant votre période d\'essai.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build AI prompt to detect attributes (NOT SEO fields)
    const prompt = `
Tu es un expert en analyse de produits e-commerce. Analyse ce produit et extrait TOUS les attributs suivants (PAS de SEO).

PRODUIT:
- Titre: ${product.title || ''}
- Description: ${product.description || ''}
- Type: ${product.product_type || ''}
- Catégorie existante: ${product.category || ''}
- Vendor: ${product.vendor || ''}

INSTRUCTIONS:
Analyse le produit et fournis les informations suivantes:

ATTRIBUTS VISUELS:
1. ai_color: Couleur principale (ex: "noir", "blanc", "bois naturel")
2. ai_material: Matériau principal (ex: "bois", "métal", "verre", "tissu")
3. ai_shape: Forme (ex: "rectangulaire", "rond", "carré")
4. ai_texture: Texture (ex: "lisse", "rugueux", "mat")
5. ai_pattern: Motif si applicable (ex: "uni", "rayé", "fleuri")
6. ai_finish: Finition (ex: "vernis", "mat", "brillant")
7. ai_design_elements: Éléments de design notables

ANALYSE VISION (estime basé sur description):
8. ai_vision_analysis: Analyse détaillée du produit (2-3 phrases)
9. ai_presentation_quality: Note de qualité de présentation /10
10. ai_craftsmanship_level: Niveau d'artisanat ("standard", "premium", "luxe")
11. ai_lighting_type: Type d'éclairage apparent ("naturel", "studio", "mixte")
12. ai_background_style: Style du fond ("neutre", "contextualisé", "lifestyle")
13. ai_condition_notes: Notes sur l'état si mentionné

DIMENSIONS (estime des dimensions typiques pour ce type de produit):
14. smart_length, smart_length_unit: Longueur (cm ou m)
15. smart_width, smart_width_unit: Largeur
16. smart_height, smart_height_unit: Hauteur
17. smart_diameter, smart_diameter_unit: Diamètre si applicable
18. smart_depth, smart_depth_unit: Profondeur si applicable
19. smart_weight, smart_weight_unit: Poids (kg)
20. smart_seat_height, smart_seat_height_unit: Hauteur d'assise si meuble

CATÉGORISATION:
21. category: Catégorie principale (ex: "Meuble", "Décoration")
22. sub_category: Sous-catégorie (ex: "Chaise", "Lampe")
23. style: Style (ex: "Moderne", "Vintage", "Industriel")
24. room: Pièce (ex: "Salon", "Chambre", "Bureau")
25. functionality: Fonctionnalité principale
26. characteristics: Caractéristiques notables (string)

AUTRES:
27. chat_text: Description conversationnelle pour le chatbot (2-3 phrases naturelles)

Si une information n'est pas disponible ou applicable, utilise null.

Réponds UNIQUEMENT en JSON valide:
{
  "ai_color": "string ou null",
  "ai_material": "string ou null",
  "ai_shape": "string ou null",
  "ai_texture": "string ou null",
  "ai_pattern": "string ou null",
  "ai_finish": "string ou null",
  "ai_design_elements": "string ou null",
  "ai_vision_analysis": "string ou null",
  "ai_presentation_quality": 8,
  "ai_craftsmanship_level": "string ou null",
  "ai_lighting_type": "string ou null",
  "ai_background_style": "string ou null",
  "ai_condition_notes": "string ou null",
  "smart_length": 120,
  "smart_length_unit": "cm",
  "smart_width": 60,
  "smart_width_unit": "cm",
  "smart_height": 80,
  "smart_height_unit": "cm",
  "smart_diameter": null,
  "smart_diameter_unit": null,
  "smart_depth": 45,
  "smart_depth_unit": "cm",
  "smart_weight": 15.5,
  "smart_weight_unit": "kg",
  "smart_seat_height": null,
  "smart_seat_height_unit": null,
  "category": "string ou null",
  "sub_category": "string ou null",
  "style": "string ou null",
  "room": "string ou null",
  "functionality": "string ou null",
  "characteristics": "string ou null",
  "chat_text": "string ou null"
}`;

    console.log('🤖 Calling DeepSeek API for attribute detection...');
    
    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: 'Tu es un expert en analyse de produits e-commerce. Réponds UNIQUEMENT en JSON valide sans commentaires.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], 1500);

    console.log('✅ AI response received');

    const parsedData = parseAIResponse(aiResponse);

    if (!parsedData) {
      throw new Error('Failed to parse AI response');
    }

    console.log('📝 Parsed attributes:', parsedData);

    // PHASE 3: Try SERP search for similar products specs
    let serpData = null;
    let specsSource = 'estimated';
    let specsConfidence = 0.5;
    let serpVerified = false;

    try {
      console.log('🔍 Searching SERP for similar products...');
      const { data: serpResponse, error: serpError } = await supabase.functions.invoke(
        'search-similar-products-specs',
        {
          body: {
            productTitle: product.title,
            imageUrl: product.images?.[0]?.src,
            productType: parsedData.category,
          }
        }
      );

      if (!serpError && serpResponse && serpResponse.confidence > 0.7 && serpResponse.similarProducts?.length >= 3) {
        console.log('✅ SERP data verified with high confidence:', serpResponse.confidence);
        serpData = serpResponse;
        specsSource = 'serp';
        specsConfidence = serpResponse.confidence;
        serpVerified = true;

        // Override estimated dimensions with SERP data
        if (serpResponse.averageWeight) {
          const weightMatch = serpResponse.averageWeight.match(/^([\d.]+)(kg)?$/);
          if (weightMatch) {
            parsedData.smart_weight = parseFloat(weightMatch[1]);
            parsedData.smart_weight_unit = 'kg';
          }
        }

        if (serpResponse.averageDimensions?.length) {
          const lengthMatch = serpResponse.averageDimensions.length.match(/^([\d.]+)(cm)?$/);
          if (lengthMatch) {
            parsedData.smart_length = parseFloat(lengthMatch[1]);
            parsedData.smart_length_unit = 'cm';
          }
        }

        if (serpResponse.averageDimensions?.width) {
          const widthMatch = serpResponse.averageDimensions.width.match(/^([\d.]+)(cm)?$/);
          if (widthMatch) {
            parsedData.smart_width = parseFloat(widthMatch[1]);
            parsedData.smart_width_unit = 'cm';
          }
        }

        if (serpResponse.averageDimensions?.height) {
          const heightMatch = serpResponse.averageDimensions.height.match(/^([\d.]+)(cm)?$/);
          if (heightMatch) {
            parsedData.smart_height = parseFloat(heightMatch[1]);
            parsedData.smart_height_unit = 'cm';
          }
        }
      } else {
        console.log('⚠️ SERP search returned low confidence or insufficient data');
      }
    } catch (serpError) {
      console.warn('⚠️ SERP search failed, using estimated values:', serpError);
    }

    // Update ALL AI attributes and dimensions
    const { error: updateError } = await supabase
      .from('shopify_products')
      .update({
        // Visual attributes
        ai_color: parsedData.ai_color || null,
        ai_material: parsedData.ai_material || null,
        ai_shape: parsedData.ai_shape || null,
        ai_texture: parsedData.ai_texture || null,
        ai_pattern: parsedData.ai_pattern || null,
        ai_finish: parsedData.ai_finish || null,
        ai_design_elements: parsedData.ai_design_elements || null,
        
        // Vision AI analysis
        ai_vision_analysis: parsedData.ai_vision_analysis || null,
        ai_vision_model: 'deepseek-chat',
        ai_vision_timestamp: new Date().toISOString(),
        ai_vision_confidence: parsedData.ai_presentation_quality ? parsedData.ai_presentation_quality * 10 : 80,
        ai_presentation_quality: parsedData.ai_presentation_quality || null,
        ai_craftsmanship_level: parsedData.ai_craftsmanship_level || null,
        ai_lighting_type: parsedData.ai_lighting_type || null,
        ai_background_style: parsedData.ai_background_style || null,
        ai_condition_notes: parsedData.ai_condition_notes || null,
        
        // Dimensions (potentially updated by SERP)
        smart_length: parsedData.smart_length || null,
        smart_length_unit: parsedData.smart_length_unit || null,
        smart_width: parsedData.smart_width || null,
        smart_width_unit: parsedData.smart_width_unit || null,
        smart_height: parsedData.smart_height || null,
        smart_height_unit: parsedData.smart_height_unit || null,
        smart_diameter: parsedData.smart_diameter || null,
        smart_diameter_unit: parsedData.smart_diameter_unit || null,
        smart_depth: parsedData.smart_depth || null,
        smart_depth_unit: parsedData.smart_depth_unit || null,
        smart_weight: parsedData.smart_weight || null,
        smart_weight_unit: parsedData.smart_weight_unit || null,
        smart_seat_height: parsedData.smart_seat_height || null,
        smart_seat_height_unit: parsedData.smart_seat_height_unit || null,
        
        // Categorization
        category: parsedData.category || product.category || null,
        sub_category: parsedData.sub_category || null,
        style: parsedData.style || null,
        room: parsedData.room || null,
        functionality: parsedData.functionality || null,
        characteristics: parsedData.characteristics || null,
        
        // Chat text
        chat_text: parsedData.chat_text || null,
        
        // Status
        enrichment_status: 'enriched',
        last_enriched_at: new Date().toISOString(),
        optimization_count: (product.optimization_count || 0) + 1
      })
      .eq('id', productId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Product enriched successfully');

    // Increment usage counter
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'optimizations_count',
        p_increment: 1
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        attributes: parsedData
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in enrich-product:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
