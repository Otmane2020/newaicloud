import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";
import { resolveLanguage } from "../_shared/language-detector.ts";

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

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { pageId, isHomepage, force = false } = body;
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
    let connection: any = null;

    if (isHomepage) {
      // Pour la page d'accueil, récupérer les infos complètes de la boutique
      const { data: connData } = await supabaseClient
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      connection = connData;

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
        
        // Detect store category from products if not set
        let storeCategory = connection.store_category;
        if (!storeCategory && topProducts && topProducts.length > 0) {
          // Extract most common product types/categories
          const productTypes = topProducts.map((p: any) => p.product_type || p.category).filter(Boolean);
          if (productTypes.length > 0) {
            // Use the first product type as category hint
            storeCategory = productTypes[0];
          }
        }
        storeCategory = storeCategory || 'E-commerce';
        
        const storeDescription = connection.store_description || '';
        
        // Build comprehensive product context
        const productContext = topProducts && topProducts.length > 0
          ? topProducts.map((p: any) => {
              const parts = [p.title];
              if (p.vendor) parts.push(`Marque: ${p.vendor}`);
              if (p.product_type) parts.push(`Type: ${p.product_type}`);
              if (p.category) parts.push(`Catégorie: ${p.category}`);
              return parts.join(' | ');
            }).join('\n')
          : 'Aucun produit trouvé';
        
        textContent = `
BOUTIQUE E-COMMERCE RÉELLE :
- Nom EXACT de la boutique : ${storeLabel}
- URL de la boutique : ${connection.store_url}
- Secteur d'activité détecté : ${storeCategory}
${storeDescription ? `- Description : ${storeDescription}` : ''}
${connection.store_phone ? `- Téléphone : ${connection.store_phone}` : ''}
${connection.store_address ? `- Adresse : ${connection.store_address}` : ''}

⚠️ IMPORTANT : Tu DOIS utiliser UNIQUEMENT les informations ci-dessus. N'invente RIEN.

CONTENU RÉEL DE LA PAGE D'ACCUEIL :
- Titre actuel : "${elements.title}"
- H1 actuel : "${elements.h1 || 'Aucun H1 détecté'}"
- H2s principaux : ${elements.h2s.join(', ') || 'Aucun'}
- Meta description actuelle : "${elements.metaDescription || 'Aucune'}"
- Mots-clés détectés dans le contenu : ${elements.topKeywords.join(', ')}

PRODUITS RÉELS DE LA BOUTIQUE (NE PAS INVENTER) :
${productContext}

COLLECTIONS RÉELLES :
${collections?.map((c: any) => `- ${c.title}${c.seo_description ? ': ' + c.seo_description.substring(0, 100) : ''}`).join('\n') || 'Aucune collection'}

TAGS PRINCIPAUX RÉELS : ${topTags.join(', ') || 'Aucun'}

EXTRAIT DU CONTENU RÉEL DE LA PAGE :
${elements.bodyText}

⚠️ RAPPEL CRITIQUE : Base-toi UNIQUEMENT sur les données ci-dessus. Le SEO doit refléter EXACTEMENT les produits et l'activité réelle de ${storeLabel}.
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
      let baseContent = page.body_html?.replace(/<[^>]*>/g, ' ').substring(0, 800) || '';
      
      // Si c'est une page de contact, récupérer le nom de la boutique via user_id
      const isContactPage = page.title.toLowerCase().includes('contact') || 
                           page.handle?.toLowerCase().includes('contact') ||
                           baseContent.toLowerCase().includes('contact');
      
      if (isContactPage) {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('store_name, store_label, store_phone, store_email, store_address')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (storeData) {
          const storeName = storeData.store_label || storeData.store_name || '';
          textContent = `PAGE DE CONTACT - Boutique: ${storeName}
${storeData.store_phone ? `Téléphone: ${storeData.store_phone}` : ''}
${storeData.store_email ? `Email: ${storeData.store_email}` : ''}
${storeData.store_address ? `Adresse: ${storeData.store_address}` : ''}

${baseContent}`;
        } else {
          textContent = baseContent;
        }
      } else {
        textContent = baseContent;
      }
      
      console.log(`Generating SEO for page: ${pageTitle}${isContactPage ? ' (Contact page)' : ''}`);
    }

    // 🛡️ LANGUAGE GUARD - Detect language from content
    let rawStoreLanguage = 'fr';
    if (isHomepage && connection) {
      rawStoreLanguage = connection.store_language || 'fr';
    } else {
      const { data: pageData } = await supabaseClient
        .from('shopify_pages')
        .select('store_id')
        .eq('id', pageId)
        .single();
      
      if (pageData?.store_id) {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('store_language')
          .eq('id', pageData.store_id)
          .single();
        
        if (storeData?.store_language) {
          rawStoreLanguage = storeData.store_language;
        }
      }
    }

    const storeLanguage = resolveLanguage({
      contentText: `${pageTitle || ""} ${textContent || ""}`,
      storeLanguage: rawStoreLanguage
    });
    console.log(`🛡️ LANGUAGE GUARD: page - detected=${storeLanguage}, store=${rawStoreLanguage}, title="${pageTitle?.substring(0,30)}..."`);

    // Get store localization for SERP analysis
    let storeCountry = 'FR';
    if (isHomepage && connection?.country_code) {
      storeCountry = connection.country_code.toUpperCase();
    } else if (!isHomepage) {
      const { data: pageData } = await supabaseClient
        .from('shopify_pages')
        .select('store_id')
        .eq('id', pageId)
        .single();
      
      if (pageData?.store_id) {
        const { data: storeData } = await supabaseClient
          .from('shopify_connections')
          .select('country_code')
          .eq('id', pageData.store_id)
          .single();
        
        if (storeData?.country_code) {
          storeCountry = storeData.country_code.toUpperCase();
        }
      }
    }

    // Analyze SERP competitors for strategic pages
    let serpInsights = '';
    try {
      let serpKeyword = '';
      let serpAnalysisType: 'landing' | 'product' | 'article' = 'landing';

      if (isHomepage && connection) {
        serpKeyword = `${connection.store_label || connection.store_name} ${connection.store_category || 'boutique'}`;
      } else {
        serpKeyword = pageTitle;
        // Detect page type for better SERP analysis
        const isContactPage = pageTitle.toLowerCase().includes('contact');
        const isAboutPage = pageTitle.toLowerCase().includes('about') || pageTitle.toLowerCase().includes('propos');
        serpAnalysisType = (isContactPage || isAboutPage) ? 'landing' : 'landing';
      }

      console.log(`🔍 Analyzing SERP for page: ${serpKeyword}`);
      const serpResponse = await supabaseClient.functions.invoke('analyze-serp-competitors', {
        body: {
          keyword: serpKeyword,
          analysisType: serpAnalysisType,
          location: storeCountry,
          language: storeLanguage,
          maxResults: 10
        }
      });

      if (!serpResponse.error && serpResponse.data?.insights) {
        const insights = serpResponse.data.insights;
        serpInsights = `

🎯 ANALYSE SERP CONCURRENTS :
- Sections communes : ${insights.commonSections?.join(', ') || 'N/A'}
- CTAs récurrents : ${insights.ctaPatterns?.join(', ') || 'N/A'}
- Structure type : ${insights.layoutPatterns?.join(', ') || 'N/A'}
- Éléments clés : ${insights.keyElements?.join(', ') || 'N/A'}

📌 Optimise le SEO en alignant sur ces patterns qui performent.`;
        console.log('✅ SERP analysis successful for page');
      }
    } catch (serpError) {
      console.log('⚠️ SERP analysis failed, continuing without it:', serpError);
    }

    // Générer le SEO avec Lovable AI (enriched context)
    const promptType = isHomepage ? 'pageHomepage' : 'pageRegular';
    const prompt = getSeoPrompt(storeLanguage, promptType, {
      title: pageTitle,
      textContent: textContent + serpInsights,
      isHomepage: isHomepage
    });

    const systemRole = getSystemRole(storeLanguage, 'page');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `Tu es un expert SEO. Tu DOIS analyser précisément les données fournies et générer du SEO qui reflète EXACTEMENT l'activité réelle. N'invente JAMAIS de contenu. Réponds uniquement en JSON valide sans markdown.` 
          },
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
      console.log('[UPDATE] Starting page update for pageId:', pageId);
      
      // Get current page data
      const { data: currentPage, error: fetchError } = await supabaseClient
        .from('shopify_pages')
        .select('optimization_count')
        .eq('id', pageId)
        .single();

      if (fetchError) {
        console.error('[UPDATE] Error fetching current page:', fetchError);
        throw fetchError;
      }

      console.log('[UPDATE] Current page optimization_count:', currentPage?.optimization_count);

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

      if (updateError) {
        console.error('[UPDATE] Error updating page:', updateError);
        throw updateError;
      }

      console.log('[UPDATE] Page updated successfully');

      // Track usage
      console.log('[USAGE] Incrementing usage count');
      const { error: usageError } = await supabaseClient.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'optimizations_count',
        p_increment: 2
      });

      if (usageError) {
        console.error('[USAGE] Error incrementing usage:', usageError);
        throw usageError;
      }

      console.log('[USAGE] Usage incremented successfully');
    } else if (isHomepage && connection) {
      // Save homepage SEO to database
      console.log('[HOMEPAGE] Saving homepage SEO to database');
      
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { error: homepageError } = await supabaseAdmin
        .from('homepage_seo')
        .upsert({
          user_id: user.id,
          store_id: connection.id,
          seo_title: seoData.seo_title,
          seo_description: seoData.seo_description,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,store_id',
          ignoreDuplicates: false
        });

      if (homepageError) {
        console.error('[HOMEPAGE] Error saving homepage SEO:', homepageError);
        throw homepageError;
      }

      console.log('[HOMEPAGE] Homepage SEO saved successfully');
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
