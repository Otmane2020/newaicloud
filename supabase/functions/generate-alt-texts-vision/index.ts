import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextVisionRequest {
  imageId: string;
  imageType?: 'product' | 'content';
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  
  // Pattern 1: ```json\n{...}\n```
  const jsonBlockMatch = cleaned.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  // Pattern 2: ```{...}```
  const codeBlockMatch = cleaned.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Pattern 3: Remove backticks
  return cleaned.replace(/^```json?\s*|\s*```$/g, '').trim();
}

// Extract the main product name intelligently from full title
function extractProductName(title: string): string {
  // Clean title by taking part before first dash or comma
  let productName = title.split(/[-–—,]/)[0].trim();
  
  // Detect key product phrases to keep together
  const keyPhrases = [
    /canapé\s+d'angle/i,
    /table\s+basse/i,
    /meuble\s+tv/i,
    /lit\s+coffre/i,
    /buffet\s+bahut/i,
    /chaise\s+de\s+bureau/i
  ];
  
  // Check if we have a key phrase, keep it complete
  for (const phrase of keyPhrases) {
    if (phrase.test(productName)) {
      const words = productName.split(' ');
      // Keep up to 5 words for key phrases
      return words.slice(0, Math.min(5, words.length)).join(' ');
    }
  }
  
  // Default: limit to 4 words
  const words = productName.split(' ').filter(w => w.length > 0);
  if (words.length > 4) {
    productName = words.slice(0, 4).join(' ');
  }
  
  return productName;
}

// Normalize word to its stem (basic French stemming)
function getStem(word: string): string {
  const w = word.toLowerCase().trim();
  
  // Remove common French suffixes
  if (w.endsWith('aux')) return w.slice(0, -3) + 'al';
  if (w.endsWith('eaux')) return w.slice(0, -4) + 'eau';
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('ée')) return w.slice(0, -2) + 'é';
  if (w.endsWith('ées')) return w.slice(0, -3) + 'é';
  
  return w;
}

