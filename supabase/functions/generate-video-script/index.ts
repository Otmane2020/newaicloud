import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  creditErrorResponse,
  refundCredits,
  reserveCredits,
  type CreditReservation,
} from "../_shared/credit-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let creditReservation: CreditReservation | null = null;

  try {
    const body = await req.json();
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { language = "fr", audience = "shopify-sellers", context = "" } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // A video script is advanced text content (2 credits). Full video rendering
    // remains a separate, more expensive action.
    creditReservation = await reserveCredits(req, "content", {
      feature: "generate-video-script",
      language,
      audience,
    });

    const systemPrompt = `You are an expert video ad scriptwriter specializing in SaaS and e-commerce products.
Your task is to generate high-impact, scroll-stopping video ad scripts optimized for TikTok, Instagram Reels, and Facebook.

Key principles:
- Hook must capture attention in under 3 seconds
- Use emotional triggers and pain points
- Keep language punchy and dynamic
- Include clear benefits and social proof when possible
- End with a strong, actionable CTA

Output ONLY valid JSON in the following format:
{
  "hook": "Attention-grabbing opening line (max 10 words)",
  "problem": "Pain point description (max 20 words)",
  "solution": "How the product solves it (max 25 words)",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "cta": "Call to action (max 8 words)"
}`;

    const userPrompt = `Generate a video ad script for NEWAI, an AI-powered Shopify optimization tool.

Target Audience: ${audience}
Language: ${language === "fr" ? "French" : "English"}
${context ? `Additional Context: ${context}` : ""}

NEWAI helps e-commerce sellers:
- Generate optimized product descriptions with AI
- Create professional product images with AI backgrounds
- Automate SEO optimization
- Generate blog articles for SEO
- Sync everything to Shopify automatically

Generate a compelling, ${language === "fr" ? "French" : "English"} video ad script that will stop scrollers and drive conversions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      await refundCredits(creditReservation, `provider_http_${response.status}`);
      creditReservation = null;

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later.", credits_refunded: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI provider temporarily unavailable. No Nexora credits were used.", credits_refunded: true }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let script;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      script = language === "fr" ? {
        hook: "⚡ Tu perds des ventes à cause de mauvaises photos ?",
        problem: "Créer des fiches produits prend des heures et ne convertit pas.",
        solution: "NEWAI génère descriptions, images et SEO en 12 secondes.",
        benefits: [
          "Images professionnelles générées par IA",
          "Descriptions SEO optimisées automatiquement",
          "Synchronisation Shopify en 1 clic"
        ],
        cta: "Teste NEWAI gratuitement 🚀"
      } : {
        hook: "⚡ Losing sales because of bad product photos?",
        problem: "Creating product listings takes hours and doesn't convert.",
        solution: "NEWAI generates descriptions, images, and SEO in 12 seconds.",
        benefits: [
          "Professional AI-generated images",
          "Auto-optimized SEO descriptions",
          "One-click Shopify sync"
        ],
        cta: "Try NEWAI free 🚀"
      };
    }

    return new Response(
      JSON.stringify({
        script,
        credit_cost: creditReservation.cost,
        credit_balance: creditReservation.balanceAfter,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const creditResponse = creditErrorResponse(error, corsHeaders);
    if (creditResponse) return creditResponse;

    if (creditReservation) {
      await refundCredits(
        creditReservation,
        error instanceof Error ? error.message.slice(0, 180) : "video_script_failed",
      );
    }

    console.error("Error in generate-video-script:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", credits_refunded: !!creditReservation }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});