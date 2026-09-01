import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// English narrations for each slide
const SLIDE_NARRATIONS = [
  "NewAI. AI-powered e-commerce. Transform your Shopify store.", // 0 - Hook
  "Real results. Three times faster. Fifty percent more traffic.", // 1 - Stats
  "Your products. Everywhere on Google.", // 2 - Products
  "Dominate Google Search, Shopping, and Discover.", // 3 - Google
  "SEO score optimization. From thirty to ninety percent.", // 4 - SEO Score
  "Before and after. See the difference.", // 5 - Before/After
  "Vision AI turns boring photos into high-converting visuals.", // 6 - Vision AI
  "AI landing pages. Professional design in seconds.", // 7 - Landing Page
  "Smart background removal. White backgrounds. AI enhancement.", // 8 - Image Enhancement
  "Google Shopping ready. Maximum visibility.", // 9 - Google Shopping
  "Start your free trial today. NewAI dot sale.", // 10 - CTA
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: { slideIndex: number; url: string | null; error?: string }[] = [];

    // Check if bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'audio-cache');
    
    if (!bucketExists) {
      await supabase.storage.createBucket('audio-cache', { public: true });
      console.log('Created audio-cache bucket');
    }

    // Generate audio for each slide sequentially with delay
    for (let i = 0; i < SLIDE_NARRATIONS.length; i++) {
      const text = SLIDE_NARRATIONS[i];
      const filePath = `animationads/slide-${i}.mp3`;

      // Check if already exists
      const { data: existingFile } = await supabase.storage
        .from('audio-cache')
        .list('animationads', { search: `slide-${i}.mp3` });

      if (existingFile && existingFile.length > 0) {
        const { data: urlData } = supabase.storage
          .from('audio-cache')
          .getPublicUrl(filePath);
        
        results.push({ slideIndex: i, url: urlData.publicUrl });
        console.log(`Slide ${i} already exists, skipping`);
        continue;
      }

      try {
        console.log(`Generating audio for slide ${i}: "${text}"`);
        
        // Call ElevenLabs API
        const response = await fetch(
          'https://api.elevenlabs.io/v1/text-to-speech/9Qd2dAu97Sqnt7S88BrY',
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ElevenLabs error for slide ${i}:`, errorText);
          results.push({ slideIndex: i, url: null, error: errorText });
          continue;
        }

        const audioBuffer = await response.arrayBuffer();
        const audioData = new Uint8Array(audioBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('audio-cache')
          .upload(filePath, audioData, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for slide ${i}:`, uploadError);
          results.push({ slideIndex: i, url: null, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('audio-cache')
          .getPublicUrl(filePath);

        results.push({ slideIndex: i, url: urlData.publicUrl });
        console.log(`Successfully generated and uploaded slide ${i}`);

        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error processing slide ${i}:`, error);
        results.push({ slideIndex: i, url: null, error: String(error) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Generated ${results.filter(r => r.url).length}/${SLIDE_NARRATIONS.length} audio files`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
