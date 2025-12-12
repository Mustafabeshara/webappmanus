/**
 * AI Learning System
 *
 * Learns from user corrections to improve AI suggestions over time.
 * Implements feedback loops for:
 * - Product matching corrections
 * - Category suggestions
 * - Price predictions
 * - Search relevance
 */

// Correction types
export type CorrectionType =
  | "product_match"
  | "category_suggestion"
  | "price_prediction"
  | "search_relevance"
  | "tender_match"
  | "supplier_recommendation";

// Correction record
export interface CorrectionRecord {
  id: string;
  type: CorrectionType;
  originalValue: unknown;
  correctedValue: unknown;
  context: Record<string, unknown>;
  userId?: number;
  timestamp: Date;
  applied: boolean;
}

// Learning pattern
export interface LearningPattern {
  type: CorrectionType;
  pattern: string;
  weight: number;
  frequency: number;
  lastSeen: Date;
  examples: Array<{
    input: unknown;
    expected: unknown;
  }>;
}

// In-memory storage for corrections and patterns
class LearningStore {
  private readonly corrections: Map<string, CorrectionRecord> = new Map();
  private readonly patterns: Map<string, LearningPattern> = new Map();
  private correctionCounter = 0;

  /**
   * Record a user correction
   */
  recordCorrection(
    type: CorrectionType,
    originalValue: unknown,
    correctedValue: unknown,
    context: Record<string, unknown> = {},
    userId?: number
  ): CorrectionRecord {
    const id = `correction-${Date.now()}-${++this.correctionCounter}`;

    const correction: CorrectionRecord = {
      id,
      type,
      originalValue,
      correctedValue,
      context,
      userId,
      timestamp: new Date(),
      applied: false,
    };

    this.corrections.set(id, correction);

    // Update learning patterns
    this.updatePatterns(correction);

    console.log(`[Learning] Recorded ${type} correction:`, {
      original: originalValue,
      corrected: correctedValue,
    });

    return correction;
  }

