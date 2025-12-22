import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TRANSLATE_API_KEY = "AIzaSyDfUyKqHIFVw0H0wDXPGqhoVU5V3vEFZGk";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface TranslateRequest {
  text: string | string[];
  targetLang: string;
  sourceLang?: string;
}

// Language code to full name mapping for AI prompt
const languageNames: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  tr: "Turkish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  el: "Greek",
  he: "Hebrew",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ro: "Romanian",
  hu: "Hungarian",
  uk: "Ukrainian",
  bg: "Bulgarian",
  hr: "Croatian",
  sk: "Slovak",
  sl: "Slovenian",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
};

// Fallback translation using Lovable AI Gateway
async function translateWithAI(texts: string[], targetLang: string, sourceLang?: string): Promise<{ translatedText: string; detectedSourceLanguage?: string }[]> {
  const targetLanguageName = languageNames[targetLang] || targetLang;
  const sourceLanguageName = sourceLang ? (languageNames[sourceLang] || sourceLang) : "auto-detect";
  
  console.log(`[google-translate] Using Lovable AI fallback for ${texts.length} text(s)`);
  
  // For batch translation, we'll process in chunks to avoid token limits
  const results: { translatedText: string; detectedSourceLanguage?: string }[] = [];
  const chunkSize = 20;
  
  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    
    const prompt = `You are a professional translator. Translate the following text(s) to ${targetLanguageName}. 
${sourceLang ? `Source language: ${sourceLanguageName}` : "Detect the source language automatically."}

IMPORTANT: Return ONLY a valid JSON array with the translations, no explanation or markdown. Each element should be an object with "translatedText" and optionally "detectedSourceLanguage" (2-letter code like "fr", "en", etc).

Texts to translate:
${chunk.map((t, idx) => `[${idx}]: "${t}"`).join("\n")}

Return format (ONLY JSON, no markdown code blocks):
[{"translatedText": "translated text here", "detectedSourceLanguage": "fr"}]`;

    // Retry logic for transient errors (503, connection issues)
    let response: Response | null = null;
    let lastError: string = "";
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        const errorText = await response.text();
        lastError = `${response.status}: ${errorText}`;
        console.error(`[google-translate] Lovable AI attempt ${attempt}/${maxRetries} failed:`, response.status, errorText);
        
        // Don't retry for client errors (4xx except 429)
        if (response.status === 429) {
          throw new Error("AI translation rate limited, please try again later");
        }
        if (response.status === 402) {
          throw new Error("AI translation requires credits, please add funds");
        }
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`AI translation failed: ${response.status}`);
        }
        
        // For 5xx errors, wait and retry
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s
          console.log(`[google-translate] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error(`[google-translate] Fetch error attempt ${attempt}/${maxRetries}:`, lastError);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(`AI translation failed after ${maxRetries} attempts: ${lastError}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log(`[google-translate] AI response for chunk ${i / chunkSize + 1}:`, content.substring(0, 200));
    
    // Parse JSON from response
    try {
      // Extract JSON array from response (handle markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      
      const translations = JSON.parse(jsonStr);
      if (Array.isArray(translations)) {
        results.push(...translations);
      } else {
        // If single object returned, wrap in array
        results.push(translations);
      }
    } catch (parseError) {
      console.error("[google-translate] Failed to parse AI response:", content);
      // Fallback: use the raw content as translation for single text
      if (chunk.length === 1) {
        results.push({ translatedText: content.trim() });
      } else {
        // For multiple texts, try to extract anything useful
        chunk.forEach((originalText) => {
          results.push({ translatedText: originalText }); // Return original if parsing fails
        });
      }
    }
  }
  
  return results;
}

// Try Google Translate first, fallback to AI
async function translateWithGoogle(textsToTranslate: string[], targetLang: string, sourceLang?: string): Promise<{ translations: any[]; usedFallback: boolean }> {
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
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[google-translate] Google API error:", errorText);
    
    // Check if it's a rate limit error - use AI fallback
    if (response.status === 403 || response.status === 429) {
      console.log("[google-translate] Rate limit hit, using Lovable AI fallback");
      
      if (!LOVABLE_API_KEY) {
        console.error("[google-translate] LOVABLE_API_KEY not configured");
        throw new Error("Google API rate limited and AI fallback not available");
      }
      
      const aiTranslations = await translateWithAI(textsToTranslate, targetLang, sourceLang);
      return { translations: aiTranslations, usedFallback: true };
    }
    
    throw new Error(`Translation API error: ${errorText}`);
  }

  const data = await response.json();
  
  const translations = data.data?.translations?.map((t: any) => ({
    translatedText: t.translatedText,
    detectedSourceLanguage: t.detectedSourceLanguage,
  })) || [];

  return { translations, usedFallback: false };
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
      return new Response(JSON.stringify({ status: "ok", hasFallback: !!LOVABLE_API_KEY }), {
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
    
    const { translations, usedFallback } = await translateWithGoogle(textsToTranslate, targetLang, sourceLang);

    console.log(`[google-translate] Successfully translated ${translations.length} text(s)${usedFallback ? " (via Lovable AI fallback)" : ""}`);

    return new Response(
      JSON.stringify({
        translations,
        // If single text was passed, return single translation for convenience
        translation: translations.length === 1 ? translations[0].translatedText : undefined,
        usedFallback,
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
