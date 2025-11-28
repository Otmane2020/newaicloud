import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {}

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const requestBody = await req.json().catch(() => ({}));
    const count = requestBody.count || 10;

    const systemPrompt = `You are an SEO content strategist for NewAI, a SaaS platform that helps Shopify merchants optimize their stores with AI. 

NewAI features include:
1. SEO Optimization - AI-powered SEO titles, meta descriptions, and alt texts
2. Google Merchant Feed - Automated product feed generation for Google Shopping
3. AI Assistant - Chat-based product recommendations and customer support
4. Landing Pages - AI-generated product landing pages
5. Blog Automation - Automated blog article generation
6. Product Enrichment - AI analysis and enhancement of product data
7. Collection Management - Smart collection optimization
8. Image Optimization - White background removal, AI backgrounds
9. Price Analysis - Competitor price tracking
10. Shopify Integration - Seamless sync with Shopify stores

Generate ${count} unique blog article topics that would:
- Attract Shopify merchants searching for SEO solutions
- Showcase NewAI's capabilities
- Target high-value keywords
- Provide genuine value to readers

Return a JSON array with this structure:
{
  "topics": [
    {
      "title": "Compelling article title (60 chars max)",
      "description": "Meta description (160 chars max)",
      "category": "One of: SEO, Google Merchant, AI Assistant, E-commerce, Shopify, Product Optimization, Landing Pages, Blog Automation",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}

Focus on topics like:
- How to improve Shopify SEO rankings
- Google Shopping optimization strategies
- AI tools for e-commerce
- Product page optimization techniques
- Conversion rate optimization
- E-commerce content marketing
- Shopify app recommendations
- Product feed management`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${count} SEO-optimized blog topic suggestions for the NewAI blog. Return ONLY the JSON array, no other text.` }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let topics = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        topics = parsed.topics || [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Provide fallback topics
      topics = [
        {
          title: "10 AI-Powered SEO Strategies for Shopify Stores in 2025",
          description: "Discover how AI can transform your Shopify store's SEO performance with automated optimization techniques.",
          category: "SEO",
          keywords: ["shopify seo", "ai seo tools", "ecommerce optimization"]
        },
        {
          title: "Complete Guide to Google Merchant Center Setup for Shopify",
          description: "Step-by-step guide to setting up and optimizing your Google Merchant Center feed for maximum visibility.",
          category: "Google Merchant",
          keywords: ["google merchant center", "product feed", "google shopping"]
        },
        {
          title: "How AI Chatbots Increase E-commerce Conversion Rates",
          description: "Learn how AI-powered chat assistants can boost your online store's conversion rates and customer satisfaction.",
          category: "AI Assistant",
          keywords: ["ai chatbot", "conversion optimization", "customer support"]
        },
        {
          title: "Product Page Optimization: The Ultimate Checklist",
          description: "A comprehensive checklist to optimize your product pages for better SEO and higher conversions.",
          category: "Product Optimization",
          keywords: ["product page seo", "conversion rate", "shopify products"]
        },
        {
          title: "Automated Content Marketing for E-commerce Success",
          description: "How to leverage AI-generated content to scale your e-commerce marketing efforts effectively.",
          category: "Blog Automation",
          keywords: ["content marketing", "blog automation", "ai content"]
        }
      ];
    }

    return new Response(JSON.stringify({ topics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error generating topics:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      topics: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
