import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartTitleRequest {
  productId: string;
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

    // Get user from auth header or request body (for internal calls)
    const authHeader = req.headers.get('Authorization');
    let userId: string;
    const requestBody = await req.json();
    const { productId, language = 'fr', userId: bodyUserId } = requestBody as SmartTitleRequest & { userId?: string };

    // Check if this is an internal call with service role key
    if (authHeader?.includes('service_role')) {
      // Internal call from another edge function
      if (!bodyUserId) {
        throw new Error('userId required for internal calls');
      }
      userId = bodyUserId;
      console.log('[SMART-TITLE] Internal call detected, using userId from body:', userId);
    } else {
      // External call - validate user token
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        throw new Error('Unauthorized');
      }
      userId = user.id;
      console.log('[SMART-TITLE] External call detected, using userId from token:', userId);
    }

    if (!productId) {
      throw new Error('Product ID is required');
    }

    console.log(`[SMART-TITLE] Processing product: ${productId}`);

    // Fetch product with images
    const { data: product, error: productError } = await supabase
      .from('shopify_products')
      .select(`
        *,
        product_images (
          id,
          src,
          position
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Step 1: Analyze title/description with DeepSeek
    console.log('[SMART-TITLE] Step 1: DeepSeek analysis');
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const deepseekPrompt = `Tu es un expert en analyse de produits e-commerce. Analyse en détail ce produit et extrais toutes les informations pertinentes pour créer un titre SEO optimal.

**Produit:**
Titre actuel: ${product.title}
Type de produit: ${product.product_type || 'Non spécifié'}
Description HTML: ${product.body_html || 'Aucune description'}

**Instructions:**
1. Identifie la catégorie principale du produit (ex: "Table Basse", "Lampe", "Canapé")
2. Liste TOUS les matériaux mentionnés ou visibles (ex: "Marbre", "Chrome", "Acier", "Verre")
3. Identifie les caractéristiques clés (ex: "Gigogne", "Réglable", "LED", "2 Places")
4. Note le style/design (ex: "Moderne", "Scandinave", "Industriel", "Art Déco")
5. Identifie les dimensions ou tailles si mentionnées
6. Liste les points de vente uniques (ex: "Piètement ajouré", "Plateau rotatif")

**IMPORTANT:** Sois très précis et exhaustif. N'utilise JAMAIS de termes génériques comme "Unknown", "unspecified", "placeholder". Si une information n'est pas claire, déduis-la du contexte.

Retourne UNIQUEMENT un objet JSON avec ces champs:
{
  "category": "catégorie principale précise",
  "materials": ["matériau1", "matériau2", ...],
  "features": ["caractéristique1", "caractéristique2", ...],
  "style": "style design",
  "dimensions": "dimensions si mentionnées",
  "use_case": "usage principal",
  "selling_points": ["point unique 1", "point unique 2", ...]
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
      console.error('[SMART-TITLE] DeepSeek error:', deepseekResponse.status, errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    
    if (!deepseekData.choices || !deepseekData.choices[0] || !deepseekData.choices[0].message) {
      console.error('[SMART-TITLE] Invalid DeepSeek response:', deepseekData);
      throw new Error('Invalid response from DeepSeek API');
    }

    const deepseekAnalysis = JSON.parse(
      deepseekData.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    );

    console.log('[SMART-TITLE] DeepSeek analysis:', deepseekAnalysis);

    // Step 2: Analyze images with Gemini Vision
    console.log('[SMART-TITLE] Step 2: Gemini Vision analysis');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const images = product.product_images || [];
    let visionAnalysis = null;

    if (images.length > 0 && geminiApiKey) {
      const primaryImage = images.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[0];
      
      try {
        const imageResponse = await fetch(primaryImage.src);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = arrayBufferToBase64(imageBuffer);

        const visionPrompt = `Tu es un expert en analyse de produits mobilier pour l'e-commerce. Analyse cette image de produit et décris PRÉCISÉMENT sa structure et ses matériaux.

**Titre actuel du produit:** ${product.title}

**Ta mission:** Décrire le produit avec des phrases COMPLÈTES et PRÉCISES qui expliquent sa construction.

**IMPORTANT - Structure du meuble:**
1. **Construction globale:** Est-ce un bloc monolithique (monobloc), ou a-t-il des pieds/piètement séparés ?
2. **Corps principal:** Quel matériau ? Quelle couleur ? (ex: "Le corps est en marbre blanc")
3. **Piètement/Support:** 
   - S'il y a des PIEDS MÉTALLIQUES ou structure porteuse visible → décris-les précisément (ex: "4 pieds coniques en métal doré", "piètement chromé ajouré")
   - S'il N'Y A PAS de pieds visibles (monobloc) → dis-le clairement (ex: "aucun piètement visible, c'est un bloc monolithique")
4. **Décorations/Finitions:** Lignes décoratives ? Motifs ? (ex: "des lignes dorées de style Kintsugi parcourent la surface")
5. **Forme générale:** Ronde, rectangulaire, ovale ?
6. **Style:** Moderne, Art Déco, Scandinave, etc.

**Format de réponse attendu (en ${language === 'fr' ? 'français' : 'anglais'}):**
Réponds avec des PHRASES COMPLÈTES séparées par des retours à la ligne:

Catégorie: [catégorie précise]
Construction: [monobloc OU structure avec pieds - sois explicite]
Corps: [matériau + couleur du corps principal]
Piètement: [description détaillée des pieds SI PRÉSENTS, sinon écrire "Aucun - monobloc"]
Décorations: [éléments décoratifs visibles comme lignes dorées, motifs, etc.]
Forme: [forme du plateau/surface]
Style: [style design]

**Exemple pour table monobloc avec décor doré:**
Catégorie: Table Basse
Construction: Bloc monolithique sans pieds visibles
Corps: Marbre blanc avec finition brillante
Piètement: Aucun - monobloc
Décorations: Lignes dorées de style Kintsugi qui traversent la surface du marbre
Forme: Rectangulaire
Style: Moderne, Luxueux, Design Kintsugi`;

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
          console.error('[SMART-TITLE] Gemini Vision error:', geminiResponse.status, errorText);
          throw new Error(`Gemini Vision API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        visionAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;
        console.log('[SMART-TITLE] Vision analysis:', visionAnalysis);
      } catch (visionError) {
        console.error('[SMART-TITLE] Vision analysis failed:', visionError);
      }
    }

    // Step 3: Generate optimized title with Google Gemini
    console.log('[SMART-TITLE] Step 3: Generate optimized title');
    
    const titlePrompt = `Tu es un expert en rédaction de titres SEO pour l'e-commerce. Génère un titre ULTRA RICHE ET PRÉCIS.

**🖼️ ANALYSE VISUELLE GEMINI (SOURCE PRIORITAIRE - phrases détaillées):**
${visionAnalysis || 'Non disponible'}

**📝 Données complémentaires DeepSeek:**
- Catégorie: ${deepseekAnalysis.category}
- Matériaux: ${deepseekAnalysis.materials?.join(', ')}
- Style: ${deepseekAnalysis.style || 'N/A'}

**📌 Titre actuel:** ${product.title}

**🎯 INSTRUCTIONS ULTRA PRÉCISES:**

1. **LIS ATTENTIVEMENT L'ANALYSE VISUELLE** qui te donne des phrases complètes sur:
   - La construction (monobloc ou avec piètement)
   - Le corps (matériau + couleur)
   - Le piètement (présent ou absent)
   - Les décorations (lignes dorées, motifs, etc.)

2. **DISTINGUE CLAIREMENT:**
   - **PIÈTEMENT** = structure porteuse visible (pieds métalliques, piètement chromé, etc.)
     → Si l'analyse dit "Aucun - monobloc" ou "pas de pieds visibles" → NE PAS mentionner de piètement
   - **DÉCORATION** = éléments esthétiques (lignes dorées, motif Kintsugi, etc.)
     → Utilise "Design Kintsugi", "Lignes Dorées", "Motif Géométrique"

3. **STRUCTURE DU TITRE:**
   CATÉGORIE + FORME + COULEUR + MATÉRIAU + [PIÈTEMENT si présent] + [DÉCORATION si notable] + STYLE
   
   Exemples:
   - Avec piètement: "Table Basse Ovale Blanche Marbre Piètement Métal Doré Moderne"
   - Monobloc avec décor: "Table Basse Rectangulaire Blanche Marbre Design Kintsugi Doré Moderne"

4. **RÈGLES STRICTES:**
   - Maximum 80 caractères
   - Majuscule à chaque mot important
   - Espaces uniquement (PAS de virgules)
   - ${language === 'fr' ? 'FRANÇAIS UNIQUEMENT (ex: "Moderne" pas "Modern")' : 'ENGLISH ONLY'}
   - Ordre matériau: "Marbre Blanc" jamais "Blanc Marbre"
   - Ne sacrifie AUCUN détail visuel important

**⚡ GÉNÈRE LE TITRE (SEULEMENT LE TITRE):**`;

    const geminiTitleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: titlePrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          }
        })
      }
    );

    if (!geminiTitleResponse.ok) {
      const errorText = await geminiTitleResponse.text();
      console.error('[SMART-TITLE] Google Gemini error:', geminiTitleResponse.status, errorText);
      throw new Error(`Google Gemini error: ${geminiTitleResponse.status}`);
    }

    const geminiTitleData = await geminiTitleResponse.json();
    console.log('[SMART-TITLE] Google Gemini response:', JSON.stringify(geminiTitleData));
    
    if (!geminiTitleData.candidates || !geminiTitleData.candidates[0] || !geminiTitleData.candidates[0].content) {
      console.error('[SMART-TITLE] Invalid Google Gemini response structure:', geminiTitleData);
      throw new Error('Invalid response from Google Gemini');
    }

    let optimizedTitle = geminiTitleData.candidates[0].content.parts[0].text.trim()
      .replace(/^["']|["']$/g, '');
    
    // Si le titre dépasse 80 caractères, couper au dernier mot complet
    if (optimizedTitle.length > 80) {
      const truncated = optimizedTitle.slice(0, 80);
      const lastSpace = truncated.lastIndexOf(' ');
      optimizedTitle = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    }

    console.log('[SMART-TITLE] Optimized title:', optimizedTitle);

    // Track usage
    await supabase.rpc('increment_usage', {
      p_seller_id: userId,
      p_field: 'optimizations_count',
      p_increment: 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        productId: productId,
        originalTitle: product.title,
        optimizedTitle,
        deepseekAnalysis,
        visionAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SMART-TITLE] Error:', error);
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
