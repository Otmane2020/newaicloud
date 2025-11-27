// Intelligent Language Detection System
// Detects language from content text (product titles, descriptions, etc.)

/**
 * Detects the language of a given text based on keyword indicators
 * Supports: French (fr), English (en), German (de), Spanish (es), Italian (it)
 * Uses adaptive threshold: 1 match for short texts, 2 for longer texts
 */
export function detectContentLanguage(text: string): string {
  if (!text || text.length < 3) return "fr"; // Default to French

  const cleanText = text.toLowerCase().trim();
  const isShortText = cleanText.length < 50;

  // Language indicators - common words that strongly indicate a specific language
  // Expanded with e-commerce and product-specific terms
  const indicators: Record<string, string[]> = {
    fr: [
      // Articles & prepositions
      "le", "la", "les", "un", "une", "de", "du", "des", "avec", "pour", "dans", "sur", "ce", "cette", "est", "sont", "très", "être", "avoir", "qui", "que", "nous", "vous", "et", "ou", "en", "au", "aux",
      // Furniture & materials
      "bois", "métal", "tissu", "cuir", "moderne", "élégant", "canapé", "table", "chaise", "fauteuil", "bureau", "lit", "armoire", "rangement", "meuble",
      // E-commerce French
      "livraison", "gratuite", "promotion", "solde", "nouveau", "collection", "produit", "achat", "panier", "commande", "prix", "qualité", "neige", "planche"
    ],
    en: [
      // Articles & prepositions
      "the", "and", "for", "with", "this", "that", "from", "our", "your", "is", "are", "has", "have", "was", "were", "an", "of", "to", "in", "on", "at", "by",
      // Furniture & materials
      "wood", "metal", "fabric", "leather", "modern", "elegant", "sofa", "table", "chair", "desk", "bed", "storage", "cabinet", "drawer", "furniture",
      // E-commerce English
      "snowboard", "board", "premium", "hidden", "collection", "shop", "buy", "new", "sale", "free", "shipping", "product", "style", "design", "price", "quality", "delivery", "order", "cart", "checkout",
      // Sports & products
      "freestyle", "ski", "surf", "bike", "outdoor", "gear", "equipment", "accessories", "performance", "pro", "edition", "limited", "exclusive"
    ],
    de: [
      "der", "die", "das", "und", "mit", "für", "ein", "eine", "von", "zu", "ist", "sind", "hat", "haben", "auf", "bei", "nach", "über",
      "holz", "metall", "stoff", "leder", "modern", "elegant", "sofa", "tisch", "stuhl", "schreibtisch", "bett", "schrank",
      "lieferung", "kostenlos", "neu", "kollektion", "produkt", "preis", "qualität", "snowboard", "brett"
    ],
    es: [
      "el", "la", "los", "las", "un", "una", "con", "para", "que", "en", "de", "es", "son", "tiene", "tienen", "del", "al", "por",
      "madera", "metal", "tela", "cuero", "moderno", "elegante", "sofá", "mesa", "silla", "escritorio", "cama", "armario",
      "envío", "gratis", "nuevo", "colección", "producto", "precio", "calidad", "comprar", "tienda"
    ],
    it: [
      "il", "la", "le", "un", "una", "con", "per", "che", "di", "da", "è", "sono", "ha", "hanno", "del", "della", "nel", "nella",
      "legno", "metallo", "tessuto", "pelle", "moderno", "elegante", "divano", "tavolo", "sedia", "scrivania", "letto", "armadio",
      "spedizione", "gratuita", "nuovo", "collezione", "prodotto", "prezzo", "qualità", "acquista", "negozio"
    ],
  };

  // Count occurrences of indicator words for each language
  const counts: Record<string, number> = { fr: 0, en: 0, de: 0, es: 0, it: 0 };
  
  // Split text into words and check against indicators
  const words = cleanText.split(/\s+/);
  
  for (const [lang, langIndicators] of Object.entries(indicators)) {
    for (const indicator of langIndicators) {
      // Check for word boundaries to avoid false positives
      if (words.includes(indicator) || cleanText.includes(` ${indicator} `) || 
          cleanText.startsWith(`${indicator} `) || cleanText.endsWith(` ${indicator}`)) {
        counts[lang]++;
      }
    }
  }

  // Find the language with the highest count
  let maxLang = "fr";
  let maxCount = 0;
  
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang;
    }
  }

  // Adaptive threshold: 1 for short texts (< 50 chars), 2 for longer texts
  const threshold = isShortText ? 1 : 2;
  
  console.log(`🔍 Language detection: text="${cleanText.substring(0, 40)}..." counts=${JSON.stringify(counts)} maxLang=${maxLang} maxCount=${maxCount} threshold=${threshold} isShort=${isShortText}`);
  
  return maxCount >= threshold ? maxLang : "fr";
}

/**
 * Resolves the language to use with priority:
 * 1. Explicit language passed in the request
 * 2. Language detected from content (title, description)
 * 3. Store language from shopify_connections
 * 4. Default: French
 */
