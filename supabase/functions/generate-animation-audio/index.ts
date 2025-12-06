import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// English narrations for 11 slides
const SLIDE_NARRATIONS = [
  "NewAI — the AI that boosts your Shopify SEO automatically. Connect Shopify, Google, Facebook and Instagram in one click!",
  "Real results: 3x faster workflow, 50% more traffic, save 10 hours weekly, and Top 10 Google ranking!",
  "Showcase your products in style! Professional photos, 3D animations, and dynamic galleries!",
  "Dominate Google Search! Appear in Search, Shopping, and Discover with AI-powered optimization!",
  "Watch your SEO score skyrocket! From struggling to thriving — all fully automated!",
  "Transform your SEO from 34% to 95%! AI optimization that actually works!",
  "See the difference! Before: plain white. After: Vision AI professional staging. Plus 68% more conversions!",
  "Auto-generated landing pages with AI — conversion-optimized HTML ready to deploy in seconds!",
  "AI Vision analyzes and enhances every product image. Alt text, backgrounds, optimization — all automatic!",
  "Google Shopping ready! XML feed, category mapping, GTIN validation. Zero errors guaranteed!",
  "Start your free trial today. No credit card required. Join 500+ successful sellers!"
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: { slideIndex: number; url: string; success: boolean; error?: string }[] = [];
    const voiceId = "9BWtsMINqrJLrRacOk9x"; // Aria voice

    console.log('Starting audio generation for', SLIDE_NARRATIONS.length, 'slides');

    for (let index = 0; index < SLIDE_NARRATIONS.length; index++) {
      const text = SLIDE_NARRATIONS[index];
      const fileName = `animationads/slide-${index}.mp3`;

      try {
        console.log(`Generating audio ${index + 1}/${SLIDE_NARRATIONS.length}...`);

        // Generate audio with ElevenLabs
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioData = new Uint8Array(audioBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-cache')
          .upload(fileName, audioData, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload error: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('audio-cache')
          .getPublicUrl(fileName);

        results.push({
          slideIndex: index,
          url: urlData.publicUrl,
          success: true,
        });

        console.log(`✓ Slide ${index} audio saved: ${urlData.publicUrl}`);

        // Small delay to avoid rate limits
        if (index < SLIDE_NARRATIONS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (err) {
        console.error(`Failed to generate audio for slide ${index}:`, err);
        results.push({
          slideIndex: index,
          url: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${SLIDE_NARRATIONS.length} audios generated`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: successCount,
        total: SLIDE_NARRATIONS.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
