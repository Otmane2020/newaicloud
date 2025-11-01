import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const articles = [
  {
    title: "How AI-Powered SEO Automation Can 10x Your Shopify Traffic",
    slug: "ai-powered-seo-automation-shopify-traffic",
    category: "SEO",
    metaDescription: "Discover how NewAI's intelligent SEO automation transforms your Shopify store's visibility on Google, driving 10x more organic traffic without manual effort.",
    excerpt: "Manual SEO is dead. Learn how NewAI's AI-powered automation optimizes your entire Shopify store for search engines in minutes, not months.",
    readTime: 8
  },
  {
    title: "The Complete Guide to Shopify Product SEO Optimization in 2025",
    slug: "complete-guide-shopify-product-seo-2025",
    category: "SEO",
    metaDescription: "Master product SEO for Shopify in 2025. This comprehensive guide reveals AI-driven strategies to rank higher, convert more, and dominate your niche.",
    excerpt: "Product pages are your money makers. Learn the exact SEO framework NewAI uses to optimize thousands of Shopify products for maximum visibility and conversions.",
    readTime: 12
  },
  {
    title: "Why Manual SEO is Dead: The Rise of AI-Driven E-commerce Optimization",
    slug: "manual-seo-dead-ai-driven-optimization",
    category: "SEO",
    metaDescription: "Manual SEO optimization takes hundreds of hours. See how NewAI's artificial intelligence automates the entire process, delivering better results in fraction of the time.",
    excerpt: "Spending hours writing meta descriptions and title tags? AI has changed everything. Discover why smart merchants are switching to automated SEO.",
    readTime: 7
  },
  {
    title: "From Zero to Hero: How NewAI Transformed These Shopify Stores' Rankings",
    slug: "shopify-stores-ranking-transformation-case-studies",
    category: "SEO",
    metaDescription: "Real results from real stores. See how NewAI helped Shopify merchants increase organic traffic by 300%+ and dominate their Google rankings.",
    excerpt: "Case studies don't lie. Read how three Shopify stores went from page 10 to page 1 on Google using NewAI's intelligent SEO automation.",
    readTime: 10
  },
  {
    title: "Google Shopping Feed Optimization: The Ultimate Guide for Shopify Stores",
    slug: "google-shopping-feed-optimization-shopify",
    category: "Google Merchant",
    metaDescription: "Maximize your Google Shopping ROI with this complete optimization guide. Learn how NewAI automates feed management for better ad performance.",
    excerpt: "Your product feed makes or breaks your Google Shopping campaigns. Discover the AI-powered optimization strategies that drive 40% lower CPC and 2x ROAS.",
    readTime: 9
  },
  {
    title: "How to Fix Google Merchant Center Errors in Seconds with AI",
    slug: "fix-google-merchant-center-errors-ai",
    category: "Google Merchant",
    metaDescription: "Stop wasting hours fixing Google Merchant Center errors. NewAI's AI automatically detects and resolves feed issues before they impact your campaigns.",
    excerpt: "Merchant Center errors cost you sales every day. Learn how NewAI's intelligent error detection and auto-fix features keep your products live 24/7.",
    readTime: 6
  },
  {
    title: "Maximizing ROAS: AI-Powered Product Feed Management for Google Shopping",
    slug: "maximize-roas-ai-product-feed-google-shopping",
    category: "Google Merchant",
    metaDescription: "Achieve 200%+ ROAS on Google Shopping with AI-optimized product feeds. NewAI automatically enhances titles, descriptions, and attributes for maximum performance.",
    excerpt: "Poor product data = poor ad performance. See how NewAI's AI continuously optimizes your Google Shopping feed for higher CTR and lower acquisition costs.",
    readTime: 11
  },
  {
    title: "Why Every Shopify Store Needs an AI Sales Assistant in 2025",
    slug: "why-shopify-needs-ai-sales-assistant-2025",
    category: "AI Assistant",
    metaDescription: "AI chatbots are no longer optional. Discover why forward-thinking Shopify stores use NewAI's conversational assistant to boost sales and customer satisfaction.",
    excerpt: "24/7 customer support that never sleeps, never gets tired, and converts like your best salesperson. Welcome to the future of e-commerce.",
    readTime: 7
  },
  {
    title: "24/7 Customer Support: How AI Chatbots Increase Conversions by 40%",
    slug: "ai-chatbots-increase-conversions-customer-support",
    category: "AI Assistant",
    metaDescription: "Real data shows AI chat assistants boost conversion rates by 40%. Learn how NewAI's smart assistant handles customer questions and closes more sales.",
    excerpt: "Missing sales while you sleep? NewAI's AI assistant engages visitors instantly, answers questions accurately, and guides them to checkout—around the clock.",
    readTime: 8
  },
  {
    title: "The ROI of AI: How Smart Assistants Boost Average Order Value",
    slug: "ai-assistant-roi-boost-average-order-value",
    category: "AI Assistant",
    metaDescription: "AI assistants don't just answer questions—they upsell, cross-sell, and increase AOV by 35%. See how NewAI's smart recommendations drive more revenue per order.",
    excerpt: "What if your chatbot could recommend products like an expert salesperson? NewAI's AI assistant analyzes behavior in real-time to suggest the perfect upsells.",
    readTime: 9
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[GENERATE-PROMOTIONAL] Starting article generation...');

    const generatedArticles = [];

    for (const article of articles) {
      console.log(`[GENERATE-PROMOTIONAL] Generating: ${article.title}`);

      // Generate article content using Lovable AI
      const contentPrompt = `Write a comprehensive, engaging blog article about "${article.title}" for NewAI, a Shopify SEO automation platform.

Target audience: Shopify store owners, e-commerce managers, digital marketers.

Article must include:
1. **Hook**: Start with a compelling statistic or problem statement
2. **Problem**: Detail the pain points merchants face
3. **Solution**: Explain how NewAI solves these problems with AI
4. **Benefits**: List 5-7 key benefits with real examples
5. **Features**: Describe specific NewAI features (automated SEO, Google Merchant integration, AI chat assistant)
6. **Social Proof**: Include hypothetical success metrics (e.g., "stores see 300% traffic increase")
7. **How It Works**: Step-by-step explanation
8. **CTA**: Strong call-to-action to try NewAI free

Writing style:
- Professional but conversational
- Data-driven with specific numbers
- Action-oriented with clear benefits
- SEO-optimized with natural keyword usage
- 1800-2200 words
- Use H2 and H3 headings for structure
- Include bullet points and numbered lists

Format as clean HTML with proper semantic tags (<h2>, <h3>, <p>, <ul>, <ol>, <strong>).
Do NOT include a main <h1> title (it's added separately).
Include internal CTAs every 500 words linking to signup.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp',
          messages: [
            {
              role: 'user',
              content: contentPrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 4000
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;

      // Get featured image from Unsplash based on category
      const imageQueries: Record<string, string> = {
        'SEO': 'seo optimization analytics',
        'Google Merchant': 'google shopping ecommerce',
        'AI Assistant': 'ai chatbot customer service'
      };
      
      const imageQuery = imageQueries[article.category] || 'ecommerce technology';
      const featuredImage = `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80`; // Default tech image

      // Insert article into database
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/promotional_articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: article.title,
          slug: article.slug,
          meta_description: article.metaDescription,
          excerpt: article.excerpt,
          content: content,
          category: article.category,
          featured_image: featuredImage,
          read_time: article.readTime,
          published: true,
          published_at: new Date().toISOString()
        })
      });

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        console.error(`[GENERATE-PROMOTIONAL] Insert error for ${article.title}:`, error);
        continue;
      }

      const insertedArticle = await insertResponse.json();
      generatedArticles.push(insertedArticle);

      console.log(`[GENERATE-PROMOTIONAL] ✓ Generated: ${article.title}`);
    }

    console.log(`[GENERATE-PROMOTIONAL] Successfully generated ${generatedArticles.length} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedArticles.length,
        articles: generatedArticles
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[GENERATE-PROMOTIONAL] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});