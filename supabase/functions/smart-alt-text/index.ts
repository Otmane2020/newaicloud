import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- BASE64 SAFE ----
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { image_id } = await req.json();
    if (!image_id) throw new Error("image_id missing");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Image
    const { data: image } = await supabase
      .from("product_images")
      .select("id, src, alt_text, optimization_count, product_id")
      .eq("id", image_id)
      .single();
    if (!image) throw new Error("Image not found");

    // 2. Product
    const { data: product } = await supabase
      .from("shopify_products")
      .select("id, title, seo_title, body_html, product_type, category, seller_id, store_id")
      .eq("id", image.product_id)
      .single();
    if (!product) throw new Error("Product not found");

    // 3. Store language
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("store_language")
      .eq("id", product.store_id)
      .single();
    const lang = store?.store_language || "en-US";

    // Clean description
    const cleanDescription = (product.body_html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 400);

    // 4. Improved prompt - FOCUS ON PRODUCT ONLY
    const prompt = `
Tu es un expert SEO e-commerce. Génère UN SEUL texte ALT descriptif qui se concentre UNIQUEMENT sur le produit.

LANGUE: ${lang}
LONGUEUR: 8-12 mots maximum

🎯 FOCUS ABSOLU : LE PRODUIT UNIQUEMENT
- Décris SEULEMENT le produit lui-même
- Concentre-toi sur : matériaux, fabrication, look, style, finitions
- IGNORE COMPLÈTEMENT le contexte (meubles, déco, vases, tables, murs, etc.)
- IGNORE les objets autour du produit

RÈGLES STRICTES:
- UN SEUL résultat (pas de liste, pas d'options multiples)
- Commence directement la description (pas de "Image de", "Voici", etc.)
- Décris uniquement les caractéristiques intrinsèques du produit
- Aucun mot inventé ou anglicisme inapproprié
- Pas de termes inutiles comme "photo", "image", "frontal"
- Style naturel et fluide

❌ À ÉVITER ABSOLUMENT:
- "sur une table", "avec un vase", "dans un salon"
- Toute mention d'objets ou de contexte autour du produit
- Descriptions de l'environnement ou de la mise en scène

✅ À PRIVILÉGIER:
- Matériaux (bois, métal, verre, tissu, etc.)
- Finitions (naturel, doré, poli, mat, brillant)
- Style (scandinave, moderne, industriel, vintage)
- Caractéristiques visibles (lignes, formes, textures)

INFORMATIONS PRODUIT:
Titre: ${product.title}
Type: ${product.product_type || 'Non spécifié'}
Catégorie: ${product.category || 'Non spécifiée'}
Description: ${cleanDescription}

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL CONCENTRÉ SUR LE PRODUIT.
`;

    // ---- DeepSeek first pass
    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const deepseekText = (await deepseekRes.json())?.choices?.[0]?.message?.content?.trim() || "";

    // ---- Gemini Vision refinement
    const buffer = await fetch(image.src).then((r) => r.arrayBuffer());
    const base64 = arrayBufferToBase64(buffer);

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        Deno.env.get("GOOGLE_GEMINI_API_KEY"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { 
                  text: `Analyse cette image de produit e-commerce et génère UN SEUL texte ALT de 8-12 mots maximum.

Base suggérée: ${deepseekText}

🎯 FOCUS ABSOLU : DÉCRIS UNIQUEMENT LE PRODUIT
- Concentre-toi sur : matériaux, finitions, style, caractéristiques visibles
- IGNORE complètement le contexte : objets autour, meubles, déco, environnement
- IGNORE les vases, tables, murs, lampes, accessoires de mise en scène

RÈGLES ABSOLUES:
- UN SEUL texte final (jamais de liste ou options multiples)
- Décris SEULEMENT le produit en lui-même (pas "sur une table", pas "avec un vase")
- Maximum 12 mots
- Langue: ${lang}
- Naturel et fluide
- Pas de préfixe comme "Voici" ou "Image de"

❌ INTERDIT: Mentionner le contexte ou les objets autour
✅ PRIVILÉGIER: Matériaux, style, finitions, caractéristiques intrinsèques

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL CONCENTRÉ SUR LE PRODUIT.` 
                },
                { inline_data: { mime_type: "image/jpeg", data: base64 } },
              ],
            },
          ],
        }),
      },
    );

    let geminiText = (await geminiRes.json())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deepseekText || "Image produit";
    
    // Nettoyer: prendre seulement la première ligne si multiple options retournées
    geminiText = geminiText
      .replace(/^(Voici|Image de|Photo de|ALT\s*:?\s*|Texte ALT\s*:?\s*)/i, "")
      .replace(/^\*\s*/g, "")
      .replace(/^-\s*/g, "")
      .split(/\n|•/)[0]
      .replace(/^\*\s*/g, "")
      .trim();

    // ---- 5. Update database
    await supabase
      .from("product_images")
      .update({
        alt_text: geminiText,
        optimization_count: (image.optimization_count ?? 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", image.id);

    // ---- 6. Increment usage
    await supabase.rpc("increment_usage", {
      p_seller_id: product.seller_id,
      p_field: "optimizations_count",
      p_increment: 3,
    });

    return new Response(JSON.stringify({ success: true, alt: geminiText }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
