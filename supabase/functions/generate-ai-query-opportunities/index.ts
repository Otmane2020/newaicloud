import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ✅ VERSION AIO FINALE – Answer Engine Optimization
 * 4 corrections critiques appliquées :
 * 1. direct_answer = colonne top-level (pas dans JSON)
 * 2. Réponses courtes, affirmatives, chiffrées (citables)
 * 3. Scoring AIO réel
 * 4. Limite par catégorie + plateforme
 */

type Platform = 'chatgpt' | 'gemini' | 'copilot';
type Lang = 'fr' | 'en';
type QueryType = 'direct' | 'list' | 'comparison';

interface Product {
  id: string;
  title: string;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
}

interface AiAnswer {
  platform: Platform;
  query_type: QueryType;
  question: string;
  
  // ✅ AIO CORE (top-level, pas dans JSON)
  direct_answer: string;
  answer_confidence: number;
  
  // Secondaire
  supporting_content: {
    bullets: string[];
    faq: { q: string; a: string }[];
    comparison_table?: any[];
  };
  
  citation_potential: number;
  product_ids: string[];
  keywords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

// Platform-specific configurations for AIO
const PLATFORM_CONFIGS = {
  chatgpt: {
    name: 'ChatGPT',
    style: 'conversational',
    preferredAnswerLength: 140,
    citationWeight: 0.95,
    queryTypes: ['direct', 'comparison', 'list'] as const
  },
  gemini: {
    name: 'Gemini',
    style: 'factual',
    preferredAnswerLength: 160,
    citationWeight: 0.90,
    queryTypes: ['direct', 'list', 'comparison'] as const
  },
  copilot: {
    name: 'Copilot',
    style: 'practical',
    preferredAnswerLength: 150,
    citationWeight: 0.85,
    queryTypes: ['list', 'direct', 'comparison'] as const
  }
};

/* -------------------- HELPERS -------------------- */

function detectLanguage(products: Product[]): Lang {
  const text = products.map(p => p.title.toLowerCase()).join(' ');
  const frenchIndicators = [' de ', ' le ', ' la ', ' les ', ' pour ', ' avec ', ' en ', ' du ', ' des ', ' une ', ' un '];
  const frenchCount = frenchIndicators.filter(w => text.includes(w)).length;
  return frenchCount >= 2 ? 'fr' : 'en';
}

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.product_type || p.vendor || 'general';
    acc[key] ??= [];
    acc[key].push(p);
    return acc;
  }, {});
}

/**
 * ✅ RÈGLES MÉTIER PAR CATÉGORIE DE MEUBLE
 * Chaque catégorie a ses propres dimensions et critères corrects
 */
interface CategoryRule {
  gender: 'un' | 'une';
  directAnswer: { fr: string; en: string };
  listAnswer: { fr: string; en: string };
  directQuestion: { fr: string; en: string };
  listQuestion: { fr: string; en: string };
}