  /**
   * Update learning patterns based on correction
   */
  private updatePatterns(correction: CorrectionRecord): void {
    const patternKey = this.extractPatternKey(correction);

    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.weight = Math.min(existing.weight + 0.1, 1);
      existing.frequency++;
      existing.lastSeen = new Date();
      existing.examples.push({
        input: correction.originalValue,
        expected: correction.correctedValue,
      });

      // Keep only recent examples
      if (existing.examples.length > 100) {
        existing.examples = existing.examples.slice(-100);
      }
    } else {
      this.patterns.set(patternKey, {
        type: correction.type,
        pattern: patternKey,
        weight: 0.5,
        frequency: 1,
        lastSeen: new Date(),
        examples: [
          {
            input: correction.originalValue,
            expected: correction.correctedValue,
          },
        ],
      });
    }
  }

  /**
   * Extract pattern key from correction
   */
  private extractPatternKey(correction: CorrectionRecord): string {
    switch (correction.type) {
      case "product_match":
        return `pm-${this.normalizeValue(correction.context["tenderId"] ?? "any")}-${this.normalizeValue(correction.originalValue)}`;

      case "category_suggestion":
        return `cs-${this.normalizeValue(correction.originalValue)}-${this.normalizeValue(correction.correctedValue)}`;

      case "price_prediction": {
        const priceRange = this.getPriceRange(correction.correctedValue);
        return `pp-${this.normalizeValue(correction.context["category"] ?? "any")}-${priceRange}`;
      }

      case "search_relevance":
        return `sr-${this.normalizeValue(correction.context["query"])}-${correction.correctedValue ? "relevant" : "irrelevant"}`;

      case "tender_match":
        return `tm-${this.normalizeValue(correction.context["tenderId"] ?? "any")}-${this.normalizeValue(correction.context["productId"] ?? "any")}`;

      case "supplier_recommendation":
        return `sup-${this.normalizeValue(correction.context["category"] ?? "any")}-${this.normalizeValue(correction.correctedValue)}`;

      default:
        return `${correction.type}-${Date.now()}`;
    }
  }

  /**
   * Normalize value for pattern matching
   */
  private normalizeValue(value: unknown): string {
    if (typeof value === "string") {
      return value
        .toLowerCase()
        .trim()
        .replaceAll(/\s+/g, "-")
        .substring(0, 50);
    }
    return String(value).substring(0, 50);
  }

  /**
   * Get price range category
   */
  private getPriceRange(price: number): string {
    if (price < 1000) return "low";
    if (price < 10000) return "medium";
    if (price < 100000) return "high";
    return "premium";
  }

  /**
   * Get learned adjustments for a prediction
   */
  getAdjustments(
    type: CorrectionType,
    context: Record<string, unknown>
  ): {
    adjustment: number;
    confidence: number;
    suggestions: unknown[];
  } {
    const relevantPatterns: LearningPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.type !== type) continue;

      // Check pattern relevance
      const relevance = this.calculatePatternRelevance(pattern, context);
      if (relevance > 0.3) {
        relevantPatterns.push(pattern);
      }
    }

    if (relevantPatterns.length === 0) {
      return { adjustment: 0, confidence: 0, suggestions: [] };
    }

    // Calculate weighted adjustment
    let totalWeight = 0;
    let weightedAdjustment = 0;
    const suggestions: unknown[] = [];

    for (const pattern of relevantPatterns) {
      totalWeight += pattern.weight * pattern.frequency;

      // Extract suggestion from examples
      if (pattern.examples.length > 0) {
        const recentExample = pattern.examples.at(-1);
        suggestions.push(recentExample.expected);
      }
    }

    const confidence = Math.min(totalWeight / 10, 1);

    return {
      adjustment: weightedAdjustment / Math.max(totalWeight, 1),
      confidence,
      suggestions: [...new Set(suggestions)].slice(0, 5),
    };
  }

  /**
   * Calculate pattern relevance to context
   */
  private calculatePatternRelevance(
    pattern: LearningPattern,
    context: Record<string, unknown>
  ): number {
    let relevance = 0;

    // Time decay - patterns become less relevant over time
    const daysSinceLastSeen =
      (Date.now() - pattern.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    const timeDecay = Math.exp(-daysSinceLastSeen / 30);

    relevance += timeDecay * 0.3;

    // Frequency bonus
    relevance += Math.min(pattern.frequency / 10, 0.3);

    // Context matching
    const patternParts = pattern.pattern.split("-");
    for (const part of patternParts) {
      for (const value of Object.values(context)) {
        if (String(value).toLowerCase().includes(part.toLowerCase())) {
          relevance += 0.1;
        }
      }
    }

    return Math.min(relevance, 1);
  }

  /**
   * Get corrections history
   */
  getCorrections(options?: {
    type?: CorrectionType;
    userId?: number;
    limit?: number;
    since?: Date;
  }): CorrectionRecord[] {
    let results = Array.from(this.corrections.values());

    if (options?.type) {
      results = results.filter(c => c.type === options.type);
    }

    if (options?.userId) {
      results = results.filter(c => c.userId === options.userId);
    }

    if (options?.since) {
      results = results.filter(c => c.timestamp >= options.since!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get learning statistics
   */
  getStats(): {
    totalCorrections: number;
    correctionsByType: Record<string, number>;
    totalPatterns: number;
    topPatterns: LearningPattern[];
    learningRate: number;
  } {
    const correctionsByType: Record<string, number> = {};

    for (const correction of this.corrections.values()) {
      correctionsByType[correction.type] =
        (correctionsByType[correction.type] || 0) + 1;
    }

    // Get top patterns by frequency
    const topPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Calculate learning rate (corrections applied / total)
    const applied = Array.from(this.corrections.values()).filter(
      c => c.applied
    ).length;
    const learningRate =
      this.corrections.size > 0 ? applied / this.corrections.size : 0;

    return {
      totalCorrections: this.corrections.size,
      correctionsByType,
      totalPatterns: this.patterns.size,
      topPatterns,
      learningRate,
    };
  }

  /**
   * Export learning data for backup
   */
  exportData(): {
    corrections: CorrectionRecord[];
    patterns: LearningPattern[];
  } {
    return {
      corrections: Array.from(this.corrections.values()),
      patterns: Array.from(this.patterns.values()),
    };
  }

  /**
   * Import learning data
   */
  importData(data: {
    corrections: CorrectionRecord[];
    patterns: LearningPattern[];
  }): void {
    for (const correction of data.corrections) {
      this.corrections.set(correction.id, {
        ...correction,
        timestamp: new Date(correction.timestamp),
      });
    }

    for (const pattern of data.patterns) {
      this.patterns.set(pattern.pattern, {
        ...pattern,
        lastSeen: new Date(pattern.lastSeen),
      });
    }
  }

  /**
   * Clear all learning data
   */
  clear(): void {
    this.corrections.clear();
    this.patterns.clear();
  }
}

// Singleton instance
export const learningStore = new LearningStore();

/**
 * Record a product match correction
 */
export function recordProductMatchCorrection(
  tenderId: number,
  productId: number,
  wasCorrect: boolean,
  correctProductId?: number,
  userId?: number
): CorrectionRecord {
  return learningStore.recordCorrection(
    "product_match",
    { tenderId, productId, wasCorrect },
    correctProductId,
    { tenderId, productId },
    userId
  );
}

/**
 * Record a category suggestion correction
 */
export function recordCategoryCorrection(
  suggestedCategory: string,
  actualCategory: string,
  productContext: Record<string, unknown>,
  userId?: number
): CorrectionRecord {
  return learningStore.recordCorrection(
    "category_suggestion",
    suggestedCategory,
    actualCategory,
    productContext,
    userId
  );
}

/**
 * Record a search relevance correction
 */
export function recordSearchRelevanceCorrection(
  query: string,
  resultId: number,
  resultType: string,
  isRelevant: boolean,
  userId?: number
): CorrectionRecord {
  return learningStore.recordCorrection(
    "search_relevance",
    { resultId, resultType },
    isRelevant,
    { query, resultId, resultType },
    userId
  );
}

/**
 * Get improved predictions based on learning
 */
export function getLearnedPredictions(
  type: CorrectionType,
  context: Record<string, unknown>
): {
  adjustment: number;
  confidence: number;
  suggestions: unknown[];
} {
  return learningStore.getAdjustments(type, context);
}

/**
 * Apply learning to a match score
 */
export function applyLearningToScore(
  baseScore: number,
  type: CorrectionType,
  context: Record<string, unknown>
): number {
  const { adjustment, confidence } = learningStore.getAdjustments(
    type,
    context
  );

  // Only apply adjustment if we have enough confidence
  if (confidence < 0.3) return baseScore;

  // Apply weighted adjustment
  return baseScore + adjustment * confidence * 20;
}
