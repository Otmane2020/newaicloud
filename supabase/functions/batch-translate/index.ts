import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationKey {
  key: string;
  value: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keys, targetLang, context = "E-commerce SaaS platform" } = await req.json();

    if (!keys || !Array.isArray(keys) || !targetLang) {
      throw new Error("Missing required fields: keys (array) and targetLang");
    }

    // If target language is French, return original texts
    if (targetLang === "fr" || targetLang === "fr-FR") {
      const translations: Record<string, string> = {};
      keys.forEach((item: TranslationKey) => {
        translations[item.key] = item.value;
      });
      return new Response(JSON.stringify({ translations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Batch translating ${keys.length} keys to ${targetLang}`);

    // Prepare batch translation prompt
    const translationItems = keys.map((item: TranslationKey, index: number) => 
      `${index + 1}. KEY: "${item.key}" | TEXT: "${item.value}"`
    ).join('\n');

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
            content: `You are a professional translator. Translate the provided texts to ${targetLang}.
Context: ${context}

CRITICAL RULES:
- Return ONLY a valid JSON object with the format: { "key": "translated_text", ... }
- Keep HTML tags, variables like {variable}, and special characters intact
- Maintain the tone and style
- Keep technical terms in English when appropriate (SEO, AI, API, etc.)
- Do NOT add any explanations, markdown formatting, or extra text
- The response must be parseable JSON`,
          },
          {
            role: "user",
            content: `Translate these texts to ${targetLang}:\n\n${translationItems}\n\nReturn ONLY a JSON object with keys and translated values.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI translation API error:", errorText);
      throw new Error(`AI translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();
    
    console.log("Raw AI response:", rawContent);

    // Clean the response - remove markdown code blocks if present
    let cleanContent = rawContent;
    if (rawContent.startsWith('```json')) {
      cleanContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (rawContent.startsWith('```')) {
      cleanContent = rawContent.replace(/```\n?/g, '');
    }

    // Parse the translations
    let translations: Record<string, string>;
    try {
      translations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanContent);
      throw new Error("AI returned invalid JSON format");
    }

    console.log(`Successfully translated ${Object.keys(translations).length} keys`);

    // Insert translations into database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const insertData = keys.map((item: TranslationKey) => ({
      key: item.key,
      language: targetLang,
      value: translations[item.key] || item.value,
      context: context,
      ai_generated: true,
      reviewed: false
    }));

    const { error: insertError } = await supabase
      .from('translations')
      .upsert(insertData, { 
        onConflict: 'key,language',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('Error inserting translations:', insertError);
    } else {
      console.log(`Inserted ${insertData.length} translations into database`);
    }

    return new Response(JSON.stringify({ translations, inserted: !insertError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch translation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