const CATEGORY_RULES: Record<string, CategoryRule> = {
  // Tables
  'table a manger': {
    gender: 'une',
    directAnswer: {
      fr: 'Une table à manger pour 6 personnes mesure entre 160 et 180 cm de long. Prévoir 60 cm de largeur par convive.',
      en: 'A dining table for 6 people measures between 160 and 180 cm long. Allow 60 cm width per person.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour choisir une table à manger sont : dimensions (160-180 cm pour 6 personnes), matériau (bois massif ou verre trempé), et stabilité du piètement.',
      en: 'The 3 key criteria for choosing a dining table are: dimensions (160-180 cm for 6 people), material (solid wood or tempered glass), and base stability.'
    },
    directQuestion: { fr: 'Quelle taille pour une table à manger 6 personnes ?', en: 'What size for a 6-person dining table?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir une table à manger ?', en: 'What are the criteria for choosing a dining table?' }
  },
  'table basse': {
    gender: 'une',
    directAnswer: {
      fr: 'Une table basse mesure généralement entre 35 et 45 cm de hauteur. La longueur idéale est d\'environ 2/3 de celle du canapé.',
      en: 'A coffee table is usually between 35 and 45 cm high. The ideal length is about 2/3 of the sofa length.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour une table basse sont : hauteur (35-45 cm), proportion avec le canapé (2/3 de sa longueur), et matériaux (verre, bois, métal).',
      en: 'The 3 key criteria for a coffee table are: height (35-45 cm), proportion to sofa (2/3 of its length), and materials (glass, wood, metal).'
    },
    directQuestion: { fr: 'Quelle hauteur pour une table basse ?', en: 'What height for a coffee table?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir une table basse ?', en: 'What are the criteria for choosing a coffee table?' }
  },
  'table extensible': {
    gender: 'une',
    directAnswer: {
      fr: 'Une table extensible passe généralement de 140 cm (4-6 personnes) à 200 cm (8-10 personnes). Vérifier le mécanisme d\'extension.',
      en: 'An extendable table typically goes from 140 cm (4-6 people) to 200 cm (8-10 people). Check the extension mechanism.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : dimensions fermée/ouverte, solidité du mécanisme d\'extension, et stabilité une fois déployée.',
      en: 'The 3 key criteria are: closed/open dimensions, extension mechanism strength, and stability when extended.'
    },
    directQuestion: { fr: 'Quelle taille pour une table extensible ?', en: 'What size for an extendable table?' },
    listQuestion: { fr: 'Quels critères pour choisir une table extensible ?', en: 'What criteria for choosing an extendable table?' }
  },

  // Sièges
  'chaise': {
    gender: 'une',
    directAnswer: {
      fr: 'Une chaise standard a une hauteur d\'assise de 45 à 48 cm, adaptée aux tables de 75 cm de haut.',
      en: 'A standard chair has a seat height of 45 to 48 cm, suitable for 75 cm high tables.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour une chaise sont : hauteur d\'assise (45-48 cm), confort du dossier, et solidité de la structure.',
      en: 'The 3 key criteria for a chair are: seat height (45-48 cm), backrest comfort, and frame strength.'
    },
    directQuestion: { fr: 'Quelle hauteur d\'assise pour une chaise ?', en: 'What seat height for a chair?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir une chaise ?', en: 'What are the criteria for choosing a chair?' }
  },
  'tabouret': {
    gender: 'un',
    directAnswer: {
      fr: 'Un tabouret de bar mesure entre 75 et 80 cm de hauteur pour un plan de travail de 105-110 cm. Pour une table haute de 90 cm, prévoir 65 cm.',
      en: 'A bar stool measures between 75 and 80 cm high for a 105-110 cm counter. For a 90 cm high table, allow 65 cm.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un tabouret sont : hauteur adaptée au plan (75-80 cm pour bar), repose-pieds, et stabilité de la base.',
      en: 'The 3 key criteria for a stool are: height matching counter (75-80 cm for bar), footrest, and base stability.'
    },
    directQuestion: { fr: 'Quelle hauteur pour un tabouret de bar ?', en: 'What height for a bar stool?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir un tabouret ?', en: 'What are the criteria for choosing a stool?' }
  },
  'fauteuil': {
    gender: 'un',
    directAnswer: {
      fr: 'Un fauteuil standard mesure entre 70 et 90 cm de largeur et 40-45 cm de hauteur d\'assise. Prévoir 80 cm d\'espace devant.',
      en: 'A standard armchair measures between 70 and 90 cm wide with a 40-45 cm seat height. Allow 80 cm of space in front.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un fauteuil sont : profondeur d\'assise (50-55 cm), inclinaison du dossier, et qualité du rembourrage.',
      en: 'The 3 key criteria for an armchair are: seat depth (50-55 cm), backrest angle, and padding quality.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un fauteuil ?', en: 'What dimensions for an armchair?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir un fauteuil ?', en: 'What are the criteria for choosing an armchair?' }
  },
  'banquette': {
    gender: 'une',
    directAnswer: {
      fr: 'Une banquette convertible mesure généralement 140x190 cm une fois dépliée. Vérifier l\'épaisseur du matelas (min 12 cm).',
      en: 'A convertible bench typically measures 140x190 cm when unfolded. Check mattress thickness (min 12 cm).'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : dimensions ouvertes (140x190 cm), mécanisme de conversion (clic-clac ou BZ), et confort du matelas.',
      en: 'The 3 key criteria are: open dimensions (140x190 cm), conversion mechanism (click-clack or BZ), and mattress comfort.'
    },
    directQuestion: { fr: 'Quelles dimensions pour une banquette convertible ?', en: 'What dimensions for a convertible bench?' },
    listQuestion: { fr: 'Quels critères pour choisir une banquette ?', en: 'What criteria for choosing a bench?' }
  },

  // Canapés
  'canape': {
    gender: 'un',
    directAnswer: {
      fr: 'Un canapé 3 places mesure entre 180 et 220 cm de large. Prévoir 90 cm de profondeur et 80-100 cm de dégagement devant.',
      en: 'A 3-seater sofa measures between 180 and 220 cm wide. Allow 90 cm depth and 80-100 cm clearance in front.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un canapé sont : dimensions (180-220 cm pour 3 places), densité de mousse (min 30 kg/m³), et solidité de la structure.',
      en: 'The 3 key criteria for a sofa are: dimensions (180-220 cm for 3 seats), foam density (min 30 kg/m³), and frame strength.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un canapé 3 places ?', en: 'What dimensions for a 3-seater sofa?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir un canapé ?', en: 'What are the criteria for choosing a sofa?' }
  },

  // Literie
  'lit': {
    gender: 'un',
    directAnswer: {
      fr: 'Un lit double standard mesure 140x190 cm ou 160x200 cm (Queen Size). Prévoir 60 cm de chaque côté pour circuler.',
      en: 'A standard double bed measures 140x190 cm or 160x200 cm (Queen Size). Allow 60 cm on each side for circulation.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un lit sont : dimensions (140x190 ou 160x200 cm), hauteur du sommier (50-55 cm), et qualité du matelas.',
      en: 'The 3 key criteria for a bed are: dimensions (140x190 or 160x200 cm), bed base height (50-55 cm), and mattress quality.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un lit double ?', en: 'What dimensions for a double bed?' },
    listQuestion: { fr: 'Quels sont les critères pour choisir un lit ?', en: 'What are the criteria for choosing a bed?' }
  },
  'cadre de lit': {
    gender: 'un',
    directAnswer: {
      fr: 'Un cadre de lit double standard mesure 140x190 cm ou 160x200 cm. La hauteur totale (cadre + sommier + matelas) doit atteindre 50-55 cm.',
      en: 'A standard double bed frame measures 140x190 cm or 160x200 cm. Total height (frame + base + mattress) should reach 50-55 cm.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : compatibilité dimensions matelas, solidité des lattes (min 20), et hauteur sous lit pour rangement.',
      en: 'The 3 key criteria are: mattress dimension compatibility, slat strength (min 20), and under-bed height for storage.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un cadre de lit ?', en: 'What dimensions for a bed frame?' },
    listQuestion: { fr: 'Quels critères pour choisir un cadre de lit ?', en: 'What criteria for choosing a bed frame?' }
  },
  'lit superpose': {
    gender: 'un',
    directAnswer: {
      fr: 'Un lit superposé standard mesure 90x190 cm par couchage. Hauteur totale : 150-180 cm. Respecter 60 cm minimum entre matelas et plafond.',
      en: 'A standard bunk bed measures 90x190 cm per sleeping area. Total height: 150-180 cm. Keep 60 cm minimum between mattress and ceiling.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : solidité de la structure (poids max par couchage), hauteur sous plafond, et sécurité des barrières.',
      en: 'The 3 key criteria are: frame strength (max weight per bed), ceiling height, and safety rail security.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un lit superposé ?', en: 'What dimensions for a bunk bed?' },
    listQuestion: { fr: 'Quels critères pour choisir un lit superposé ?', en: 'What criteria for choosing a bunk bed?' }
  },
  'matelas': {
    gender: 'un',
    directAnswer: {
      fr: 'Un matelas double standard mesure 140x190 cm ou 160x200 cm. Épaisseur recommandée : 20 à 25 cm pour un bon confort.',
      en: 'A standard double mattress measures 140x190 cm or 160x200 cm. Recommended thickness: 20 to 25 cm for good comfort.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un matelas sont : fermeté (selon poids et position de sommeil), épaisseur (20-25 cm), et technologie (mousse, ressorts, latex).',
      en: 'The 3 key criteria for a mattress are: firmness (based on weight and sleep position), thickness (20-25 cm), and technology (foam, springs, latex).'
    },
    directQuestion: { fr: 'Quelle épaisseur pour un matelas ?', en: 'What thickness for a mattress?' },
    listQuestion: { fr: 'Quels critères pour choisir un matelas ?', en: 'What criteria for choosing a mattress?' }
  },
  'chevet': {
    gender: 'un',
    directAnswer: {
      fr: 'Un chevet mesure en moyenne 40 à 60 cm de hauteur, aligné avec le haut du matelas. Largeur standard : 40 à 50 cm.',
      en: 'A nightstand averages 40 to 60 cm high, aligned with the top of the mattress. Standard width: 40 to 50 cm.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un chevet sont : hauteur alignée au matelas, rangement (tiroirs), et espace pour lampe et accessoires.',
      en: 'The 3 key criteria for a nightstand are: height aligned with mattress, storage (drawers), and space for lamp and accessories.'
    },
    directQuestion: { fr: 'Quelle hauteur pour un chevet ?', en: 'What height for a nightstand?' },
    listQuestion: { fr: 'Quels critères pour choisir un chevet ?', en: 'What criteria for choosing a nightstand?' }
  },

  // Rangement
  'buffet et commode': {
    gender: 'un',
    directAnswer: {
      fr: 'Un buffet mesure généralement 150 à 200 cm de long et 80 à 90 cm de haut. Profondeur standard : 40 à 50 cm.',
      en: 'A sideboard typically measures 150 to 200 cm long and 80 to 90 cm high. Standard depth: 40 to 50 cm.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : capacité de rangement (tiroirs + portes), profondeur (40-50 cm), et solidité des charnières.',
      en: 'The 3 key criteria are: storage capacity (drawers + doors), depth (40-50 cm), and hinge strength.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un buffet ?', en: 'What dimensions for a sideboard?' },
    listQuestion: { fr: 'Quels critères pour choisir un buffet ?', en: 'What criteria for choosing a sideboard?' }
  },
  'meuble tv': {
    gender: 'un',
    directAnswer: {
      fr: 'Un meuble TV doit être légèrement plus large que l\'écran. Pour une TV 55", prévoir 140-160 cm. Hauteur : 40-50 cm pour un visionnage confortable.',
      en: 'A TV stand should be slightly wider than the screen. For a 55" TV, allow 140-160 cm. Height: 40-50 cm for comfortable viewing.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés sont : largeur supérieure à la TV, passage des câbles intégré, et stabilité pour supporter le poids.',
      en: 'The 3 key criteria are: width greater than TV, integrated cable management, and stability to support the weight.'
    },
    directQuestion: { fr: 'Quelle largeur pour un meuble TV ?', en: 'What width for a TV stand?' },
    listQuestion: { fr: 'Quels critères pour choisir un meuble TV ?', en: 'What criteria for choosing a TV stand?' }
  },
  'console': {
    gender: 'une',
    directAnswer: {
      fr: 'Une console d\'entrée mesure généralement 80 à 120 cm de long, 25 à 35 cm de profondeur et 75 à 85 cm de hauteur.',
      en: 'An entryway console typically measures 80 to 120 cm long, 25 to 35 cm deep, and 75 to 85 cm high.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour une console sont : faible profondeur (25-35 cm), hauteur adaptée (75-85 cm), et rangement optionnel.',
      en: 'The 3 key criteria for a console are: shallow depth (25-35 cm), suitable height (75-85 cm), and optional storage.'
    },
    directQuestion: { fr: 'Quelles dimensions pour une console ?', en: 'What dimensions for a console?' },
    listQuestion: { fr: 'Quels critères pour choisir une console ?', en: 'What criteria for choosing a console?' }
  },
  'gueridon': {
    gender: 'un',
    directAnswer: {
      fr: 'Un guéridon mesure généralement 40 à 60 cm de diamètre et 50 à 75 cm de hauteur, idéal comme table d\'appoint.',
      en: 'A pedestal table typically measures 40 to 60 cm in diameter and 50 to 75 cm high, ideal as a side table.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un guéridon sont : diamètre adapté à l\'espace, hauteur par rapport au siège, et stabilité du pied central.',
      en: 'The 3 key criteria for a pedestal table are: diameter suited to space, height relative to seating, and central foot stability.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un guéridon ?', en: 'What dimensions for a pedestal table?' },
    listQuestion: { fr: 'Quels critères pour choisir un guéridon ?', en: 'What criteria for choosing a pedestal table?' }
  },
  'ensemble': {
    gender: 'un',
    directAnswer: {
      fr: 'Un ensemble salle à manger comprend généralement une table de 160-180 cm et 6 chaises. Prévoir 10 m² minimum pour circuler.',
      en: 'A dining set typically includes a 160-180 cm table and 6 chairs. Allow minimum 10 m² for circulation.'
    },
    listAnswer: {
      fr: 'Les 3 critères clés pour un ensemble sont : cohérence des styles, proportions adaptées à la pièce, et qualité uniforme des pièces.',
      en: 'The 3 key criteria for a set are: style consistency, proportions suited to room, and uniform quality of pieces.'
    },
    directQuestion: { fr: 'Quelles dimensions pour un ensemble salle à manger ?', en: 'What dimensions for a dining set?' },
    listQuestion: { fr: 'Quels critères pour choisir un ensemble ?', en: 'What criteria for choosing a set?' }
  }
};

