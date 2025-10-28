import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Initialize Deno KV for caching
const kv = await Deno.openKv();

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
}

interface ChatResponse {
  role: "assistant";
  content: string;
  intent: "simple_chat" | "product_chat" | "product_show" | "conversation";
  products: Product[];
  mode: "conversation" | "product_show";
  sector: string;
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
async function getCachedResponse(cacheKey: string): Promise<string | null> {
  try {
    const entry = await kv.get<string>(["chat-cache", cacheKey]);
    return entry.value;
  } catch (err) {
    console.error("Cache read error:", err);
    return null;
  }
}

async function setCachedResponse(cacheKey: string, response: string): Promise<void> {
  try {
    await kv.set(["chat-cache", cacheKey], response, { expireIn: 3600000 }); // 1h TTL
  } catch (err) {
    console.error("Cache write error:", err);
  }
}

function extractContextFromHistory(history: ChatMessage[]): string {
  return history
    .filter((msg) => msg.role === "user")
    .slice(-3)
    .map((msg) => msg.content)
    .join(" ");
}

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

  // Détection spécifique des catégories avec priorités
  const categoryPatterns = [
    { pattern: /table\s*basse/i, category: "table basse", exact: true },
    { pattern: /table\s*a\s*manger/i, category: "table à manger", exact: true },
    { pattern: /table\s*de\s*salle\s*a\s*manger/i, category: "table à manger", exact: true },
    { pattern: /table\s*de\s*cuisine/i, category: "table à manger", exact: true },
    { pattern: /canape/i, category: "canapé", exact: true },
    { pattern: /fauteuil/i, category: "fauteuil", exact: true },
    { pattern: /chaise/i, category: "chaise", exact: true },
    { pattern: /armoire/i, category: "armoire", exact: true },
    { pattern: /commode/i, category: "commode", exact: true },
    { pattern: /buffet/i, category: "buffet", exact: true },
    { pattern: /etagere/i, category: "étagère", exact: true },
    { pattern: /bibliotheque/i, category: "bibliothèque", exact: true },
    { pattern: /lit/i, category: "lit", exact: true },
    { pattern: /bureau/i, category: "bureau", exact: true },
    { pattern: /lampe/i, category: "lampe", exact: true },
    { pattern: /miroir/i, category: "miroir", exact: true },
    { pattern: /tabouret/i, category: "tabouret", exact: true },
  ];

  // Recherche des catégories spécifiques en premier
  let foundSpecificCategory = false;
  for (const { pattern, category, exact } of categoryPatterns) {
    if (pattern.test(searchQuery)) {
      filters.query = category;
      filters.exactMatch = exact;
      foundSpecificCategory = true;
      console.log("🎯 Specific category detected:", category, "exact:", exact);
      break;
    }
  }

  // Détection des attributs (TOUJOURS exécutée, même avec catégorie spécifique)
  console.log("🎨 Detecting attributes from query:", searchNormalized);

  // Couleurs avec variantes
  const colorMap = {
    blanc: ["blanc", "blanche", "white"],
    noir: ["noir", "noire", "black"],
    gris: ["gris", "grise", "gray", "grey"],
    beige: ["beige"],
    bois: ["bois", "wood", "boise"],
    marron: ["marron", "brown", "brun", "brune"],
    bleu: ["bleu", "bleue", "blue"],
    vert: ["vert", "verte", "green"],
    rouge: ["rouge", "red"],
    jaune: ["jaune", "yellow"],
    orange: ["orange"],
    rose: ["rose", "pink"],
    violet: ["violet", "violette", "purple", "mauve"],
  };

  for (const [color, variants] of Object.entries(colorMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.color = color;
      console.log("🎨 Color detected:", color);
      break;
    }
  }

