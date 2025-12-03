import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoGenerationRequest {
  mode: "image-to-video" | "text-to-video";
  // For image-to-video
  imageUrl?: string;
  // For text-to-video
  prompt?: string;
  // Common params
  duration?: number; // 2, 4, 6 seconds
  motionIntensity?: "subtle" | "medium" | "dynamic";
  style?: "cinematic" | "commercial" | "lifestyle";
  resolution?: "576x320" | "768x432" | "1024x576";
  healthCheck?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: VideoGenerationRequest = await req.json();

    // Health check
    if (body.healthCheck) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY not configured");
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const { mode, imageUrl, prompt, duration = 4, motionIntensity = "medium", style = "cinematic" } = body;

    console.log(`Generating video - Mode: ${mode}, Duration: ${duration}s, Style: ${style}`);

    let output: unknown;

    if (mode === "image-to-video") {
      if (!imageUrl) {
        throw new Error("imageUrl is required for image-to-video mode");
      }

      // Motion bucket affects movement intensity (0-255)
      const motionBucket = motionIntensity === "subtle" ? 50 : motionIntensity === "medium" ? 127 : 200;
      
      // Use Stable Video Diffusion for image-to-video
      console.log("Using Stable Video Diffusion for image animation...");
      output = await replicate.run(
        "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        {
          input: {
            input_image: imageUrl,
            motion_bucket_id: motionBucket,
            fps: 25,
            cond_aug: 0.02,
            decoding_t: 7,
            video_length: duration === 2 ? "14_frames_with_svd" : "25_frames_with_svd_xt",
          },
        }
      );
    } else if (mode === "text-to-video") {
      if (!prompt) {
        throw new Error("prompt is required for text-to-video mode");
      }

      // Build enhanced prompt based on style
      let enhancedPrompt = prompt;
      if (style === "cinematic") {
        enhancedPrompt = `${prompt}, cinematic lighting, 4K quality, professional videography, smooth camera movement`;
      } else if (style === "commercial") {
        enhancedPrompt = `${prompt}, commercial advertisement style, bright and vibrant, product showcase, professional`;
      } else if (style === "lifestyle") {
        enhancedPrompt = `${prompt}, lifestyle photography, natural lighting, warm tones, authentic feel`;
      }

      // Use zeroscope for text-to-video
      console.log("Using Zeroscope for text-to-video generation...");
      const numFrames = duration === 2 ? 24 : duration === 4 ? 36 : 48;
      
      output = await replicate.run(
        "cerspense/zeroscope_v2_xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
        {
          input: {
            prompt: enhancedPrompt,
            num_frames: numFrames,
            fps: 8,
            width: 576,
            height: 320,
            guidance_scale: 17.5,
            num_inference_steps: 50,
          },
        }
      );
    } else {
      throw new Error("Invalid mode. Use 'image-to-video' or 'text-to-video'");
    }

    console.log("Video generation completed:", output);

    // Output is typically a URL to the generated video
    const videoUrl = Array.isArray(output) ? output[0] : output;

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl,
        mode,
        duration,
        style,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating video:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
    
    // Check for billing/credits error
    const isBillingError = errorMessage.includes("402") || 
                           errorMessage.includes("Payment Required") || 
                           errorMessage.includes("Insufficient credit");
    
    return new Response(
      JSON.stringify({
        success: false,
        error: isBillingError 
          ? "Crédits Replicate insuffisants. Ajoutez des crédits sur https://replicate.com/account/billing"
          : errorMessage,
        code: isBillingError ? "BILLING_ERROR" : "GENERATION_ERROR",
      }),
      {
        status: isBillingError ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