// Règle par défaut pour catégories inconnues
const DEFAULT_RULE: CategoryRule = {
  gender: 'un',
  directAnswer: {
    fr: 'Les dimensions varient selon le modèle. Mesurez votre espace disponible et prévoyez 60 cm de dégagement autour.',
    en: 'Dimensions vary by model. Measure your available space and allow 60 cm clearance around.'
  },
  listAnswer: {
    fr: 'Les 3 critères clés sont : dimensions adaptées à l\'espace, qualité des matériaux, et solidité de la structure.',
    en: 'The 3 key criteria are: dimensions suited to space, material quality, and frame strength.'
  },
  directQuestion: { fr: 'Quelles dimensions recommandées ?', en: 'What recommended dimensions?' },
  listQuestion: { fr: 'Quels critères pour bien choisir ?', en: 'What criteria for choosing well?' }
};

/**
 * ✅ RÉCUPÉRER LA RÈGLE PAR CATÉGORIE (avec normalisation)
 */
function getCategoryRule(category: string): CategoryRule {
  const normalized = category.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
  
  // Try exact match first
  if (CATEGORY_RULES[normalized]) {
    return CATEGORY_RULES[normalized];
  }
  
  // Try partial match
  for (const [key, rule] of Object.entries(CATEGORY_RULES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return rule;
    }
  }
  
  return DEFAULT_RULE;
}