  // Matériaux avec variantes
  const materialMap = {
    bois: ["bois", "wood", "boise", "en bois", "bois massif", "chene", "chenê", "noyer", "teck", "pin"],
    metal: ["metal", "métal", "acier", "inox", "fer", "aluminium", "chrome", "or", "argent"],
    verre: ["verre", "glass", "vitre"],
    marbre: ["marbre", "marbree", "marbré", "marble"],
    cuir: ["cuir", "leather", "cuir", "simili cuir"],
    tissu: ["tissu", "tissée", "tissé", "tissus", "textile", "fabric", "velours", "lin", "coton", "soie"],
    plastique: ["plastique", "plastic", "resine", "résine", "composite"],
    ceramique: ["ceramique", "céramique", "ceramic", "porcelaine", "faïence"],
    pierre: ["pierre", "stone", "granit", "granite", "ardoise"],
    rotin: ["rotin", "osier", "bambou", "wicker"],
  };

  for (const [material, variants] of Object.entries(materialMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.material = material;
      console.log("🏗️ Material detected:", material);
      break;
    }
  }

  // Styles avec variantes
  const styleMap = {
    moderne: ["moderne", "modern", "contemporain", "contemporaine", "design"],
    classique: ["classique", "traditionnel", "traditionnelle", "ancien", "ancienne"],
    vintage: ["vintage", "retro", "rétro", "ancien", "ancienne"],
    scandinave: ["scandinave", "scandinavie", "nordique", "danemark", "suède"],
    industriel: ["industriel", "industrielle", "industrie", "metal", "métal", "usine"],
    rustique: ["rustique", "campagne", "provence", "provencal", "provençale"],
    minimaliste: ["minimaliste", "minimal", "epure", "épuré", "simple", "sobre"],
    design: ["design", "contemporain", "moderne", "tendance"],
    elegant: ["elegant", "élégant", "raffine", "raffiné", "chic", "luxe", "luxueux"],
  };

  for (const [style, variants] of Object.entries(styleMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.style = style;
      console.log("🎭 Style detected:", style);
      break;
    }
  }

  // Pièces avec variantes
  const roomMap = {
    salon: ["salon", "sejour", "séjour", "living", "salle de sejour", "salle à manger"],
    chambre: ["chambre", "chambre a coucher", "chambre à coucher", "bedroom"],
    cuisine: ["cuisine", "kitchen", "salle de cuisine"],
    "salle de bain": ["salle de bain", "salle de bains", "bain", "bains", "bathroom", "douche", "toilette"],
    bureau: ["bureau", "office", "studie", "studio", "travail"],
    jardin: ["jardin", "exterieur", "extérieur", "terrasse", "balcon", "jardinnage"],
    entree: ["entree", "entrée", "hall", "couloir", "vestibule"],
  };

  for (const [room, variants] of Object.entries(roomMap)) {
    if (variants.some((variant) => searchNormalized.includes(variant))) {
      filters.room = room;
      console.log("🏠 Room detected:", room);
      break;
    }
  }

