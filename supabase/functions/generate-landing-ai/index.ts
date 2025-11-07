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
        temperature: 0.8,
      }),
    });

    // 🧱 Handle API errors
    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-landing-ai] ❌ API error:", response.status, errText);

      const messages: Record<number, string> = {
        429: "Rate limits exceeded. Please try again later.",
        402: "Payment required. Please add funds to your Lovable AI workspace.",
      };

      const errorMessage = messages[response.status] || `Lovable API error: ${response.status}`;

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Parse AI response safely
    const data = await response.json().catch(() => null);
    const html = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!html) {
      console.warn("[generate-landing-ai] ⚠️ Empty HTML response from AI");
      return new Response(
        JSON.stringify({
          error: "Aucune réponse générée par l'IA. Essayez avec un prompt plus simple ou un style différent.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[generate-landing-ai] ✅ Generated HTML length:", html.length, "chars");

    // ✅ Success
    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
