import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to fetch and analyze HTML
const fetchAndAnalyzeHtml = async (url: string) => {
  const htmlResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NewAI-SEO-Bot/1.0)'
    }
  });
  
  if (!htmlResponse.ok) {
    throw new Error(`Failed to fetch homepage HTML: ${htmlResponse.status}`);
  }
  
  const html = await htmlResponse.text();
  
  // Extract key SEO elements
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  
  // Extract body text (remove HTML tags)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyText = '';
  if (bodyMatch) {
    bodyText = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Extract keywords from content
  const words = bodyText.toLowerCase().match(/\b\w+\b/g) || [];
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return {
    h1: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '',
    h2s: h2Matches.map(h2 => h2.replace(/<[^>]+>/g, '').trim()).slice(0, 5),
    metaDescription: metaDescMatch ? metaDescMatch[1] : '',
    title: titleMatch ? titleMatch[1].trim() : '',
    bodyText: bodyText.substring(0, 1000),
    topKeywords
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageId, isHomepage, force = false } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Check optimization limits BEFORE calling AI (for non-homepage pages)
    if (!isHomepage) {
      const { data: checkResult, error: checkError } = await supabaseClient
        .rpc('check_optimization_allowed', {
          p_user_id: user.id,
          p_resource_type: 'page',
          p_resource_id: pageId,
          p_force: force
        });

      if (checkError) {
        console.error('Error checking optimization limits:', checkError);
        throw new Error('Failed to check optimization limits');
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
    }

    let pageTitle = '';
    let textContent = '';

    if (isHomepage) {
      // Pour la page d'accueil, récupérer les infos complètes de la boutique
      const { data: connection } = await supabaseClient
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (connection) {
        // Fetch and analyze real homepage content
        const homepageUrl = `https://${connection.store_url}`;
        console.log(`[GENERATE-PAGE-SEO] Analyzing homepage: ${homepageUrl}`);
        
        const elements = await fetchAndAnalyzeHtml(homepageUrl);
        
        // Fetch top products for context
        const { data: topProducts } = await supabaseClient
          .from('shopify_products')
          .select('title, category, product_type, tags, vendor')
          .eq('seller_id', user.id)
          .limit(10);

        // Fetch collections for context
        const { data: collections } = await supabaseClient
          .from('shopify_collections')
          .select('title, seo_description')
          .eq('user_id', user.id)
          .limit(5);

        // Extract common tags
        const allTags = topProducts?.flatMap(p => p.tags?.split(',').map((t: string) => t.trim()) || []) || [];
        const tagFreq: Record<string, number> = {};
        allTags.forEach((tag: string) => {
          if (tag) tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
        const topTags = Object.entries(tagFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag);
        
        pageTitle = elements.title || connection.store_label || connection.store_name || 'Home';
        
        // Build rich context from real content + products + collections
        const storeLabel = connection.store_label || connection.store_name || 'Boutique';
        const storeCategory = connection.store_category || 'E-commerce';
        const storeDescription = connection.store_description || '';
        
        textContent = `
BOUTIQUE E-COMMERCE :
- Nom commercial : ${storeLabel}
- Secteur : ${storeCategory}
- Description : ${storeDescription}
${connection.store_phone ? `- Téléphone : ${connection.store_phone}` : ''}
${connection.store_address ? `- Adresse : ${connection.store_address}` : ''}

CONTENU ACTUEL DE LA PAGE D'ACCUEIL :
- Titre actuel : "${elements.title}"
- H1 actuel : "${elements.h1 || 'Aucun H1 détecté'}"
- H2s principaux : ${elements.h2s.join(', ') || 'Aucun'}
- Meta description actuelle : "${elements.metaDescription || 'Aucune'}"
- Mots-clés détectés : ${elements.topKeywords.join(', ')}

PRODUITS POPULAIRES :
${topProducts?.map((p: any) => `- ${p.title} (${p.category || p.product_type || 'N/A'})`).join('\n') || 'Aucun produit trouvé'}

COLLECTIONS :
${collections?.map((c: any) => `- ${c.title}${c.seo_description ? ': ' + c.seo_description.substring(0, 100) : ''}`).join('\n') || 'Aucune collection'}

TAGS PRINCIPAUX : ${topTags.join(', ') || 'Aucun'}

EXTRAIT DU CONTENU :
${elements.bodyText}
        `.trim();
      }
      
      console.log(`Generating SEO for homepage of: ${pageTitle}`);
    } else {
      // Récupérer la page depuis la base de données
      const { data: page, error: pageError } = await supabaseClient
        .from('shopify_pages')
        .select('*')
        .eq('id', pageId)
        .eq('user_id', user.id)
        .single();

      if (pageError) throw pageError;

      pageTitle = page.title;
      textContent = page.body_html?.replace(/<[^>]*>/g, ' ').substring(0, 1000) || '';
      
      console.log(`Generating SEO for page: ${pageTitle}`);
    }

    // Générer le SEO avec Lovable AI (enriched context)
    const prompt = isHomepage 
      ? `Tu es un expert SEO français spécialisé en e-commerce Shopify. 

${textContent}

OBJECTIF: Créer un titre SEO et une meta description qui:
1. Incluent naturellement le nom de la boutique
2. Mentionnent le secteur d'activité
3. Intègrent 1-2 mots-clés parmi les tags principaux ou produits détectés
4. Créent l'urgence avec un appel à l'action
5. Se démarquent de la concurrence

RÈGLES STRICTES :
- Titre SEO : Exactement 50-60 caractères
- Meta Description : Exactement 150-160 caractères, engageant avec chiffre ou bénéfice concret
- Utilise des power words (Découvrez, Profitez, Exclusive, Premium, etc.)
- Mentionne un avantage compétitif (livraison gratuite, garantie, qualité, choix, etc.)

FORMAT JSON strict uniquement (sans markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`
      : `Génère un titre SEO optimisé (max 60 caractères) et une meta description (max 160 caractères) pour cette page Shopify:

Titre: ${pageTitle}
Contenu: ${textContent}

Réponds uniquement en JSON:
{
  "seo_title": "...",
  "seo_description": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert SEO. Réponds uniquement en JSON valide sans markdown.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Nettoyer les balises markdown si présentes
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const seoData = JSON.parse(cleanContent);

    console.log('Generated SEO:', seoData);

    // Update page with generated SEO
    if (!isHomepage) {
      // Get current page data
      const { data: currentPage } = await supabaseClient
        .from('shopify_pages')
        .select('optimization_count')
        .eq('id', pageId)
        .single();

      // Update the page
      const { error: updateError } = await supabaseClient
        .from('shopify_pages')
        .update({
          seo_title: seoData.seo_title,
          seo_description: seoData.seo_description,
          optimized: true,
          optimization_count: (currentPage?.optimization_count || 0) + 1,
          last_optimization_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId);

      if (updateError) throw updateError;

      // Track usage
      await supabaseClient.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'optimizations_count',
        p_increment: 1
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        seo_title: seoData.seo_title,
        seo_description: seoData.seo_description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