  // Filtres de prix (AMÉLIORÉ)
  const priceMatch = searchNormalized.match(
    /(?:moins de|max|maximum|jusqu'?a|jusqu'?à|inferieur a|inférieur à|pas plus de|<\s*)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (priceMatch) {
    filters.maxPrice = parseInt(priceMatch[1]);
    console.log("💰 Max price detected:", filters.maxPrice);
  }

  const minPriceMatch = searchNormalized.match(
    /(?:plus de|min|minimum|a partir de|à partir de|superieur a|supérieur à|>\s*)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (minPriceMatch) {
    filters.minPrice = parseInt(minPriceMatch[1]);
    console.log("💰 Min price detected:", filters.minPrice);
  }

  const priceRangeMatch = searchNormalized.match(
    /(?:entre\s*)(\d+)(?:\s*et|\s*à|\s*-)\s*(\d+)(?:\s*euros?|\s*€|\s*euro)?/i,
  );
  if (priceRangeMatch) {
    filters.minPrice = parseInt(priceRangeMatch[1]);
    filters.maxPrice = parseInt(priceRangeMatch[2]);
    console.log("💰 Price range detected:", filters.minPrice, "-", filters.maxPrice);
  }

  // Si pas de catégorie spécifique, utiliser la détection normale
  if (!foundSpecificCategory) {
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
        "je",
        "tu",
        "il",
        "elle",
        "on",
        "nous",
        "vous",
        "ils",
        "elles",
        "de",
        "du",
        "des",
        "le",
        "la",
        "les",
        "un",
        "une",
        "au",
        "aux",
        "avec",
        "pour",
        "dans",
        "sur",
        "sous",
        "chez",
        "est",
        "sont",
        "ai",
        "as",
        "a",
        "avons",
        "avez",
        "ont",
        "veux",
        "voudrais",
        "cherche",
        "recherche",
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

function calculateRelevanceScore(product: Product, searchQuery: string, exactMatch: boolean = false): number {
  const query = normalizeText(searchQuery);
  const terms = query.split(" ").filter((term) => term.length > 2);
  let score = 0;

  // Bonus important pour les correspondances exactes de catégorie
  if (exactMatch) {
    const title = normalizeText(product.title || "");
    const category = normalizeText(product.category || "");
    const subCategory = normalizeText(product.sub_category || "");
    const productType = normalizeText(product.product_type || "");

    // Vérification stricte pour les catégories spécifiques
    if (query.includes("table basse")) {
      if (title.includes("table basse") || category === "table basse" || subCategory === "table basse") {
        score += 2000;
      } else if (title.includes("table") && !title.includes("manger") && !title.includes("salle")) {
        score += 500;
      } else {
        score -= 1000; // Pénalité forte pour les tables à manger
      }
    }

    if (query.includes("table à manger") || query.includes("table a manger")) {
      if (title.includes("manger") || title.includes("salle") || category === "table à manger") {
        score += 2000;
      } else if (title.includes("table") && !title.includes("basse")) {
        score += 500;
      } else {
        score -= 1000; // Pénalité pour les tables basses
      }
    }

    // Correspondance exacte de catégorie
    if (category === query || subCategory === query || productType === query) {
      score += 1500;
    }
  }

  const productTypes = [
    "table",
    "chaise",
    "canape",
    "fauteuil",
    "armoire",
    "lit",
    "bureau",
    "lampe",
    "miroir",
    "commode",
    "buffet",
    "etagere",
    "tabouret",
  ];
  const mentionedType = productTypes.find((type) => terms.includes(type));

  if (mentionedType) {
    const title = normalizeText(product.title || "");
    const category = normalizeText(product.category || "");
    const subCategory = normalizeText(product.sub_category || "");

    if (title.includes(mentionedType) || category === mentionedType || subCategory.includes(mentionedType)) {
      score += 1000;
    } else if (category.includes(mentionedType) || title.split(" ").some((word) => word === mentionedType)) {
      score += 800;
    } else {
      score -= 500;
    }
  }

  if (product.category) {
    const category = normalizeText(product.category);
    if (terms.some((term) => category.includes(term))) {
      score += 100;
      if (terms.some((term) => category === term)) score += 500;
    }
  }

  if (product.sub_category) {
    const subCat = normalizeText(product.sub_category);
    if (terms.some((term) => subCat.includes(term))) score += 80;
  }

  if (product.title) {
    const title = normalizeText(product.title);
    const titleWords = title.split(" ");
    let titleMatches = 0;
    for (const term of terms) {
      if (titleWords.some((word) => word.includes(term) || term.includes(word))) titleMatches++;
    }
    score += titleMatches * 50;
    if (terms.some((term) => titleWords.includes(term))) score += 200;
  }

  if (product.tags) {
    const tags = normalizeText(product.tags);
    const tagCount = terms.filter((term) => tags.includes(term)).length;
    score += tagCount * 30;
  }

  const aiFields = [product.ai_material, product.ai_color, product.ai_shape, product.style, product.room];
  for (const field of aiFields) {
    if (field) {
      const normalized = normalizeText(field);
      if (terms.some((term) => normalized.includes(term))) score += 20;
    }
  }

  if (product.description) {
    const desc = normalizeText(product.description);
    const descMatches = terms.filter((term) => desc.includes(term)).length;
    score += descMatches * 10;
  }

  return score;
}

async function searchProducts(filters: ProductSearchFilters, storeId?: string, sellerId?: string): Promise<Product[]> {
  console.log("🔍 [SEARCH] Searching with filters:", filters);
  console.log("🔍 [SEARCH] storeId:", storeId, "sellerId:", sellerId);

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("shopify_products")
      .select("*")
      .eq("status", filters.status || "active");

    if (sellerId) {
      console.log("🔍 [SEARCH] Filtering by seller_id:", sellerId);
      query = query.eq("seller_id", sellerId);
    } else if (storeId) {
      console.log("🔍 [SEARCH] Filtering by store_id:", storeId);
      query = query.eq("store_id", storeId);
    } else {
      console.log("🔍 [SEARCH] No seller/store filter - searching all");
    }

    // Recherche textuelle principale
    if (filters.query && filters.query.trim().length > 0) {
      const searchTerms = normalizeText(filters.query).split(" ").filter(t => t.length > 2);
      console.log("🔍 [SEARCH] Search terms:", searchTerms);
      
      if (filters.exactMatch) {
        // Recherche exacte pour catégories spécifiques
        console.log("🎯 [SEARCH] Exact match for:", filters.query);
        const exactConditions = searchTerms.map(term => 
          `title.ilike.%${term}%,category.ilike.%${term}%,sub_category.ilike.%${term}%,product_type.ilike.%${term}%`
        );
        query = query.or(exactConditions.join(","));
      } else if (searchTerms.length > 0) {
        // Recherche large
        const conditions = searchTerms.map(term =>
          `title.ilike.%${term}%,description.ilike.%${term}%,tags.ilike.%${term}%,category.ilike.%${term}%,sub_category.ilike.%${term}%,chat_text.ilike.%${term}%`
        );
        query = query.or(conditions.join(","));
      }
    }

    // Récupérer plus de produits pour filtrage en mémoire
    query = query.limit(100);
    const { data, error } = await query;

    console.log("🔍 [SEARCH] Raw query returned:", data?.length || 0, "products");

    if (error) {
      console.error("❌ [SEARCH] Database error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("✅ [SEARCH] Found 0 products");
      return [];
    }

    // FILTRAGE EN MÉMOIRE avec logique ET
    let filteredData = data;

    // Filtrer par couleur (AND)
    if (filters.color) {
      console.log("🎨 [FILTER] Applying color filter:", filters.color);
      filteredData = filteredData.filter(p => {
        const color = normalizeText(filters.color || "");
        const aiColor = normalizeText(p.ai_color || "");
        const title = normalizeText(p.title || "");
        const tags = normalizeText(p.tags || "");
        return aiColor.includes(color) || title.includes(color) || tags.includes(color);
      });
      console.log(`🎨 After color filter: ${filteredData.length} products`);
    }

    // Filtrer par matériau (AND)
    if (filters.material) {
      console.log("🏗️ [FILTER] Applying material filter:", filters.material);
      filteredData = filteredData.filter(p => {
        const material = normalizeText(filters.material || "");
        const aiMaterial = normalizeText(p.ai_material || "");
        const title = normalizeText(p.title || "");
        const tags = normalizeText(p.tags || "");
        const desc = normalizeText(p.description || "");
        return aiMaterial.includes(material) || title.includes(material) || tags.includes(material) || desc.includes(material);
      });
      console.log(`🏗️ After material filter: ${filteredData.length} products`);
    }

    // Filtrer par style (AND)
    if (filters.style) {
      console.log("🎭 [FILTER] Applying style filter:", filters.style);
      filteredData = filteredData.filter(p => {
        const style = normalizeText(filters.style || "");
        const pStyle = normalizeText(p.style || "");
        const title = normalizeText(p.title || "");
        const tags = normalizeText(p.tags || "");
        return pStyle.includes(style) || title.includes(style) || tags.includes(style);
      });
      console.log(`🎭 After style filter: ${filteredData.length} products`);
    }

    // Filtrer par pièce (AND)
    if (filters.room) {
      console.log("🏠 [FILTER] Applying room filter:", filters.room);
      filteredData = filteredData.filter(p => {
        const room = normalizeText(filters.room || "");
        const pRoom = normalizeText(p.room || "");
        const title = normalizeText(p.title || "");
        const tags = normalizeText(p.tags || "");
        return pRoom.includes(room) || title.includes(room) || tags.includes(room);
      });
      console.log(`🏠 After room filter: ${filteredData.length} products`);
    }

    // Filtrer par catégorie/sous-catégorie
    if (filters.category) {
      filteredData = filteredData.filter(p => 
        normalizeText(p.category || "").includes(normalizeText(filters.category || ""))
      );
    }
    if (filters.subCategory) {
      filteredData = filteredData.filter(p =>
        normalizeText(p.sub_category || "").includes(normalizeText(filters.subCategory || ""))
      );
    }

    // Filtrer par prix (AND)
    if (filters.maxPrice) {
      filteredData = filteredData.filter(p => {
        const price = parseFloat(p.price);
        return !isNaN(price) && price <= filters.maxPrice!;
      });
      console.log(`💰 After max price ${filters.maxPrice}: ${filteredData.length} products`);
    }
    if (filters.minPrice) {
      filteredData = filteredData.filter(p => {
        const price = parseFloat(p.price);
        return !isNaN(price) && price >= filters.minPrice!;
      });
      console.log(`💰 After min price ${filters.minPrice}: ${filteredData.length} products`);
    }

    if (filteredData.length === 0) {
      console.log("✅ [SEARCH] Found 0 products after filtering");
      return [];
    }

    // Scoring et tri par pertinence
    const searchQuery = filters.query || "";
    const scoredProducts = filteredData.map((product) => ({
      ...product,
      _relevance_score: calculateRelevanceScore(product, searchQuery, filters.exactMatch),
    }));

    scoredProducts.sort((a, b) => b._relevance_score - a._relevance_score);
    const results = scoredProducts.slice(0, filters.limit || 12);

    console.log(`✅ [SEARCH] Found ${data.length} products, returning top ${results.length} by relevance`);
    console.log(
      "🎯 [SEARCH] Top 3 scores:",
      results.slice(0, 3).map((p) => ({
        title: p.title,
        score: p._relevance_score,
        category: p.category,
        color: p.ai_color,
        material: p.ai_material,
      })),
    );

    return results;
  } catch (error) {
    console.error("❌ [SEARCH] Search failed:", error);
    return [];
  }
}

async function detectIntent(userMessage: string): Promise<"simple_chat" | "product_chat" | "product_show"> {
  const msg = normalizeText(userMessage);
  console.log("🧠 Analyzing intent for:", msg);
  let scores = { simple_chat: 0, product_chat: 0, product_show: 0 };

  // Mots-clés plus précis pour chaque intent
  const simpleChatKeywords = [
    "bonjour",
    "salut",
    "hello",
    "coucou",
    "hey",
    "hi",
    "bonsoir",
    "comment ca va",
    "ca va",
    "comment allez-vous",
    "merci",
    "thanks",
    "au revoir",
    "bye",
    "a bientot",
    "ok",
    "d'accord",
    "parfait",
    "super",
    "genial",
    "cool",
    "qui es-tu",
    "ton nom",
    "tu fais quoi",
    "comment tu t'appelles",
    "tu es un robot",
    "tu es une ia",
    "vous etes disponible",
    "vous travaillez",
    "jour de repos",
    "week-end",
  ];

  const productShowKeywords = [
    "montre",
    "montrez",
    "montre-moi",
    "affiche",
    "voir",
    "regarder",
    "montrer",
    "liste",
    "lister",
    "catalogue",
    "collection",
    "gamme",
    "selection",
    "je cherche",
    "je veux",
    "j'ai besoin",
    "je voudrais",
    "trouver",
    "acheter",
    "commander",
    "panier",
    "budget",
    "plusieurs",
    "quelques",
    "des",
    "tous les",
    "toutes les",
    "table basse",
    "table a manger",
    "canape",
    "fauteuil",
    "chaise",
    "armoire",
    "commode",
    "buffet",
    "etagere",
    "bibliotheque",
    "lit",
    "bureau",
    "lampe",
    "miroir",
    "tabouret",
  ];

  const productChatKeywords = [
    "avez-vous",
    "proposez-vous",
    "vendez-vous",
    "vous avez",
    "disponible",
    "en stock",
    "existe",
    "qualite",
    "durable",
    "resistant",
    "solide",
    "fiable",
    "materiau",
    "matiere",
    "composition",
    "fabrication",
    "garantie",
    "retour",
    "satisfait",
    "livraison",
    "conseil",
    "avis",
    "recommandation",
    "suggestion",
    "comment choisir",
    "lequel",
    "quelle",
    "difference",
    "meilleur",
    "preferer",
    "conseiller",
    "tendance",
    "mode",
    "populaire",
    "best-seller",
    "nouveau",
    "actualite",
    "promotion",
    "promo",
    "solde",
    "offre",
    "prix",
    "coute",
    "combien",
    "dimension",
    "taille",
    "couleur",
    "matériau",
    "style",
    "caracteristique",
  ];

  const productKeywords = [
    "produit",
    "article",
    "modele",
    "reference",
    "table",
    "chaise",
    "canape",
    "fauteuil",
    "meuble",
    "lit",
    "bureau",
    "armoire",
    "lampe",
    "miroir",
    "decoration",
    "mobilier",
    "robe",
    "chemise",
    "pantalon",
    "jupe",
    "sac",
    "bijou",
    "vetement",
    "chaussure",
    "accessoire",
    "ceinture",
    "telephone",
    "smartphone",
    "ordinateur",
    "tablette",
    "casque",
  ];

  // Calcul des scores avec pondérations améliorées
  simpleChatKeywords.forEach((word) => {
    if (msg.includes(word)) scores.simple_chat += 10;
  });

  productShowKeywords.forEach((word) => {
    if (msg.includes(word)) scores.product_show += 25;
  });

  productChatKeywords.forEach((word) => {
    if (msg.includes(word)) scores.product_chat += 12;
  });

  productKeywords.forEach((word) => {
    if (msg.includes(word)) {
      scores.product_chat += 6;
      scores.product_show += 6;
    }
  });

  // Détection de phrases spécifiques
  if (msg.match(/(montre|voir|affiche).*(table|chaise|canape|fauteuil|meuble)/)) {
    scores.product_show += 50;
  }

  if (msg.match(/(combien|prix|cout|dimension|taille|couleur|matériau)/)) {
    scores.product_chat += 30;
  }

  if (msg.length < 15 && scores.simple_chat > 0 && scores.product_show === 0) {
    scores.simple_chat += 50;
  }

  // Si la requête contient des termes de produits spécifiques, favoriser product_show
  const hasSpecificProduct = productShowKeywords.some(
    (word) => msg.includes(word) && productKeywords.some((p) => msg.includes(p)),
  );
  if (hasSpecificProduct) {
    scores.product_show += 40;
  }

  console.log("📊 Intent scores:", scores);
  const maxScore = Math.max(scores.simple_chat, scores.product_chat, scores.product_show);

  if (maxScore === 0) {
    console.log("🎯 Decision: SIMPLE_CHAT (no keywords matched - fallback)");
    return "simple_chat";
  }

  if (scores.product_show === maxScore && scores.product_show > 30) {
    console.log("🎯 Decision: PRODUCT_SHOW (strong intent to see products)");
    return "product_show";
  }

  if (scores.product_chat === maxScore && scores.product_chat > 20) {
    console.log("🎯 Decision: PRODUCT_CHAT (information request about products)");
    return "product_chat";
  }

  console.log("🎯 Decision: SIMPLE_CHAT (conversation intent)");
  return "simple_chat";
}

async function* callDeepSeek(
  messages: ChatMessage[], 
  maxTokens = 300
): AsyncGenerator<string, void, unknown> {
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekKey) {
    yield "Bonjour ! Je suis votre assistant commercial. Comment puis-je vous aider ?";
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: true, // ✅ Enable streaming
      }),
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    if (!response.body) throw new Error("No response body");

    // ✅ Stream SSE (Server-Sent Events)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          console.error("Parse error:", e);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error calling DeepSeek:", err);
    yield "Je suis votre assistant commercial. Décrivez-moi ce que vous cherchez !";
  }
}

async function* OmnIAChat(
  userMessage: string,
  history: ChatMessage[] = [],
  storeId?: string,
  sellerId?: string,
): AsyncGenerator<ChatResponse, void, unknown> {
  console.log("🚀 [OMNIA] Message received:", userMessage);

  try {
    const intent = await detectIntent(userMessage);
    console.log("🎯 Final intent:", intent);

    // Check cache
    const cacheKey = `${intent}:${userMessage.toLowerCase().trim()}:${sellerId || storeId || 'global'}`;
    const cached = await getCachedResponse(cacheKey);
    
    if (cached && intent === "simple_chat") {
      console.log("✅ Cache HIT for:", cacheKey);
      yield {
        role: "assistant",
        content: cached,
        intent: "simple_chat",
        products: [],
        mode: "conversation",
        sector: "général",
      };
      return;
    }

    if (intent === "simple_chat") {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Tu es un assistant commercial friendly et professionnel.\nRéponds de manière concise et chaleureuse en français.\nMax 50 mots. Sois naturel et engageant.`,
        },
        { role: "user", content: userMessage },
      ];

      let fullResponse = "";
      for await (const chunk of callDeepSeek(messages, 80)) {
        fullResponse += chunk;
        yield {
          role: "assistant",
          content: chunk,
          intent: "simple_chat",
          products: [],
          mode: "conversation",
          sector: "général",
        };
      }
      
      // Cache the full response
      await setCachedResponse(cacheKey, fullResponse);
      return;
    }

    if (intent === "product_chat") {
      const searchFilters = extractFiltersFromQuery(userMessage, history);
      const products = await searchProducts(searchFilters, storeId, sellerId);

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Tu es un vendeur expert et enthousiaste.\n\nRÈGLES :\n🚫 NE montre PAS les produits (pas de liste)\n✅ Parle NATURELLEMENT des caractéristiques\n✅ Donne des informations PRÉCISES basées sur les produits réels\n✅ Termine par une question pour continuer la discussion`,
        },
        {
          role: "user",
          content: `PRODUITS DISPONIBLES : ${JSON.stringify(
            products.map((p) => ({
              nom: p.title,
              prix: p.price,
              matériau: p.ai_material,
              couleur: p.ai_color,
              catégorie: p.category,
            })),
            null,
            2,
          )}\n\nQuestion client : "${userMessage}"\n\nRéponds naturellement sans lister les produits.`,
        },
      ];

      for await (const chunk of callDeepSeek(messages, 200)) {
        yield {
          role: "assistant",
          content: chunk,
          intent: "product_chat",
          products: [],
          mode: "conversation",
          sector: "général",
        };
      }
      return;
    }

