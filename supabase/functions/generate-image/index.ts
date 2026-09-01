import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  creditErrorResponse,
  refundCredits,
  reserveCredits,
  type CreditReservation,
} from "../_shared/credit-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

// ===== MAIN FUNCTION =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let creditReservation: CreditReservation | null = null;

  try {
    const {
      prompt,
      article_id,
      collection_id,
      product_type,
      style = "professional",
      type = "white",
      aspect_ratio = "1:1",
    } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CONFIG ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    // Reserve before making the paid provider call. Failed generations are
    // automatically refunded below, so users never pay for an unusable result.
    creditReservation = await reserveCredits(req, "image", {
      feature: "generate-image",
      article_id: article_id || null,
      collection_id: collection_id || null,
      product_type: product_type || null,
    });

    console.log("🧠 Generating image for:", prompt);

    // Determine if it's for a blog article (16:9) or product/collection (1:1)
    const isArticle = !!article_id;
    const finalAspectRatio = isArticle ? "16:9" : aspect_ratio;
    const resolution = isArticle ? "1920x1080" : "1024x1024";

    // --- SIMPLIFIED PROMPT ---
    const enhancedPrompt = `Generate a professional ${isArticle ? 'blog featured' : 'product'} image.

${prompt}

Requirements:
- Aspect ratio: ${finalAspectRatio}
- High resolution: ${resolution}
- ${type === "white" ? "Pure white background" : "Natural lifestyle setting"}
- Professional lighting and composition
- No text, watermarks, or borders`.trim();

    // --- LOVABLE AI IMAGE GENERATION ---
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: enhancedPrompt
            }
          ],
          modalities: ["image", "text"]
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Error:", response.status, errorText);

      await refundCredits(creditReservation, `provider_http_${response.status}`);
      creditReservation = null;

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de taux dépassée. Réessayez dans quelques secondes.",
            credits_refunded: true,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Le fournisseur d'image est temporairement indisponible. Aucun crédit Nexora n'a été consommé.",
            credits_refunded: true,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Erreur Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Lovable AI response received");

    // --- EXTRACT IMAGE BASE64 FROM LOVABLE AI RESPONSE ---
    // Lovable AI returns the image in data.choices[0].message.images[0].image_url.url
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("❌ Aucune image détectée :", JSON.stringify(data, null, 2));
      throw new Error("Aucune image générée - format inattendu.");
    }

    // Extract base64 from data URL (format: data:image/png;base64,...)
    const base64Match = imageUrl.match(/data:image\/[^;]+;base64,(.+)/);
    const base64Data = base64Match ? base64Match[1] : imageUrl;

    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // --- SUPABASE UPLOAD ---
    let publicUrl = null;
    let storageMetadata = null;

    if (collection_id || article_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const filename = `ai_gen_${collection_id || "product"}_${article_id || "img"}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage.from("generated-images").upload(filename, imageBuffer, {
          contentType: "image/png",
        });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("generated-images").getPublicUrl(filename);
          publicUrl = urlData.publicUrl;
          storageMetadata = {
            filename,
            bucket: "generated-images",
            uploaded_at: new Date().toISOString(),
          };
          console.log("☁️ Upload réussi:", filename);
        } else {
          console.error("Erreur upload Supabase:", uploadError);
        }
      }
    }

    // --- SUCCESS RESPONSE ---
    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl || imageUrl,
        credit_cost: creditReservation.cost,
        credit_balance: creditReservation.balanceAfter,
        metadata: {
          model: "google/gemini-2.5-flash-image-preview",
          product_type,
          style,
          aspect_ratio: finalAspectRatio,
          resolution: resolution,
          generated_at: new Date().toISOString(),
          storage: storageMetadata,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const creditResponse = creditErrorResponse(error, corsHeaders);
    if (creditResponse) return creditResponse;

    if (creditReservation) {
      await refundCredits(
        creditReservation,
        error instanceof Error ? error.message.slice(0, 180) : "image_generation_failed",
      );
      creditReservation = null;
    }

    console.error("❌ Image generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        credits_refunded: true,
        suggestion: "Vérifiez votre prompt ou essayez un texte plus précis (couleur, matériau, ambiance).",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
