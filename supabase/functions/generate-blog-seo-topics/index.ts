import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestBody = await req.json().catch(() => ({}));
  if (requestBody?.healthCheck === true) {
    return new Response(JSON.stringify({ status: 'healthy' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
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

Return ONLY valid JSON with this structure:
{
  "topics": [
    {
      "title": "Compelling article title (60 chars max)",
      "description": "Meta description (160 chars max)",
      "category": "One of: SEO, Google Merchant, AI Assistant, E-commerce, Shopify, Product Optimization, Landing Pages, Blog Automation",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}`;

    const aiResult = await routeAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${count} SEO-optimized blog topic suggestions for the NewAI blog. Return ONLY valid JSON.` },
      ],
      temperature: 0.8,
      maxTokens: 3000,
    });

    let topics: any[] = [];
    try {
      const content = aiResult.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      throw new Error("Failed to parse AI-generated blog topics");
    }

    return new Response(JSON.stringify({
      topics,
      ai_provider: aiResult.provider,
      ai_model: aiResult.model,
    }), {
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
