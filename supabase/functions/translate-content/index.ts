import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLang, context = "" } = await req.json();

    if (!text || !targetLang) {
      throw new Error("Missing required fields: text and targetLang");
    }

    // Si la langue cible est le français, retourner le texte tel quel
    if (targetLang === "fr" || targetLang === "fr-FR") {
      return new Response(JSON.stringify({ translation: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_AI_API_KEY") || ""}`,
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the provided text to ${targetLang}. 
Context: ${context || "E-commerce SaaS platform for Shopify optimization"}
Rules:
- Keep HTML tags, variables like {variable}, and special characters intact
- Maintain the tone and style
- Return ONLY the translated text, no explanations
- Keep technical terms in English when appropriate (SEO, AI, etc.)`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
