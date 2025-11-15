/**
 * Detailed SEO Score Criteria for Products & Pages
 * Returns a score from 0-100 based on multiple factors
 */

interface SeoScoreDetails {
  score: number;
  breakdown: {
    presence: number;    // /20
    length: number;      // /30
    keywords: number;    // /30
    readability: number; // /20
  };
  maxScore: number;
}

interface ArticleSeoScoreDetails {
  score: number;
  breakdown: string[];
  quality: 'poor' | 'average' | 'good' | 'excellent';
}

interface AltTextScoreDetails {
  score: number;
  weight: number; // 0.3 for Shopify, 1.0 for AI Vision
  isAI: boolean;
}

/**
 * Calculate SEO score for TITLE based on new criteria
 * Critères: présence (0.2), longueur 40-70 (0.3), mots-clés (0.3), lisibilité (0.2)
 */
export function calculateTitleScore(
  title: string | null | undefined,
  category?: string | null,
  style?: string | null,
  color?: string | null
): SeoScoreDetails {
  const breakdown = {
    presence: 0,
    length: 0,
    keywords: 0,
    readability: 0
  };

  if (!title) {
    return { score: 0, breakdown, maxScore: 100 };
  }

  // 1. PRÉSENCE (20 points - increased for easier 80%)
  breakdown.presence = 20;

  // 2. LONGUEUR 50-60 caractères = optimal (28 points max - more generous)
  const titleLength = title.length;
  if (titleLength >= 50 && titleLength <= 60) {
    breakdown.length = 28; // Perfect - optimal SEO
  } else if (titleLength >= 45 && titleLength < 50) {
    breakdown.length = 25; // Excellent
  } else if (titleLength > 60 && titleLength <= 65) {
    breakdown.length = 25; // Excellent
  } else if (titleLength >= 40 && titleLength < 45) {
    breakdown.length = 22; // Bon
  } else if (titleLength > 65 && titleLength <= 70) {
    breakdown.length = 20; // Bon
  } else if (titleLength >= 35 && titleLength < 40) {
    breakdown.length = 16; // Acceptable
  } else if (titleLength > 70 && titleLength <= 75) {
    breakdown.length = 14; // Acceptable
  } else {
    breakdown.length = 8; // Trop court ou trop long
  }

  // 3. CONTIENT MOTS-CLÉS (28 points max - more generous)
  const titleLower = title.toLowerCase();
  let keywordScore = 0;
  let keywordsFound = 0;

  // Check for category keywords
  if (category && titleLower.includes(category.toLowerCase())) {
    keywordScore += 10;
    keywordsFound++;
  }

  // Check for style keywords
  if (style && titleLower.includes(style.toLowerCase())) {
    keywordScore += 10;
    keywordsFound++;
  }

  // Check for color keywords
  if (color && titleLower.includes(color.toLowerCase())) {
    keywordScore += 8;
    keywordsFound++;
  }

  // If no context provided, check for meaningful keywords (More generous)
  if (!category && !style && !color) {
    const meaningfulWords = title.split(/\s+/).filter(w => w.length > 3);
    if (meaningfulWords.length >= 5) {
      keywordScore = 28; // Full score si 5+ mots
    } else if (meaningfulWords.length >= 4) {
      keywordScore = 24; // Très bon
    } else if (meaningfulWords.length >= 3) {
      keywordScore = 18; // Acceptable
    } else if (meaningfulWords.length >= 2) {
      keywordScore = 12; // Faible
    }
  } else if (keywordsFound >= 2) {
    // Si au moins 2 keywords du contexte présents
    keywordScore = Math.max(keywordScore, 24);
  } else if (keywordsFound >= 1) {
    keywordScore = Math.max(keywordScore, 18);
  }

  breakdown.keywords = keywordScore;

  // 4. LISIBILITÉ (20 points) - MORE STRICT
  let readabilityScore = 0;

  // Start with base score only if text looks natural
  const upperCaseCount = (title.match(/[A-Z]/g) || []).length;
  const upperCaseRatio = upperCaseCount / title.length;
  
  // Natural capitalization (first letter + proper nouns)
  if (upperCaseRatio <= 0.15) {
    readabilityScore += 10;
  } else if (upperCaseRatio <= 0.3) {
    readabilityScore += 5;
  }

  // Check for repetition
  const words = title.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;
  
  if (repetitionRatio <= 1.2) {
    readabilityScore += 10; // Very low repetition
  } else if (repetitionRatio <= 1.4) {
    readabilityScore += 5; // Some repetition
  }

  breakdown.readability = Math.max(0, readabilityScore);
  
  const totalScore = breakdown.presence + breakdown.length + breakdown.keywords + breakdown.readability;

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    maxScore: 100
  };
}

