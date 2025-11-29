import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Topics based on NewAI features - 5 EN + 5 FR per day
const TOPICS_EN = [
  { theme: 'seo_automation', title: 'How AI-Powered SEO Automation Transforms Shopify Stores', category: 'SEO', keywords: ['shopify seo', 'ai automation', 'ecommerce optimization'] },
  { theme: 'product_optimization', title: 'Mastering Product Title and Description Optimization for Higher Rankings', category: 'SEO', keywords: ['product seo', 'title optimization', 'shopify products'] },
  { theme: 'google_merchant', title: 'Google Merchant Center: Complete Guide to Feed Optimization', category: 'Google Merchant', keywords: ['google shopping', 'product feed', 'merchant center'] },
  { theme: 'alt_text', title: 'AI-Generated Alt Text: Boost Image SEO Without Manual Work', category: 'SEO', keywords: ['alt text', 'image seo', 'accessibility'] },
  { theme: 'ai_chatbot', title: 'Why Every Shopify Store Needs an AI Sales Assistant', category: 'AI Assistant', keywords: ['ai chatbot', 'customer service', 'sales automation'] },
  { theme: 'landing_pages', title: 'AI-Generated Landing Pages That Convert: A Complete Guide', category: 'Landing Pages', keywords: ['landing pages', 'conversion', 'ai generation'] },
  { theme: 'blog_automation', title: 'Automated Blog Content: The Secret to Sustainable SEO Growth', category: 'Blog Automation', keywords: ['blog automation', 'content marketing', 'ai writing'] },
  { theme: 'collection_seo', title: 'Collection Page Optimization: Hidden SEO Opportunities', category: 'SEO', keywords: ['collection seo', 'category pages', 'shopify collections'] },
  { theme: 'bulk_optimization', title: 'Bulk SEO Optimization: Save Hours with AI Automation', category: 'Product Optimization', keywords: ['bulk seo', 'automation', 'time saving'] },
  { theme: 'roas_tracking', title: 'Understanding ROAS: Maximize Your Ad Spend with AI Insights', category: 'Google Merchant', keywords: ['roas', 'advertising', 'google ads'] },
];

const TOPICS_FR = [
  { theme: 'seo_automation', title: "Comment l'IA révolutionne le SEO de votre boutique Shopify", category: 'SEO', keywords: ['seo shopify', 'automatisation ia', 'optimisation ecommerce'] },
  { theme: 'product_optimization', title: 'Optimisation des titres et descriptions produits pour un meilleur référencement', category: 'SEO', keywords: ['seo produit', 'titre optimisé', 'shopify produits'] },
  { theme: 'google_merchant', title: 'Google Merchant Center : Guide complet pour optimiser votre flux', category: 'Google Merchant', keywords: ['google shopping', 'flux produits', 'merchant center'] },
  { theme: 'alt_text', title: "Textes alternatifs IA : Boostez le SEO de vos images automatiquement", category: 'SEO', keywords: ['texte alt', 'seo images', 'accessibilité'] },
  { theme: 'ai_chatbot', title: "Pourquoi chaque boutique Shopify a besoin d'un assistant IA", category: 'AI Assistant', keywords: ['chatbot ia', 'service client', 'automatisation vente'] },
  { theme: 'landing_pages', title: 'Pages de vente générées par IA : Guide complet pour convertir', category: 'Landing Pages', keywords: ['landing pages', 'conversion', 'génération ia'] },
  { theme: 'blog_automation', title: 'Blog automatisé : Le secret pour une croissance SEO durable', category: 'Blog Automation', keywords: ['blog automatisé', 'content marketing', 'rédaction ia'] },
  { theme: 'collection_seo', title: 'Optimisation des collections : Opportunités SEO cachées', category: 'SEO', keywords: ['seo collection', 'pages catégories', 'collections shopify'] },
  { theme: 'bulk_optimization', title: "Optimisation SEO en masse : Gagnez des heures avec l'IA", category: 'Product Optimization', keywords: ['seo masse', 'automatisation', 'gain temps'] },
  { theme: 'roas_tracking', title: "Comprendre le ROAS : Maximisez vos dépenses publicitaires avec l'IA", category: 'Google Merchant', keywords: ['roas', 'publicité', 'google ads'] },
];

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

    const { days = 7 } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[SCHEDULE-BLOG] Scheduling ${days * 10} articles for ${days} days...`);

    const scheduledArticles = [];
    const now = new Date();

    for (let day = 0; day < days; day++) {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + day);
      scheduledDate.setHours(9, 0, 0, 0); // 9:00 AM

      // Pick 5 random EN topics for this day
      const shuffledEN = [...TOPICS_EN].sort(() => Math.random() - 0.5);
      const dayTopicsEN = shuffledEN.slice(0, 5);

      // Pick 5 random FR topics for this day
      const shuffledFR = [...TOPICS_FR].sort(() => Math.random() - 0.5);
      const dayTopicsFR = shuffledFR.slice(0, 5);

      // Schedule EN articles
      for (let i = 0; i < dayTopicsEN.length; i++) {
        const topic = dayTopicsEN[i];
        const articleDate = new Date(scheduledDate);
        articleDate.setHours(9 + i, 0, 0, 0); // Spread throughout the day

        const slug = topic.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        scheduledArticles.push({
          title: topic.title,
          slug: `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: topic.category,
          language: 'en',
          status: 'scheduled',
          scheduled_for: articleDate.toISOString(),
          topic_theme: topic.theme,
          keywords: topic.keywords,
        });
      }

      // Schedule FR articles
      for (let i = 0; i < dayTopicsFR.length; i++) {
        const topic = dayTopicsFR[i];
        const articleDate = new Date(scheduledDate);
        articleDate.setHours(14 + i, 0, 0, 0); // Afternoon for FR

        const slug = topic.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        scheduledArticles.push({
          title: topic.title,
          slug: `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: topic.category,
          language: 'fr',
          status: 'scheduled',
          scheduled_for: articleDate.toISOString(),
          topic_theme: topic.theme,
          keywords: topic.keywords,
        });
      }
    }

    // Insert all scheduled articles
    const { data: inserted, error } = await supabase
      .from('scheduled_blog_articles')
      .insert(scheduledArticles)
      .select();

    if (error) {
      throw error;
    }

    console.log(`[SCHEDULE-BLOG] ✅ Scheduled ${inserted?.length || 0} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: inserted?.length || 0,
        days,
        articles: inserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCHEDULE-BLOG] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