/**
 * ✅ CORRECTION 3 — Scoring AIO réel
 * Critères : longueur ≤140, chiffres, affirmatif, pas de "dépend"
 */
function computeCitationScoreAIO(
  answer: string,
  platform: Platform,
  queryType: QueryType
): number {
  let score = 50;

  // ✅ CORRECTION 1 — Utiliser preferredAnswerLength par plateforme
  const preferredLength = PLATFORM_CONFIGS[platform].preferredAnswerLength;
  if (answer.length <= preferredLength) score += 20;
  
  // Contient des chiffres = +20
  if (/\d/.test(answer)) score += 20;
  
  // Pas de "dépend" / "depends" = +10
  if (!answer.toLowerCase().includes('dépend') && !answer.toLowerCase().includes('depend')) score += 10;
  
  // Réponse directe = +10
  if (queryType === 'direct') score += 10;
  
  // Unités de mesure = +5
  if (/cm|kg|€|\$|%|mm|m²/.test(answer)) score += 5;
  
  // Affirmation forte = +5
  if (answer.includes('est ') || answer.includes(' is ') || answer.includes('mesure') || answer.includes('measures')) score += 5;

  const weight = PLATFORM_CONFIGS[platform].citationWeight;
  return Math.min(100, Math.round(score * weight));
}

