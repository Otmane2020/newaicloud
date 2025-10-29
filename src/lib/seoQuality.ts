/**
 * Detailed SEO Score Criteria for Products & Pages
 * Returns a score from 0-100 based on multiple factors
 */

interface SeoScoreDetails {
  score: number;
  breakdown: {
    structure: number; // /30
    content: number;   // /30
    technical: number; // /25
    bonus: number;     // /15
  };
  maxScore: number;
}

/**
 * Calculate detailed SEO score for a product or page
 */
export function calculateDetailedSeoScore(
  title: string | null | undefined,
  description: string | null | undefined,
  hasImage: boolean = false,
  hasUrl: boolean = false
): SeoScoreDetails {
  const breakdown = {
    structure: 0,
    content: 0,
    technical: 0,
    bonus: 0
  };

  // ===== 1. STRUCTURE HTML (30 points) =====
  if (title) {
    // Title length optimization (10 points)
    const titleLength = title.length;
    if (titleLength >= 50 && titleLength <= 60) {
      breakdown.structure += 10; // Perfect
    } else if (titleLength >= 40 && titleLength < 50) {
      breakdown.structure += 8; // Good
    } else if (titleLength >= 30 && titleLength < 40) {
      breakdown.structure += 6; // Acceptable
    } else if (titleLength > 60 && titleLength <= 70) {
      breakdown.structure += 5; // Slightly long
    } else if (titleLength >= 20 && titleLength < 30) {
      breakdown.structure += 4; // Too short
    }

    // Title capitalization (3 points)
    if (title.charAt(0) === title.charAt(0).toUpperCase()) {
      breakdown.structure += 3;
    }

    // Title contains keyword diversity (5 points)
    const words = title.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 5 && words.length <= 10) {
      breakdown.structure += 5;
    } else if (words.length >= 3) {
      breakdown.structure += 3;
    }
  }

  if (description) {
    // Description length (10 points)
    const descLength = description.length;
    if (descLength >= 150 && descLength <= 160) {
      breakdown.structure += 10; // Perfect
    } else if (descLength >= 120 && descLength < 150) {
      breakdown.structure += 8; // Good
    } else if (descLength >= 100 && descLength < 120) {
      breakdown.structure += 6; // Acceptable
    } else if (descLength > 160 && descLength <= 180) {
      breakdown.structure += 5; // Slightly long
    } else if (descLength >= 80 && descLength < 100) {
      breakdown.structure += 4; // Too short
    }
  }

  // Image alt text (2 points)
  if (hasImage) {
    breakdown.structure += 2;
  }

  // ===== 2. CONTENT SEMANTIC (30 points) =====
  if (title) {
    // Avoid excessive punctuation (5 points)
    const punctuationCount = (title.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount === 0) {
      breakdown.content += 5;
    }

    // Contains numbers (good for CTR) (5 points)
    if (/\d/.test(title)) {
      breakdown.content += 5;
    }

    // Title uniqueness (no generic words only) (5 points)
    const genericWords = ['produit', 'product', 'item', 'article'];
    const hasGenericOnly = genericWords.every(word => 
      title.toLowerCase().includes(word)
    );
    if (!hasGenericOnly && title.length > 10) {
      breakdown.content += 5;
    }
  }

  if (description) {
    // Proper sentence structure (5 points)
    if (description.includes('.') || description.includes('!')) {
      breakdown.content += 5;
    }

    // Word count quality (5 points)
    const words = description.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 20 && words.length <= 30) {
      breakdown.content += 5;
    } else if (words.length >= 15) {
      breakdown.content += 3;
    }

    // Call-to-action presence (5 points)
    const ctaWords = [
      'découvrez', 'achetez', 'profitez', 'obtenez', 'trouvez', 'explorez',
      'shop', 'buy', 'get', 'find', 'discover', 'explore', 'commandez'
    ];
    if (ctaWords.some(word => description.toLowerCase().includes(word))) {
      breakdown.content += 5;
    }
  }

  // ===== 3. TECHNICAL & QUALITY (25 points) =====
  if (title && description) {
    // Both title and description present (10 points)
    breakdown.technical += 10;

    // Keyword consistency between title and description (8 points)
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const commonWords = titleWords.filter(word => descWords.includes(word));
    if (commonWords.length >= 2) {
      breakdown.technical += 8;
    } else if (commonWords.length >= 1) {
      breakdown.technical += 4;
    }

    // No keyword stuffing (7 points)
    const wordFrequency = new Map<string, number>();
    descWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordFrequency.set(lowerWord, (wordFrequency.get(lowerWord) || 0) + 1);
    });
    const maxFrequency = wordFrequency.size > 0 ? Math.max(...Array.from(wordFrequency.values())) : 0;
    if (maxFrequency <= 3) {
      breakdown.technical += 7;
    } else if (maxFrequency <= 4) {
      breakdown.technical += 4;
    }
  }

  // ===== 4. BONUS SEO (15 points) =====
  if (title && description) {
    // Title and description are unique/different (5 points)
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    if (!descLower.includes(titleLower) && !titleLower.includes(descLower)) {
      breakdown.bonus += 5;
    }

    // Rich content indicators (5 points)
    const richIndicators = ['€', '$', '%', '™', '®', '✓', '⭐'];
    const hasRichContent = richIndicators.some(indicator => 
      title.includes(indicator) || description.includes(indicator)
    );
    if (hasRichContent) {
      breakdown.bonus += 5;
    }

    // URL-friendly check (5 points)
    if (hasUrl && title) {
      // Title can make a good URL (lowercase, no special chars excess)
      const urlFriendlyTest = /^[a-zA-Z0-9\s\-À-ÿ]+$/.test(title);
      if (urlFriendlyTest) {
        breakdown.bonus += 5;
      } else {
        breakdown.bonus += 2;
      }
    }
  }

  const totalScore = breakdown.structure + breakdown.content + breakdown.technical + breakdown.bonus;
  const maxScore = 100;

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    maxScore
  };
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
  const result = calculateDetailedSeoScore(title, description, false, false);
  return result.score;
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
