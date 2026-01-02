import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📚 [generate-aeo-pillar-article] Starting...');
    
    const { user_id, store_id, link_to_qas = true } = await req.json();
    
    if (!user_id) {
      throw new Error('user_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get recent Q&A articles from the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { data: recentAnswers, error: answersError } = await supabase
      .from('ai_answers')
      .select('id, question, direct_answer, keywords, platform')
      .eq('user_id', user_id)
      .gte('created_at', oneWeekAgo.toISOString())
      .not('synced_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (answersError) {
      console.error('❌ Error fetching recent answers:', answersError);
      throw answersError;
    }

    console.log(`📝 Found ${recentAnswers?.length || 0} recent Q&A articles`);

    if (!recentAnswers || recentAnswers.length === 0) {
      console.log('⚠️ No recent Q&A to create pillar from');
      return new Response(JSON.stringify({
        success: false,
        error: 'No recent Q&A articles to create pillar from'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Get store info for context
    let storeName = '';
    let storeUrl = '';
    if (store_id) {
      const { data: store } = await supabase
        .from('shopify_connections')
        .select('shop_name, shop_url')
        .eq('id', store_id)
        .single();
      
      if (store) {
        storeName = store.shop_name || '';
        storeUrl = store.shop_url || '';
      }
    }

    // 3. Extract common topic/theme from Q&A
    const allKeywords = recentAnswers.flatMap(a => a.keywords || []);
    const keywordCounts: Record<string, number> = {};
    allKeywords.forEach(k => {
      keywordCounts[k] = (keywordCounts[k] || 0) + 1;
    });
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    const questionsContext = recentAnswers.map(a => 
      `- Question: "${a.question}"\n  Answer: "${a.direct_answer}"`
    ).join('\n\n');

    // 4. Generate pillar article with OpenAI
    console.log('🤖 Generating pillar article with AI...');
    
    const prompt = `You are an expert SEO content writer. Create a comprehensive pillar article (1500-2000 words) that synthesizes the following Q&A content into an authoritative guide.

Store context: ${storeName || 'E-commerce store'}
Top keywords: ${topKeywords.join(', ')}

Recent Q&A content:
${questionsContext}

Create a pillar article with this structure:
1. Compelling H1 title (SEO optimized, under 60 chars)
2. Introduction (150 words - set up the problem/topic)
3. 3-5 H2 sections covering the main subtopics
4. Each H2 should have 200-400 words with practical, expert advice
5. FAQ section at the end with 5 questions from the Q&A above
6. Conclusion with call-to-action

Requirements:
- Write in a professional, authoritative tone
- Include the top keywords naturally
- Use proper HTML formatting (h1, h2, h3, p, ul, li)
- Add schema markup for FAQPage
- Make it AEO-optimized (clear answers, structured data)
- Include internal linking placeholders: [LINK_TO_QA_X] where X is the question number

Return JSON with:
{
  "title": "SEO title",
  "meta_description": "Meta description (max 155 chars)",
  "content": "Full HTML content",
  "keywords": ["array", "of", "keywords"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResult = await openaiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content generated from AI');
    }

    // Parse JSON response
    let articleData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      articleData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('❌ Error parsing AI response:', e);
      // Fallback: create basic structure
      articleData = {
        title: `Complete Guide: ${topKeywords[0] || 'Expert Insights'}`,
        meta_description: `Comprehensive guide covering everything you need to know about ${topKeywords.join(', ')}`,
        content: `<article>${aiContent}</article>`,
        keywords: topKeywords,
      };
    }

    console.log(`📄 Generated article: "${articleData.title}"`);

    // 5. Save pillar article to aeo_pillar_articles
    const linkedQaIds = recentAnswers.map(a => a.id);
    
    const { data: pillarArticle, error: pillarError } = await supabase
      .from('aeo_pillar_articles')
      .insert({
        user_id,
        store_id,
        title: articleData.title,
        topic: topKeywords[0] || 'General',
        content: articleData.content,
        meta_description: articleData.meta_description,
        keywords: articleData.keywords,
        linked_qa_ids: linkedQaIds,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pillarError) {
      console.error('❌ Error saving pillar article:', pillarError);
      throw pillarError;
    }

    // 6. Also create in blog_articles for consistency
    const { data: blogArticle, error: blogError } = await supabase
      .from('blog_articles')
      .insert({
        user_id,
        store_id,
        title: articleData.title,
        content: articleData.content,
        meta_description: articleData.meta_description,
        keywords: articleData.keywords,
        status: 'draft',
        source: 'ai_generated',
      })
      .select()
      .single();

    if (blogError) {
      console.error('⚠️ Error saving to blog_articles:', blogError);
    } else {
      // Link pillar to blog article
      await supabase
        .from('aeo_pillar_articles')
        .update({ article_id: blogArticle.id })
        .eq('id', pillarArticle.id);
    }

    // 7. Update linked Q&A with pillar reference (if enabled)
    if (link_to_qas && pillarArticle) {
      console.log('🔗 Linking Q&A articles to pillar...');
      
      // We could update the Q&A articles to include a link to the pillar
      // For now, just log this - the actual linking happens via linked_qa_ids
    }

    console.log('✅ Pillar article created successfully');

    return new Response(JSON.stringify({
      success: true,
      article: {
        id: pillarArticle.id,
        title: pillarArticle.title,
        blog_article_id: blogArticle?.id,
      },
      linked_qa_count: linkedQaIds.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('❌ [generate-aeo-pillar-article] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