// Tokenize text into significant words
function tokenize(text: string): string[] {
  if (!text) return [];
  
  const stopWords = new Set([
    'avec', 'pour', 'dans', 'une', 'des', 'the', 'and', 'with', 'for', 'in', 'a', 'an', 'of',
    'le', 'la', 'les', 'un', 'de', 'du', 'en', 'ou', 'et', 'à', 'au', 'aux', 'ce', 'cette'
  ]);
  
  return text
    .toLowerCase()
    .split(/[\s,;:.!?()]+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

// Categorize words by semantic type
interface CategorizedWords {
  materials: string[];
  colors: string[];
  shapes: string[];
  styles: string[];
  others: string[];
}

function categorizeWords(words: string[]): CategorizedWords {
  const materialsSet = new Set([
    'bois', 'verre', 'métal', 'marbre', 'pierre', 'tissu', 'cuir', 'céramique', 
    'acier', 'fer', 'aluminium', 'plastique', 'résine', 'rotin', 'osier',
    'wood', 'glass', 'metal', 'marble', 'stone', 'fabric', 'leather', 'ceramic',
    'travertin', 'travertine', 'chêne', 'oak', 'noyer', 'walnut'
  ]);
  
  const colorsSet = new Set([
    'blanc', 'noir', 'beige', 'gris', 'marron', 'rouge', 'bleu', 'vert', 'jaune',
    'white', 'black', 'grey', 'gray', 'brown', 'red', 'blue', 'green', 'yellow',
    'transparent', 'translucide', 'opaque', 'clair', 'foncé', 'doré', 'argenté'
  ]);
  
  const shapesSet = new Set([
    'rectangulaire', 'carré', 'rond', 'ovale', 'circulaire', 'triangulaire',
    'rectangular', 'square', 'round', 'oval', 'circular', 'triangular',
    'arrondi', 'courbe', 'droit', 'angulaire'
  ]);
  
  const stylesSet = new Set([
    'moderne', 'scandinave', 'industriel', 'vintage', 'classique', 'contemporain',
    'modern', 'scandinavian', 'industrial', 'vintage', 'classic', 'contemporary',
    'minimaliste', 'rustique', 'élégant', 'design'
  ]);
  
  const result: CategorizedWords = {
    materials: [],
    colors: [],
    shapes: [],
    styles: [],
    others: []
  };
  
  for (const word of words) {
    const stem = getStem(word);
    if (materialsSet.has(stem)) result.materials.push(word);
    else if (colorsSet.has(stem)) result.colors.push(word);
    else if (shapesSet.has(stem)) result.shapes.push(word);
    else if (stylesSet.has(stem)) result.styles.push(word);
    else result.others.push(word);
  }
  
  return result;
}

// Build optimized alt-text with intelligent deduplication and structured phrase
function buildOptimizedAltText(
  productName: string,
  visualAnalysis: string,
  seoKeywords: string[] = [],
  maxWords: number = 15
): string {
  // Extract clean product name (no duplication later)
  const cleanProductName = extractProductName(productName);
  
  // Track used stems globally to prevent ANY repetition
  const usedStems = new Set<string>();
  
  // Mark product name stems as used first
  tokenize(cleanProductName).forEach(token => {
    usedStems.add(getStem(token));
  });
  
  // Collect unique tokens from SEO keywords
  const seoTokens: string[] = [];
  seoKeywords.flatMap(kw => tokenize(kw)).forEach(token => {
    const stem = getStem(token);
    if (!usedStems.has(stem)) {
      usedStems.add(stem);
      seoTokens.push(token);
    }
  });
  
  // Collect unique tokens from visual analysis
  const visualTokens: string[] = [];
  tokenize(visualAnalysis).forEach(token => {
    const stem = getStem(token);
    if (!usedStems.has(stem) && visualTokens.length < 8) {
      usedStems.add(stem);
      visualTokens.push(token);
    }
  });
  
  // Categorize all collected tokens
  const allTokens = [...seoTokens, ...visualTokens];
  const categorized = categorizeWords(allTokens);
  
  // Build language-neutral structured phrase
  const parts: string[] = [cleanProductName];
  
  // Add shapes (max 1)
  if (categorized.shapes.length > 0) {
    parts.push(categorized.shapes[0]);
  }
  
  // Add materials (max 2)
  if (categorized.materials.length > 0) {
    parts.push(...categorized.materials.slice(0, 2));
  }
  
  // Add colors (max 2)
  if (categorized.colors.length > 0) {
    parts.push(...categorized.colors.slice(0, 2));
  }
  
  // Add style (max 1)
  if (categorized.styles.length > 0) {
    parts.push(categorized.styles[0]);
  }
  
  // Add max 2 other significant descriptors
  if (categorized.others.length > 0) {
    parts.push(...categorized.others.slice(0, 2));
  }
  
  // Join with commas and clean up
  let altText = parts.join(', ');
  
  // Remove any accidental double spaces or double commas
  altText = altText.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
  
  // Ensure length constraints
  if (altText.length > 200) {
    altText = altText.substring(0, 197) + '...';
  }
  
  return altText;
}

function validateAltText(altText: string, productTitle?: string, minLength = 15, maxLength = 200): boolean {
  if (!altText || typeof altText !== 'string') {
    return false;
  }
  
  const trimmed = altText.trim();
  const wordCount = trimmed.split(' ').length;
  
  // Length check
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    console.warn('⚠️ ALT text length invalid:', trimmed.length);
    return false;
  }
  
  if (wordCount < 6 || wordCount > 16) {
    console.warn('⚠️ ALT text word count invalid:', wordCount);
    return false;
  }
  
  // Anti-copy check (allow product name but not full title)
  if (productTitle) {
    const productName = extractProductName(productTitle);
    const productNameWords = productName.toLowerCase().split(/\s+/);
    const altWords = trimmed.toLowerCase().split(/\s+/);
    
    // Check if product name is present (good!)
    const hasProductName = productNameWords.some(w => altWords.includes(w));
    
    // Check we didn't copy FULL title (>80% similarity = bad)
    const titleWords = productTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchingWords = titleWords.filter(w => altWords.includes(w));
    const matchRatio = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
    
    if (matchRatio > 0.8) {
      console.warn('⚠️ ALT text is too similar to full title:', matchRatio);
      return false;
    }
    
    if (!hasProductName) {
      console.warn('⚠️ ALT text should contain product name');
      // Just warn, don't reject
    }
  }
  
  return !altText.includes('```');
}

// Sleep utility for rate limiting
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Analyze title with DeepSeek to extract structured SEO data
async function analyzeTitle(productTitle: string) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    console.warn('DeepSeek API key not configured, using fallback analysis');
    return extractStructuredKeywords(productTitle);
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert SEO e-commerce. Tu analyses les titres produits et extrais les informations structurées pour optimiser le référencement.'
          },
          {
            role: 'user',
            content: `Analyse ce titre produit et extrais les informations structurées par catégories.

Titre: "${productTitle}"

Réponds UNIQUEMENT avec un JSON valide structuré :
{
  "materials": ["matériau1", "matériau2"],
  "colors": ["couleur1", "couleur2"],
  "style": ["style1"],
  "features": ["caractéristique1", "caractéristique2"],
  "product_type": "type de produit"
}

Consignes :
- Élimine les mots génériques comme "premium", "qualité", "top"
- Sois précis et concis
- N'invente rien, extrait seulement ce qui est explicitement mentionné`
          }
        ],
        temperature: 0.3,
        max_tokens: 250
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status);
      return extractStructuredKeywords(productTitle);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    try {
      const cleaned = cleanJsonResponse(content);
      const parsed = JSON.parse(cleaned);
      
      // Flatten structured data into keywords array for backward compatibility
      const keywords: string[] = [
        ...(parsed.materials || []),
        ...(parsed.colors || []),
        ...(parsed.style || []),
        ...(parsed.features || [])
      ].filter(k => k && k.length > 2);
      
      return {
        keywords,
        analysis: `Type: ${parsed.product_type || 'produit'}`,
        structured: parsed
      };
    } catch (e) {
      console.error('Failed to parse DeepSeek response:', content);
      return extractStructuredKeywords(productTitle);
    }
  } catch (error) {
    console.error('DeepSeek analysis error:', error);
    return extractStructuredKeywords(productTitle);
  }
}

