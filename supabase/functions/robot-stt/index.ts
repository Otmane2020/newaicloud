import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Auto detect mime for audio
function detectMime(base64: string) {
  if (base64.startsWith("/+MY")) return "audio/mpeg"; // mp3
  if (base64.startsWith("GkXf")) return "audio/webm"; // webm
  if (base64.startsWith("UklG")) return "audio/wav"; // wav
  if (base64.startsWith("T2dn")) return "audio/ogg"; // ogg
  return "audio/webm"; // fallback
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, translateTo = "fr" } = await req.json();

    if (!audio) {
      return new Response(JSON.stringify({ error: "Missing 'audio' base64 field." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not set in edge config!");
    }

    const mime = detectMime(audio);
    const audioDataUri = `data:${mime};base64,${audio}`;

    console.log("🎧 Audio received, sending to Gemini STT...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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
                text:
                  translateTo === "fr"
                    ? "Transcris cet audio en français. Réponds uniquement le texte propre, sans commentaires."
                    : "Transcribe this audio in English. Reply only with the clean text.",
              },
              {
                type: "audio_url",
                audio_url: { url: audioDataUri },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Gemini STT Error:", error);
      throw new Error(error);
    }

    const result = await response.json();
    const text = result?.choices?.[0]?.message?.content?.trim();

    if (!text) throw new Error("AI returned empty response");

    console.log("✅ Transcription successful:", text);

    return new Response(
      JSON.stringify({
        text,
        wordCount: text.split(" ").length,
        language: translateTo,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected error";
    console.error("⚠ STT Handler Error:", err);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        tip: "Verify your base64 audio and LOVABLE_API_KEY.",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
