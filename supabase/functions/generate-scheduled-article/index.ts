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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
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
      ? `Write a comprehensive, SEO-optimized blog article about "${article.title}" for NewAI.

Target audience: Shopify store owners, e-commerce managers, digital marketers.
Category: ${article.category}
Keywords to include naturally: ${article.keywords?.join(', ') || 'shopify, seo, e-commerce'}

Article requirements:
1. **Hook**: Start with a compelling statistic or problem statement
2. **Problem**: Detail the pain points merchants face
3. **Solution**: Explain how NewAI solves these problems with AI
4. **Benefits**: List 5-7 key benefits with real examples
5. **Features**: Describe specific NewAI features relevant to the topic
6. **How It Works**: Step-by-step explanation
7. **CTA**: Strong call-to-action to try NewAI free

Writing style:
- Professional but conversational
- Data-driven with specific numbers
- Action-oriented with clear benefits
- SEO-optimized with natural keyword usage
- 1800-2200 words
- Use H2 and H3 headings for structure
- Include bullet points and numbered lists

Format as clean HTML with semantic tags (<h2>, <h3>, <p>, <ul>, <ol>, <strong>).
Do NOT include <h1> (added separately).`
      : `Rédigez un article de blog complet et optimisé SEO sur "${article.title}" pour NewAI.

Public cible : Propriétaires de boutiques Shopify, responsables e-commerce, marketeurs digitaux.
Catégorie : ${article.category}
Mots-clés à inclure naturellement : ${article.keywords?.join(', ') || 'shopify, seo, e-commerce'}

Exigences de l'article :
1. **Accroche** : Commencez par une statistique convaincante ou un problème
2. **Problème** : Détaillez les difficultés des marchands
3. **Solution** : Expliquez comment NewAI résout ces problèmes avec l'IA
4. **Avantages** : Listez 5-7 avantages clés avec exemples concrets
5. **Fonctionnalités** : Décrivez les fonctionnalités NewAI pertinentes
6. **Comment ça marche** : Explication étape par étape
7. **CTA** : Appel à l'action fort pour essayer NewAI gratuitement

Style d'écriture :
- Professionnel mais conversationnel
- Axé sur les données avec des chiffres précis
- Orienté action avec des avantages clairs
- Optimisé SEO avec utilisation naturelle des mots-clés
- 1800-2200 mots
- Utilisez des titres H2 et H3 pour la structure
- Incluez des listes à puces et numérotées

Format : HTML propre avec balises sémantiques (<h2>, <h3>, <p>, <ul>, <ol>, <strong>).
N'incluez PAS de <h1> (ajouté séparément).`;

    // Generate content with AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentPrompt }
        ],
        max_tokens: 4000
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

    const metaResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: metaPrompt }],
        max_tokens: 100
      }),
    });

    const metaData = await metaResponse.json();
    const metaDescription = metaData.choices[0]?.message?.content?.slice(0, 160) || '';

    // Generate excerpt
    const excerptPrompt = isEnglish
      ? `Write a 2-sentence excerpt summarizing the key takeaway from an article about "${article.title}".`
      : `Rédigez un extrait de 2 phrases résumant le point clé d'un article sur "${article.title}".`;

    const excerptResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: excerptPrompt }],
        max_tokens: 150
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