// Fallback: extract structured keywords from title using regex
function extractStructuredKeywords(title: string): { keywords: string[]; analysis: string; structured?: any } {
  const keywords: string[] = [];
  const lowerTitle = title.toLowerCase();
  
  // Extract materials
  const materials = ['bois', 'verre', 'métal', 'marbre', 'pierre', 'tissu', 'cuir', 'céramique', 'travertin'];
  const foundMaterials = materials.filter(m => lowerTitle.includes(m));
  keywords.push(...foundMaterials);
  
  // Extract colors
  const colors = ['blanc', 'noir', 'beige', 'gris', 'marron', 'transparent'];
  const foundColors = colors.filter(c => lowerTitle.includes(c));
  keywords.push(...foundColors);
  
  // Extract styles
  const styles = ['moderne', 'scandinave', 'industriel', 'vintage', 'classique'];
  const foundStyles = styles.filter(s => lowerTitle.includes(s));
  keywords.push(...foundStyles);
  
  // Extract product type (first 2-3 words usually)
  const words = title.split(/\s+/).filter(w => w.length > 2);
  const productType = words.slice(0, 3).join(' ');
  
  // Add other significant words (> 3 chars, not stop words)
  const stopWords = ['avec', 'pour', 'dans', 'the', 'and', 'with'];
  const otherWords = words.filter(w => 
    w.length > 3 && 
    !stopWords.includes(w.toLowerCase()) &&
    !keywords.includes(w.toLowerCase())
  ).slice(0, 3);
  keywords.push(...otherWords);
  
  return {
    keywords,
    analysis: `Analyse automatique: ${productType}`,
    structured: {
      materials: foundMaterials,
      colors: foundColors,
      style: foundStyles,
      product_type: productType
    }
  };
}

