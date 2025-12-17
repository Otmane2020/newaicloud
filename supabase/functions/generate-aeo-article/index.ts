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
    const { 
      answer_id,
      user_id,
      store_id,
      direct_answer,
      question,
      supporting_content,
      keywords,
      platform,
      language = 'fr'
    } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!direct_answer) {
      throw new Error("direct_answer is required - AEO articles must start from a citable answer");
    }

    console.log(`[AEO Article] Generating from answer: ${answer_id}, platform: ${platform}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store info for brand context
    let storeInfo = { store_name: 'Notre boutique', store_language: language };
    if (store_id) {
      const { data: store } = await supabase
        .from('shopify_connections')
        .select('store_name, store_language')
        .eq('id', store_id)
        .single();
      if (store) {
        storeInfo = store;
      }
    }

    const storeName = storeInfo.store_name || 'Notre boutique';
    const articleLang = storeInfo.store_language || language;

    // ✅ AEO ARTICLE STRUCTURE - Answer-First
    const articleHtml = generateAEOArticleFromAnswer({
      question,
      directAnswer: direct_answer,
      supportingContent: supporting_content,
      keywords: keywords || [],
      platform,
      storeName,
      language: articleLang
    });

    // Generate SEO metadata
    const title = generateAEOTitle(question, platform, articleLang);
    const metaDescription = direct_answer.length > 155 
      ? direct_answer.substring(0, 152) + '...'
      : direct_answer;

    // Save article to blog_articles
    const { data: article, error: insertError } = await supabase
      .from('blog_articles')
      .insert({
        user_id,
        store_id,
        title,
        content: articleHtml,
        meta_description: metaDescription,
        keywords: keywords || [],
        status: 'draft',
        source: 'aeo_engine',
        seo_title: title
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving AEO article:", insertError);
      throw insertError;
    }

    // Update ai_answers with article_id
    if (answer_id) {
      await supabase
        .from('ai_answers')
        .update({ 
          status: 'treated',
          article_id: article.id 
        })
        .eq('id', answer_id);
    }

    console.log(`[AEO Article] Created article ${article.id} from answer ${answer_id}`);

    return new Response(JSON.stringify({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        meta_description: article.meta_description,
        keywords: article.keywords
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in generate-aeo-article:", errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ✅ Generate AEO Title based on question and platform
function generateAEOTitle(question: string, platform: string, language: string): string {
  const platformLabels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini', 
    copilot: 'Copilot'
  };
  
  // Clean the question for title
  let cleanQuestion = question.replace(/[?"]/g, '').trim();
  if (cleanQuestion.length > 60) {
    cleanQuestion = cleanQuestion.substring(0, 57) + '...';
  }
  
  return cleanQuestion;
}

// ✅ Generate AEO Article from Direct Answer (Answer-First structure)
function generateAEOArticleFromAnswer({
  question,
  directAnswer,
  supportingContent,
  keywords,
  platform,
  storeName,
  language
}: {
  question: string;
  directAnswer: string;
  supportingContent?: { bullets?: string[]; faq?: { q: string; a: string }[] };
  keywords: string[];
  platform: string;
  storeName: string;
  language: string;
}): string {
  const platformLabels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    copilot: 'Copilot'
  };
  const platformName = platformLabels[platform] || platform;

  const bullets = supportingContent?.bullets || [];
  const faq = supportingContent?.faq || [];

  // ✅ AEO STRUCTURE - Answer Box FIRST
  const answerBoxHtml = `
<div class="aeo-answer-box" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
  <p style="font-size: 12px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
    ✨ <strong>Réponse directe</strong> — Optimisée pour ${platformName}
  </p>
  <p style="font-size: 18px; font-weight: 600; color: #0f172a; line-height: 1.5; margin: 0;">
    ${directAnswer}
  </p>
</div>`;

  // Key Facts bullets
  const keyFactsHtml = bullets.length > 0 ? `
<div class="aeo-key-facts" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
  <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">📋 ${language === 'fr' ? 'Points clés' : 'Key Facts'}</h3>
  <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
    ${bullets.map(b => `<li style="margin-bottom: 6px; color: #4b5563;">${b}</li>`).join('')}
  </ul>
</div>` : '';

  // FAQ Section
  const faqHtml = faq.length > 0 ? `
<div class="aeo-faq" style="margin-top: 32px;">
  <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">❓ FAQ</h2>
  ${faq.map(item => `
  <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px;">
    <h4 style="font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">${item.q}</h4>
    <p style="font-size: 14px; color: #4b5563; margin: 0;">${item.a}</p>
  </div>`).join('')}
</div>` : '';

  // Full article with AEO structure
  return `<article class="aeo-article" itemscope itemtype="https://schema.org/Article">
<h1 itemprop="headline" style="font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 20px; line-height: 1.3;">
  ${question.replace(/[?"]/g, '')}
</h1>

${answerBoxHtml}

${keyFactsHtml}

<div class="aeo-content" style="color: #374151; line-height: 1.7;">
  <p style="font-size: 16px; margin-bottom: 16px;">
    ${language === 'fr' 
      ? `Cette réponse a été optimisée pour être facilement citée par les assistants IA comme ${platformName}. Chez ${storeName}, nous nous engageons à fournir des informations claires et précises.`
      : `This answer has been optimized to be easily cited by AI assistants like ${platformName}. At ${storeName}, we are committed to providing clear and accurate information.`
    }
  </p>
  
  ${bullets.length > 0 ? `
  <h2 style="font-size: 22px; font-weight: 700; color: #111827; margin-top: 32px; margin-bottom: 16px;">
    ${language === 'fr' ? '📌 Ce qu\'il faut retenir' : '📌 What to remember'}
  </h2>
  <ul style="padding-left: 20px; list-style-type: disc;">
    ${bullets.map(b => `<li style="margin-bottom: 8px;">${b}</li>`).join('')}
  </ul>
  ` : ''}
</div>

${faqHtml}

<footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
  <p style="font-size: 12px; color: #9ca3af;">
    ${language === 'fr' 
      ? `Contenu optimisé AEO par ${storeName} — Conçu pour être cité par ${platformName}, Gemini, et autres IA.`
      : `AEO-optimized content by ${storeName} — Designed to be cited by ${platformName}, Gemini, and other AI.`
    }
  </p>
</footer>
</article>`;
}
