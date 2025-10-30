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

  // 1. PRÉSENCE (20 points)
  breakdown.presence = 20;

  // 2. LONGUEUR 40-70 caractères (30 points)
  const titleLength = title.length;
  if (titleLength >= 40 && titleLength <= 70) {
    breakdown.length = 30; // Perfect
  } else if (titleLength >= 30 && titleLength < 40) {
    breakdown.length = 20; // Too short
  } else if (titleLength > 70 && titleLength <= 85) {
    breakdown.length = 20; // Slightly long
  } else if (titleLength >= 20 && titleLength < 30) {
    breakdown.length = 10; // Very short
  } else if (titleLength > 85) {
    breakdown.length = 5; // Too long
  }

  // 3. CONTIENT MOTS-CLÉS (30 points)
  const titleLower = title.toLowerCase();
  let keywordScore = 0;

  // Check for category keywords
  if (category && titleLower.includes(category.toLowerCase())) {
    keywordScore += 10;
  }

  // Check for style keywords
  if (style && titleLower.includes(style.toLowerCase())) {
    keywordScore += 10;
  }

  // Check for color keywords
  if (color && titleLower.includes(color.toLowerCase())) {
    keywordScore += 10;
  }

  // If no context provided, check for meaningful keywords
  if (!category && !style && !color) {
    const meaningfulWords = title.split(/\s+/).filter(w => w.length > 3);
    if (meaningfulWords.length >= 3) {
      keywordScore = 30; // Has multiple descriptive words
    } else if (meaningfulWords.length >= 2) {
      keywordScore = 20;
    } else if (meaningfulWords.length >= 1) {
      keywordScore = 10;
    }
  }

  breakdown.keywords = keywordScore;

  // 4. LISIBILITÉ (20 points)
  let readabilityScore = 20;

  // Penalize excessive capitalization
  const upperCaseCount = (title.match(/[A-Z]/g) || []).length;
  const upperCaseRatio = upperCaseCount / title.length;
  if (upperCaseRatio > 0.5) {
    readabilityScore -= 10; // Too many capitals
  }

  // Penalize repetition
  const words = title.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > uniqueWords.size * 1.5) {
    readabilityScore -= 10; // Too much repetition
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

  // 1. PRÉSENCE (20 points)
  breakdown.presence = 20;

  // 2. LONGUEUR 120-160 caractères (30 points)
  const descLength = description.length;
  if (descLength >= 120 && descLength <= 160) {
    breakdown.length = 30; // Perfect
  } else if (descLength >= 100 && descLength < 120) {
    breakdown.length = 20; // Slightly short
  } else if (descLength > 160 && descLength <= 180) {
    breakdown.length = 20; // Slightly long
  } else if (descLength >= 80 && descLength < 100) {
    breakdown.length = 10; // Too short
  } else if (descLength > 180) {
    breakdown.length = 5; // Too long
  }

  // 3. CONTIENT MOTS-CLÉS (30 points)
  const descLower = description.toLowerCase();
  let keywordScore = 0;

  // Check for category/product keywords
  if (category && descLower.includes(category.toLowerCase())) {
    keywordScore += 10;
  }

  // Check for style keywords
  if (style && descLower.includes(style.toLowerCase())) {
    keywordScore += 10;
  }

  // Check for product name
  if (productName && descLower.includes(productName.toLowerCase())) {
    keywordScore += 10;
  }

  // If no context, check for descriptive content
  if (!category && !style && !productName) {
    const meaningfulWords = description.split(/\s+/).filter(w => w.length > 3);
    if (meaningfulWords.length >= 15) {
      keywordScore = 30; // Rich content
    } else if (meaningfulWords.length >= 10) {
      keywordScore = 20;
    } else if (meaningfulWords.length >= 5) {
      keywordScore = 10;
    }
  }

  breakdown.keywords = keywordScore;

  // 4. LISIBILITÉ - Texte fluide, sans répétition, phrase complète (20 points)
  let readabilityScore = 0;

  // Check for proper sentence structure
  if (description.includes('.') || description.includes('!') || description.includes('?')) {
    readabilityScore += 10;
  }

  // Check for repetition
  const words = description.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;
  
  if (repetitionRatio <= 1.3) {
    readabilityScore += 10; // Low repetition
  } else if (repetitionRatio <= 1.5) {
    readabilityScore += 5; // Some repetition
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
 * Calculate detailed SEO score combining title and description (legacy support)
 */
export function calculateDetailedSeoScore(
  title: string | null | undefined,
  description: string | null | undefined,
  hasImage: boolean = false,
  hasUrl: boolean = false
): SeoScoreDetails {
  const titleScore = calculateTitleScore(title);
  const descScore = calculateDescriptionScore(description);

  // Average the two scores with equal weight
  const avgScore = Math.round((titleScore.score + descScore.score) / 2);

  return {
    score: avgScore,
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
  const weight = isAIGenerated ? 1.0 : 0.3;
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
  if (score >= 60) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
}