// Analyze image with Vision AI (Gemini)
async function callVisionAI(imageUrl: string, retryCount = 0) {
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  console.log('🔍 Calling Vision AI with ZERO context (pure visual analysis)');
  console.log('📸 Image URL:', imageUrl.substring(0, 80) + '...');
  console.log('🚫 NO product context passed');
  console.log('🚫 NO keywords passed');

  // Check for placeholder URLs that won't work
  if (imageUrl.includes('placeholder.com') || imageUrl.includes('via.placeholder')) {
    throw new Error('Cannot analyze placeholder images. Please use real product images.');
  }

  // Convert image to base64 efficiently
  let base64Data: string;
  if (imageUrl.startsWith('data:')) {
    base64Data = imageUrl.split(',')[1];
  } else {
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...Array.from(chunk));
      }
      base64Data = btoa(binary);
    } catch (fetchError) {
      console.error('Image fetch error:', fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      throw new Error(`Cannot access image URL: ${imageUrl}. ${errorMsg}`);
    }
  }

  // Rate limiting: wait before making request
  const minDelayBetweenRequests = 6500; // 6.5s to stay under 10 req/min
  await sleep(minDelayBetweenRequests);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Tu es un expert en vision par ordinateur et en génération de textes ALT conformes aux standards Google d'accessibilité.

🎯 MISSION : Décris UNIQUEMENT ce qui est VISUELLEMENT présent dans cette image.

📸 RÈGLES STRICTES D'ANALYSE VISUELLE :
1. Analyse l'image comme si tu la voyais pour la première fois
2. Décris SEULEMENT les éléments visibles : formes, couleurs, matériaux apparents, angle de vue, composition
3. Maximum 12-16 mots pour l'ALT text
4. Ton factuel et neutre (comme un observateur neutre)
5. N'invente RIEN, ne suppose RIEN sur le produit complet ou son contexte
6. N'utilise AUCUNE information externe (tu ne connais pas le titre, la description, le contexte du produit)
7. Si tu vois un détail isolé (ex: pieds de meuble), décris SEULEMENT ce détail visible, pas l'objet complet
8. Évite tout langage marketing ou superlatif
9. Sois précis sur les matériaux visibles (métal, bois, tissu, pierre, verre, etc.)
10. Mentionne l'angle de vue si pertinent (gros plan, vue d'ensemble, détail, macro, etc.)

🔍 ÉLÉMENTS À OBSERVER :
- Formes et structures visibles
- Couleurs précises (noir, blanc, beige, gris, etc.)
- Matériaux identifiables visuellement
- Textures apparentes (lisse, mat, brillant, texturé, etc.)
- Angle de prise de vue
- Composition de l'image
- Détails distinctifs visibles

❌ EXEMPLES DE CE QU'IL NE FAUT PAS FAIRE :
Image montrant uniquement des pieds métalliques noirs :
❌ FAUX : "Table basse gigogne avec plateau en marbre et structure métallique noire"
✅ CORRECT : "Gros plan sur pieds en métal noir arrondis avec plateau blanc en arrière-plan"

Image montrant un détail de textile :
❌ FAUX : "Canapé d'angle scandinave 5 places en tissu beige"
✅ CORRECT : "Texture de tissu beige clair à trame visible"

✅ EXEMPLES CORRECTS :
"Plateau rectangulaire en pierre beige nervurée, surface polie"
"Structure métallique noire tubulaire, finition mate, vue en macro"
"Assemblage de planches de bois clair veiné, vue d'ensemble"
"Détail de textile gris chiné à mailles serrées"

📝 FORMAT DE RÉPONSE (JSON strict avec catégories) :
{
  "materials": ["matériau1", "matériau2"],
  "colors": ["couleur1", "couleur2"],
  "shapes": ["forme1"],
  "textures": ["texture1"],
  "view_angle": "type de vue (gros plan, vue d'ensemble, etc.)",
  "visual_description": "Description structurée en 12-16 mots des éléments visuels identifiables"
}

