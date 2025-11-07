import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ✅ CORS Headers — sécurisé et compatible front
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** ----------------------------------------------------------------
 * 🧠 Function: Generate landing page HTML via Lovable AI Gateway
 * ----------------------------------------------------------------*/
serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🛡️ VÉRIFICATION DES LIMITES AVANT GÉNÉRATION
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      
      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        
        // Récupérer usage actuel
        const { data: usage } = await supabaseAdmin
          .from('usage_tracking')
          .select('optimizations_count')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        // Récupérer profil et plan
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();
        
        const { data: plan } = await supabaseAdmin
          .from('subscription_plans')
          .select('max_optimizations_monthly, trial_max_optimizations')
          .eq('id', profile?.current_plan_id || 'trial')
          .single();
        
        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations = profile?.subscription_status === 'trialing' 
          ? (plan?.trial_max_optimizations || 50)
          : (plan?.max_optimizations_monthly || 999999);
        
        console.log(`[generate-landing-ai] 🔍 Usage check: ${currentUsage}/${maxOptimizations}`);
        
        // ❌ BLOQUER si limite atteinte
        if (currentUsage >= maxOptimizations) {
          console.error(`[generate-landing-ai] ❌ LIMIT REACHED: ${currentUsage}/${maxOptimizations}`);
          return new Response(
            JSON.stringify({ 
              error: 'LIMIT_REACHED',
              message: 'Limite d\'optimisations atteinte. Passez à un plan supérieur.',
              usage: currentUsage,
              limit: maxOptimizations
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // ✅ Incrémenter IMMÉDIATEMENT (avant génération pour éviter les abus)
        const LANDING_PAGE_COST = 3; // 1 landing page = 3 optimisations
        
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: LANDING_PAGE_COST
        });
        
        console.log(`[generate-landing-ai] ✅ Usage incremented: +${LANDING_PAGE_COST} (now ${currentUsage + LANDING_PAGE_COST}/${maxOptimizations})`);
      }
    }
    
    const body = await req.json();

    const { productTitle, imageUrl, description, style, mainColor, layout, length } = body ?? {};

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY in environment variables");
    }

    // 🧩 Dynamic tone based on length
    const tone =
      length === "courte (400 mots)"
        ? "concis"
        : length === "moyenne (800 mots)"
          ? "équilibré"
          : "détaillé et approfondi";

    // 🪄 Main AI prompt
    const prompt = `
Tu es un designer et copywriter expert en e-commerce.

Ta mission est de générer une landing page HTML complète pour un produit Shopify à partir des données suivantes :

- Titre du produit : ${productTitle}
- Image du produit : ${imageUrl || "aucune"}
- Description existante : ${description || "aucune"}
- Style visuel : ${style}
- Couleur principale : ${mainColor}
- Layout souhaité : ${layout}
- Longueur du texte : ${length}

⚙️ Contraintes :
- Sortie : HTML clair, responsive et SEO-friendly.
- Inclure les sections : 
  1️⃣ Hero section (titre H1, sous-titre, image)
  2️⃣ Avantages (3-5 cartes avec icônes)
  3️⃣ Caractéristiques techniques
  4️⃣ CTA final
  5️⃣ Garanties / Livraison
- Design ${style}, ton ${tone}.
- Compatible Tailwind CSS uniquement (aucun <style> inline).
- Responsive mobile-first, avec gap-4, p-6, rounded-xl, shadow-lg.
- Titres: font-bold text-2xl ou text-3xl.
- Pas de balises <html>, <head> ou <body>.
- Retourne UNIQUEMENT le contenu HTML prêt à injecter dans React.
`;

    console.log("[generate-landing-ai] 🧠 Sending prompt to Lovable Gateway...");
    console.log("[generate-landing-ai] Request details:", { 
      productTitle, 
      style, 
      layout, 
      length,
      hasImage: !!imageUrl 
    });

    // 🔄 Retry logic for temporary failures
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[generate-landing-ai] Attempt ${attempt}/${MAX_RETRIES}`);

        // 🧠 Call Lovable AI Gateway (Gemini or GPT-based)
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Tu es un expert UX/UI designer et copywriter e-commerce. Génère des landing pages Tailwind modernes et efficaces pour Shopify.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 3000,
          }),
        });

        // 🧱 Handle API errors - retry on 503/502/504
        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate-landing-ai] ❌ API error (attempt ${attempt}):`, response.status, errText);

          // Permanent errors - don't retry
          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              error: "Rate limits exceeded. Please try again later." 
            }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (response.status === 402) {
            return new Response(JSON.stringify({ 
              error: "Payment required. Please add funds to your Lovable AI workspace." 
            }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Temporary errors (503, 502, 504) - retry
          if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue; // Try again
          }

          // Other errors or last attempt
          const errorMessage = `Lovable AI API error: ${response.status}`;
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // ✅ Success - parse response and exit retry loop
        const data = await response.json().catch(() => null);
        const html = data?.choices?.[0]?.message?.content?.trim() || "";

        console.log("[generate-landing-ai] Response status:", response.status);
        console.log("[generate-landing-ai] AI response parsed, HTML length:", html.length);

        if (!html) {
          console.warn("[generate-landing-ai] ⚠️ Empty HTML response from AI");
          
          // If we have retries left, try again
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to empty response...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: "Aucune réponse générée par l'IA. Essayez avec un prompt plus simple ou un style différent.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Validation du HTML généré
        if (html.includes('<html') || html.includes('<head') || html.includes('<body')) {
          console.warn("[generate-landing-ai] ⚠️ HTML contains forbidden tags (html/head/body)");
          return new Response(
            JSON.stringify({
              error: "Le HTML généré contient des balises interdites. Réessayez.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (html.length < 500) {
          console.warn("[generate-landing-ai] ⚠️ Generated HTML too short:", html.length);
          
          // If we have retries left, try again
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to short content...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: "Le contenu généré est trop court. Réessayez avec plus de détails.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        console.log("[generate-landing-ai] ✅ Generated HTML length:", html.length, "chars");

        // ✅ Success
        return new Response(JSON.stringify({ html }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (networkError) {
        lastError = networkError instanceof Error ? networkError : new Error(String(networkError));
        console.error(`[generate-landing-ai] 💥 Network error (attempt ${attempt}):`, lastError);
        
        // Retry on network errors if we have attempts left
        if (attempt < MAX_RETRIES) {
          console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to network error...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    // If we get here, all retries failed
    console.error("[generate-landing-ai] ❌ All retry attempts failed");
    return new Response(
      JSON.stringify({
        error: lastError?.message || "Service temporairement indisponible. Veuillez réessayer dans quelques instants.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (err) {
    console.error("[generate-landing-ai] 💥 Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
