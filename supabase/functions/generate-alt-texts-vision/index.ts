import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveLanguage } from "../_shared/language-detector.ts";

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

// Language-specific prompts for alt text generation
function getAltTextPrompt(lang: string, productTitle: string, productType: string, category: string, cleanDescription: string): string {
  const prompts: Record<string, string> = {
    fr: `Tu es un expert SEO e-commerce. Génère UN SEUL texte ALT descriptif qui se concentre UNIQUEMENT sur le produit.

LANGUE: français
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
Titre: ${productTitle}
Type: ${productType || 'Non spécifié'}
Catégorie: ${category || 'Non spécifiée'}
Description: ${cleanDescription}

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL CONCENTRÉ SUR LE PRODUIT.`,

    en: `You are an e-commerce SEO expert. Generate ONE descriptive ALT text that focuses ONLY on the product.

LANGUAGE: English
LENGTH: 8-12 words maximum

🎯 ABSOLUTE FOCUS: THE PRODUCT ONLY
- Describe ONLY the product itself
- Focus on: materials, construction, look, style, finishes
- COMPLETELY IGNORE context (furniture, decor, vases, tables, walls, etc.)
- IGNORE objects around the product

STRICT RULES:
- ONE result only (no list, no multiple options)
- Start directly with description (no "Image of", "Here is", etc.)
- Describe only intrinsic product characteristics
- No invented words or inappropriate terms
- No unnecessary terms like "photo", "image", "frontal"
- Natural and fluid style

❌ ABSOLUTELY AVOID:
- "on a table", "with a vase", "in a living room"
- Any mention of objects or context around the product
- Descriptions of environment or staging

✅ PRIORITIZE:
- Materials (wood, metal, glass, fabric, etc.)
- Finishes (natural, gold, polished, matte, glossy)
- Style (Scandinavian, modern, industrial, vintage)
- Visible characteristics (lines, shapes, textures)

PRODUCT INFO:
Title: ${productTitle}
Type: ${productType || 'Not specified'}
Category: ${category || 'Not specified'}
Description: ${cleanDescription}

RESPOND ONLY WITH THE FINAL ALT TEXT FOCUSED ON THE PRODUCT.`,

    de: `Du bist ein E-Commerce SEO-Experte. Erstelle EINEN beschreibenden ALT-Text, der sich NUR auf das Produkt konzentriert.

SPRACHE: Deutsch
LÄNGE: 8-12 Wörter maximal

INFORMATIONEN PRODUKT:
Titel: ${productTitle}
Typ: ${productType || 'Nicht angegeben'}
Kategorie: ${category || 'Nicht angegeben'}
Beschreibung: ${cleanDescription}

ANTWORTE NUR MIT DEM FINALEN ALT-TEXT, DER SICH AUF DAS PRODUKT KONZENTRIERT.`,

    es: `Eres un experto en SEO de comercio electrónico. Genera UN texto ALT descriptivo que se centre SOLO en el producto.

IDIOMA: español
LONGITUD: 8-12 palabras máximo

INFORMACIÓN DEL PRODUCTO:
Título: ${productTitle}
Tipo: ${productType || 'No especificado'}
Categoría: ${category || 'No especificada'}
Descripción: ${cleanDescription}

RESPONDE SOLO CON EL TEXTO ALT FINAL CENTRADO EN EL PRODUCTO.`,

    it: `Sei un esperto SEO e-commerce. Genera UN testo ALT descrittivo che si concentri SOLO sul prodotto.

LINGUA: italiano
LUNGHEZZA: 8-12 parole massimo

INFO PRODOTTO:
Titolo: ${productTitle}
Tipo: ${productType || 'Non specificato'}
Categoria: ${category || 'Non specificata'}
Descrizione: ${cleanDescription}

RISPONDI SOLO CON IL TESTO ALT FINALE CONCENTRATO SUL PRODOTTO.`,
  };
  
  return prompts[lang] || prompts.fr;
}

