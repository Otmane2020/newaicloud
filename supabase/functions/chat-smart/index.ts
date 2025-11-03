import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Cache en mémoire avec TTL
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 heure

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Product {
  id: string;
  title: string;
  price: string;
  compare_at_price?: string;
  ai_color?: string;
  ai_material?: string;
  ai_shape?: string;
  image_url?: string;
  category?: string;
  sub_category?: string;
  tags?: string;
  handle?: string;
  vendor?: string;
  currency?: string;
  description?: string;
  product_type?: string;
  style?: string;
  room?: string;
}

interface ProductSearchFilters {
  query?: string;
  category?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  style?: string;
  room?: string;
  limit?: number;
  status?: string;
  maxPrice?: number;
  minPrice?: number;
  exactMatch?: boolean;
  strictCategory?: boolean;
}

interface ChatResponse {
  role: "assistant";
  content: string;
  intent: "simple_chat" | "product_chat" | "product_show" | "conversation" | "product_details" | "product_comparison" | "product_recommendation";
  products: Product[];
  mode: "conversation" | "product_show" | "details" | "comparison";
  sector: string;
  follow_up_questions?: string[];
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Cache helpers
function getCachedResponse(cacheKey: string): string | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  console.log("✅ Cache HIT:", cacheKey);
  return entry.response;
}

function setCachedResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  console.log("💾 Cache SET:", cacheKey);
  
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

function extractContextFromHistory(history: ChatMessage[]): string {
  return history
    .filter((msg) => msg.role === "user")
    .slice(-3)
    .map((msg) => msg.content)
    .join(" ");
}

