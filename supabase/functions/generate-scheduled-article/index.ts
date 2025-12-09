import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Health check
    if (body.healthCheck) {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { articleId } = body;
    
    if (!articleId) {
      throw new Error('articleId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    // Get the scheduled article
    const { data: article, error: fetchError } = await supabase
      .from('scheduled_blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Article not found: ${fetchError?.message || 'Unknown'}`);
    }

    if (article.status !== 'scheduled') {
      return new Response(
        JSON.stringify({ success: false, message: 'Article already processed', status: article.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to generating
    await supabase
      .from('scheduled_blog_articles')
      .update({ status: 'generating' })
      .eq('id', articleId);

    console.log(`[GENERATE-SCHEDULED] Generating: ${article.title} (${article.language})`);

    // Build prompt based on language
    const isEnglish = article.language === 'en';
    const systemPrompt = isEnglish
      ? `You are an expert SEO content writer for NewAI, a Shopify SEO automation platform. Write comprehensive, engaging blog articles that help Shopify store owners improve their online presence.`
      : `Vous êtes un expert en rédaction de contenu SEO pour NewAI, une plateforme d'automatisation SEO pour Shopify. Rédigez des articles de blog complets et engageants pour aider les propriétaires de boutiques Shopify à améliorer leur présence en ligne.`;

    const contentPrompt = isEnglish
      ? `Write a concise, SEO-optimized blog article about "${article.title}" for NewAI (Shopify SEO platform).

Target: Shopify store owners, e-commerce managers.
Category: ${article.category}
Keywords: ${article.keywords?.join(', ') || 'shopify, seo, e-commerce'}

Structure (600-800 words max):
1. Hook: Start with a compelling problem or stat
2. Problem: Briefly explain merchant pain points
3. Solution: How NewAI solves this with AI
4. 3-4 Key Benefits with examples
5. CTA: Try NewAI free

Style: Professional, data-driven, action-oriented.
Format: Clean HTML (<h2>, <h3>, <p>, <ul>, <strong>). No <h1>.`
      : `Rédigez un article de blog concis et optimisé SEO sur "${article.title}" pour NewAI (plateforme SEO Shopify).

Cible : Propriétaires de boutiques Shopify, responsables e-commerce.
Catégorie : ${article.category}
Mots-clés : ${article.keywords?.join(', ') || 'shopify, seo, e-commerce'}

Structure (600-800 mots max) :
1. Accroche : Problème ou statistique convaincante
2. Problème : Difficultés des marchands
3. Solution : Comment NewAI résout avec l'IA
4. 3-4 Avantages clés avec exemples
5. CTA : Essayez NewAI gratuitement

Style : Professionnel, axé données, orienté action.
Format : HTML propre (<h2>, <h3>, <p>, <ul>, <strong>). Pas de <h1>.`;

    // Generate content with DeepSeek (cheaper: ~$0.09-0.12 per article)
    const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || '';

    if (!content) {
      throw new Error('No content generated from AI');
    }

    // Generate meta description
    const metaPrompt = isEnglish
      ? `Write a compelling 155-character meta description for an article titled "${article.title}". Include a call-to-action.`
      : `Rédigez une méta-description convaincante de 155 caractères pour un article intitulé "${article.title}". Incluez un appel à l'action.`;

    const metaResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: metaPrompt }],
        max_tokens: 80,
        temperature: 0.7
      }),
    });

    const metaData = await metaResponse.json();
    const metaDescription = metaData.choices[0]?.message?.content?.slice(0, 160) || '';

    // Generate excerpt
    const excerptPrompt = isEnglish
      ? `Write a 2-sentence excerpt summarizing the key takeaway from an article about "${article.title}".`
      : `Rédigez un extrait de 2 phrases résumant le point clé d'un article sur "${article.title}".`;

    const excerptResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: excerptPrompt }],
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    const excerptData = await excerptResponse.json();
    const excerpt = excerptData.choices[0]?.message?.content || '';

    // Calculate read time (avg 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    // Update the article with generated content
    const { error: updateError } = await supabase
      .from('scheduled_blog_articles')
      .update({
        content,
        meta_description: metaDescription,
        excerpt,
        read_time: readTime,
        status: 'generated',
        generated_at: new Date().toISOString(),
      })
      .eq('id', articleId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[GENERATE-SCHEDULED] ✅ Generated: ${article.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        articleId,
        title: article.title,
        wordCount,
        readTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-SCHEDULED] Error:', error);
    
    // Try to update status to failed
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.articleId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        
        await supabase
          .from('scheduled_blog_articles')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : 'Unknown error' 
          })
          .eq('id', body.articleId);
      }
    } catch (e) {
      console.error('[GENERATE-SCHEDULED] Failed to update status:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