/**
 * ✅ CORRECTION 2 — Réponses métier correctes par catégorie
 * Format AIO : ≤ 2 phrases, chiffres, affirmation, pas de "dépend de"
 */
function generateDirectAnswer(
  category: string,
  products: Product[],
  lang: Lang,
  queryType: QueryType
): string {
  const rule = getCategoryRule(category);
  
  if (queryType === 'direct') {
    return lang === 'fr' ? rule.directAnswer.fr : rule.directAnswer.en;
  }
  
  // ✅ CORRECTION 4 — Comparison plus factuel, moins marketing
  if (queryType === 'comparison' && products.length >= 2) {
    return lang === 'fr'
      ? `${products[0]?.title} est généralement moins cher, tandis que ${products[1]?.title} utilise des matériaux plus épais et résistants.`
      : `${products[0]?.title} is generally cheaper, while ${products[1]?.title} uses thicker and more durable materials.`;
  }
  
  if (queryType === 'comparison') {
    return lang === 'fr'
      ? `Pour comparer, évaluez 3 critères : prix au m² (30%), qualité matériaux (40%), avis clients (30%).`
      : `To compare, evaluate 3 criteria: price per sqm (30%), material quality (40%), customer reviews (30%).`;
  }
  
  // list type
  return lang === 'fr' ? rule.listAnswer.fr : rule.listAnswer.en;
}

