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
    const { audio } = await req.json();

    if (!audio) {
      throw new Error("Audio data is required");
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("Lovable API key not configured");
    }

    console.log("Transcribing audio with Gemini...");

    // Use Lovable AI (Gemini 2.5 Flash) for audio transcription
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcris cet audio en français. Retourne uniquement le texte transcrit, sans commentaires ni formatage."
              },
              {
                type: "audio",
                audio: audio // base64 encoded audio
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Lovable AI error:", error);
      throw new Error(`Transcription error: ${error}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No transcription returned from AI");
    }

    console.log("Transcription successful:", text);

    return new Response(
      JSON.stringify({ 
        text: text.trim()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("STT error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
