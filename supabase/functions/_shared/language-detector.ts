// Intelligent Language Detection System
// Detects language from content text (product titles, descriptions, etc.)

/**
 * Detects the language of a given text based on keyword indicators
 * Supports: French (fr), English (en), German (de), Spanish (es), Italian (it)
 */
export function detectContentLanguage(text: string): string {
  if (!text || text.length < 5) return "fr"; // Default to French

  const cleanText = text.toLowerCase().trim();

  // Language indicators - common words that strongly indicate a specific language
  const indicators: Record<string, string[]> = {
    fr: ["le", "la", "les", "un", "une", "de", "du", "des", "avec", "pour", "dans", "sur", "ce", "cette", "est", "sont", "très", "être", "avoir", "qui", "que", "nous", "vous", "bois", "métal", "tissu", "cuir", "moderne", "élégant", "canapé", "table", "chaise", "fauteuil", "bureau", "lit", "armoire", "rangement"],
    en: ["the", "and", "for", "with", "this", "that", "from", "our", "your", "is", "are", "has", "have", "was", "were", "wood", "metal", "fabric", "leather", "modern", "elegant", "sofa", "table", "chair", "desk", "bed", "storage", "cabinet", "drawer"],
    de: ["der", "die", "das", "und", "mit", "für", "ein", "eine", "von", "zu", "ist", "sind", "hat", "haben", "holz", "metall", "stoff", "leder", "modern", "elegant", "sofa", "tisch", "stuhl", "schreibtisch", "bett", "schrank"],
    es: ["el", "la", "los", "las", "un", "una", "con", "para", "que", "en", "de", "es", "son", "tiene", "tienen", "madera", "metal", "tela", "cuero", "moderno", "elegante", "sofá", "mesa", "silla", "escritorio", "cama", "armario"],
    it: ["il", "la", "le", "un", "una", "con", "per", "che", "di", "da", "è", "sono", "ha", "hanno", "legno", "metallo", "tessuto", "pelle", "moderno", "elegante", "divano", "tavolo", "sedia", "scrivania", "letto", "armadio"],
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

  // Only return detected language if we have enough confidence (at least 2 indicator matches)
  return maxCount >= 2 ? maxLang : "fr";
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
  
  // 2. Detect from content text (title + description)
  if (options.contentText && options.contentText.length >= 10) {
    const detected = detectContentLanguage(options.contentText);
    console.log(`🌍 Language detected from content: ${detected}`);
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