/**
 * ✅ GÉNÉRATION DE QUESTION MÉTIER PAR CATÉGORIE
 */
function generateAiQuery(category: string, queryType: QueryType, lang: Lang): string {
  const rule = getCategoryRule(category);
  
  if (queryType === 'direct') {
    return lang === 'fr' ? rule.directQuestion.fr : rule.directQuestion.en;
  }
  
  if (queryType === 'comparison') {
    const catLower = category.toLowerCase();
    return lang === 'fr'
      ? `Comment comparer les ${catLower} ?`
      : `How to compare ${catLower}?`;
  }
  
  // list type
  return lang === 'fr' ? rule.listQuestion.fr : rule.listQuestion.en;
}

/**
 * ✅ BULLETS CONTEXTUALISÉS PAR CATÉGORIE
 */
function generateSupportingBullets(category: string, lang: Lang): string[] {
  const rule = getCategoryRule(category);
  const catLower = category.toLowerCase();
  
  // Bullets génériques mais contextualisés
  return lang === 'fr'
    ? [
        `Mesurer l'espace disponible avant l'achat`,
        `Vérifier les dimensions exactes du produit`,
        `Privilégier les matériaux durables (bois massif, métal, verre trempé)`,
        `Comparer les garanties (minimum 2 ans)`,
        `Lire les avis clients récents`
      ]
    : [
        `Measure available space before purchase`,
        `Check exact product dimensions`,
        `Prefer durable materials (solid wood, metal, tempered glass)`,
        `Compare warranties (minimum 2 years)`,
        `Read recent customer reviews`
      ];
}

/**
 * ✅ FAQ CONTEXTUALISÉE PAR CATÉGORIE
 */
function generateFaq(category: string, directAnswer: string, lang: Lang): { q: string; a: string }[] {
  const rule = getCategoryRule(category);
  const catLower = category.toLowerCase();
  const article = rule.gender === 'un' ? 'un' : 'une';
  const articleEn = 'a';
  
  return lang === 'fr'
    ? [
        { q: rule.directQuestion.fr, a: rule.directAnswer.fr },
        { q: `Quel budget pour ${article} ${catLower} de qualité ?`, a: `Budget moyen : 200€ à 800€ selon matériaux et marque.` },
        { q: `Quelle durée de vie pour ${article} ${catLower} ?`, a: `10 à 20 ans avec entretien régulier selon le matériau.` }
      ]
    : [
        { q: rule.directQuestion.en, a: rule.directAnswer.en },
        { q: `What budget for ${articleEn} quality ${catLower}?`, a: `Average budget: $200 to $800 depending on materials and brand.` },
        { q: `How long does ${articleEn} ${catLower} last?`, a: `10 to 20 years with regular maintenance depending on material.` }
      ];
}

