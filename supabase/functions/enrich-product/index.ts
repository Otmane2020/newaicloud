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

    // ============ PHASE 0: CHECK EXISTING DIMENSIONS (HIGHEST PRIORITY) ============
    console.log('🔍 Phase 0: Checking for existing product dimensions...');
    let existingDimensions: any = {};
    let hasExistingDims = false;

    // Check if dimensions already exist in the product
    if (product.smart_length || product.smart_width || product.smart_height || 
        product.smart_diameter || product.smart_depth || product.smart_weight || 
        product.smart_seat_height) {
      console.log('✅ Found existing dimensions in product');
      existingDimensions = {
        length: product.smart_length,
        length_unit: product.smart_length_unit,
        width: product.smart_width,
        width_unit: product.smart_width_unit,
        height: product.smart_height,
        height_unit: product.smart_height_unit,
        diameter: product.smart_diameter,
        diameter_unit: product.smart_diameter_unit,
        depth: product.smart_depth,
        depth_unit: product.smart_depth_unit,
        weight: product.smart_weight,
        weight_unit: product.smart_weight_unit,
        seat_height: product.smart_seat_height,
        seat_height_unit: product.smart_seat_height_unit,
      };
      hasExistingDims = true;
    } else {
      console.log('ℹ️ No existing dimensions found');
    }

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

    // ============ PHASE 1: VISION AI ANALYSIS (SECOND PRIORITY) ============
    console.log('🎨 Phase 1: Vision AI analysis starting...');
    let visionAttributes: any = null;
    let visionConfidence = 0;

    // Fetch product images
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('src, position, alt_text')
      .eq('product_id', productId)
      .order('position', { ascending: true })
      .limit(3);

    if (images && images.length > 0) {
      console.log(`📸 Found ${images.length} images, analyzing with Gemini Vision...`);
      
      // Analyze up to 6 images (technical schemas are often in later positions)
      const maxImages = Math.min(images.length, 6);
      console.log(`📸 Analyzing ${maxImages} images for technical details...`);
      
      const imageAnalyses = [];
      for (let i = 0; i < maxImages; i++) {
        try {
          console.log(`🔍 Analyzing image ${i + 1}/${maxImages} with Vision AI...`);
          const { data: visionData, error: visionError } = await supabase.functions.invoke(
            'analyze-image-with-vision',
            {
              body: {
                imageUrl: images[i].src,
                productContext: {
                  title: product.title,
                  category: product.category,
                  type: product.product_type,
                }
              }
            }
          );

          if (!visionError && visionData?.visualAttributes) {
            imageAnalyses.push(visionData);
            console.log(`✅ Vision analysis ${i + 1} complete (confidence: ${visionData.confidence})`);
            
            // Early stopping: if we found a technical schema with complete dimensions, stop analyzing
            const hasTechDims = visionData?.visualContext?.hasTechnicalSchema && 
                               visionData?.technicalDimensions &&
                               Object.keys(visionData.technicalDimensions).length >= 3;
            
            if (hasTechDims) {
              console.log(`✅ Technical schema with complete dimensions found in image ${i + 1}, stopping analysis`);
              break;
            }
          } else {
            console.warn(`⚠️ Vision analysis ${i + 1} failed:`, visionError);
          }
        } catch (visionErr) {
          console.warn(`⚠️ Vision analysis ${i + 1} error:`, visionErr);
        }
      }

      // Merge vision data from all analyzed images (prioritize first image for main attributes)
      if (imageAnalyses.length > 0) {
        visionAttributes = imageAnalyses[0].visualAttributes;
        visionConfidence = imageAnalyses[0].confidence || 0.5;

        // Merge technical dimensions from all images (take the first non-null value)
        const allTechDims = imageAnalyses
          .map((a: any) => a.visualAttributes?.technicalDimensions)
          .filter((d: any) => d && Object.keys(d).length > 0);
        
        if (allTechDims.length > 0) {
          visionAttributes.technicalDimensions = allTechDims[0];
        }

        // Aggregate materials from all images
        const allMaterials = imageAnalyses
          .flatMap((a: any) => a.visualAttributes?.materials || [])
          .filter((m: string, i: number, arr: string[]) => arr.indexOf(m) === i);
        
        if (allMaterials.length > 0) {
          visionAttributes.materials = allMaterials;
        }

        console.log('✅ Vision AI analysis completed:', visionAttributes);
      } else {
        console.log('⏭️ No successful vision analyses');
      }
    } else {
      console.log('⏭️ No product images found, skipping Vision AI');
    }

    // ============ PHASE 2: DEEPSEEK AI COMPLETION (FILLS REMAINING GAPS) ============
    console.log('🤖 Phase 2: DeepSeek AI completing missing attributes...');

    // Build prompt that includes vision data and asks DeepSeek to ONLY fill gaps
    const visionDataSummary = visionAttributes ? `
DONNÉES VISION AI DISPONIBLES (NE PAS REMPLACER):
- Couleurs: ${visionAttributes.primaryColor || 'non détecté'}, ${(visionAttributes.secondaryColors || []).join(', ')}
- Matériaux: ${(visionAttributes.materials || []).join(', ') || 'non détecté'}
- Style: ${visionAttributes.style || 'non détecté'}
- Finition: ${visionAttributes.finish || 'non détecté'}
- Dimensions visibles: ${JSON.stringify(visionAttributes.technicalDimensions || {})}
` : 'AUCUNE DONNÉE VISION AI DISPONIBLE';

    const prompt = `
Tu es un expert en analyse de produits e-commerce. Analyse ce produit et extrait les attributs MANQUANTS.

${visionDataSummary}

PRODUIT:
- Titre: ${product.title || ''}
- Description: ${product.description || ''}
- Type: ${product.product_type || ''}
- Catégorie existante: ${product.category || ''}
- Vendor: ${product.vendor || ''}

INSTRUCTIONS CRITIQUES:
1. NE REMPLACE PAS les données Vision AI si elles existent
2. Complète UNIQUEMENT les attributs manquants ou null
3. Si Vision AI a détecté des matériaux/couleurs, ne les change pas
4. Pour les dimensions: SI Vision AI n'a PAS de technicalDimensions, estime des dimensions typiques
5. Si Vision AI a un poids visible, NE L'ESTIME PAS

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
9. ai_presentation_quality: Note de qualité de présentation entre 0 et 1 (ex: 0.8 pour bonne qualité)
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

    // PHASE 3: SERP search for similar products specs (ONLY IF VISION AI FAILED)
    let serpData = null;
    let specsSource = 'estimated';
    let specsConfidence = 0.5;
    let serpVerified = false;
    
    // Separate object for SERP dimensions (to avoid mixing with parsedData)
    const serpDimensions = {
      weight: null as number | null,
      weight_unit: null as string | null,
      length: null as number | null,
      length_unit: null as string | null,
      width: null as number | null,
      width_unit: null as string | null,
      height: null as number | null,
      height_unit: null as string | null,
      depth: null as number | null,
      depth_unit: null as string | null,
    };

    // Only use SERP if Vision AI didn't provide sufficient data
    const hasVisionDimensions = visionAttributes?.technicalDimensions && 
      Object.keys(visionAttributes.technicalDimensions).length > 0;
    const hasVisionMaterials = visionAttributes?.materials?.length > 0;
    const hasVisionColors = visionAttributes?.primaryColor || visionAttributes?.secondaryColors?.length > 0;

    if (!hasVisionDimensions && !hasVisionMaterials && !hasVisionColors) {
      try {
        console.log('🔍 Vision AI incomplete, searching SERP for similar products...');
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

          // Extract SERP dimensions into dedicated object
          if (serpResponse.averageWeight) {
            const weightMatch = serpResponse.averageWeight.match(/^([\d.]+)(kg)?$/);
            if (weightMatch) {
              serpDimensions.weight = parseFloat(weightMatch[1]);
              serpDimensions.weight_unit = 'kg';
            }
          }

          if (serpResponse.averageDimensions?.length) {
            const lengthMatch = serpResponse.averageDimensions.length.match(/^([\d.]+)(cm)?$/);
            if (lengthMatch) {
              serpDimensions.length = parseFloat(lengthMatch[1]);
              serpDimensions.length_unit = 'cm';
            }
          }

          if (serpResponse.averageDimensions?.width) {
            const widthMatch = serpResponse.averageDimensions.width.match(/^([\d.]+)(cm)?$/);
            if (widthMatch) {
              serpDimensions.width = parseFloat(widthMatch[1]);
              serpDimensions.width_unit = 'cm';
            }
          }

          if (serpResponse.averageDimensions?.height) {
            const heightMatch = serpResponse.averageDimensions.height.match(/^([\d.]+)(cm)?$/);
            if (heightMatch) {
              serpDimensions.height = parseFloat(heightMatch[1]);
              serpDimensions.height_unit = 'cm';
            }
          }

          if (serpResponse.averageDimensions?.depth) {
            const depthMatch = serpResponse.averageDimensions.depth.match(/^([\d.]+)(cm)?$/);
            if (depthMatch) {
              serpDimensions.depth = parseFloat(depthMatch[1]);
              serpDimensions.depth_unit = 'cm';
            }
          }
        } else {
          console.log('⚠️ SERP search returned low confidence or insufficient data');
        }
      } catch (serpError) {
        console.warn('⚠️ SERP search failed, using estimated values:', serpError);
      }
    } else {
      console.log('✅ Vision AI provided sufficient data, skipping SERP search');
    }

    // Update ALL AI attributes and dimensions
    const { error: updateError } = await supabase
      .from('shopify_products')
      .update({
        // Vision AI attributes (HIGHEST PRIORITY)
        vision_attributes: visionAttributes || null,
        vision_timestamp: visionAttributes ? new Date().toISOString() : null,
        vision_model: visionAttributes ? 'google/gemini-2.5-flash' : null,
        
        // Visual attributes (from DeepSeek, unless overridden by Vision)
        ai_color: visionAttributes?.primaryColor || parsedData.ai_color || null,
        ai_material: visionAttributes?.materials?.join(', ') || parsedData.ai_material || null,
        ai_shape: parsedData.ai_shape || null,
        ai_texture: visionAttributes?.texture || parsedData.ai_texture || null,
        ai_pattern: parsedData.ai_pattern || null,
        ai_finish: visionAttributes?.finish || parsedData.ai_finish || null,
        ai_design_elements: parsedData.ai_design_elements || null,
        
        // Vision AI analysis
        ai_vision_analysis: parsedData.ai_vision_analysis || null,
        ai_vision_model: 'deepseek-chat',
        ai_vision_timestamp: new Date().toISOString(),
        ai_vision_confidence: visionConfidence > 0
          ? Math.min(visionConfidence, 1)
          : (parsedData.ai_presentation_quality
              ? Math.min(parsedData.ai_presentation_quality, 1)
              : 0.8),
        ai_presentation_quality: parsedData.ai_presentation_quality ? Math.min(parsedData.ai_presentation_quality, 1) : null,
        ai_craftsmanship_level: parsedData.ai_craftsmanship_level || null,
        ai_lighting_type: parsedData.ai_lighting_type || null,
        ai_background_style: parsedData.ai_background_style || null,
        ai_condition_notes: parsedData.ai_condition_notes || null,
        
        // Dimensions - PRIORITY ORDER: Existing > Vision > SERP > Estimated
        smart_length: existingDimensions.length || 
                      (visionAttributes?.technicalDimensions?.length ?? null) || 
                      serpDimensions.length ||
                      parsedData.smart_length || null,
        smart_length_unit: existingDimensions.length_unit || 
                          (visionAttributes?.technicalDimensions?.lengthUnit ?? null) || 
                          serpDimensions.length_unit ||
                          parsedData.smart_length_unit || null,
        smart_width: existingDimensions.width || 
                     (visionAttributes?.technicalDimensions?.width ?? null) || 
                     serpDimensions.width ||
                     parsedData.smart_width || null,
        smart_width_unit: existingDimensions.width_unit || 
                         (visionAttributes?.technicalDimensions?.widthUnit ?? null) || 
                         serpDimensions.width_unit ||
                         parsedData.smart_width_unit || null,
        smart_height: existingDimensions.height || 
                      (visionAttributes?.technicalDimensions?.height ?? null) || 
                      serpDimensions.height ||
                      parsedData.smart_height || null,
        smart_height_unit: existingDimensions.height_unit || 
                          (visionAttributes?.technicalDimensions?.heightUnit ?? null) || 
                          serpDimensions.height_unit ||
                          parsedData.smart_height_unit || null,
        smart_diameter: existingDimensions.diameter || 
                        (visionAttributes?.technicalDimensions?.diameter ?? null) || 
                        parsedData.smart_diameter || null,
        smart_diameter_unit: existingDimensions.diameter_unit || 
                            (visionAttributes?.technicalDimensions?.diameterUnit ?? null) || 
                            parsedData.smart_diameter_unit || null,
        smart_depth: existingDimensions.depth || 
                     (visionAttributes?.technicalDimensions?.depth ?? null) || 
                     serpDimensions.depth ||
                     parsedData.smart_depth || null,
        smart_depth_unit: existingDimensions.depth_unit || 
                         (visionAttributes?.technicalDimensions?.depthUnit ?? null) || 
                         serpDimensions.depth_unit ||
                         parsedData.smart_depth_unit || null,
        smart_weight: existingDimensions.weight || 
                      (visionAttributes?.technicalDimensions?.weight ?? null) || 
                      serpDimensions.weight ||
                      parsedData.smart_weight || null,
        smart_weight_unit: existingDimensions.weight_unit || 
                          (visionAttributes?.technicalDimensions?.weightUnit ?? null) || 
                          serpDimensions.weight_unit ||
                          parsedData.smart_weight_unit || null,
        smart_seat_height: existingDimensions.seat_height || 
                          (visionAttributes?.technicalDimensions?.seatHeight ?? null) || 
                          parsedData.smart_seat_height || null,
        smart_seat_height_unit: existingDimensions.seat_height_unit || 
                               (visionAttributes?.technicalDimensions?.seatHeightUnit ?? null) || 
                               parsedData.smart_seat_height_unit || null,
        
        // SERP tracking - PRIORITY ORDER: product_description > vision > serp > estimated
        specs_source: hasExistingDims ? 'product_description' : 
                     (visionAttributes?.technicalDimensions && Object.keys(visionAttributes.technicalDimensions).length > 0) ? 'vision' :
                     (serpDimensions.length || serpDimensions.width || serpDimensions.height || serpDimensions.weight || serpDimensions.depth) ? 'serp' : 
                     'estimated',
        specs_confidence: hasExistingDims ? 1 : 
                         (visionAttributes?.technicalDimensions && Object.keys(visionAttributes.technicalDimensions).length > 0) ? 
                           Math.min(visionConfidence || 0.9, 1) :
                         (serpDimensions.length || serpDimensions.width || serpDimensions.height || serpDimensions.weight || serpDimensions.depth) ? 0.75 :
                         0.5,
        serp_verified: serpVerified,
        serp_data: serpData || null,
        
        // Categorization
        category: parsedData.category || product.category || null,
        sub_category: parsedData.sub_category || null,
        style: visionAttributes?.style || parsedData.style || null,
        room: visionAttributes?.room || parsedData.room || null,
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