    console.log("🛍️ Searching products for display...");
    const searchFilters = extractFiltersFromQuery(userMessage, history);
    const products = await searchProducts(searchFilters, storeId, sellerId);

    let response = "";
    if (products.length === 0) {
      response = `Je n'ai pas trouvé de produits correspondant à votre recherche "${userMessage}".\n\nPour affiner votre recherche :\n• Essayez d'autres termes ou synonymes\n• Précisez la couleur, le matériau ou le style\n• Indiquez votre budget si vous en avez un\n\nJe reste à votre disposition pour vous aider !`;
    } else {
      const productCount = products.length;
      const promoCount = products.filter(
        (p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price),
      ).length;
      response = `J'ai trouvé ${productCount} produit${productCount > 1 ? "s" : ""} correspondant à votre recherche. ${promoCount > 0 ? `📢 ${promoCount} en promotion ! ` : ""}Découvrez-les ci-dessous 👇`;
    }

    yield {
      role: "assistant",
      content: response,
      intent: "product_show",
      products: products,
      mode: "product_show",
      sector: "général",
    };
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { userMessage, history, storeId, sellerId } = await req.json();

    if (!userMessage)
      return new Response(JSON.stringify({ error: "userMessage is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ✅ Return SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of OmnIAChat(userMessage, history || [], storeId, sellerId)) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = `data: ${JSON.stringify({ 
            role: "assistant",
            content: "Erreur lors du traitement.",
            intent: "conversation",
            products: [],
            mode: "conversation",
            sector: "général"
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }

        // Usage tracking after stream
        if (sellerId) {
          try {
            const supabase = getSupabaseClient();
            await supabase.rpc("increment_usage", {
              p_seller_id: sellerId,
              p_field: "chat_responses_count",
              p_increment: 1,
            });
            console.log("✅ Chat usage incremented for seller:", sellerId);
          } catch (usageErr) {
            console.error("❌ Usage tracking error:", usageErr);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", message: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
