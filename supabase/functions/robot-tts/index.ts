import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/* ---------------------------------------------
   GLOBAL CORS — autorise requêtes web/app
--------------------------------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------------------------------------
   Convert ArrayBuffer → Base64 safely
--------------------------------------------- */
function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 8192;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = body?.text?.trim();

    // 🔍 Health Check
    if (body?.health === true) {
      return Response.json({ status: "ok", service: "ElevenLabs-TTS" }, { headers: corsHeaders });
    }

    if (!text || text.length < 2) {
      return Response.json(
        { audio: null, quotaExceeded: false, error: "Missing or empty text input" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (text.length > 550) {
      return Response.json(
        { error: "Text too long. Max = 550 chars", received: text.length },
        { status: 400, headers: corsHeaders },
      );
    }

    const API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!API_KEY) throw new Error("Missing ELEVENLABS_API_KEY");

    console.log("🎤 Generating TTS…", text.slice(0, 60) + "...");

    /* ---------------------------------------
       🔥 ElevenLabs Request
       Voice: 9Qd2dAu97Sqnt7S88BrY (male voice)
    ---------------------------------------- */
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/9Qd2dAu97Sqnt7S88BrY", {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.78,
          style: 0.23,
          use_speaker_boost: true,
        },
      }),
    });

    // 🛑 Quota / Error handling clean
    if (!res.ok) {
      const errorText = await res.text();
      console.warn("❗ Eleven error:", errorText);

      if (errorText.includes("quota")) {
        return Response.json(
          {
            audio: null,
            quotaExceeded: true,
            message: "Quota exceeded — voice skipped gracefully",
          },
          { headers: corsHeaders },
        );
      }
      throw new Error(errorText);
    }

    const audioBuffer = await res.arrayBuffer();
    const base64Audio = toBase64(audioBuffer);

    return Response.json(
      {
        audio: base64Audio,
        voice: "9Qd2dAu97Sqnt7S88BrY",
        size: audioBuffer.byteLength,
        format: "mp3",
        success: true,
        preview_url: `data:audio/mp3;base64,${base64Audio}`,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("🛑 TTS Error:", errorMessage);
    return Response.json({ success: false, error: errorMessage }, { status: 500, headers: corsHeaders });
  }
});
