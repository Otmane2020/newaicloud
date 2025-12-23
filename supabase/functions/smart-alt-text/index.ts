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

// ---- MULTI-LANGUAGE PROMPTS FOR PRODUCTS ----
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

// ---- MULTI-LANGUAGE PROMPTS FOR CONTENT IMAGES (collections, pages, homepage, articles) ----
function getContentAltTextPrompt(
  lang: string,
  contentType: string,
  contentTitle: string,
  cleanDescription: string
): string {
  const typeLabels: Record<string, Record<string, string>> = {
    fr: { collection: 'collection', homepage: 'page d\'accueil', page: 'page', article: 'article de blog' },
    en: { collection: 'collection', homepage: 'homepage', page: 'page', article: 'blog article' },
    de: { collection: 'Kollektion', homepage: 'Startseite', page: 'Seite', article: 'Blog-Artikel' },
    es: { collection: 'colección', homepage: 'página de inicio', page: 'página', article: 'artículo de blog' },
    it: { collection: 'collezione', homepage: 'homepage', page: 'pagina', article: 'articolo del blog' },
  };

  const typeLabel = typeLabels[lang]?.[contentType] || typeLabels['en']?.[contentType] || contentType;

  const prompts: Record<string, string> = {
    fr: `Tu es un expert SEO e-commerce. Génère UN SEUL texte ALT descriptif pour cette image de ${typeLabel}.

LANGUE: Français
LONGUEUR: 8-12 mots maximum

🎯 CONTEXTE: Image de ${typeLabel}
- Décris ce que représente l'image visuellement
- Inclus le contexte de marque si pertinent
- Pour une collection: mentionne le thème ou style de la collection
- Pour une page d'accueil: décris l'ambiance ou le message visuel

RÈGLES STRICTES:
- UN SEUL résultat (pas de liste, pas d'options multiples)
- Commence directement la description (pas de "Image de", "Voici", etc.)
- Style naturel et fluide

INFORMATIONS:
Titre: ${contentTitle || 'Non spécifié'}
Type: ${typeLabel}
Description: ${cleanDescription || 'Non disponible'}

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL.`,

    en: `You are an e-commerce SEO expert. Generate ONE SINGLE descriptive ALT text for this ${typeLabel} image.

LANGUAGE: English
LENGTH: 8-12 words maximum

🎯 CONTEXT: ${typeLabel} image
- Describe what the image represents visually
- Include brand context if relevant
- For a collection: mention the theme or style of the collection
- For a homepage: describe the ambiance or visual message

STRICT RULES:
- ONE SINGLE result (no list, no multiple options)
- Start directly with the description (no "Image of", "Here is", etc.)
- Natural and fluid style

INFORMATION:
Title: ${contentTitle || 'Not specified'}
Type: ${typeLabel}
Description: ${cleanDescription || 'Not available'}

RESPOND ONLY WITH THE FINAL ALT TEXT.`,

    de: `Du bist ein E-Commerce-SEO-Experte. Erstelle EINEN EINZIGEN beschreibenden ALT-Text für dieses ${typeLabel}-Bild.

SPRACHE: Deutsch
LÄNGE: 8-12 Wörter maximal

🎯 KONTEXT: ${typeLabel}-Bild
- Beschreibe, was das Bild visuell darstellt
- Füge Markenkontext hinzu, wenn relevant
- Für eine Kollektion: erwähne das Thema oder den Stil
- Für eine Startseite: beschreibe die Atmosphäre oder visuelle Botschaft

STRIKTE REGELN:
- EIN EINZIGES Ergebnis (keine Liste, keine mehrfachen Optionen)
- Beginne direkt mit der Beschreibung (kein "Bild von", "Hier ist", etc.)
- Natürlicher und flüssiger Stil

INFORMATIONEN:
Titel: ${contentTitle || 'Nicht angegeben'}
Typ: ${typeLabel}
Beschreibung: ${cleanDescription || 'Nicht verfügbar'}

ANTWORTE NUR MIT DEM ENDGÜLTIGEN ALT-TEXT.`,

    es: `Eres un experto en SEO de e-commerce. Genera UN SOLO texto ALT descriptivo para esta imagen de ${typeLabel}.

IDIOMA: Español
LONGITUD: 8-12 palabras máximo

🎯 CONTEXTO: Imagen de ${typeLabel}
- Describe lo que representa la imagen visualmente
- Incluye contexto de marca si es relevante
- Para una colección: menciona el tema o estilo
- Para una página de inicio: describe el ambiente o mensaje visual

REGLAS ESTRICTAS:
- UN SOLO resultado (sin lista, sin opciones múltiples)
- Comienza directamente con la descripción (sin "Imagen de", "Aquí está", etc.)
- Estilo natural y fluido

INFORMACIÓN:
Título: ${contentTitle || 'No especificado'}
Tipo: ${typeLabel}
Descripción: ${cleanDescription || 'No disponible'}

RESPONDE SOLO CON EL TEXTO ALT FINAL.`,

    it: `Sei un esperto SEO e-commerce. Genera UN SOLO testo ALT descrittivo per questa immagine di ${typeLabel}.

LINGUA: Italiano
LUNGHEZZA: 8-12 parole massimo

🎯 CONTESTO: Immagine di ${typeLabel}
- Descrivi cosa rappresenta visivamente l'immagine
- Includi il contesto del marchio se rilevante
- Per una collezione: menziona il tema o lo stile
- Per una homepage: descrivi l'atmosfera o il messaggio visivo

REGOLE RIGOROSE:
- UN SOLO risultato (nessuna lista, nessuna opzione multipla)
- Inizia direttamente con la descrizione (no "Immagine di", "Ecco", ecc.)
- Stile naturale e fluido

INFORMAZIONI:
Titolo: ${contentTitle || 'Non specificato'}
Tipo: ${typeLabel}
Descrizione: ${cleanDescription || 'Non disponibile'}

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

function getContentVisionRefinePrompt(lang: string, deepseekText: string, contentType: string): string {
  const typeLabels: Record<string, Record<string, string>> = {
    fr: { collection: 'collection', homepage: 'page d\'accueil', page: 'page', article: 'article de blog' },
    en: { collection: 'collection', homepage: 'homepage', page: 'page', article: 'blog article' },
    de: { collection: 'Kollektion', homepage: 'Startseite', page: 'Seite', article: 'Blog-Artikel' },
    es: { collection: 'colección', homepage: 'página de inicio', page: 'página', article: 'artículo de blog' },
    it: { collection: 'collezione', homepage: 'homepage', page: 'pagina', article: 'articolo del blog' },
  };

  const typeLabel = typeLabels[lang]?.[contentType] || typeLabels['en']?.[contentType] || contentType;

  const prompts: Record<string, string> = {
    fr: `Analyse cette image de ${typeLabel} e-commerce et génère UN SEUL texte ALT de 8-12 mots maximum.

Base suggérée: ${deepseekText}

🎯 CONTEXTE: Image de ${typeLabel}
- Décris ce que montre l'image visuellement
- Capture l'ambiance, le style ou le message de l'image
- Sois descriptif mais concis

RÈGLES ABSOLUES:
- UN SEUL texte final (jamais de liste ou options multiples)
- Maximum 12 mots
- Langue: Français
- Naturel et fluide
- Pas de préfixe comme "Voici" ou "Image de"

RÉPONDS UNIQUEMENT AVEC LE TEXTE ALT FINAL.`,

    en: `Analyze this e-commerce ${typeLabel} image and generate ONE SINGLE ALT text of 8-12 words maximum.

Suggested base: ${deepseekText}

🎯 CONTEXT: ${typeLabel} image
- Describe what the image shows visually
- Capture the ambiance, style or message of the image
- Be descriptive but concise

ABSOLUTE RULES:
- ONE SINGLE final text (never a list or multiple options)
- Maximum 12 words
- Language: English
- Natural and fluid
- No prefix like "Here is" or "Image of"

RESPOND ONLY WITH THE FINAL ALT TEXT.`,

    de: `Analysiere dieses E-Commerce-${typeLabel}-Bild und erstelle EINEN EINZIGEN ALT-Text von maximal 8-12 Wörtern.

Vorgeschlagene Basis: ${deepseekText}

🎯 KONTEXT: ${typeLabel}-Bild
- Beschreibe, was das Bild visuell zeigt
- Erfasse die Atmosphäre, den Stil oder die Botschaft
- Sei beschreibend aber prägnant

ABSOLUTE REGELN:
- EIN EINZIGER finaler Text (niemals eine Liste oder mehrere Optionen)
- Maximal 12 Wörter
- Sprache: Deutsch
- Natürlich und flüssig
- Kein Präfix wie "Hier ist" oder "Bild von"

ANTWORTE NUR MIT DEM ENDGÜLTIGEN ALT-TEXT.`,

    es: `Analiza esta imagen de ${typeLabel} e-commerce y genera UN SOLO texto ALT de 8-12 palabras máximo.

Base sugerida: ${deepseekText}

🎯 CONTEXTO: Imagen de ${typeLabel}
- Describe lo que muestra la imagen visualmente
- Captura el ambiente, estilo o mensaje de la imagen
- Sé descriptivo pero conciso

REGLAS ABSOLUTAS:
- UN SOLO texto final (nunca una lista u opciones múltiples)
- Máximo 12 palabras
- Idioma: Español
- Natural y fluido
- Sin prefijo como "Aquí está" o "Imagen de"

RESPONDE SOLO CON EL TEXTO ALT FINAL.`,

    it: `Analizza questa immagine di ${typeLabel} e-commerce e genera UN SOLO testo ALT di 8-12 parole massimo.

Base suggerita: ${deepseekText}

🎯 CONTESTO: Immagine di ${typeLabel}
- Descrivi cosa mostra visivamente l'immagine
- Cattura l'atmosfera, lo stile o il messaggio
- Sii descrittivo ma conciso

REGOLE ASSOLUTE:
- UN SOLO testo finale (mai una lista o opzioni multiple)
- Massimo 12 parole
- Lingua: Italiano
- Naturale e fluido
- Nessun prefisso come "Ecco" o "Immagine di"

RISPONDI SOLO CON IL TESTO ALT FINALE.`
  };

  return prompts[lang] || prompts['fr'];
}

// Validate that alt text is not empty or generic
function isValidAltText(altText: string | null | undefined): boolean {
  if (!altText || altText.trim() === '') return false;
  
  const genericTexts = [
    'product image', 'image', 'photo', 'picture',
    'image de produit', 'image du produit', 'photo de produit',
    'produktbild', 'bild',
    'imagen de producto', 'imagen',
    'immagine del prodotto', 'immagine',
  ];
  
  const lowerText = altText.toLowerCase().trim();
  return !genericTexts.includes(lowerText);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Safe HealthCheck handler
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
    }

    const { image_id, imageType = 'product', force = false } = body;
    if (!image_id) throw new Error("image_id missing");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`[smart-alt-text] Processing image ${image_id}, type: ${imageType}, force: ${force}`);

    // Determine if this is a product image or content image
    const isContentImage = imageType !== 'product';

    let image: any;
    let contextData: any;
    let sellerId: string;
    let storeId: string;
    let lang: string;
    let contentTitle: string = '';
    let cleanDescription: string = '';

    if (isContentImage) {
      // ---- CONTENT IMAGE (collection, homepage, page, article) ----
      console.log(`[smart-alt-text] Fetching content_image ${image_id}`);
      
      const { data: contentImage, error: contentError } = await supabase
        .from("content_images")
        .select("id, src, alt_text, optimization_count, content_id, content_type, store_id, user_id")
        .eq("id", image_id)
        .single();
      
      if (contentError || !contentImage) {
        console.error(`[smart-alt-text] Content image not found:`, contentError);
        throw new Error("Content image not found");
      }
      
      image = contentImage;
      sellerId = contentImage.user_id;
      storeId = contentImage.store_id;
      
      // Get context based on content type
      const contentType = contentImage.content_type || imageType;
      console.log(`[smart-alt-text] Content type: ${contentType}, content_id: ${contentImage.content_id}`);
      
      if (contentType === 'collection') {
        const { data: collection } = await supabase
          .from("shopify_collections")
          .select("id, title, body_html, store_id")
          .eq("id", contentImage.content_id)
          .single();
        
        if (collection) {
          contextData = collection;
          contentTitle = collection.title || '';
          cleanDescription = (collection.body_html || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 400);
        }
      } else if (contentType === 'article') {
        const { data: article } = await supabase
          .from("blog_articles")
          .select("id, title, content, store_id")
          .eq("id", contentImage.content_id)
          .single();
        
        if (article) {
          contextData = article;
          contentTitle = article.title || '';
          cleanDescription = (article.content || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 400);
        }
      } else {
        // For homepage/page, use minimal context
        contentTitle = imageType || 'content';
        cleanDescription = '';
      }
      
      // Get store language
      const { data: store } = await supabase
        .from("shopify_connections")
        .select("store_language")
        .eq("id", storeId)
        .single();
      
      const rawStoreLanguage = store?.store_language || "en-US";
      lang = resolveLanguage({
        contentText: `${contentTitle} ${cleanDescription}`,
        storeLanguage: rawStoreLanguage
      });
      
      console.log(`[smart-alt-text] 🛡️ LANGUAGE GUARD: content-image - detected=${lang}, store=${rawStoreLanguage}`);
      
    } else {
      // ---- PRODUCT IMAGE ----
      console.log(`[smart-alt-text] Fetching product_image ${image_id}`);
      
      const { data: productImage } = await supabase
        .from("product_images")
        .select("id, src, alt_text, optimization_count, product_id")
        .eq("id", image_id)
        .single();
      
      if (!productImage) throw new Error("Product image not found");
      
      image = productImage;
      
      // Get product data
      const { data: product } = await supabase
        .from("shopify_products")
        .select("id, title, seo_title, body_html, product_type, category, seller_id, store_id")
        .eq("id", productImage.product_id)
        .single();
      
      if (!product) throw new Error("Product not found");
      
      contextData = product;
      sellerId = product.seller_id;
      storeId = product.store_id;
      contentTitle = product.title;
      
      // Clean description
      cleanDescription = (product.body_html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 400);
      
      // Get store language
      const { data: store } = await supabase
        .from("shopify_connections")
        .select("store_language")
        .eq("id", product.store_id)
        .single();
      
      const rawStoreLanguage = store?.store_language || "en-US";
      lang = resolveLanguage({
        contentText: `${product.title || ""} ${product.body_html || ""}`,
        storeLanguage: rawStoreLanguage
      });
      
      console.log(`[smart-alt-text] 🛡️ LANGUAGE GUARD: product - detected=${lang}, store=${rawStoreLanguage}, product="${product.title?.substring(0,30)}..."`);
    }

    // Get prompt based on image type
    let prompt: string;
    if (isContentImage) {
      prompt = getContentAltTextPrompt(lang, imageType, contentTitle, cleanDescription);
    } else {
      prompt = getAltTextPrompt(
        lang,
        contentTitle,
        contextData?.product_type || 'Non spécifié',
        contextData?.category || 'Non spécifiée',
        cleanDescription
      );
    }

    // ---- DeepSeek first pass ----
    console.log(`[smart-alt-text] Calling DeepSeek for initial ALT text...`);
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
    console.log(`[smart-alt-text] DeepSeek response: "${deepseekText.substring(0, 100)}..."`);

    // ---- Gemini Vision refinement ----
    console.log(`[smart-alt-text] Fetching image and calling Gemini Vision...`);
    const buffer = await fetch(image.src).then((r) => r.arrayBuffer());
    const base64 = arrayBufferToBase64(buffer);

    // Get vision prompt based on image type
    const visionPrompt = isContentImage 
      ? getContentVisionRefinePrompt(lang, deepseekText, imageType)
      : getVisionRefinePrompt(lang, deepseekText);

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

    let geminiText = (await geminiRes.json())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deepseekText;
    console.log(`[smart-alt-text] Gemini response: "${geminiText.substring(0, 100)}..."`);
    
    // Clean: take only the first line if multiple options returned
    geminiText = geminiText
      .replace(/^(Voici|Image de|Photo de|ALT\s*:?\s*|Texte ALT\s*:?\s*|Here is|Image of|Bild von|Hier ist|Immagine di|Ecco|Imagen de|Aquí está)/i, "")
      .replace(/^\*\s*/g, "")
      .replace(/^-\s*/g, "")
      .split(/\n|•/)[0]
      .replace(/^\*\s*/g, "")
      .trim();

    // ✅ VALIDATION: Ensure we have a valid alt text before saving
    if (!isValidAltText(geminiText)) {
      console.error(`[smart-alt-text] ❌ Generated alt text is empty or generic: "${geminiText}"`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to generate valid alt text - AI returned empty or generic response",
        generatedText: geminiText
      }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    console.log(`[smart-alt-text] ✅ Final alt text: "${geminiText}"`);

    // ---- Update database ----
    const tableName = isContentImage ? "content_images" : "product_images";
    
    await supabase
      .from(tableName)
      .update({
        alt_text: geminiText,
        optimization_count: (image.optimization_count ?? 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ai_generated: true,
      })
      .eq("id", image.id);

    console.log(`[smart-alt-text] Updated ${tableName} with new alt text`);

    // ---- Increment usage ----
    await supabase.rpc("increment_usage", {
      p_seller_id: sellerId,
      p_field: "optimizations_count",
      p_increment: 3,
    });

    // ---- Auto-sync ALT text to Shopify ----
    let shopifySynced = false;
    let syncError = '';
    
    // Get shopify_image_id for sync
    const shopifyImageId = image.shopify_image_id;
    
    if (shopifyImageId) {
      console.log(`[smart-alt-text] 🔄 Auto-syncing ALT text to Shopify for image ${image_id}, type: ${imageType}`);
      try {
        const syncResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-seo-to-shopify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              imageId: image_id,
              imageType: imageType, // Pass the actual image type
              serviceMode: true,
              userId: sellerId,
            }),
          }
        );
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          if (syncResult.success) {
            shopifySynced = true;
            console.log(`[smart-alt-text] ✅ ALT text synced to Shopify successfully`);
          } else {
            syncError = syncResult.error || syncResult.message || 'Sync returned failure';
            console.error(`[smart-alt-text] ❌ Sync returned failure:`, syncError);
          }
        } else {
          const errorText = await syncResponse.text();
          syncError = `HTTP ${syncResponse.status}: ${errorText}`;
          console.error(`[smart-alt-text] ❌ Failed to sync ALT to Shopify:`, syncError);
        }
      } catch (err) {
        syncError = err instanceof Error ? err.message : 'Unknown sync error';
        console.error(`[smart-alt-text] ❌ Error during auto-sync:`, syncError);
      }
    } else {
      console.log(`[smart-alt-text] Image ${image_id} has no Shopify ID, skipping sync`);
      syncError = 'Image has no Shopify ID';
    }

    // Return response with sync status
    return new Response(JSON.stringify({ 
      success: true, 
      alt: geminiText,
      shopifySynced: shopifySynced,
      syncError: syncError || undefined
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[smart-alt-text] Error:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
