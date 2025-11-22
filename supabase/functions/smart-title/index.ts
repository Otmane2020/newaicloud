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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { productId, language = 'fr' }: SmartTitleRequest = await req.json();

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

        const visionPrompt = `Tu es un expert en analyse de produits pour l'e-commerce. Analyse cette image de produit et extrais UNIQUEMENT les informations clés pour créer un titre de produit optimisé.

**Titre actuel du produit:** ${product.title}

**Instructions CRITIQUES:**
Identifie et liste en format court (mots-clés séparés par des virgules):
1. **Catégorie exacte** (ex: Table Basse, Lampe, Vase, Chaise)
2. **Matériaux visibles** (ex: Marbre Blanc, Chrome, Verre, Bois)
3. **Couleurs principales** (ex: Blanc, Noir, Doré, Argent)
4. **Style/Design** (ex: Moderne, Scandinave, Industriel, Art Déco)
5. **Caractéristiques uniques** (ex: Gigogne, Piètement Ajouré, LED, Réglable)
6. **Forme** (ex: Ronde, Rectangulaire, Ovale)

**Format de réponse (SEULEMENT mots-clés):**
Réponds en ${language === 'fr' ? 'français' : 'anglais'} avec un format simple comme:
"Catégorie: XXX, Matériaux: XXX XXX, Couleurs: XXX XXX, Style: XXX, Caractéristiques: XXX XXX, Forme: XXX"

Sois concis, précis et concentre-toi sur ce qui rendra le titre vendeur.`;

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

**🖼️ ANALYSE VISUELLE GEMINI (SOURCE PRIORITAIRE):**
${visionAnalysis || 'Non disponible'}

**📝 Données complémentaires DeepSeek:**
- Catégorie: ${deepseekAnalysis.category}
- Matériaux: ${deepseekAnalysis.materials?.join(', ')}
- Style: ${deepseekAnalysis.style || 'N/A'}

**📌 Titre actuel:** ${product.title}

**🎯 INSTRUCTIONS ULTRA PRÉCISES - EXTRAIS TOUT:**

1. **DE L'ANALYSE VISUELLE, EXTRAIS ET UTILISE:**
   - CATÉGORIE exacte (Table Basse, Meuble TV, Console...)
   - TOUTES les COULEURS visibles (Blanc, Bleu Marine, Doré...)
   - TOUS les MATÉRIAUX distincts du corps ET des pieds (Bois Laqué Blanc + Métal Doré, Marbre Blanc + Chrome...)
   - TYPE de PIÈTEMENT si distinctif (Piètement Conique Doré, Pieds Chromés Ajourés, Piètement Hexagonal...)
   - CARACTÉRISTIQUES physiques (Gigogne, Niches Rangement, Compartiments...)
   - STYLE design (Moderne, Scandinave, Industriel, Art Déco...)

2. **STRUCTURE ENRICHIE (utilise TOUS les éléments visuels):**
   CATÉGORIE + COULEUR CORPS + MATÉRIAU CORPS + PIÈTEMENT/PIEDS + CARACTÉRISTIQUE + STYLE
   
   Exemple: "Table Basse Blanc Bois Laqué Pieds Métal Doré Coniques Niches Moderne"

3. **EXEMPLES DE TITRES RICHES:**
   - Vision: "Blanc, Bois Laqué, Pieds Métal Doré Coniques, Niches" → "Table Basse Blanche Bois Laqué Piètement Métal Doré Conique Rangement Moderne"
   - Vision: "Bleu Marine, Laminé, Pieds Métal Doré" → "Table Basse Bleu Marine Laminé Pieds Métal Doré Moderne"
   - Vision: "Marbre Blanc, Piètement Chromé Ajouré Hexagonal" → "Table Basse Marbre Blanc Piètement Chromé Ajouré Hexagonal Moderne"

4. **RÈGLES STRICTES:**
   - Maximum 80 caractères (pour permettre plus de détails)
   - Majuscule à chaque mot important
   - Espaces uniquement (PAS de virgules)
   - ${language === 'fr' ? 'En FRANÇAIS' : 'In ENGLISH'}
   - Inclus OBLIGATOIREMENT: Couleur + Matériau Corps + Type Piètement si visible
   - Ne sacrifie AUCUN détail visuel important

**⚡ GÉNÈRE LE TITRE RICHE (SEULEMENT LE TITRE):**`;

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

    const optimizedTitle = geminiTitleData.candidates[0].content.parts[0].text.trim()
      .replace(/^["']|["']$/g, '')
      .slice(0, 60);

    console.log('[SMART-TITLE] Optimized title:', optimizedTitle);

    // Track usage
    await supabase.rpc('increment_usage', {
      p_seller_id: user.id,
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