export function resolveLanguage(options: {
  explicitLanguage?: string;   // Language passed explicitly in request body
  contentText?: string;        // Product title, description, or other content
  storeLanguage?: string;      // Language from shopify_connections.store_language
}): string {
  // 1. Explicit language has highest priority
  if (options.explicitLanguage) {
    const lang = options.explicitLanguage.split('-')[0].toLowerCase();
    if (['fr', 'en', 'de', 'es', 'it'].includes(lang)) {
      console.log(`🌍 Using explicit language: ${lang}`);
      return lang;
    }
  }
  
  // 2. Detect from content text (title + description) - PRIORITY over store language
  if (options.contentText && options.contentText.length >= 3) {
    const detected = detectContentLanguage(options.contentText);
    console.log(`🌍 Language detected from content "${options.contentText.substring(0, 30)}...": ${detected}`);
    return detected;
  }
  
  // 3. Use store language as fallback
  if (options.storeLanguage) {
    const lang = options.storeLanguage.split('-')[0].toLowerCase();
    if (['fr', 'en', 'de', 'es', 'it'].includes(lang)) {
      console.log(`🌍 Using store language: ${lang}`);
      return lang;
    }
  }
  
  // 4. Default to French
  console.log(`🌍 Using default language: fr`);
  return 'fr';
}

/**
 * Get language-specific prompt instructions
 */
export function getLanguageInstructions(lang: string): string {
  const instructions: Record<string, string> = {
    fr: "Réponds uniquement en français. Utilise un style naturel et commercial adapté au marché français.",
    en: "Respond only in English. Use a natural, commercial style suited for English-speaking markets.",
    de: "Antworte nur auf Deutsch. Verwende einen natürlichen, kommerziellen Stil für den deutschen Markt.",
    es: "Responde únicamente en español. Utiliza un estilo natural y comercial adaptado al mercado hispanohablante.",
    it: "Rispondi solo in italiano. Utilizza uno stile naturale e commerciale adatto al mercato italiano.",
  };
  
  return instructions[lang] || instructions.fr;
}

/**
 * Get language name for prompts
 */
export function getLanguageName(lang: string): string {
  const names: Record<string, string> = {
    fr: "français",
    en: "English",
    de: "Deutsch",
    es: "español",
    it: "italiano",
  };
  
  return names[lang] || names.fr;
}

/**
 * Get SEO prompt in the correct language
 */
export function getSeoPromptByLanguage(lang: string): string {
  const prompts: Record<string, string> = {
    fr: "Tu es un expert SEO e-commerce. Génère du contenu optimisé pour le référencement en français.",
    en: "You are an e-commerce SEO expert. Generate search-optimized content in English.",
    de: "Du bist ein E-Commerce-SEO-Experte. Generiere suchmaschinenoptimierten Inhalt auf Deutsch.",
    es: "Eres un experto en SEO de comercio electrónico. Genera contenido optimizado para motores de búsqueda en español.",
    it: "Sei un esperto SEO di e-commerce. Genera contenuti ottimizzati per i motori di ricerca in italiano.",
  };
  
  return prompts[lang] || prompts.fr;
}

/**
 * 🛡️ LANGUAGE GUARD - Central function that ALL generation functions MUST call
 * Returns validated language with full logging for debugging
 */
export interface LanguageGuardResult {
  language: string;           // Detected language code (fr, en, de, es, it)
  languageName: string;       // Full name (français, English, etc.)
  instructions: string;       // Language-specific instructions for AI
  seoPrompt: string;          // SEO-specific system prompt
  isContentDetected: boolean; // True if detected from content, false if fallback
  sourceText: string;         // First 50 chars of text used for detection
}

export function getGenerationLanguage(options: {
  productTitle?: string;
  productDescription?: string;
  collectionTitle?: string;
  pageTitle?: string;
  articleTitle?: string;
  explicitLanguage?: string;
  storeLanguage?: string;
}): LanguageGuardResult {
  // Build content text from all available sources
  const contentParts: string[] = [];
  
  if (options.productTitle) contentParts.push(options.productTitle);
  if (options.productDescription) contentParts.push(options.productDescription);
  if (options.collectionTitle) contentParts.push(options.collectionTitle);
  if (options.pageTitle) contentParts.push(options.pageTitle);
  if (options.articleTitle) contentParts.push(options.articleTitle);
  
  const contentText = contentParts.join(' ').trim();
  
  // Detect language using priority system
  const language = resolveLanguage({
    explicitLanguage: options.explicitLanguage,
    contentText: contentText,
    storeLanguage: options.storeLanguage,
  });
  
  const languageName = getLanguageName(language);
  const instructions = getLanguageInstructions(language);
  const seoPrompt = getSeoPromptByLanguage(language);
  const isContentDetected = contentText.length >= 3;
  
  // 🛡️ CRITICAL LOG - Always log for debugging
  console.log(`🛡️ LANGUAGE GUARD: detected="${language}" (${languageName}), contentDetected=${isContentDetected}, source="${contentText.substring(0, 50)}..."`);
  
  return {
    language,
    languageName,
    instructions,
    seoPrompt,
    isContentDetected,
    sourceText: contentText.substring(0, 50),
  };
}