function getVisionRefinePrompt(lang: string, deepseekText: string): string {
  const prompts: Record<string, string> = {
    fr: `Analyse cette image de produit e-commerce et génère UN SEUL texte ALT de 8-12 mots maximum.

Base suggérée: ${deepseekText}

🎯 FOCUS ABSOLU : DÉCRIS UNIQUEMENT LE PRODUIT
- Concentre-toi sur : matériaux, finitions, style, caractéristiques visibles
- IGNORE complètement le contexte : objets autour, meubles, déco, environnement
- IGNORE les vases, tables, murs, lampes, accessoires de mise en scène

RÈGLES ABSOLUES:
- UN SEUL texte final (jamais de liste ou options multiples)
- Décris SEULEMENT le produit en lui-même (pas "sur une table", pas "avec un vase")
- Maximum 12 mots
- Langue: français
- Naturel et fluide
- Pas de préfixe comme "Voici" ou "Image de"

❌ INTERDIT: Mentionner le contexte ou les objets autour
✅ PRIVILÉGIER: Matériaux, style, finitions, caractéristiques intrinsèques

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL CONCENTRÉ SUR LE PRODUIT.`,

    en: `Analyze this e-commerce product image and generate ONE ALT text of 8-12 words maximum.

Suggested base: ${deepseekText}

🎯 ABSOLUTE FOCUS: DESCRIBE ONLY THE PRODUCT
- Focus on: materials, finishes, style, visible features
- COMPLETELY IGNORE context: surrounding objects, furniture, decor, environment
- IGNORE vases, tables, walls, lamps, staging accessories

ABSOLUTE RULES:
- ONE final text only (never a list or multiple options)
- Describe ONLY the product itself (not "on a table", not "with a vase")
- Maximum 12 words
- Language: English
- Natural and fluid
- No prefix like "Here is" or "Image of"

❌ FORBIDDEN: Mentioning context or objects around
✅ PRIORITIZE: Materials, style, finishes, intrinsic characteristics

RESPOND ONLY WITH THE FINAL ALT TEXT FOCUSED ON THE PRODUCT.`,

    de: `Analysiere dieses E-Commerce-Produktbild und erstelle EINEN ALT-Text von maximal 8-12 Wörtern.

Vorgeschlagene Basis: ${deepseekText}

ANTWORTE NUR MIT DEM FINALEN ALT-TEXT, DER SICH AUF DAS PRODUKT KONZENTRIERT.`,

    es: `Analiza esta imagen de producto de comercio electrónico y genera UN texto ALT de 8-12 palabras máximo.

Base sugerida: ${deepseekText}

RESPONDE SOLO CON EL TEXTO ALT FINAL CENTRADO EN EL PRODUCTO.`,

    it: `Analizza questa immagine di prodotto e-commerce e genera UN testo ALT di massimo 8-12 parole.

Base suggerita: ${deepseekText}

RISPONDI SOLO CON IL TESTO ALT FINALE CONCENTRATO SUL PRODOTTO.`,
  };
  
  return prompts[lang] || prompts.fr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  try {
    const { image_id, language: explicitLang } = body;
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
    const storeLanguage = store?.store_language || "fr-FR";

    // 🌍 Detect language from product title (priority) or fallback to store language
    const contentText = `${product.title || ''} ${product.body_html || ''}`;
    const lang = resolveLanguage({
      explicitLanguage: explicitLang,
      contentText: contentText,
      storeLanguage: storeLanguage
    });
    console.log(`🌍 [generate-alt-texts-vision] Using language: ${lang} (from: ${product.title?.substring(0, 50)}...)`);

    // Clean description
    const cleanDescription = (product.body_html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 400);

    // 4. Improved prompt - Language-aware
    const prompt = getAltTextPrompt(lang, product.title, product.product_type, product.category, cleanDescription);

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

    const deepseekTextResult = (await deepseekRes.json())?.choices?.[0]?.message?.content?.trim() || "";

    // ---- Gemini Vision refinement
    const buffer = await fetch(image.src).then((r) => r.arrayBuffer());
    const base64 = arrayBufferToBase64(buffer);

    const visionRefinePrompt = getVisionRefinePrompt(lang, deepseekTextResult);

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
                { text: visionRefinePrompt },
                { inline_data: { mime_type: "image/jpeg", data: base64 } },
              ],
            },
          ],
        }),
      },
    );

    let geminiText = (await geminiRes.json())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deepseekTextResult || "Image produit";
    
    // Nettoyer: prendre seulement la première ligne si multiple options retournées
    geminiText = geminiText
      .replace(/^(Voici|Image de|Photo de|ALT\s*:?\s*|Texte ALT\s*:?\s*|Here is|Here's|Image of)/i, "")
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

    return new Response(JSON.stringify({ success: true, alt: geminiText, language: lang }), {
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
