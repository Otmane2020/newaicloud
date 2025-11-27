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

// ---- MULTI-LANGUAGE PROMPTS ----
function getAltTextPrompt(
  lang: string,
  productTitle: string,
  productType: string,
  category: string,
  cleanDescription: string
): string {
  const prompts: Record<string, string> = {
    fr: `Tu es un expert SEO e-commerce. Génère UN SEUL texte ALT descriptif qui se concentre UNIQUEMENT sur le produit.

LANGUE: Français
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
- Style naturel et fluide

INFORMATIONS PRODUIT:
Titre: ${productTitle}
Type: ${productType || 'Non spécifié'}
Catégorie: ${category || 'Non spécifiée'}
Description: ${cleanDescription}

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL.`,

    en: `You are an e-commerce SEO expert. Generate ONE SINGLE descriptive ALT text focusing ONLY on the product.

LANGUAGE: English
LENGTH: 8-12 words maximum

🎯 ABSOLUTE FOCUS: THE PRODUCT ONLY
- Describe ONLY the product itself
- Focus on: materials, craftsmanship, look, style, finishes
- COMPLETELY IGNORE context (furniture, decor, vases, tables, walls, etc.)
- IGNORE objects around the product

STRICT RULES:
- ONE SINGLE result (no list, no multiple options)
- Start directly with the description (no "Image of", "Here is", etc.)
- Describe only the intrinsic characteristics of the product
- Natural and fluid style

PRODUCT INFORMATION:
Title: ${productTitle}
Type: ${productType || 'Not specified'}
Category: ${category || 'Not specified'}
Description: ${cleanDescription}

RESPOND ONLY WITH THE FINAL ALT TEXT.`,

    de: `Du bist ein E-Commerce-SEO-Experte. Erstelle EINEN EINZIGEN beschreibenden ALT-Text, der sich NUR auf das Produkt konzentriert.

SPRACHE: Deutsch
LÄNGE: 8-12 Wörter maximal

🎯 ABSOLUTER FOKUS: NUR DAS PRODUKT
- Beschreibe NUR das Produkt selbst
- Konzentriere dich auf: Materialien, Verarbeitung, Look, Stil, Oberflächen
- IGNORIERE KOMPLETT den Kontext (Möbel, Deko, Vasen, Tische, Wände, etc.)
- IGNORIERE Objekte um das Produkt herum

STRIKTE REGELN:
- EIN EINZIGES Ergebnis (keine Liste, keine mehrfachen Optionen)
- Beginne direkt mit der Beschreibung (kein "Bild von", "Hier ist", etc.)
- Beschreibe nur die intrinsischen Eigenschaften des Produkts
- Natürlicher und flüssiger Stil

PRODUKTINFORMATIONEN:
Titel: ${productTitle}
Typ: ${productType || 'Nicht angegeben'}
Kategorie: ${category || 'Nicht angegeben'}
Beschreibung: ${cleanDescription}

ANTWORTE NUR MIT DEM ENDGÜLTIGEN ALT-TEXT.`,

    es: `Eres un experto en SEO de e-commerce. Genera UN SOLO texto ALT descriptivo que se centre ÚNICAMENTE en el producto.

IDIOMA: Español
LONGITUD: 8-12 palabras máximo

🎯 ENFOQUE ABSOLUTO: SOLO EL PRODUCTO
- Describe SOLO el producto en sí
- Concéntrate en: materiales, fabricación, aspecto, estilo, acabados
- IGNORA COMPLETAMENTE el contexto (muebles, decoración, jarrones, mesas, paredes, etc.)
- IGNORA los objetos alrededor del producto

REGLAS ESTRICTAS:
- UN SOLO resultado (sin lista, sin opciones múltiples)
- Comienza directamente con la descripción (sin "Imagen de", "Aquí está", etc.)
- Describe solo las características intrínsecas del producto
- Estilo natural y fluido

INFORMACIÓN DEL PRODUCTO:
Título: ${productTitle}
Tipo: ${productType || 'No especificado'}
Categoría: ${category || 'No especificada'}
Descripción: ${cleanDescription}

RESPONDE SOLO CON EL TEXTO ALT FINAL.`,

    it: `Sei un esperto SEO e-commerce. Genera UN SOLO testo ALT descrittivo che si concentri UNICAMENTE sul prodotto.

LINGUA: Italiano
LUNGHEZZA: 8-12 parole massimo

🎯 FOCUS ASSOLUTO: SOLO IL PRODOTTO
- Descrivi SOLO il prodotto stesso
- Concentrati su: materiali, lavorazione, aspetto, stile, finiture
- IGNORA COMPLETAMENTE il contesto (mobili, decorazioni, vasi, tavoli, pareti, ecc.)
- IGNORA gli oggetti intorno al prodotto

REGOLE RIGOROSE:
- UN SOLO risultato (nessuna lista, nessuna opzione multipla)
- Inizia direttamente con la descrizione (no "Immagine di", "Ecco", ecc.)
- Descrivi solo le caratteristiche intrinseche del prodotto
- Stile naturale e fluido

INFORMAZIONI PRODOTTO:
Titolo: ${productTitle}
Tipo: ${productType || 'Non specificato'}
Categoria: ${category || 'Non specificata'}
Descrizione: ${cleanDescription}

RISPONDI SOLO CON IL TESTO ALT FINALE.`
  };

  return prompts[lang] || prompts['fr'];
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
- Langue: Français
- Naturel et fluide
- Pas de préfixe comme "Voici" ou "Image de"

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL.`,

    en: `Analyze this e-commerce product image and generate ONE SINGLE ALT text of 8-12 words maximum.

Suggested base: ${deepseekText}

🎯 ABSOLUTE FOCUS: DESCRIBE ONLY THE PRODUCT
- Focus on: materials, finishes, style, visible characteristics
- COMPLETELY IGNORE context: surrounding objects, furniture, decor, environment
- IGNORE vases, tables, walls, lamps, staging accessories

ABSOLUTE RULES:
- ONE SINGLE final text (never a list or multiple options)
- Describe ONLY the product itself (not "on a table", not "with a vase")
- Maximum 12 words
- Language: English
- Natural and fluid
- No prefix like "Here is" or "Image of"

RESPOND ONLY WITH THE FINAL ALT TEXT.`,

    de: `Analysiere dieses E-Commerce-Produktbild und erstelle EINEN EINZIGEN ALT-Text von maximal 8-12 Wörtern.

Vorgeschlagene Basis: ${deepseekText}

🎯 ABSOLUTER FOKUS: BESCHREIBE NUR DAS PRODUKT
- Konzentriere dich auf: Materialien, Oberflächen, Stil, sichtbare Eigenschaften
- IGNORIERE KOMPLETT den Kontext: umliegende Objekte, Möbel, Deko, Umgebung
- IGNORIERE Vasen, Tische, Wände, Lampen, Staging-Zubehör

ABSOLUTE REGELN:
- EIN EINZIGER finaler Text (niemals eine Liste oder mehrere Optionen)
- Beschreibe NUR das Produkt selbst (nicht "auf einem Tisch", nicht "mit einer Vase")
- Maximal 12 Wörter
- Sprache: Deutsch
- Natürlich und flüssig
- Kein Präfix wie "Hier ist" oder "Bild von"

ANTWORTE NUR MIT DEM ENDGÜLTIGEN ALT-TEXT.`,

    es: `Analiza esta imagen de producto e-commerce y genera UN SOLO texto ALT de 8-12 palabras máximo.

Base sugerida: ${deepseekText}

🎯 ENFOQUE ABSOLUTO: DESCRIBE SOLO EL PRODUCTO
- Concéntrate en: materiales, acabados, estilo, características visibles
- IGNORA COMPLETAMENTE el contexto: objetos alrededor, muebles, decoración, entorno
- IGNORA jarrones, mesas, paredes, lámparas, accesorios de escenografía

REGLAS ABSOLUTAS:
- UN SOLO texto final (nunca una lista u opciones múltiples)
- Describe SOLO el producto en sí (no "sobre una mesa", no "con un jarrón")
- Máximo 12 palabras
- Idioma: Español
- Natural y fluido
- Sin prefijo como "Aquí está" o "Imagen de"

RESPONDE SOLO CON EL TEXTO ALT FINAL.`,

    it: `Analizza questa immagine di prodotto e-commerce e genera UN SOLO testo ALT di 8-12 parole massimo.

Base suggerita: ${deepseekText}

🎯 FOCUS ASSOLUTO: DESCRIVI SOLO IL PRODOTTO
- Concentrati su: materiali, finiture, stile, caratteristiche visibili
- IGNORA COMPLETAMENTE il contesto: oggetti intorno, mobili, decorazioni, ambiente
- IGNORA vasi, tavoli, pareti, lampade, accessori di staging

REGOLE ASSOLUTE:
- UN SOLO testo finale (mai una lista o opzioni multiple)
- Descrivi SOLO il prodotto stesso (non "su un tavolo", non "con un vaso")
- Massimo 12 parole
- Lingua: Italiano
- Naturale e fluido
- Nessun prefisso come "Ecco" o "Immagine di"

RISPONDI SOLO CON IL TESTO ALT FINALE.`
  };

  return prompts[lang] || prompts['fr'];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Safe HealthCheck handler
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
    }

    const { image_id } = body;
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

    // 🛡️ LANGUAGE GUARD - Detect language from content
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("store_language")
      .eq("id", product.store_id)
      .single();
    const rawStoreLanguage = store?.store_language || "en-US";
    const lang = resolveLanguage({
      contentText: `${product.title || ""} ${product.body_html || ""}`,
      storeLanguage: rawStoreLanguage
    });
    console.log(`🛡️ LANGUAGE GUARD: alt-text - detected=${lang}, store=${rawStoreLanguage}, product="${product.title?.substring(0,30)}..."`);

    // Clean description
    const cleanDescription = (product.body_html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 400);

    // 4. Get multi-language prompt
    const prompt = getAltTextPrompt(
      lang,
      product.title,
      product.product_type || 'Non spécifié',
      product.category || 'Non spécifiée',
      cleanDescription
    );

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

    // Get multi-language vision prompt
    const visionPrompt = getVisionRefinePrompt(lang, deepseekText);

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
                { text: visionPrompt },
                { inline_data: { mime_type: "image/jpeg", data: base64 } },
              ],
            },
          ],
        }),
      },
    );

    let geminiText = (await geminiRes.json())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deepseekText || "Product image";
    
    // Clean: take only the first line if multiple options returned
    geminiText = geminiText
      .replace(/^(Voici|Image de|Photo de|ALT\s*:?\s*|Texte ALT\s*:?\s*|Here is|Image of|Bild von|Hier ist|Immagine di|Ecco|Imagen de|Aquí está)/i, "")
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
