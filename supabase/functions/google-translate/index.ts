import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TRANSLATE_API_KEY = "AIzaSyDfUyKqHIFVw0H0wDXPGqhoVU5V3vEFZGk";

interface TranslateRequest {
  text: string | string[];
  targetLang: string;
  sourceLang?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, targetLang, sourceLang } = body as TranslateRequest;

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing text or targetLang" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle single string or array of strings
    const textsToTranslate = Array.isArray(text) ? text : [text];
    
    // Build URL with query params for Google Translate API v2
    const url = new URL("https://translation.googleapis.com/language/translate/v2");
    url.searchParams.set("key", GOOGLE_TRANSLATE_API_KEY);
    
    const requestBody: any = {
      q: textsToTranslate,
      target: targetLang,
      format: "text",
    };
    
    if (sourceLang) {
      requestBody.source = sourceLang;
    }

    console.log(`[google-translate] Translating ${textsToTranslate.length} text(s) to ${targetLang}`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://newai.sale",
        "X-Referer": "https://newai.sale",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[google-translate] API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Translation API error", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract translations
    const translations = data.data?.translations?.map((t: any) => ({
      translatedText: t.translatedText,
      detectedSourceLanguage: t.detectedSourceLanguage,
    })) || [];

    console.log(`[google-translate] Successfully translated ${translations.length} text(s)`);

    return new Response(
      JSON.stringify({
        translations,
        // If single text was passed, return single translation for convenience
        translation: translations.length === 1 ? translations[0].translatedText : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[google-translate] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