Maintenant, analyse cette image en suivant strictement ces règles et retourne un JSON structuré.`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // Handle rate limit (429) with retry
    if (response.status === 429 && retryCount < 3) {
      console.warn(`Rate limit hit (attempt ${retryCount + 1}/3), retrying...`);
      
      // Parse retry delay from error
      let retryDelaySeconds = 30;
      try {
        const errorData = JSON.parse(errorText);
        const retryInfo = errorData.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          retryDelaySeconds = parseInt(retryInfo.retryDelay.replace('s', '')) || 30;
        }
      } catch {}
      
      console.log(`Waiting ${retryDelaySeconds}s before retry...`);
      await sleep(retryDelaySeconds * 1000);
      
      // Retry with incremented count
      return callVisionAI(imageUrl, retryCount + 1);
    }
    
    throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract text from Gemini response format
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return { text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authorization header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageId, imageType = 'product' }: AltTextVisionRequest = await req.json();

    if (!imageId) {
      return new Response(
        JSON.stringify({ error: "Image ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check optimization limits using RPC
    const { data: checkResult, error: checkError } = await supabaseClient
      .rpc('check_optimization_allowed', {
        p_user_id: user.id,
        p_resource_type: 'image',
        p_resource_id: imageId,
        p_force: false
      });

    if (checkError) {
      console.error('Error checking optimization limits:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check optimization limits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkResult.allowed) {
      return new Response(
        JSON.stringify({
          error: checkResult.reason,
          message: checkResult.message
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get image info based on type
    let image: any;
    let imageError: any;
    
    if (imageType === 'content') {
      const result = await supabaseClient
        .from("content_images")
        .select("id, src, alt_text, content_type, content_id, user_id")
        .eq("id", imageId)
        .maybeSingle();
      
      image = result.data;
      imageError = result.error;
    } else {
      const result = await supabaseClient
        .from("product_images")
        .select("id, src, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();
      
      image = result.data;
      imageError = result.error;
    }

    if (imageError || !image) {
      console.error('Image not found:', imageError);
      return new Response(
        JSON.stringify({ error: "Image not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get context based on image type
    let productContext = "";
    let userId = image.user_id;
    let productTitle = "";
    let product: any = null; // Declare product outside conditional blocks
    let storeId: string | null = null; // Declare storeId early
    
    if (imageType === 'content') {
      // Get content context
      const contentType = image.content_type;
      const contentId = image.content_id;
      
      if (contentType === 'collection') {
        const { data: collection } = await supabaseClient
          .from("shopify_collections")
          .select("title, body_html")
          .eq("id", contentId)
          .maybeSingle();
        
        if (collection) {
          productTitle = collection.title;
          productContext = `Collection: ${collection.title}\n`;
          if (collection.body_html) {
            const shortDesc = collection.body_html.replace(/<[^>]*>/g, '').substring(0, 150);
            productContext += `Description: ${shortDesc}\n`;
          }
        }
      } else if (contentType === 'page') {
        const { data: page } = await supabaseClient
          .from("shopify_pages")
          .select("title, body_html")
          .eq("id", contentId)
          .maybeSingle();
        
        if (page) {
          productTitle = page.title;
          productContext = `Page: ${page.title}\n`;
        }
      } else if (contentType === 'article') {
        const { data: article } = await supabaseClient
          .from("blog_articles")
          .select("title, content")
          .eq("id", contentId)
          .maybeSingle();
        
        if (article) {
          productTitle = article.title;
          productContext = `Article: ${article.title}\n`;
          const shortContent = article.content.replace(/<[^>]*>/g, '').substring(0, 150);
          productContext += `Content: ${shortContent}\n`;
        }
      }
    } else {
      // Get product info (including title for keyword mixing and store_id for localization)
      const { data: productData, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("title, description, category, ai_color, ai_material, seller_id, store_id")
        .eq("id", image.product_id)
        .maybeSingle();

      if (productError || !productData) {
        console.error('Product not found for image:', imageId, 'product_id:', image.product_id, 'error:', productError);
        return new Response(
          JSON.stringify({ 
            error: "Product not found for this image. The product may have been deleted.",
            imageId: imageId,
            productId: image.product_id
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      product = productData; // Assign to outer scope variable
      userId = productData.seller_id;
      productTitle = productData.title;
      storeId = productData.store_id; // Get store_id from product

      // Get variants for this product (for variable products)
      const { data: variants } = await supabaseClient
        .from("product_variants")
        .select("title, option1, option2, option3, ai_color, ai_material")
        .eq("product_id", image.product_id)
        .limit(5);

      // Build context with product title for keyword extraction
      productContext = `Titre produit: ${product.title}\n`;
      productContext += `Category: ${product.category || 'Product'}\n`;
      
      if (product.description) {
        const shortDesc = product.description.substring(0, 150);
        productContext += `Description hint: ${shortDesc}\n`;
      }

      if (variants && variants.length > 0) {
        productContext += `\nVariations:\n`;
        variants.forEach(v => {
          const variantDesc = [v.option1, v.option2, v.option3].filter(Boolean).join(', ');
          if (variantDesc) {
            productContext += `- ${v.title || variantDesc}\n`;
          }
          if (v.ai_color) productContext += `  Color: ${v.ai_color}\n`;
          if (v.ai_material) productContext += `  Material: ${v.ai_material}\n`;
        });
      } else {
        if (product.ai_color) productContext += `Color: ${product.ai_color}\n`;
        if (product.ai_material) productContext += `Material: ${product.ai_material}\n`;
      }
    }

    console.log(`🎯 Vision AI Analysis for image: ${image.id}`);

    // 🌍 Get store localization for SERP analysis
    let storeCountry = 'United States';
    let storeLanguage = 'en';
    
    // Get store_id based on image type
    if (imageType === 'content') {
      if (image.content_type === 'collection') {
        const { data: collection } = await supabaseClient
          .from("shopify_collections")
          .select("store_id")
          .eq("id", image.content_id)
          .maybeSingle();
        storeId = collection?.store_id || null;
      } else if (image.content_type === 'article') {
        const { data: article } = await supabaseClient
          .from("blog_articles")
          .select("store_id")
          .eq("id", image.content_id)
          .maybeSingle();
        storeId = article?.store_id || null;
      }
    }
    // For product images, storeId is already set above in the product block
    
    if (storeId) {
      console.log("🔍 Fetching store localization info...");
      try {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('primary_locale, country_code')
          .eq('id', storeId)
          .maybeSingle();
        
        if (storeData) {
          storeCountry = storeData.country_code || 'United States';
          storeLanguage = storeData.primary_locale?.split('-')[0] || 'en';
          console.log(`📍 Store location: ${storeCountry}, language: ${storeLanguage}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch store info, using defaults:', error);
      }
    }

    // Step 1: Analyze SERP for image visual patterns
    let serpImageInsights: any = null;
    if (productTitle) {
      console.log("🔍 Analyzing SERP for image patterns...");
      try {
        const { data: serpData, error: serpError } = await supabaseClient.functions.invoke("analyze-serp-competitors", {
          body: {
            keyword: productTitle,
            analysisType: "images",
            location: storeCountry,
            language: storeLanguage,
            maxResults: 10
          }
        });

        if (serpError) {
          console.warn("⚠️ SERP image analysis failed:", serpError);
        } else if (serpData) {
          serpImageInsights = serpData.insights;
          console.log("✅ SERP image analysis completed:", {
            dominantStyles: serpImageInsights?.dominantStyles?.length || 0,
            commonAngles: serpImageInsights?.commonAngles?.length || 0
          });
        }
      } catch (serpErr) {
        console.warn("⚠️ SERP image analysis error:", serpErr);
      }
    }

    // Step 2: Analyze title with DeepSeek to extract structured SEO keywords
    let titleKeywords: string[] = [];
    let titleStructured: any = null;
    if (productTitle) {
      console.log(`🧠 DeepSeek - Analyzing title: "${productTitle}"`);
      const titleAnalysis = await analyzeTitle(productTitle);
      titleKeywords = titleAnalysis.keywords;
      titleStructured = titleAnalysis.structured;
      
      console.log(`✅ SEO Keywords extracted:`, titleKeywords.join(', '));
      if (titleStructured) {
        console.log(`📊 Structured data:`, {
          materials: titleStructured.materials,
          colors: titleStructured.colors,
          style: titleStructured.style,
          product_type: titleStructured.product_type
        });
      }
      
      // Enhance keywords with SERP visual insights
      if (serpImageInsights?.dominantStyles) {
        console.log(`✨ Adding SERP visual context: ${serpImageInsights.dominantStyles.slice(0, 2).join(', ')}`);
      }
    }

    // Step 3: Analyze image with Vision AI (PURE VISUAL ANALYSIS - NO CONTEXT)
    // DeepSeek and SERP data are kept for logging/metrics but NOT passed to Vision AI
    console.log('📊 DeepSeek keywords (for reference only, not used in Vision AI):', titleKeywords);
    if (serpImageInsights) {
      console.log('🎨 SERP insights (for reference only, not used in Vision AI):', {
        dominantStyles: serpImageInsights.dominantStyles,
        commonAngles: serpImageInsights.commonAngles,
        colorSchemes: serpImageInsights.colorSchemes,
      });
    }

    const visionResponse = await callVisionAI(image.src);
    const visionContent = visionResponse.text;

    let geminiAltText = "";
    let visualAnalysis = "";
    let visionStructured: any = null;
    
    try {
      const cleanedJson = cleanJsonResponse(visionContent);
      console.log('Cleaned JSON:', cleanedJson.substring(0, 100));
      
      const parsed = JSON.parse(cleanedJson);
      visionStructured = parsed;
      
      // Build visual description from structured data
      if (parsed.visual_description) {
        geminiAltText = parsed.visual_description;
      } else {
        // Fallback: build from categories
        const parts: string[] = [];
        if (parsed.shapes?.length) parts.push(parsed.shapes.join(', '));
        if (parsed.materials?.length) parts.push(`en ${parsed.materials.join(' et ')}`);
        if (parsed.colors?.length) parts.push(`coloris ${parsed.colors.join(', ')}`);
        if (parsed.textures?.length) parts.push(parsed.textures.join(', '));
        geminiAltText = parts.join(', ');
      }
      
      visualAnalysis = `Matériaux: ${parsed.materials?.join(', ') || 'non identifié'}. Couleurs: ${parsed.colors?.join(', ') || 'non identifié'}. Vue: ${parsed.view_angle || 'standard'}.`;
    } catch (e) {
      console.error('Failed to parse Vision JSON:', visionContent);
      console.error('Parse error:', e);
      
      // Fallback: extract alt_text or visual_description
      let match = visionContent.match(/"visual_description":\s*"([^"]+)"/);
      if (match) {
        geminiAltText = match[1];
      } else {
        match = visionContent.match(/"alt_text":\s*"([^"]+)"/);
        if (match) {
          geminiAltText = match[1];
        } else {
          geminiAltText = 'Image visuelle';
          visualAnalysis = 'Analyse visuelle non disponible';
        }
      }
    }

    // ✨ Create intelligent mix: product name + SEO keywords + visual analysis
    let finalAltText = "";
    
    if (productTitle && geminiAltText) {
      // Extract main product name
      const productName = extractProductName(productTitle);
      
      // Combine: name + SEO keywords + visual analysis
      finalAltText = buildOptimizedAltText(productName, geminiAltText, titleKeywords, 15);
      
      console.log('🎯 Alt-text optimisé:');
      console.log(`   - Titre original: ${productTitle}`);
      console.log(`   - Nom extrait: ${productName}`);
      console.log(`   - SEO Keywords: ${titleKeywords.join(', ')}`);
      console.log(`   - Gemini visual: ${geminiAltText}`);
      console.log(`   - Final (NAME + SEO + VISUAL): ${finalAltText}`);
    } else {
      // Fallback: use only Gemini if no title
      finalAltText = geminiAltText;
    }

    // Validate final mixed alt-text
    if (!validateAltText(finalAltText, productTitle)) {
      console.warn('⚠️ Final alt-text validation failed, using Gemini directly');
      finalAltText = geminiAltText;
    }

    // Update image with mixed ALT text
    const tableName = imageType === 'content' ? 'content_images' : 'product_images';
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({ 
        alt_text: finalAltText
      })
      .eq("id", imageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Vision ALT text generated for image ${imageId}:`);
    console.log(`   - DeepSeek Keywords: ${titleKeywords.join(', ')}`);
    if (visionStructured) {
      console.log(`   - Vision AI Structured:`, {
        materials: visionStructured.materials,
        colors: visionStructured.colors,
        shapes: visionStructured.shapes,
        view: visionStructured.view_angle
      });
    }
    console.log(`   - Final ALT Text (optimized): ${finalAltText}`);
    console.log(`   - Visual Analysis: ${visualAnalysis}`);
    console.log(`   - Character count: ${finalAltText.length}`);

    // Track usage - Alt image counts as 3 optimizations
    if (userId) {
      await supabaseClient.rpc('increment_usage', {
        p_seller_id: userId,
        p_field: 'optimizations_count',
        p_increment: 3
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vision ALT text generated successfully",
        data: {
          image_id: imageId,
          alt_text: finalAltText,
          visual_analysis: visualAnalysis,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
