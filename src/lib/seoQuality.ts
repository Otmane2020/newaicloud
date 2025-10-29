/**
 * Calculate SEO confidence score based on title and description quality
 * Returns a percentage (0-100)
 */
export function calculateSeoConfidence(
  title: string | null | undefined,
  description: string | null | undefined
): number {
  if (!title && !description) return 0;

  let score = 0;
  let maxScore = 0;

  // Title evaluation (50 points max)
  if (title) {
    maxScore += 50;
    const titleLength = title.length;

    // Length score (0-25 points)
    if (titleLength >= 50 && titleLength <= 60) {
      score += 25; // Perfect length
    } else if (titleLength >= 40 && titleLength < 50) {
      score += 20; // Good length
    } else if (titleLength >= 30 && titleLength < 40) {
      score += 15; // Acceptable
    } else if (titleLength > 60 && titleLength <= 70) {
      score += 15; // Slightly too long
    } else if (titleLength < 30 || titleLength > 70) {
      score += 5; // Too short or too long
    }

    // Content quality (0-25 points)
    // Check for capitalization
    if (title.charAt(0) === title.charAt(0).toUpperCase()) {
      score += 5;
    }

    // Check for keywords diversity (simple word count)
    const words = title.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 5 && words.length <= 10) {
      score += 10; // Good keyword count
    } else if (words.length >= 3 && words.length < 5) {
      score += 5;
    }

    // Avoid excessive punctuation
    const punctuationCount = (title.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount === 0) {
      score += 5;
    }

    // Check for numbers (often good for SEO)
    if (/\d/.test(title)) {
      score += 5;
    }
  }

  // Description evaluation (50 points max)
  if (description) {
    maxScore += 50;
    const descLength = description.length;

    // Length score (0-25 points)
    if (descLength >= 150 && descLength <= 160) {
      score += 25; // Perfect length
    } else if (descLength >= 120 && descLength < 150) {
      score += 20; // Good length
    } else if (descLength >= 100 && descLength < 120) {
      score += 15; // Acceptable
    } else if (descLength > 160 && descLength <= 180) {
      score += 15; // Slightly too long
    } else if (descLength < 100 || descLength > 180) {
      score += 5; // Too short or too long
    }

    // Content quality (0-25 points)
    // Check for proper sentence structure
    if (description.includes('.') || description.includes('!')) {
      score += 5;
    }

    // Check for adequate word count
    const words = description.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 20 && words.length <= 30) {
      score += 10; // Good word count
    } else if (words.length >= 15 && words.length < 20) {
      score += 5;
    }

    // Check for call-to-action words
    const ctaWords = ['découvrez', 'achetez', 'profitez', 'obtenez', 'trouvez', 'explorez', 'shop', 'buy', 'get', 'find', 'discover', 'explore'];
    if (ctaWords.some(word => description.toLowerCase().includes(word))) {
      score += 5;
    }

    // Avoid keyword stuffing (same word repeated too many times)
    const wordFrequency = new Map<string, number>();
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordFrequency.set(lowerWord, (wordFrequency.get(lowerWord) || 0) + 1);
    });
    const maxFrequency = Math.max(...Array.from(wordFrequency.values()));
    if (maxFrequency <= 3) {
      score += 5; // No keyword stuffing
    }
  }

  // Calculate percentage
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return Math.min(100, Math.max(0, percentage));
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