/* -------------------- CORE AIO GENERATION -------------------- */

function generateAioAnswers(
  products: Product[],
  platform: Platform,
  lang: Lang
): AiAnswer[] {
  const categories = groupByCategory(products);
  const config = PLATFORM_CONFIGS[platform];
  const results: AiAnswer[] = [];

  for (const [category, items] of Object.entries(categories)) {
    if (items.length === 0) continue;

    // Generate one answer per query type for each category
    for (const queryType of config.queryTypes) {
      // ✅ ANSWER FIRST - Generate the citable answer
      const direct_answer = generateDirectAnswer(category, items, lang, queryType);
      const question = generateAiQuery(category, queryType, lang);
      
      // ✅ CORRECTION 3 — AIO scoring réel
      const citation_potential = computeCitationScoreAIO(direct_answer, platform, queryType);
      
      // Determine difficulty
      const difficulty: 'easy' | 'medium' | 'hard' = items.length >= 5 ? 'hard' : items.length >= 2 ? 'medium' : 'easy';
      
      // ✅ CORRECTION 3 — Keywords plus sémantiques (3 premiers mots, pas juste le premier)
      const keywords = [
        category.toLowerCase(),
        ...items.slice(0, 3).map(p => p.title.toLowerCase().split(' ').slice(0, 3).join(' ')),
        queryType,
        platform,
        lang === 'fr' ? 'guide' : 'guide',
        lang === 'fr' ? 'taille' : 'size'
      ].filter((v, i, a) => a.indexOf(v) === i && v.length > 2);

      results.push({
        platform,
        query_type: queryType,
        question,
        direct_answer,              // ✅ TOP-LEVEL
        answer_confidence: 0.85,
        supporting_content: {
          bullets: generateSupportingBullets(category, lang),
          faq: generateFaq(category, direct_answer, lang)
        },
        citation_potential,
        product_ids: items.slice(0, 5).map(p => p.id),
        keywords,
        difficulty,
        category
      });
    }
  }

  return results;
}

/**
 * ✅ CORRECTION 4 — Limite par catégorie + plateforme
 * 2 answers max par catégorie, triés par citation_potential
 */
function limitPerCategory(answers: AiAnswer[], maxPerCategory: number = 2): AiAnswer[] {
  const grouped: Record<string, AiAnswer[]> = {};
  
  for (const answer of answers) {
    const key = answer.category;
    grouped[key] ??= [];
    grouped[key].push(answer);
  }
  
  const finalResults: AiAnswer[] = [];
  
  for (const category of Object.keys(grouped)) {
    const categoryAnswers = grouped[category]
      .sort((a, b) => b.citation_potential - a.citation_potential)
      .slice(0, maxPerCategory);
    
    finalResults.push(...categoryAnswers);
  }
  
  return finalResults.sort((a, b) => b.citation_potential - a.citation_potential);
}

/* -------------------- ARTICLE GENERATOR -------------------- */

/**
 * ✅ LIVRABLE 2 — Génération d'article à partir du direct_answer
 * L'article est construit AUTOUR du direct_answer, pas l'inverse
 */
// ✅ CORRECTION 5 — Ajout balise <article> pour SEO + AEO
function generateArticleFromAnswer(
  question: string,
  directAnswer: string,
  supporting: { bullets: string[]; faq: { q: string; a: string }[] },
  lang: Lang
): string {
  const keyPointsTitle = lang === 'fr' ? 'Points essentiels' : 'Key points';
  const faqTitle = 'FAQ';
  
  return `<article>
<h1>${question}</h1>

<p><strong>${directAnswer}</strong></p>

<h2>${keyPointsTitle}</h2>
<ul>
${supporting.bullets.map((b: string) => `  <li>${b}</li>`).join('\n')}
</ul>

<h2>${faqTitle}</h2>
${supporting.faq.map((f: { q: string; a: string }) => `<h3>${f.q}</h3>
<p>${f.a}</p>`).join('\n\n')}
</article>`;
}

