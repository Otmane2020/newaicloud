import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartAltTextRequest {
  imageId: string;
  language?: string;
}

// Helper function to convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const imageId = body.imageId;
    const language = body.language || 'fr';

    if (!imageId) {
      throw new Error('Image ID is required');
    }

    console.log(`[SMART-ALT-TEXT] Processing image: ${imageId}`);

    // Fetch image and product data
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select(`
        id,
        src,
        alt_text,
        product_id,
        optimization_count
      `)
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !image) {
      throw new Error('Image not found');
    }

    // Fetch product with details
    const { data: product, error: productError } = await supabase
      .from('shopify_products')
      .select('id, title, seo_title, body_html, product_type, category, seller_id, store_id')
      .eq('id', image.product_id)
      .maybeSingle();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Get store language
    let storeLanguage = language;
    try {
      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('store_language')
        .eq('id', product.store_id)
        .maybeSingle();
      
      if (storeData?.store_language) {
        const detectedLang = storeData.store_language.split('-')[0].toLowerCase();
        storeLanguage = ['fr', 'en', 'es'].includes(detectedLang) ? detectedLang : language;
        console.log(`🌍 Using store language: ${storeLanguage}`);
      }
    } catch (error) {
      console.warn('Could not fetch store language:', error);
    }

    // Step 1: Analyze product context with DeepSeek
    console.log('[SMART-ALT-TEXT] Step 1: DeepSeek analysis');
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const deepseekPrompt = `Tu es un expert en analyse de produits e-commerce. Analyse ce produit et extrais les informations clés pour créer un texte ALT SEO optimal.

**Produit:**
Titre actuel: ${product.title}
Titre SEO: ${product.seo_title || 'Non défini'}
Type de produit: ${product.product_type || 'Non spécifié'}
Catégorie: ${product.category || 'Non spécifiée'}
Description HTML: ${product.body_html || 'Aucune description'}

**Instructions:**
1. Identifie la catégorie principale du produit (ex: "Table Basse", "Lampe", "Canapé")
2. Liste TOUS les matériaux mentionnés (ex: "Marbre", "Chrome", "Acier", "Verre")
3. Liste les couleurs principales mentionnées
4. Identifie les caractéristiques clés (ex: "Gigogne", "Réglable", "LED")
5. Note le style/design (ex: "Moderne", "Scandinave", "Industriel")
6. Identifie les dimensions si mentionnées

**IMPORTANT:** Sois précis et exhaustif. N'utilise JAMAIS de termes génériques comme "Unknown" ou "unspecified".

Retourne UNIQUEMENT un objet JSON avec ces champs:
{
  "category": "catégorie principale précise",
  "materials": ["matériau1", "matériau2", ...],
  "colors": ["couleur1", "couleur2", ...],
  "features": ["caractéristique1", "caractéristique2", ...],
  "style": "style design",
  "dimensions": "dimensions si mentionnées"
}`;

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: deepseekPrompt }],
        temperature: 0.3,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('[SMART-ALT-TEXT] DeepSeek error:', deepseekResponse.status, errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    
    if (!deepseekData.choices || !deepseekData.choices[0] || !deepseekData.choices[0].message) {
      console.error('[SMART-ALT-TEXT] Invalid DeepSeek response:', deepseekData);
      throw new Error('Invalid response from DeepSeek API');
    }

    const deepseekAnalysis = JSON.parse(
      deepseekData.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    );

    console.log('[SMART-ALT-TEXT] DeepSeek analysis:', deepseekAnalysis);

    // Step 2: Analyze image with Gemini Vision
    console.log('[SMART-ALT-TEXT] Step 2: Gemini Vision analysis');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    let visionAnalysis = null;

    if (geminiApiKey) {
      try {
        const imageResponse = await fetch(image.src);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = arrayBufferToBase64(imageBuffer);

        const visionPrompt = `Tu es un expert en analyse visuelle de produits e-commerce. Analyse cette image et décris PRÉCISÉMENT ce que tu vois.

**Titre du produit:** ${product.seo_title || product.title}

**Ta mission:** Décrire le produit avec des phrases COMPLÈTES et PRÉCISES.

**IMPORTANT - Éléments à analyser:**
1. **Couleurs visibles:** Quelles sont les couleurs principales et secondaires que tu vois ?
2. **Matériaux:** Quels matériaux sont visibles (marbre, métal, bois, verre, etc.) ?
3. **Structure:** Comment le produit est-il construit ? (monobloc, avec pieds, etc.)
4. **Piètement/Support:** Y a-t-il des pieds visibles ? Quelle couleur ? Quel matériau ?
5. **Finitions:** Quelles finitions vois-tu ? (mat, brillant, texture, etc.)
6. **Éléments décoratifs:** Y a-t-il des lignes, motifs ou ornements visibles ?
7. **Forme:** Quelle est la forme générale du produit ?

**Format de réponse attendu (en ${storeLanguage === 'fr' ? 'français' : 'anglais'}):**
Réponds avec des PHRASES COMPLÈTES séparées par des retours à la ligne:

Couleurs: [couleurs principales et secondaires visibles]
Matériaux: [matériaux visibles dans l'image]
Structure: [description de la construction]
Piètement: [description des pieds SI PRÉSENTS, sinon "Aucun"]
Finitions: [type de finition visible]
Décorations: [éléments décoratifs SI PRÉSENTS, sinon "Aucune"]
Forme: [forme générale]

**Exemple:**
Couleurs: Blanc cassé avec des lignes dorées
Matériaux: Marbre blanc avec finition brillante
Structure: Bloc monolithique sans structure apparente
Piètement: Aucun piètement visible
Finitions: Surface brillante et polie
Décorations: Lignes dorées de style Kintsugi qui traversent la surface
Forme: Rectangulaire arrondi`;

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: visionPrompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image,
                    },
                  },
                ],
              }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('[SMART-ALT-TEXT] Gemini Vision error:', geminiResponse.status, errorText);
          throw new Error(`Gemini Vision API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        visionAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;
        console.log('[SMART-ALT-TEXT] Vision analysis:', visionAnalysis);
      } catch (visionError) {
        console.error('[SMART-ALT-TEXT] Vision analysis failed:', visionError);
      }
    }

    // Step 3: Generate optimized ALT text with Google Gemini
    console.log('[SMART-ALT-TEXT] Step 3: Generate optimized ALT text');
    
    const altPrompt = `Tu es un expert en rédaction de textes ALT pour le SEO et l'accessibilité. Génère un texte ALT PRÉCIS et DESCRIPTIF.

**🖼️ ANALYSE VISUELLE GEMINI (SOURCE PRIORITAIRE - détails visuels précis):**
${visionAnalysis || 'Non disponible'}

**📝 Données complémentaires DeepSeek:**
- Catégorie: ${deepseekAnalysis.category}
- Matériaux mentionnés: ${deepseekAnalysis.materials?.join(', ')}
- Couleurs mentionnées: ${deepseekAnalysis.colors?.join(', ')}
- Style: ${deepseekAnalysis.style || 'N/A'}

**📌 Titre du produit:** ${product.seo_title || product.title}

**🎯 INSTRUCTIONS ULTRA PRÉCISES:**

1. **PRIORISE L'ANALYSE VISUELLE** qui te donne des informations précises sur:
   - Les couleurs RÉELLEMENT VISIBLES dans l'image
   - Les matériaux VISIBLES (pas juste mentionnés)
   - La structure et les éléments physiques présents
   - Les finitions et décorations observables

2. **DISTINGUE CLAIREMENT:**
   - **PIÈTEMENT** = structure porteuse (pieds métalliques, piètement, etc.)
     → Si l'analyse dit "Aucun" → NE PAS mentionner de pieds
   - **DÉCORATION** = éléments esthétiques (lignes dorées, motifs, etc.)
     → Mentionne-les s'ils sont visuellement significatifs

3. **STRUCTURE DU TEXTE ALT:**
   CATÉGORIE + COULEUR PRINCIPALE + MATÉRIAU + [PIÈTEMENT si présent] + [FINITION/DÉCORATION si notable]
   
   Exemples:
   - Avec piètement: "Table basse ovale blanche marbre piètement métal doré"
   - Monobloc avec décor: "Table basse rectangulaire blanche marbre lignes dorées kintsugi"
   - Simple: "Lampe de table noire métal finition mate"

4. **RÈGLES STRICTES:**
   - Maximum 70 caractères
   - Minuscules sauf première lettre
   - Pas de virgules, pas de tirets
   - ${storeLanguage === 'fr' ? 'FRANÇAIS UNIQUEMENT' : 'ENGLISH ONLY'}
   - Ordre: "marbre blanc" jamais "blanc marbre"
   - Concis mais descriptif
   - Accessible pour les lecteurs d'écran

**⚡ GÉNÈRE LE TEXTE ALT (SEULEMENT LE TEXTE ALT):**`;

    const geminiAltResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: altPrompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 80,
          }
        })
      }
    );

    if (!geminiAltResponse.ok) {
      const errorText = await geminiAltResponse.text();
      console.error('[SMART-ALT-TEXT] Google Gemini error:', geminiAltResponse.status, errorText);
      throw new Error(`Google Gemini error: ${geminiAltResponse.status}`);
    }

    const geminiAltData = await geminiAltResponse.json();
    console.log('[SMART-ALT-TEXT] Google Gemini response:', JSON.stringify(geminiAltData));
    
    if (!geminiAltData.candidates || !geminiAltData.candidates[0] || !geminiAltData.candidates[0].content) {
      console.error('[SMART-ALT-TEXT] Invalid Google Gemini response structure:', geminiAltData);
      throw new Error('Invalid response from Google Gemini');
    }

    let altText = geminiAltData.candidates[0].content.parts[0].text.trim()
      .replace(/^["']|["']$/g, '');
    
    // Si le texte ALT dépasse 70 caractères, couper au dernier mot complet
    if (altText.length > 70) {
      const truncated = altText.slice(0, 70);
      const lastSpace = truncated.lastIndexOf(' ');
      altText = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    }

    console.log('[SMART-ALT-TEXT] Optimized ALT text:', altText);

    // Update database
    const { error: updateError } = await supabase
      .from('product_images')
      .update({ 
        alt_text: altText,
        optimization_count: (image.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId);

    if (updateError) {
      console.error('[SMART-ALT-TEXT] Database error updating ALT text:', updateError);
      throw new Error('Failed to update ALT text');
    }

    // Track usage
    await supabase.rpc('increment_usage', {
      p_seller_id: product.seller_id,
      p_field: 'optimizations_count',
      p_increment: 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageId: imageId,
        alt_text: altText,
        deepseekAnalysis,
        visionAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SMART-ALT-TEXT] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