/**
 * Calculate SEO score for META DESCRIPTION based on new criteria
 * Critères: présence (0.2), longueur 120-160 (0.3), mots-clés (0.3), lisibilité (0.2)
 */
export function calculateDescriptionScore(
  description: string | null | undefined,
  category?: string | null,
  style?: string | null,
  productName?: string | null
): SeoScoreDetails {
  const breakdown = {
    presence: 0,
    length: 0,
    keywords: 0,
    readability: 0
  };

  if (!description) {
    return { score: 0, breakdown, maxScore: 100 };
  }

  // 1. PRÉSENCE (20 points - increased for easier 80%)
  breakdown.presence = 20;

  // 2. LONGUEUR 130-155 caractères = optimal (28 points max - more generous)
  const descLength = description.length;
  if (descLength >= 130 && descLength <= 155) {
    breakdown.length = 28; // Perfect - optimal SEO
  } else if (descLength >= 120 && descLength < 130) {
    breakdown.length = 25; // Excellent
  } else if (descLength > 155 && descLength <= 165) {
    breakdown.length = 25; // Excellent
  } else if (descLength >= 110 && descLength < 120) {
    breakdown.length = 22; // Bon
  } else if (descLength > 165 && descLength <= 180) {
    breakdown.length = 20; // Bon
  } else if (descLength >= 90 && descLength < 110) {
    breakdown.length = 16; // Acceptable
  } else if (descLength > 180 && descLength <= 200) {
    breakdown.length = 14; // Acceptable
  } else {
    breakdown.length = 8; // Trop court ou trop long
  }

  // 3. CONTIENT MOTS-CLÉS (28 points max - more generous)
  const descLower = description.toLowerCase();
  let keywordScore = 0;
  let keywordsFound = 0;

  // Check for category/product keywords
  if (category && descLower.includes(category.toLowerCase())) {
    keywordScore += 10;
    keywordsFound++;
  }

  // Check for style keywords
  if (style && descLower.includes(style.toLowerCase())) {
    keywordScore += 10;
    keywordsFound++;
  }

  // Check for product name
  if (productName && descLower.includes(productName.toLowerCase())) {
    keywordScore += 8;
    keywordsFound++;
  }

  // If no context, check for descriptive content (More generous)
  if (!category && !style && !productName) {
    const meaningfulWords = description.split(/\s+/).filter(w => w.length > 3);
    if (meaningfulWords.length >= 18) {
      keywordScore = 28; // Full score
    } else if (meaningfulWords.length >= 15) {
      keywordScore = 24; // Très bon
    } else if (meaningfulWords.length >= 12) {
      keywordScore = 18; // Bon
    } else if (meaningfulWords.length >= 8) {
      keywordScore = 12; // Acceptable
    }
  } else if (keywordsFound >= 2) {
    keywordScore = Math.max(keywordScore, 24);
  } else if (keywordsFound >= 1) {
    keywordScore = Math.max(keywordScore, 18);
  }

  breakdown.keywords = keywordScore;

  // 4. LISIBILITÉ - Texte fluide, sans répétition, phrase complète (20 points) - MORE STRICT
  let readabilityScore = 0;

  // Check for proper sentence structure (complete sentences)
  const hasPunctuation = description.includes('.') || description.includes('!') || description.includes('?');
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (hasPunctuation && sentences.length >= 2) {
    readabilityScore += 10; // Multiple complete sentences
  } else if (hasPunctuation && sentences.length >= 1) {
    readabilityScore += 5; // At least one sentence
  }

  // Check for repetition (STRICTER)
  const words = description.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;
  
  if (repetitionRatio <= 1.2) {
    readabilityScore += 10; // Very low repetition
  } else if (repetitionRatio <= 1.3) {
    readabilityScore += 5; // Low repetition
  }

  breakdown.readability = readabilityScore;
  
  const totalScore = breakdown.presence + breakdown.length + breakdown.keywords + breakdown.readability;

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    maxScore: 100
  };
}

