import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[OPPS] Starting blog opportunities generation');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OPPS] User authenticated: ${user.id}`);

    // Parse request body for store_id
    const body = await req.json().catch(() => ({}));
    const storeId = body.store_id;
    console.log(`[OPPS] Store ID: ${storeId || 'all stores'}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. GET COMPREHENSIVE DATA
    console.log('[OPPS] Fetching comprehensive catalog data...');

    // Products with full details - filter by store_id if provided
    const productsQuery = supabaseAdmin
      .from('shopify_products')
      .select('id, title, category, sub_category, product_type, price, vendor, tags, description, handle, image_url')
      .eq('seller_id', user.id);
    
    if (storeId) {
      productsQuery.eq('store_id', storeId);
    }
    
    const { data: products, error: productsError } = await productsQuery
      .order('price', { ascending: false });

    if (productsError) {
      console.error('[OPPS] Error fetching products:', productsError);
      throw productsError;
    }

    // Collections - filter by store_id if provided
    const collectionsQuery = supabaseAdmin
      .from('shopify_collections')
      .select('id, title, handle, body_html')
      .eq('user_id', user.id);
    
    if (storeId) {
      collectionsQuery.eq('store_id', storeId);
    }
    
    const { data: collections, error: collectionsError } = await collectionsQuery;

    if (collectionsError) {
      console.error('[OPPS] Error fetching collections:', collectionsError);
    }

    // Shop info - filter by store_id if provided
    const shopQuery = supabaseAdmin
      .from('shopify_connections')
      .select('store_name, store_url')
      .eq('user_id', user.id);
    
    if (storeId) {
      shopQuery.eq('id', storeId);
    }
    
    const { data: shopInfo, error: shopError } = await shopQuery.maybeSingle();

    if (shopError) {
      console.error('[OPPS] Error fetching shop info:', shopError);
    }

    if (!products || products.length === 0) {
      console.log('[OPPS] No products found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunities: [],
          message: 'Aucun produit trouvé. Importez des produits d\'abord.' 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OPPS] Data loaded: ${products.length} products, ${collections?.length || 0} collections`);

    // 2. ANALYZE CATALOG IN DEPTH
    const categoryMap = new Map<string, { count: number; products: any[] }>();
    const vendorMap = new Map<string, number>();
    const tagsMap = new Map<string, number>();
    const priceRanges = { low: 0, medium: 0, high: 0, premium: 0 };
    
    products.forEach(product => {
      // Categories
      const category = product.category || product.product_type || 'Général';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, products: [] });
      }
      const catData = categoryMap.get(category)!;
      catData.count++;
      catData.products.push(product);
      
      // Price ranges
      const price = parseFloat(product.price) || 0;
      if (price < 50) priceRanges.low++;
      else if (price < 200) priceRanges.medium++;
      else if (price < 500) priceRanges.high++;
      else priceRanges.premium++;

      // Vendors
      if (product.vendor) {
        vendorMap.set(product.vendor, (vendorMap.get(product.vendor) || 0) + 1);
      }

      // Tags
      if (product.tags) {
        const tags = product.tags.split(',').map((t: string) => t.trim());
        tags.forEach((tag: string) => {
          if (tag) tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
        });
      }
    });

    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    const topVendors = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topTags = Array.from(tagsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const topProducts = products.slice(0, 10);

    // 3. BUILD RICH CONTEXT PROMPT
    const prompt = `Tu es un expert en marketing de contenu et SEO e-commerce. Analyse ce catalogue en profondeur et génère EXACTEMENT 8 opportunités d'articles de blog stratégiques (MINIMUM 5, IDÉALEMENT 8).

🏪 INFORMATIONS BOUTIQUE :
${shopInfo ? `- Nom : ${shopInfo.store_name}
- URL : ${shopInfo.store_url}` : '- Boutique non connectée'}

📊 STATISTIQUES CATALOGUE :
- Total produits : ${products.length}
- Collections : ${collections?.length || 0}
- Prix bas (<50€) : ${priceRanges.low} produits
- Prix moyen (50-200€) : ${priceRanges.medium} produits
- Prix haut (200-500€) : ${priceRanges.high} produits
- Premium (>500€) : ${priceRanges.premium} produits

📁 TOP CATÉGORIES (avec exemples produits) :
${topCategories.map(([cat, data]) => {
  const examples = data.products.slice(0, 3).map((p: any) => p.title).join(', ');
  return `- ${cat} : ${data.count} produits\n  Exemples : ${examples}`;
}).join('\n')}

${collections && collections.length > 0 ? `🗂️ COLLECTIONS :
${collections.map(c => `- ${c.title}`).join('\n')}` : ''}

🏷️ MARQUES / VENDORS :
${topVendors.map(([vendor, count]) => `- ${vendor} : ${count} produits`).join('\n')}

🔖 TAGS POPULAIRES :
${topTags.map(([tag, count]) => `- ${tag} (${count})`).join('\n')}

💎 TOP 10 PRODUITS LES PLUS CHERS :
${topProducts.map(p => `- ${p.title} - ${parseFloat(p.price).toFixed(2)}€`).join('\n')}

🎯 TYPES D'ARTICLES À GÉNÉRER (obligatoire) :

1. **COMPARATIFS** : Compare 3-5 produits similaires d'une même catégorie
   Exemple : "Comparatif 2025 : Les 5 meilleures chaises de bureau ergonomiques"

2. **GUIDES D'ACHAT** : Aide à choisir le bon produit selon critères
   Exemple : "Guide complet : Comment choisir sa table à manger ?"

3. **NICHES / TENDANCES** : Articles sur micro-segments ou nouveautés
   Exemple : "Mobilier minimaliste scandinave : Notre sélection 2025"

4. **TUTORIELS** : Comment utiliser, entretenir, installer
   Exemple : "Comment entretenir son canapé en cuir : 7 conseils d'expert"

5. **SÉLECTIONS THÉMATIQUES** : Top X produits pour un usage/style
   Exemple : "Top 10 des meubles pour petit appartement"

📋 FORMAT JSON REQUIS (STRICT) :

{
  "opportunities": [
    {
      "title": "Titre accrocheur avec mots-clés SEO",
      "description": "Description engageante de 2-3 phrases expliquant l'angle et la valeur de l'article",
      "category": "Catégorie principale du catalogue",
      "subCategory": "Sous-catégorie si pertinent",
      "type": "comparison|guide|niche|tutorial|selection",
      "angle": "L'angle unique de l'article",
      "targetAudience": "Audience cible précise",
      "primaryKeywords": ["mot-clé principal 1", "mot-clé 2"],
      "secondaryKeywords": ["mot-clé 3", "mot-clé 4", "mot-clé 5"],
      "relatedCollectionTitles": ["Collection 1", "Collection 2"],
      "suggestedProductTitles": ["Produit 1", "Produit 2", "Produit 3"],
      "seoScore": 75-95,
      "difficulty": "easy|medium|hard",
      "estimatedWordCount": 1500-3000
    }
  ]
}

⚠️ RÈGLES CRITIQUES :
- Retourne UNIQUEMENT du JSON valide (ZÉRO markdown, ZÉRO backticks)
- Génère EXACTEMENT 8 opportunités variées (MINIMUM 5, IDÉALEMENT 8)
- Utilise les VRAIS noms de produits et collections du catalogue
- Chaque opportunité DOIT avoir AU MOINS 5 produits associés dans "suggestedProductTitles"
- Chaque opportunité doit être CONCRÈTE et ACTIONNABLE
- Mélange les 5 types d'articles
- Les titres doivent être SEO-optimisés et accrocheurs
- Les keywords doivent être pertinents et recherchés
- Suggère 5-8 produits réels par opportunité (OBLIGATOIRE)`;

    console.log('[OPPS] Calling Lovable AI with rich context...');
    console.log('[OPPS] Prompt length:', prompt.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en marketing de contenu et SEO e-commerce. Tu analyses des catalogues produits et génères des opportunités d\'articles de blog stratégiques et pertinents. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[OPPS] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('[OPPS] AI response received');

    const generatedText = aiData.choices[0].message.content;
    console.log('[OPPS] Raw AI response (first 300 chars):', generatedText.substring(0, 300));

    // Parse JSON response
    let cleanedText = generatedText.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.split('```json')[1].split('```')[0].trim();
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(cleanedText);

    // Handle both formats: direct array or object with opportunities property
    let opportunitiesArray: any[];
    if (Array.isArray(parsed)) {
      console.log('[OPPS] AI returned direct array format');
      opportunitiesArray = parsed;
    } else if (parsed.opportunities && Array.isArray(parsed.opportunities)) {
      console.log('[OPPS] AI returned object with opportunities property');
      opportunitiesArray = parsed.opportunities;
    } else {
      console.error('[OPPS] Invalid format. Parsed:', JSON.stringify(parsed).substring(0, 200));
      throw new Error('Invalid AI response format: expected array or object with opportunities array');
    }

    if (opportunitiesArray.length === 0) {
      throw new Error('No opportunities generated by AI');
    }

    console.log(`[OPPS] Successfully generated ${opportunitiesArray.length} opportunities`);

    // 4. SMART PRODUCT MATCHING
    const opportunitiesWithProducts = opportunitiesArray.map((opp: any) => {
      console.log(`[OPPS] Matching products for: ${opp.title}`);
      
      // Build a relevance score for each product
      const scoredProducts = products.map(product => {
        let score = 0;
        const productText = `${product.title} ${product.description || ''} ${product.tags || ''} ${product.category || ''} ${product.sub_category || ''}`.toLowerCase();
        
        // Match by suggested product titles (exact or partial)
        if (opp.suggestedProductTitles) {
          opp.suggestedProductTitles.forEach((suggestedTitle: string) => {
            if (product.title.toLowerCase().includes(suggestedTitle.toLowerCase()) ||
                suggestedTitle.toLowerCase().includes(product.title.toLowerCase())) {
              score += 100; // Very high score for direct matches
            }
          });
        }

        // Match by category
        const oppCategory = (opp.category || '').toLowerCase();
        const oppSubCategory = (opp.subCategory || '').toLowerCase();
        const prodCategory = (product.category || product.product_type || '').toLowerCase();
        const prodSubCategory = (product.sub_category || '').toLowerCase();
        
        if (prodCategory && oppCategory && prodCategory.includes(oppCategory)) score += 50;
        if (prodSubCategory && oppSubCategory && prodSubCategory.includes(oppSubCategory)) score += 40;
        
        // Match by keywords
        if (opp.primaryKeywords) {
          opp.primaryKeywords.forEach((keyword: string) => {
            if (productText.includes(keyword.toLowerCase())) score += 30;
          });
        }
        
        if (opp.secondaryKeywords) {
          opp.secondaryKeywords.forEach((keyword: string) => {
            if (productText.includes(keyword.toLowerCase())) score += 15;
          });
        }

        // Match by tags
        if (product.tags && opp.primaryKeywords) {
          const productTags = product.tags.toLowerCase().split(',').map((t: string) => t.trim());
          opp.primaryKeywords.forEach((keyword: string) => {
            if (productTags.some((tag: string) => tag.includes(keyword.toLowerCase()))) {
              score += 20;
            }
          });
        }

        return { product, score };
      });

      // Sort by score and take top 8, but ensure minimum of 5 products
      const matchedProducts = scoredProducts
        .filter(sp => sp.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      
      // If less than 5 products matched, add more from the same category
      if (matchedProducts.length < 5 && opp.category) {
        const categoryProducts = scoredProducts
          .filter(sp => {
            const prodCategory = (sp.product.category || sp.product.product_type || '').toLowerCase();
            return prodCategory.includes(opp.category.toLowerCase()) && 
                   !matchedProducts.some(mp => mp.product.id === sp.product.id);
          })
          .slice(0, 5 - matchedProducts.length);
        matchedProducts.push(...categoryProducts);
      }
      
      // If still less than 5, add any products
      if (matchedProducts.length < 5) {
        const additionalProducts = scoredProducts
          .filter(sp => !matchedProducts.some(mp => mp.product.id === sp.product.id))
          .slice(0, 5 - matchedProducts.length);
        matchedProducts.push(...additionalProducts);
      }
      
      const productIds = matchedProducts.map(sp => {
        console.log(`[OPPS] Matched: ${sp.product.title} (score: ${sp.score})`);
        return sp.product.id;
      });

      // Map collection titles to IDs
      let collectionIds: string[] = [];
      if (opp.relatedCollectionTitles && collections) {
        collectionIds = collections
          .filter(c => opp.relatedCollectionTitles.some((title: string) => 
            c.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(c.title.toLowerCase())
          ))
          .map(c => c.id);
      }

      console.log(`[OPPS] Matched ${productIds.length} products and ${collectionIds.length} collections`);

      return {
        id: crypto.randomUUID(),
        title: opp.title,
        description: opp.description,
        category: opp.category,
        subCategory: opp.subCategory,
        type: opp.type,
        angle: opp.angle,
        targetAudience: opp.targetAudience,
        primaryKeywords: opp.primaryKeywords || [],
        secondaryKeywords: opp.secondaryKeywords || [],
        productIds: productIds,
        productsCount: productIds.length,
        collectionIds: collectionIds,
        metaDescription: opp.description,
        estimatedWordCount: opp.estimatedWordCount || 2000,
        seoScore: opp.seoScore || 80,
        difficulty: opp.difficulty || 'medium'
      };
    });

    console.log('[OPPS] Opportunities enriched with matched products and collections');

    return new Response(
      JSON.stringify({ 
        success: true, 
        opportunities: opportunitiesWithProducts,
        stats: {
          totalProducts: products.length,
          totalCollections: collections?.length || 0,
          topCategories: topCategories.map(([cat, data]) => ({ category: cat, count: data.count }))
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[OPPS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
