import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { text } = body;

    if (!text) {
      throw new Error("Text is required");
    }

    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenlabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    // Call ElevenLabs TTS API with high-quality voice (Roger - male voice)
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/CwhRBWXzGAHq8TQ4Fs17", {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS error: ${error}`);
    }

    // Get audio as array buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: "mp3"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("TTS error:", error);
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
