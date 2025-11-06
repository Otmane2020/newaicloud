import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, article_id, collection_id, type, product_type, style = "professional" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating e-commerce image with prompt:", prompt);

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    // Enhanced prompt for better e-commerce results
    const enhancedPrompt = `
      E-COMMERCE PRODUCT IMAGE - PROFESSIONAL PHOTOGRAPHY

      CONTEXT: You are creating a professional e-commerce product image for an online store.

      PROMPT: ${prompt}

      PRODUCT TYPE: ${product_type || "general product"}
      STYLE: ${style}

      TECHNICAL REQUIREMENTS:
      - Square format (1:1 aspect ratio)
      - High resolution (1024x1024 pixels minimum)
      - Professional product photography style
      - Clean, well-lit composition
      - Sharp focus on the product
      - Commercial-ready quality

      VISUAL GUIDELINES:
      - Natural, professional lighting
      - Clean background that complements the product
      - Product should be the main focus
      - Professional color grading
      - No distortions or artifacts
      - Suitable for e-commerce platforms

      IMPORTANT: Generate a square image (1:1 aspect ratio) with professional e-commerce standards.
    `;

    // Generate image using Google Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enhancedPrompt }]
          }],
          generationConfig: {
            responseModalities: ["image"],
            maxOutputTokens: 500
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Gemini error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de taux dépassée. Veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Erreur API Google Gemini: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response received, extracting image...");

    // Extract base64 image from Gemini response
    const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
    
    if (!base64Image) {
      console.error("No image data found in response:", JSON.stringify(data, null, 2));
      throw new Error("Aucune image générée - format de réponse inattendu");
    }

    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log("Image generated successfully, processing...");

    // Upload to Supabase Storage if collection_id or article_id is provided
    let publicUrl = imageUrl;
    let storageMetadata = null;

    if (collection_id || article_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        // Convert base64 data URL to binary
        const base64Data = imageUrl.split(',')[1];
        const binaryData = atob(base64Data);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }

        // Create filename with timestamp and identifiers
        const timestamp = Date.now();
        const filename = `ecommerce_${collection_id || "product"}_${article_id || "img"}_${timestamp}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("generated-images")
          .upload(filename, uint8Array, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          // Continue with data URL if upload fails
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage.from("generated-images").getPublicUrl(filename);

          publicUrl = urlData.publicUrl;
          storageMetadata = {
            filename: filename,
            bucket: "generated-images",
            uploaded_at: new Date().toISOString(),
          };
          console.log("Image successfully uploaded to storage:", filename);
        }
      } catch (uploadError) {
        console.error("Error during upload process:", uploadError);
        // Continue with data URL
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl,
        metadata: {
          product_type: product_type,
          style: style,
          format: "square",
          resolution: "1024x1024",
          storage: storageMetadata,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in e-commerce image generation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de la génération de l'image",
        suggestion: "Vérifiez votre prompt et réessayez avec une description plus détaillée",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