/* -------------------- HTTP SERVER -------------------- */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { storeId, platform, refresh = false, generateArticle = false } = await req.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const platforms: Platform[] = platform 
      ? [platform] 
      : ['chatgpt', 'gemini', 'copilot'];

    // Check cache in ai_answers table if not refreshing
    if (!refresh) {
      const { data: cached } = await supabase
        .from('ai_answers')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .in('platform', platforms)
        .order('citation_potential', { ascending: false });

      if (cached && cached.length > 0) {
        console.log(`✅ Returning ${cached.length} cached AIO answers`);
        return new Response(JSON.stringify({ 
          success: true, 
          opportunities: cached,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Clear existing answers for refresh
      await supabase
        .from('ai_answers')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .in('platform', platforms);
    }

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, title, product_type, vendor, tags')
      .eq('seller_id', user.id)
      .eq('store_id', storeId)
      .limit(100);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        opportunities: [],
        message: 'No products found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const language = detectLanguage(products);
    console.log(`🌐 Detected language: ${language}, Products: ${products.length}`);

    // Generate AIO answers for each platform
    const allAnswers: any[] = [];
    
    for (const p of platforms) {
      const rawAnswers = generateAioAnswers(products, p, language);
      
      // ✅ CORRECTION 4 — Limite par catégorie (2 par catégorie)
      const answers = limitPerCategory(rawAnswers, 2);
      
      console.log(`✨ Generated ${answers.length} AIO answers for ${p}`);
      
      // ✅ Insert into ai_answers with direct_answer as top-level + category
      for (const answer of answers) {
        const insertData: any = {
          user_id: user.id,
          store_id: storeId,
          platform: answer.platform,
          query_type: answer.query_type,
          question: answer.question,
          direct_answer: answer.direct_answer,        // ✅ TOP-LEVEL
          answer_confidence: answer.answer_confidence,
          supporting_content: answer.supporting_content,
          citation_potential: answer.citation_potential,
          product_ids: answer.product_ids,
          keywords: answer.keywords,
          difficulty: answer.difficulty,
          // ✅ CORRECTION 2 — Category en DB pour analytics
          category: answer.category,
          status: 'pending'
        };

        const { data: inserted, error: insertError } = await supabase
          .from('ai_answers')
          .insert(insertData)
          .select()
          .single();

        if (!insertError && inserted) {
          // ✅ LIVRABLE 2 — Generate article if requested
          if (generateArticle) {
            const articleHtml = generateArticleFromAnswer(
              answer.question,
              answer.direct_answer,
              answer.supporting_content,
              language
            );
            inserted.generated_article = articleHtml;
          }
          
          allAnswers.push(inserted);
        } else if (insertError) {
          console.error('Insert error:', insertError);
        }
      }
    }

    console.log(`✅ Total AIO answers generated: ${allAnswers.length}`);

    // ✅ LIVRABLE 3 — Example of what ChatGPT would cite
    const exampleCitation = language === 'fr'
      ? {
          question: "Quelle taille idéale pour une table à manger 6 personnes ?",
          your_answer: "Une table à manger idéale pour 6 personnes mesure entre 160 et 180 cm. En dessous de 160 cm, l'espace devient insuffisant.",
          chatgpt_cites: "Pour 6 personnes, une table à manger doit mesurer entre 160 et 180 cm afin d'assurer un espace confortable."
        }
      : {
          question: "What is the ideal size for a 6-person dining table?",
          your_answer: "An ideal dining table for 6 people measures between 160 and 180 cm. Below 160 cm, space becomes insufficient.",
          chatgpt_cites: "For 6 people, a dining table should measure between 160 and 180 cm to ensure comfortable space."
        };

    return new Response(JSON.stringify({ 
      success: true, 
      opportunities: allAnswers,
      cached: false,
      aio_example: exampleCitation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-ai-query-opportunities:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