// Système de détection d'attributs beaucoup plus complet
function extractFiltersFromQuery(query: string, history: ChatMessage[] = []): ProductSearchFilters {
  const filters: ProductSearchFilters = {};
  const normalized = normalizeText(query);
  const pronounReferences = ["la", "le", "les", "celle", "celui", "celles", "ceux", "ca", "ça"];
  const hasPronounReference = pronounReferences.some((word) => normalized.includes(word));
  let searchQuery = query;

  if (hasPronounReference && history.length > 0) {
    const context = extractContextFromHistory(history);
    console.log("🔄 Pronoun detected, using context:", context);
    searchQuery = context + " " + query;
  }

  const searchNormalized = normalizeText(searchQuery);
  console.log("🎯 Analyzing query for filters:", searchNormalized);

  // DÉTECTION DES CATÉGORIES PRINCIPALES (AMÉLIORÉE)
  const categoryPatterns = [
    { pattern: /table\s*basse/i, category: "table basse", priority: 100 },
    { pattern: /table\s*a\s*manger/i, category: "table à manger", priority: 100 },
    { pattern: /table\s*de\s*salle\s*a\s*manger/i, category: "table à manger", priority: 100 },
    { pattern: /canape/i, category: "canapé", priority: 100 },
    { pattern: /fauteuil/i, category: "fauteuil", priority: 100 },
    { pattern: /chaise/i, category: "chaise", priority: 100 },
    { pattern: /armoire/i, category: "armoire", priority: 100 },
    { pattern: /commode/i, category: "commode", priority: 90 },
    { pattern: /buffet/i, category: "buffet", priority: 90 },
    { pattern: /etagere/i, category: "étagère", priority: 80 },
    { pattern: /bibliotheque/i, category: "bibliothèque", priority: 80 },
    { pattern: /lit/i, category: "lit", priority: 100 },
    { pattern: /bureau/i, category: "bureau", priority: 90 },
    { pattern: /lampe/i, category: "lampe", priority: 70 },
    { pattern: /miroir/i, category: "miroir", priority: 70 },
    { pattern: /tabouret/i, category: "tabouret", priority: 60 },
    { pattern: /meuble\s*de\s*tele/i, category: "meuble tv", priority: 80 },
    { pattern: /meuble\s*tv/i, category: "meuble tv", priority: 80 },
  ];

  // Recherche de la catégorie avec la plus haute priorité
  let bestCategory = null;
  let highestPriority = 0;

  for (const { pattern, category, priority } of categoryPatterns) {
    if (pattern.test(searchQuery) && priority > highestPriority) {
      bestCategory = category;
      highestPriority = priority;
      console.log("🎯 Category detected:", category, "priority:", priority);
    }
  }

  if (bestCategory) {
    filters.query = bestCategory;
    filters.exactMatch = highestPriority >= 90; // Match exact pour les catégories importantes
    filters.strictCategory = highestPriority >= 90;
  }

  // DÉTECTION DES COULEURS (SYSTÈME AMÉLIORÉ)
  const colorMap = {
    blanc: ["blanc", "blanche", "white", "blanches", "neige", "immaculé"],
    noir: ["noir", "noire", "black", "noires", "ébène", "nuit"],
    gris: ["gris", "grise", "gray", "grey", "grises", "argent", "anthracite"],
    beige: ["beige", "sable", "crème", "écru", "naturel"],
    bois: ["bois", "wood", "boise", "nature", "naturel", "massif"],
    marron: ["marron", "brown", "brun", "brune", "châtaigne", "café", "chocolat"],
    bleu: ["bleu", "bleue", "blue", "bleues", "marine", "ciel", "turquoise"],
    vert: ["vert", "verte", "green", "vertes", "émeraude", "forêt", "menthe"],
    rouge: ["rouge", "red", "cerise", "bordeaux", "rubis"],
    jaune: ["jaune", "yellow", "doré", "moutarde", "soleil"],
    orange: ["orange", "mandarine", "corail"],
    rose: ["rose", "pink", "fuchsia", "saumon"],
    violet: ["violet", "violette", "purple", "mauve", "lavande", "lilas"],
    multicolore: ["multicolore", "coloré", "colorée", "arc en ciel"],
  };

  for (const [color, variants] of Object.entries(colorMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.color = color;
      console.log("🎨 Color detected:", color);
      break;
    }
  }

  // DÉTECTION DES MATÉRIAUX (SYSTÈME COMPLET)
  const materialMap = {
    bois: ["bois", "wood", "boise", "en bois", "bois massif", "chene", "chenê", "noyer", "teck", "pin", "merisier", "hetre", "hêtre", "acajou", "bambou"],
    metal: ["metal", "métal", "acier", "inox", "fer", "aluminium", "chrome", "or", "argent", "bronze", "cuivre", "acier inoxydable"],
    verre: ["verre", "glass", "vitre", "vitrine", "transparent", "cristal"],
    marbre: ["marbre", "marbree", "marbré", "marble", "pierre naturelle"],
    cuir: ["cuir", "leather", "simili cuir", "cuir véritable", "daim", "nubuck"],
    tissu: ["tissu", "tissée", "tissé", "tissus", "textile", "fabric", "velours", "lin", "coton", "soie", "laine", "polyester", "microfibre"],
    plastique: ["plastique", "plastic", "resine", "résine", "composite", "polycarbonate", "acrylique"],
    ceramique: ["ceramique", "céramique", "ceramic", "porcelaine", "faïence", "terre cuite"],
    pierre: ["pierre", "stone", "granit", "granite", "ardoise", "basalte"],
    rotin: ["rotin", "osier", "bambou", "wicker", "vannerie"],
    beton: ["beton", "béton", "ciment", "industriel"],
  };

  for (const [material, variants] of Object.entries(materialMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.material = material;
      console.log("🏗️ Material detected:", material);
      break;
    }
  }

  // DÉTECTION DES STYLES (SYSTÈME ÉTENDU)
  const styleMap = {
    moderne: ["moderne", "modern", "contemporain", "contemporaine", "design", "actuel", "tendance"],
    classique: ["classique", "traditionnel", "traditionnelle", "ancien", "ancienne", "vieux", "ancien style"],
    vintage: ["vintage", "retro", "rétro", "ancien", "ancienne", "années 50", "années 60", "années 70"],
    scandinave: ["scandinave", "scandinavie", "nordique", "danemark", "suède", "norvège", "hygge", "épuré"],
    industriel: ["industriel", "industrielle", "industrie", "metal", "métal", "usine", "loft", "new york"],
    rustique: ["rustique", "campagne", "provence", "provencal", "provençale", "ferme", "chaleureux"],
    minimaliste: ["minimaliste", "minimal", "epure", "épuré", "simple", "sobre", "essentiel"],
    design: ["design", "contemporain", "moderne", "tendance", "créatif", "artistique"],
    elegant: ["elegant", "élégant", "raffine", "raffiné", "chic", "luxe", "luxueux", "premium"],
    bohème: ["bohème", "boho", "ethnique", "voyage", "nature"],
    japonais: ["japonais", "japonaise", "zen", "asiatique", "wabi sabi"],
  };

  for (const [style, variants] of Object.entries(styleMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.style = style;
      console.log("🎭 Style detected:", style);
      break;
    }
  }

  // DÉTECTION DES PIÈCES (SYSTÈME COMPLET)
  const roomMap = {
    salon: ["salon", "sejour", "séjour", "living", "salle de sejour", "salle à manger", "séjour", "coin détente"],
    chambre: ["chambre", "chambre a coucher", "chambre à coucher", "bedroom", "dortoir", "coin nuit"],
    cuisine: ["cuisine", "kitchen", "salle de cuisine", "coin repas", "cellier"],
    "salle de bain": ["salle de bain", "salle de bains", "bain", "bains", "bathroom", "douche", "toilette", "sanitaire"],
    bureau: ["bureau", "office", "studie", "studio", "travail", "espace travail", "home office"],
    jardin: ["jardin", "exterieur", "extérieur", "terrasse", "balcon", "jardinnage", "véranda"],
    entree: ["entree", "entrée", "hall", "couloir", "vestibule", "accueil"],
    dressing: ["dressing", "dressings", "penderie", "rangement vetements", "rangement vêtements"],
    cave: ["cave", "sous sol", "sous-sol", "cellier"],
  };

  for (const [room, variants] of Object.entries(roomMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.room = room;
      console.log("🏠 Room detected:", room);
      break;
    }
  }

  // DÉTECTION DES BUDGETS ET PRIX (AMÉLIORÉE)
  const priceMatch = searchNormalized.match(
    /(?:moins de|max|maximum|jusqu'?a|jusqu'?à|inferieur a|inférieur à|pas plus de|<\s*|budget)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (priceMatch) {
    filters.maxPrice = parseInt(priceMatch[1]);
    console.log("💰 Max price detected:", filters.maxPrice);
  }

  const minPriceMatch = searchNormalized.match(
    /(?:plus de|min|minimum|a partir de|à partir de|superieur a|supérieur à|>\s*|a partir)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (minPriceMatch) {
    filters.minPrice = parseInt(minPriceMatch[1]);
    console.log("💰 Min price detected:", filters.minPrice);
  }

  const priceRangeMatch = searchNormalized.match(
    /(?:entre\s*)(\d+)(?:\s*et|\s*à|\s*-|\s*et)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (priceRangeMatch) {
    filters.minPrice = parseInt(priceRangeMatch[1]);
    filters.maxPrice = parseInt(priceRangeMatch[2]);
    console.log("💰 Price range detected:", filters.minPrice, "-", filters.maxPrice);
  }

  // DÉTECTION DES TAILLES ET DIMENSIONS
  const sizePatterns = [
    { regex: /(\d+)\s*cm\s*(?:de\s*)?(?:largeur|large)/i, type: "width" },
    { regex: /(\d+)\s*cm\s*(?:de\s*)?(?:hauteur|haut)/i, type: "height" },
    { regex: /(\d+)\s*cm\s*(?:de\s*)?(?:profondeur|profond)/i, type: "depth" },
    { regex: /(\d+)\s*cm\s*(?:x|\*)\s*(\d+)\s*cm/i, type: "dimensions" },
    { regex: /petit/i, type: "small" },
    { regex: /grand/i, type: "large" },
    { regex: /moyen/i, type: "medium" },
  ];

  for (const pattern of sizePatterns) {
    const match = searchNormalized.match(pattern.regex);
    if (match) {
      console.log("📏 Size detected:", pattern.type, match[1]);
      // Stocker les informations de taille pour utilisation future
      break;
    }
  }

  // Si pas de catégorie spécifique détectée, utiliser la recherche textuelle
  if (!bestCategory) {
    const genericKeywords = [
      "produits",
      "articles",
      "catalogue",
      "collection",
      "tout",
      "tous",
      "tes",
      "vos",
      "montre",
      "voir",
    ];
    const isGenericRequest = genericKeywords.some((word) => searchNormalized.includes(word));

    const categories = [
      "canape",
      "table",
      "chaise",
      "fauteuil",
      "meuble",
      "armoire",
      "lit",
      "bureau",
      "lampe",
      "miroir",
    ];
    const foundCategory = categories.find((c) => searchNormalized.includes(c));

    if (foundCategory) {
      filters.query = foundCategory;
    } else if (isGenericRequest) {
      filters.query = "";
    } else {
      // Extraction des termes principaux pour la recherche
      const stopWords = [
        "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
        "de", "du", "des", "le", "la", "les", "un", "une", "au", "aux",
        "avec", "pour", "dans", "sur", "sous", "chez", "est", "sont",
        "ai", "as", "a", "avons", "avez", "ont", "veux", "voudrais",
        "cherche", "recherche", "quel", "quelle", "quels", "quelles",
      ];
      
      const queryWords = searchNormalized
        .split(" ")
        .filter((word) => word.length > 2 && !stopWords.includes(word))
        .filter((word) => !Object.values(colorMap).flat().includes(word))
        .filter((word) => !Object.values(materialMap).flat().includes(word))
        .filter((word) => !Object.values(styleMap).flat().includes(word))
        .filter((word) => !Object.values(roomMap).flat().includes(word));

      filters.query = queryWords.join(" ");
    }
  }

  filters.status = "active";
  filters.limit = 12;
  
  console.log("📋 Final extracted filters:", filters);
  return filters;
}

// SYSTÈME DE DÉTECTION D'INTENT AMÉLIORÉ
async function detectIntent(userMessage: string, history: ChatMessage[] = []): Promise<"simple_chat" | "product_chat" | "product_show" | "product_details" | "product_comparison" | "product_recommendation"> {
  const msg = normalizeText(userMessage);
  const context = extractContextFromHistory(history);
  const fullContext = context + " " + msg;
  
  console.log("🧠 Analyzing intent for:", msg);
  console.log("📚 Context from history:", context);
  
  let scores = { 
    simple_chat: 0, 
    product_chat: 0, 
    product_show: 0,
    product_details: 0,
    product_comparison: 0,
    product_recommendation: 0
  };

  // Mots-clés pour chaque intent (SYSTÈME COMPLET)
  const intentKeywords = {
    simple_chat: [
      "bonjour", "salut", "hello", "coucou", "hey", "hi", "bonsoir",
      "comment ca va", "ca va", "comment allez-vous", "merci", "thanks",
      "au revoir", "bye", "a bientot", "ok", "d'accord", "parfait",
      "super", "genial", "cool", "qui es-tu", "ton nom", "tu fais quoi",
      "comment tu t'appelles", "tu es un robot", "tu es une ia",
      "vous etes disponible", "vous travaillez", "jour de repos", "week-end",
      "aide", "help", "bien", "mal", "content", "triste"
    ],

    product_show: [
      "montre", "montrez", "montre-moi", "affiche", "voir", "regarder",
      "montrer", "liste", "lister", "catalogue", "collection", "gamme",
      "selection", "je cherche", "je veux", "j'ai besoin", "je voudrais",
      "trouver", "acheter", "commander", "panier", "budget", "plusieurs",
      "quelques", "des", "tous les", "toutes les", "ce que vous avez",
      "vos produits", "votre catalogue", "disponible", "en stock"
    ],

    product_chat: [
      "avez-vous", "proposez-vous", "vendez-vous", "vous avez", "disponible",
      "en stock", "existe", "qualite", "durable", "resistant", "solide",
      "fiable", "materiau", "matiere", "composition", "fabrication",
      "garantie", "retour", "satisfait", "livraison", "conseil", "avis",
      "recommandation", "suggestion", "comment choisir", "lequel", "quelle",
      "difference", "meilleur", "preferer", "conseiller", "tendance", "mode",
      "populaire", "best-seller", "nouveau", "actualite", "promotion", "promo",
      "solde", "offre", "prix", "coute", "combien", "dimension", "taille",
      "couleur", "matériau", "style", "caracteristique", "fonctionnalite",
      "avantage", "inconvenient", "pourquoi", "comment", "est-ce que"
    ],

    product_details: [
      "detail", "détail", "specification", "spécification", "fiche technique",
      "caracteristiques", "caractéristiques", "description complete",
      "en savoir plus", "plus d'info", "plus d'informations", "info produit",
      "qu'est-ce que", "c'est quoi", "explique", "décris", "presente",
      "caractéristique", "fonction", "utilisation", "montre les details",
      "fiche produit", "description détaillée"
    ],

    product_comparison: [
      "comparer", "comparaison", "difference", "différence", "vs", "contre",
      "oppose", "opposé", "lequel choisir", "quelle difference", "différences",
      "avantages", "inconvenients", "inconvénients", "pour et contre",
      "points forts", "points faibles", "comparatif", "mieux", "meilleur",
      "comparaison entre", "vs", "ou", "choix entre", "hésite entre"
    ],

    product_recommendation: [
      "recommandez", "recommande", "suggere", "suggère", "conseille",
      "propose", "idee", "idée", "inspiration", "trouve moi", "aide moi",
      "que me conseillez", "quel produit", "quelle marque", "pour mon",
      "pour ma", "pour mes", "adapté à", "adapte a", "correspond à",
      "correspond a", "recommandation", "suggestion", "conseil personnalise",
      "selon mes besoins", "pour débutant", "pour expert", "premium", "entree de gamme"
    ]
  };

  const productKeywords = [
    "produit", "article", "modele", "reference", "table", "chaise", "canape",
    "fauteuil", "meuble", "lit", "bureau", "armoire", "lampe", "miroir",
    "decoration", "mobilier", "robe", "chemise", "pantalon", "jupe", "sac",
    "bijou", "vetement", "chaussure", "accessoire", "ceinture", "telephone",
    "smartphone", "ordinateur", "tablette", "casque", "meuble", "mobilier"
  ];

  // CALCUL DES SCORES AVEC PONDÉRATIONS INTELLIGENTES
  Object.entries(intentKeywords).forEach(([intent, keywords]) => {
    keywords.forEach((word) => {
      if (msg.includes(word)) {
        scores[intent as keyof typeof scores] += 10;
      }
    });
  });

  // Bonus pour les mots-clés de produits
  productKeywords.forEach((word) => {
    if (msg.includes(word)) {
      scores.product_show += 8;
      scores.product_chat += 6;
      scores.product_recommendation += 4;
    }
  });

  // DÉTECTION DE PHRASES SPÉCIFIQUES
  const specificPatterns = [
    // Product Show patterns
    { pattern: /(montre|voir|affiche).*(table|chaise|canape|fauteuil|meuble|armoire|lit)/i, intent: "product_show", score: 50 },
    { pattern: /je (cherche|veux|voudrais).*(armoire|canape|table|chaise)/i, intent: "product_show", score: 40 },
    { pattern: /quels?.*(produits|articles).*avez.*vous/i, intent: "product_show", score: 35 },
    
    // Product Chat patterns
    { pattern: /(combien|prix|cout|coût).*(coute|coûte)/i, intent: "product_chat", score: 40 },
    { pattern: /(quelle|quel).*(couleur|matériau|style|taille)/i, intent: "product_chat", score: 35 },
    { pattern: /(livraison|garantie|retour|delai)/i, intent: "product_chat", score: 30 },
    
    // Product Details patterns
    { pattern: /(detail|détail|specification).*(produit|article)/i, intent: "product_details", score: 45 },
    { pattern: /(decris|décris|presente|présente).*(produit|article)/i, intent: "product_details", score: 40 },
    { pattern: /(fiche technique|caracteristiques)/i, intent: "product_details", score: 50 },
    
    // Comparison patterns
    { pattern: /(comparer|comparaison).*(et|avec|ou)/i, intent: "product_comparison", score: 60 },
    { pattern: /(difference|différence).*(entre|de)/i, intent: "product_comparison", score: 55 },
    { pattern: /(lequel|quelle).*(choisir|prendre)/i, intent: "product_comparison", score: 50 },
    
    // Recommendation patterns
    { pattern: /(recommandez|conseillez).*(produit|article)/i, intent: "product_recommendation", score: 60 },
    { pattern: /(quel|quelle).*(conseillez|recommandez)/i, intent: "product_recommendation", score: 55 },
    { pattern: /(pour|adapté).*(salon|chambre|cuisine)/i, intent: "product_recommendation", score: 45 },
  ];

  specificPatterns.forEach(({ pattern, intent, score }) => {
    if (pattern.test(fullContext)) {
      scores[intent as keyof typeof scores] += score;
    }
  });

  // ANALYSE DU CONTEXTE HISTORIQUE
  if (history.length > 0) {
    const lastMessages = history.slice(-3).map(m => m.content).join(" ");
    const lastNormalized = normalizeText(lastMessages);

    // Si l'historique contient des discussions sur des produits spécifiques
    if (productKeywords.some(word => lastNormalized.includes(word))) {
      scores.product_chat += 20;
      scores.product_details += 15;
    }

    // Si l'utilisateur vient de demander à voir des produits
    if (lastNormalized.includes("montre") || lastNormalized.includes("voir")) {
      scores.product_details += 25;
      scores.product_comparison += 20;
    }
  }

  // RÈGLES CONTEXTUELLES SUPPLÉMENTAIRES
  if (msg.length < 10 && scores.simple_chat > 0) {
    scores.simple_chat += 30;
  }

  // Si la requête contient des attributs spécifiques (couleur, matériau, etc.)
  const hasSpecificAttributes = msg.match(/(blanc|noir|bois|metal|cuir|tissu|moderne|classique)/i);
  if (hasSpecificAttributes) {
    scores.product_show += 25;
    scores.product_chat += 15;
  }

  console.log("📊 Detailed intent scores:", scores);

  // DÉCISION FINALE AVEC SEUILS INTELLIGENTS
  const maxScore = Math.max(...Object.values(scores));
  const threshold = 30;

  if (maxScore < threshold) {
    console.log("🎯 Decision: SIMPLE_CHAT (fallback - no clear intent)");
    return "simple_chat";
  }

  // Priorité des intents
  if (scores.product_comparison === maxScore && scores.product_comparison > 50) {
    console.log("🎯 Decision: PRODUCT_COMPARISON (strong comparison intent)");
    return "product_comparison";
  }

  if (scores.product_recommendation === maxScore && scores.product_recommendation > 50) {
    console.log("🎯 Decision: PRODUCT_RECOMMENDATION (recommendation request)");
    return "product_recommendation";
  }

  if (scores.product_details === maxScore && scores.product_details > 45) {
    console.log("🎯 Decision: PRODUCT_DETAILS (detailed information request)");
    return "product_details";
  }

  if (scores.product_show === maxScore && scores.product_show > 40) {
    console.log("🎯 Decision: PRODUCT_SHOW (show products intent)");
    return "product_show";
  }

  if (scores.product_chat === maxScore && scores.product_chat > 35) {
    console.log("🎯 Decision: PRODUCT_CHAT (product information conversation)");
    return "product_chat";
  }

  console.log("🎯 Decision: SIMPLE_CHAT (conversation intent)");
  return "simple_chat";
}

// [Le reste du code reste similaire mais avec des améliorations pour chaque intent...]

// Fonction principale OmnIAChat mise à jour
async function* OmnIAChat(
  userMessage: string,
  history: ChatMessage[] = [],
  storeId?: string,
  sellerId?: string,
  context: any = {},
): AsyncGenerator<ChatResponse, void, unknown> {
  const startTime = Date.now();
  console.log("🚀 [OMNIA] Message received:", userMessage);

  try {
    // Détection d'intent améliorée
    const intentStart = Date.now();
    const intent = await detectIntent(userMessage, history);
    const intentDuration = Date.now() - intentStart;
    console.log(`🎯 Final intent: ${intent} (${intentDuration}ms)`);

    // Gestion spécifique pour "je cherche une armoire"
    if (intent === "product_chat" || intent === "product_show") {
      const searchFilters = extractFiltersFromQuery(userMessage, history);
      console.log("🔍 Extracted filters for product search:", searchFilters);

      // Pour "je cherche une armoire", on veut engager une conversation
      if (searchFilters.query === "armoire" && 
          !searchFilters.color && 
          !searchFilters.material && 
          !searchFilters.style) {
        
        const followUpQuestions = [
          "Quelle couleur préférez-vous pour votre armoire ?",
          "Avez-vous une préférence de matériau (bois, métal, verre...) ?",
          "Quel style recherchez-vous (moderne, classique, rustique...) ?",
          "Pour quelle pièce est destinée cette armoire ?",
          "Avez-vous un budget en tête ?"
        ];

        yield {
          role: "assistant",
          content: `Je vois que vous cherchez une armoire ! Pour vous proposer les meilleures options, pourriez-vous me préciser :

• La couleur que vous préférez
• Le matériau souhaité (bois, métal, verre...)
• Le style que vous aimez (moderne, classique, etc.)
• La pièce où elle sera placée

Cela m'aidera à vous trouver l'armoire parfaite ! 🎯`,
          intent: "product_chat",
          products: [],
          mode: "conversation",
          sector: "mobilier",
          follow_up_questions: followUpQuestions
        };
        return;
      }
    }

    // [Le reste du code pour les autres intents...]

  } catch (error) {
    console.error("❌ [OMNIA] Global error:", error);
    yield {
      role: "assistant",
      content: "Je suis désolé, je rencontre un problème technique. Pouvez-vous réessayer dans un instant ?",
      intent: "conversation",
      products: [],
      mode: "conversation",
      sector: "général",
    };
  }
}

// [Le reste du code Deno.serve reste inchangé...]