/**
 * Calculate SEO score for TAGS
 * Critères: présence (5 pts), nombre optimal (10 pts), qualité (5 pts)
 */
export function calculateTagsScore(tags: string | null | undefined): number {
  if (!tags || tags.trim().length === 0) {
    return 0; // Aucun tag = 0 points
  }
  
  const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  let score = 0;
  
  // Présence de tags : 5 points
  if (tagArray.length > 0) score += 5;
  
  // Nombre optimal de tags (3-10) : 10 points
  if (tagArray.length >= 3 && tagArray.length <= 10) {
    score += 10;
  } else if (tagArray.length > 0) {
    score += 5; // Partiellement optimal
  }
  
  // Qualité des tags (longueur > 3 caractères) : 5 points
  const qualityTags = tagArray.filter(t => t.length > 3);
  if (qualityTags.length >= tagArray.length * 0.7) {
    score += 5; // 70% des tags sont descriptifs
  }
  
  return Math.min(score, 20); // Maximum 20 points
}

/**
 * Calculate detailed SEO score combining title, description, and tags
 * Pondération: Title 35% + Description 35% + Tags 15% + Image 6% + URL 6%
 * 
 * NOUVELLE RÈGLE:
 * - Si non-optimisé (optimization_count === 0), le score est divisé par 2 (pénalité de 50%)
 * - Si optimisé (optimization_count > 0), bonus d'optimisation garantit score > 80%
 * 
 * @param optimizationCount - Number of times content was AI-optimized
 */
export function calculateDetailedSeoScore(
  title: string | null | undefined,
  description: string | null | undefined,
  hasImage: boolean = false,
  hasUrl: boolean = false,
  tags?: string | null,
  optimizationCount?: number
): SeoScoreDetails {
  const titleScore = calculateTitleScore(title);
  const descScore = calculateDescriptionScore(description);
  const tagsScore = calculateTagsScore(tags);
  
  // Pondération : Title 35% + Description 35% + Tags 15% + Image 6% + URL 6%
  let weightedScore = Math.round(
    (titleScore.score * 0.35) +
    (descScore.score * 0.35) +
    (tagsScore * 0.75) + // Tags 15 points (reduced from 20)
    (hasImage ? 6 : 0) + // Image 6 points (reduced from 7)
    (hasUrl ? 6 : 0) // URL 6 points (reduced from 8)
  );

  // NOUVELLE RÈGLE: Pénalité pour produits non-optimisés
  const isOptimized = optimizationCount && optimizationCount > 0;
  
  let finalScore: number;
  
  if (isOptimized) {
    // ✅ Pour produits OPTIMISÉS: Bonus d'optimisation pour garantir > 80% mais MAX 95%
    // Le bonus est calculé pour atteindre minimum 82% après optimisation
    const optimizationBonus = Math.max(15, Math.ceil(82 - weightedScore));
    finalScore = Math.min(95, weightedScore + optimizationBonus);
  } else {
    // ❌ Pour produits NON-OPTIMISÉS: Score divisé par 2 (pénalité 50%)
    finalScore = Math.round(weightedScore * 0.5);
  }

  return {
    score: Math.round(finalScore),
    breakdown: {
      presence: Math.round((titleScore.breakdown.presence + descScore.breakdown.presence) / 2),
      length: Math.round((titleScore.breakdown.length + descScore.breakdown.length) / 2),
      keywords: Math.round((titleScore.breakdown.keywords + descScore.breakdown.keywords) / 2),
      readability: Math.round((titleScore.breakdown.readability + descScore.breakdown.readability) / 2),
    },
    maxScore: 100
  };
}

/**
 * Calculate ALT text score with Shopify vs AI weighting
 * Shopify ALT = 0.3 weight (30%), AI Vision ALT = 1.0 weight (100%)
 */
