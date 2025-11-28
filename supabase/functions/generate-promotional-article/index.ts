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
    const { title, category, keywords } = requestBody;

    if (!title) {
      throw new Error("Title is required");
    }

    const systemPrompt = `You are an expert SEO content writer for NewAI, a SaaS platform that helps Shopify merchants optimize their stores with AI.

Write a comprehensive, SEO-optimized blog article in HTML format. The article should:
- Be 1500-2000 words
- Include proper HTML headings (h2, h3)
- Use bullet points and numbered lists where appropriate
- Include internal CTAs mentioning NewAI features
- Be informative and valuable to Shopify merchants
- Target the given keywords naturally
- Include a compelling introduction and conclusion

NewAI features to mention when relevant:
- AI-powered SEO optimization (titles, descriptions, alt texts)
- Google Merchant Center feed automation
- AI chat assistant for customer support
- Landing page generation
- Blog automation
- Product data enrichment
- Image optimization (white backgrounds, AI backgrounds)

Return a JSON object with:
{
  "content": "Full HTML article content with h2, h3, p, ul, li tags",
  "meta_description": "SEO meta description (160 chars max)",
  "excerpt": "Short excerpt for cards (100 chars max)",
  "read_time": estimated reading time in minutes (number)
}`;

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
          { 
            role: "user", 
            content: `Write a blog article with:
Title: ${title}
Category: ${category || "SEO"}
Keywords/Focus: ${keywords || "shopify seo, ai optimization, e-commerce"}

Return ONLY the JSON object, no other text.`
          }
        ],
        temperature: 0.7,
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
    let articleData = {
      content: "",
      meta_description: "",
      excerpt: "",
      read_time: 5
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Use raw content if JSON parsing fails
      articleData.content = content;
      articleData.meta_description = title;
      articleData.excerpt = title;
    }

    return new Response(JSON.stringify(articleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error generating article:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