export function calculateAltTextScore(
  altText: string | null | undefined,
  isAIGenerated: boolean = false
): AltTextScoreDetails {
  if (!altText) {
    return { score: 0, weight: 0, isAI: false };
  }

  // Base quality score (0-100)
  let qualityScore = 0;
  
  // 1. Presence (40 points)
  qualityScore += 40;

  // 2. Length 40-70 characters (30 points)
  const length = altText.length;
  if (length >= 40 && length <= 70) {
    qualityScore += 30;
  } else if (length >= 25 && length < 40) {
    qualityScore += 20;
  } else if (length > 70 && length <= 90) {
    qualityScore += 20;
  } else if (length >= 15 && length < 25) {
    qualityScore += 10;
  }

  // 3. Has descriptive content (30 points)
  const words = altText.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 5) {
    qualityScore += 30;
  } else if (words.length >= 3) {
    qualityScore += 20;
  } else if (words.length >= 1) {
    qualityScore += 10;
  }

  // Apply weighting based on source
  const weight = isAIGenerated ? 1.0 : 0.5;
  const weightedScore = Math.round(qualityScore * weight);

  return {
    score: weightedScore,
    weight: weight,
    isAI: isAIGenerated
  };
}

/**
 * Calculate aggregated ALT score for multiple images
 * Handles mixed Shopify and AI-generated ALT texts
 */
export function calculateAggregatedAltScore(
  images: Array<{ alt_text: string | null; ai_generated?: boolean }>
): number {
  if (images.length === 0) return 0;

  const totalScore = images.reduce((sum, img) => {
    const altScore = calculateAltTextScore(img.alt_text, img.ai_generated || false);
    return sum + altScore.score;
  }, 0);

  return Math.round(totalScore / images.length);
}

/**
 * Legacy function for backward compatibility
 * Calculate SEO confidence score based on title and description quality
 * Returns a percentage (0-100)
 */
export function calculateSeoConfidence(
  title: string | null | undefined,
  description: string | null | undefined
): number {
  const titleScore = calculateTitleScore(title);
  const descScore = calculateDescriptionScore(description);
  return Math.round((titleScore.score + descScore.score) / 2);
}

/**
 * Get confidence badge color based on score
 */
export function getConfidenceBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (score >= 55) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 55) return 'Bon';
  return 'À améliorer';
}

/**
 * Get SEO score badge configuration
 */
export function getSeoScoreBadge(score: number): {
  variant: 'default' | 'secondary' | 'outline';
  label: string;
  color: string;
  textColor: string;
} {
  if (score >= 80) {
    return { 
      variant: 'default', 
      label: 'Excellent', 
      color: 'bg-green-500/10 text-green-600 border-green-500/20',
      textColor: 'text-green-600'
    };
  }
  if (score >= 55) {
    return { 
      variant: 'secondary', 
      label: 'Bon', 
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      textColor: 'text-yellow-600'
    };
  }
  if (score >= 40) {
    return { 
      variant: 'outline', 
      label: 'Moyen', 
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      textColor: 'text-orange-600'
    };
  }
  return { 
    variant: 'outline', 
    label: 'Faible', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    textColor: 'text-red-600'
  };
}

/**
 * Check if score passes quality filter
 */
export function passesQualityFilter(
  score: number, 
  filter: 'all' | 'excellent' | 'good' | 'medium' | 'poor'
): boolean {
  if (filter === 'all') return true;
  
  switch (filter) {
    case 'excellent':
      return score >= 80;
    case 'good':
      return score >= 55 && score < 80;
    case 'medium':
      return score >= 40 && score < 55;
    case 'poor':
      return score < 40;
    default:
      return true;
  }
}

/**
 * Calculate bonus score for featured images in articles/collections
 * Returns bonus points if image exists and has been synced to Shopify
 */
export function calculateFeaturedImageBonus(
  hasFeaturedImage: boolean,
  isSyncedToShopify: boolean
): { bonus: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let bonus = 0;

  if (hasFeaturedImage) {
    bonus += 5;
    breakdown.push('+5 points: Image de couverture ajoutée');
    
    if (isSyncedToShopify) {
      bonus += 10;
      breakdown.push('+10 points: Image synchronisée avec Shopify');
    } else {
      breakdown.push('💡 Synchronisez avec Shopify pour +10 points');
    }
  } else {
    breakdown.push('💡 Ajoutez une image de couverture pour +5 points');
    breakdown.push('💡 Synchronisez-la avec Shopify pour +10 points supplémentaires');
  }

  return { bonus, breakdown };
}

/**
 * Calculate comprehensive SEO score for blog articles
 */
export function calculateArticleSeoScore(
  title: string | null | undefined,
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined,
  keywords: string[] | null | undefined,
  hasFeaturedImage: boolean = false,
  isPublished: boolean = false,
  optimizationCount: number = 0
): ArticleSeoScoreDetails {
  const breakdown: string[] = [];
  let score = 0;
  const maxScore = 100;

  // SEO Title (25 points max)
  if (seoTitle) {
    const titleLen = seoTitle.length;
    if (titleLen >= 30 && titleLen <= 60) {
      score += 25;
      breakdown.push('✓ Titre SEO optimisé (+25)');
    } else if (titleLen >= 20 && titleLen <= 70) {
      score += 15;
      breakdown.push('⚠ Titre SEO acceptable (+15)');
    } else {
      score += 8;
      breakdown.push('✗ Titre SEO à améliorer (+8)');
    }
  } else {
    breakdown.push('✗ Titre SEO manquant (0)');
  }

  // SEO Description (30 points max)
  if (seoDescription) {
    const descLen = seoDescription.length;
    if (descLen >= 120 && descLen <= 160) {
      score += 30;
      breakdown.push('✓ Description SEO optimale (+30)');
    } else if (descLen >= 80 && descLen <= 180) {
      score += 20;
      breakdown.push('⚠ Description SEO acceptable (+20)');
    } else {
      score += 10;
      breakdown.push('✗ Description SEO à optimiser (+10)');
    }
  } else {
    breakdown.push('✗ Description SEO manquante (0)');
  }

  // Keywords/Tags (20 points max)
  if (keywords && keywords.length > 0) {
    const keywordCount = keywords.length;
    if (keywordCount >= 5) {
      score += 20;
      breakdown.push(`✓ Mots-clés optimisés (${keywordCount}) (+20)`);
    } else if (keywordCount >= 3) {
      score += 15;
      breakdown.push(`⚠ Mots-clés: ${keywordCount} (+15)`);
    } else {
      score += 8;
      breakdown.push(`✗ Ajoutez plus de mots-clés (${keywordCount}) (+8)`);
    }
  } else {
    breakdown.push('✗ Mots-clés manquants (0)');
  }

  // Featured image (15 points)
  if (hasFeaturedImage) {
    score += 15;
    breakdown.push('✓ Image de couverture (+15)');
  } else {
    breakdown.push('✗ Image de couverture manquante (0)');
  }

  // Publication status (10 points)
  if (isPublished) {
    score += 10;
    breakdown.push('✓ Publié sur Shopify (+10)');
  } else {
    breakdown.push('⚠ Non publié (0)');
  }

  // Determine quality level
  let quality: 'poor' | 'average' | 'good' | 'excellent';
  
  // NOUVELLE RÈGLE: Pénalité pour articles non-optimisés
  const isOptimized = optimizationCount > 0;
  let finalScore: number;
  
  if (isOptimized) {
    // ✅ Pour articles OPTIMISÉS: Bonus d'optimisation pour garantir > 80%
    const optimizationBonus = Math.max(15, Math.ceil(82 - score));
    finalScore = Math.min(100, score + optimizationBonus);
  } else {
    // ❌ Pour articles NON-OPTIMISÉS: Score divisé par 2 (pénalité 50%)
    finalScore = Math.round(score * 0.5);
  }
  
  // Determine quality level based on final score
  if (finalScore >= 90) quality = 'excellent';
  else if (finalScore >= 70) quality = 'good';
  else if (finalScore >= 50) quality = 'average';
  else quality = 'poor';

  return {
    score: finalScore,
    breakdown,
    quality
  };
}
