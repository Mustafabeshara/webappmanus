/**
 * AI-Powered Tender Intelligence & Matching System
 * Compares product specs with tender requirements and provides intelligent matching
 */

import * as db from "../db";

export interface TenderMatchingRequest {
  tenderId?: number;
  supplierId?: number;
  productIds?: number[];
  matchingCriteria: MatchingCriteria;
}

export interface MatchingCriteria {
  specificationWeight: number; // 0-1
  priceWeight: number; // 0-1
  deliveryWeight: number; // 0-1
  complianceWeight: number; // 0-1
  minimumMatchScore: number; // 0-1
}

export interface TenderMatch {
  tenderId: number;
  tenderTitle: string;
  matchScore: number;
  matchReasons: MatchReason[];
  complianceStatus: ComplianceStatus;
  estimatedWinProbability: number;
  recommendedBidPrice?: number;
  gaps: ComplianceGap[];
}

export interface MatchReason {
  category:
    | "specification"
    | "price"
    | "delivery"
    | "compliance"
    | "experience";
  score: number;
  description: string;
  evidence: string[];
}

export interface ComplianceStatus {
  overall: "full" | "partial" | "non_compliant";
  details: {
    specifications: boolean;
    certifications: boolean;
    delivery: boolean;
    pricing: boolean;
  };
}

export interface ComplianceGap {
  requirement: string;
  currentCapability: string;
  gapSeverity: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

class AITenderIntelligence {
  /**
   * Find matching tenders for supplier products
   */
  async findMatchingTenders(
    request: TenderMatchingRequest
  ): Promise<TenderMatch[]> {
    try {
      // Get active tenders
      const tenders = await db.getAllTenders();
      const activeTenders = tenders.filter(t => t.status === "open");

      // Get supplier products if supplierId provided
      let products = [];
      if (request.supplierId) {
        products = await db.getProductsBySupplierId(request.supplierId);
      } else if (request.productIds) {
        products = await Promise.all(
          request.productIds.map(id => db.getProductById(id))
        );
      }

      const matches: TenderMatch[] = [];

      for (const tender of activeTenders) {
        const tenderItems = await db.getTenderItems(tender.id);
        const match = await this.analyzeTenderMatch(
          tender,
          tenderItems,
          products,
          request.matchingCriteria
        );

        if (match.matchScore >= request.matchingCriteria.minimumMatchScore) {
          matches.push(match);
        }
      }

      // Sort by match score descending
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("[AI Tender] Matching failed:", error);
      throw error;
    }
  }

  /**
   * Analyze tender match for specific tender and products
   */
  private async analyzeTenderMatch(
    tender: any,
    tenderItems: any[],
    products: any[],
    criteria: MatchingCriteria
  ): Promise<TenderMatch> {
    const matchReasons: MatchReason[] = [];

    // Analyze specification matching
    const specMatch = await this.analyzeSpecificationMatch(
      tenderItems,
      products
    );
    matchReasons.push({
      category: "specification",
      score: specMatch.score,
      description: specMatch.description,
      evidence: specMatch.evidence,
    });

    // Analyze price competitiveness
    const priceMatch = await this.analyzePriceMatch(
      tenderItems,
      products,
      tender.estimatedValue
    );
    matchReasons.push({
      category: "price",
      score: priceMatch.score,
      description: priceMatch.description,
      evidence: priceMatch.evidence,
    });

    // Analyze delivery capability
    const deliveryMatch = await this.analyzeDeliveryMatch(tender, products);
    matchReasons.push({
      category: "delivery",
      score: deliveryMatch.score,
      description: deliveryMatch.description,
      evidence: deliveryMatch.evidence,
    });

    // Analyze compliance
    const complianceMatch = await this.analyzeCompliance(
      tender,
      tenderItems,
      products
    );
    matchReasons.push({
      category: "compliance",
      score: complianceMatch.score,
      description: complianceMatch.description,
      evidence: complianceMatch.evidence,
    });

    // Calculate overall match score
    const matchScore = this.calculateOverallScore(matchReasons, criteria);

    // Determine compliance status
    const complianceStatus = this.determineComplianceStatus(matchReasons);

    // Estimate win probability
    const winProbability = this.estimateWinProbability(
      matchScore,
      complianceStatus,
      tender
    );

    // Identify gaps
    const gaps = await this.identifyComplianceGaps(
      tender,
      tenderItems,
      products
    );

    return {
      tenderId: tender.id,
      tenderTitle: tender.title,
      matchScore,
      matchReasons,
      complianceStatus,
      estimatedWinProbability: winProbability,
      gaps,
    };
  }

  /**
   * Analyze specification matching using AI
   */
  private async analyzeSpecificationMatch(
    tenderItems: any[],
    products: any[]
  ): Promise<{
    score: number;
    description: string;
    evidence: string[];
  }> {
    // AI-powered specification matching
    let totalScore = 0;
    let matchedItems = 0;
    const evidence: string[] = [];

    for (const tenderItem of tenderItems) {
      const bestMatch = await this.findBestProductMatch(tenderItem, products);
      if (bestMatch) {
        totalScore += bestMatch.score;
        matchedItems++;
        evidence.push(
          `${tenderItem.description} matches ${bestMatch.product.name} (${Math.round(bestMatch.score * 100)}%)`
        );
      }
    }

    const avgScore = matchedItems > 0 ? totalScore / matchedItems : 0;
    const description = `${matchedItems}/${tenderItems.length} tender items have matching products`;

    return { score: avgScore, description, evidence };
  }

  /**
   * Find best product match for tender item using AI
   */
  private async findBestProductMatch(
    tenderItem: any,
    products: any[]
  ): Promise<{
    product: any;
    score: number;
  } | null> {
    let bestMatch = null;
    let bestScore = 0;

    for (const product of products) {
      const score = await this.calculateProductSimilarity(tenderItem, product);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { product, score };
      }
    }

    return bestScore > 0.3 ? bestMatch : null; // Minimum 30% similarity
  }

  /**
   * Calculate product similarity using AI text analysis
   */
  private async calculateProductSimilarity(
    tenderItem: any,
    product: any
  ): Promise<number> {
    // This would use AI to compare descriptions and specifications
    // For now, using simple text matching

    const tenderText =
      `${tenderItem.description} ${tenderItem.specifications || ""}`.toLowerCase();
    const productText =
      `${product.name} ${product.description || ""} ${product.specifications || ""}`.toLowerCase();

    // Simple keyword matching (replace with AI similarity)
    const tenderWords = tenderText.split(/\s+/);
    const productWords = productText.split(/\s+/);

    let matches = 0;
    for (const word of tenderWords) {
      if (word.length > 3 && productWords.includes(word)) {
        matches++;
      }
    }

    return Math.min(matches / Math.max(tenderWords.length, 1), 1);
  }

  /**
   * Analyze price competitiveness
   */
  private async analyzePriceMatch(
    tenderItems: any[],
    products: any[],
    estimatedValue?: number
  ): Promise<{
    score: number;
    description: string;
    evidence: string[];
  }> {
    // Calculate total estimated cost based on our products
    let totalCost = 0;
    let coveredItems = 0;
    const evidence: string[] = [];

    for (const tenderItem of tenderItems) {
      const matchingProduct = products.find(p =>
        p.name
          .toLowerCase()
          .includes(tenderItem.description.toLowerCase().split(" ")[0])
      );

      if (matchingProduct && matchingProduct.unitPrice) {
        const itemCost =
          (matchingProduct.unitPrice / 100) * tenderItem.quantity;
        totalCost += itemCost;
        coveredItems++;
        evidence.push(`${tenderItem.description}: $${itemCost.toFixed(2)}`);
      }
    }

    let score = 0.5; // Default neutral score
    let description = "Price competitiveness analysis";

    if (estimatedValue && totalCost > 0) {
      const costRatio = totalCost / (estimatedValue / 100);
      if (costRatio <= 0.8) {
        score = 0.9; // Very competitive
        description = "Highly competitive pricing";
      } else if (costRatio <= 1.0) {
        score = 0.7; // Competitive
        description = "Competitive pricing";
      } else if (costRatio <= 1.2) {
        score = 0.4; // Above budget but reasonable
        description = "Above estimated budget";
      } else {
        score = 0.2; // Too expensive
        description = "Significantly above budget";
      }
    }

    return { score, description, evidence };
  }

  /**
   * Analyze delivery capability
   */
  private async analyzeDeliveryMatch(
    tender: any,
    products: any[]
  ): Promise<{
    score: number;
    description: string;
    evidence: string[];
  }> {
    // Analyze delivery requirements vs capabilities
    const evidence: string[] = [];
    let score = 0.7; // Default good score

    if (tender.submissionDeadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(tender.submissionDeadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline > 30) {
        score = 0.9;
        evidence.push("Ample time for delivery preparation");
      } else if (daysUntilDeadline > 14) {
        score = 0.7;
        evidence.push("Sufficient time for delivery");
      } else {
        score = 0.4;
        evidence.push("Tight delivery timeline");
      }
    }

    return {
      score,
      description: "Delivery capability assessment",
      evidence,
    };
  }

  /**
   * Analyze compliance requirements
   */
  private async analyzeCompliance(
    tender: any,
    tenderItems: any[],
    products: any[]
  ): Promise<{
    score: number;
    description: string;
    evidence: string[];
  }> {
    const evidence: string[] = [];
    let complianceScore = 0.8; // Default good compliance

    // Check if we have products that match tender requirements
    const matchedProducts = products.filter(product =>
      tenderItems.some(item =>
        product.name
          .toLowerCase()
          .includes(item.description.toLowerCase().split(" ")[0])
      )
    );

    if (matchedProducts.length > 0) {
      evidence.push(
        `${matchedProducts.length} products match tender requirements`
      );
    } else {
      complianceScore = 0.3;
      evidence.push("No direct product matches found");
    }

    return {
      score: complianceScore,
      description: "Compliance assessment",
      evidence,
    };
  }

  /**
   * Calculate overall match score
   */
  private calculateOverallScore(
    matchReasons: MatchReason[],
    criteria: MatchingCriteria
  ): number {
    const weights = {
      specification: criteria.specificationWeight,
      price: criteria.priceWeight,
      delivery: criteria.deliveryWeight,
      compliance: criteria.complianceWeight,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const reason of matchReasons) {
      const weight = weights[reason.category] || 0;
      weightedScore += reason.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Determine compliance status
   */
  private determineComplianceStatus(
    matchReasons: MatchReason[]
  ): ComplianceStatus {
    const complianceReason = matchReasons.find(
      r => r.category === "compliance"
    );
    const specReason = matchReasons.find(r => r.category === "specification");

    const overallScore =
      (complianceReason?.score || 0 + specReason?.score || 0) / 2;

    return {
      overall:
        overallScore > 0.8
          ? "full"
          : overallScore > 0.5
            ? "partial"
            : "non_compliant",
      details: {
        specifications: (specReason?.score || 0) > 0.7,
        certifications: true, // Would check actual certifications
        delivery:
          matchReasons.find(r => r.category === "delivery")?.score > 0.6 ||
          false,
        pricing:
          matchReasons.find(r => r.category === "price")?.score > 0.5 || false,
      },
    };
  }

  /**
   * Estimate win probability
   */
  private estimateWinProbability(
    matchScore: number,
    complianceStatus: ComplianceStatus,
    tender: any
  ): number {
    let probability = matchScore;

    // Adjust based on compliance
    if (complianceStatus.overall === "full") {
      probability *= 1.2;
    } else if (complianceStatus.overall === "non_compliant") {
      probability *= 0.3;
    }

    // Adjust based on tender competition (estimated)
    const competitionFactor = 0.8; // Assume moderate competition
    probability *= competitionFactor;

    return Math.min(probability, 0.95); // Cap at 95%
  }

  /**
   * Identify compliance gaps
   */
  private async identifyComplianceGaps(
    tender: any,
    tenderItems: any[],
    products: any[]
  ): Promise<ComplianceGap[]> {
    const gaps: ComplianceGap[] = [];

    // Check for missing products
    const unmatchedItems = tenderItems.filter(
      item =>
        !products.some(product =>
          product.name
            .toLowerCase()
            .includes(item.description.toLowerCase().split(" ")[0])
        )
    );

    for (const item of unmatchedItems) {
      gaps.push({
        requirement: item.description,
        currentCapability: "No matching product in catalog",
        gapSeverity: "high",
        recommendation:
          "Source this product from partner or develop capability",
      });
    }

    return gaps;
  }

  /**
   * Generate tender participation recommendations
   */
  async generateTenderRecommendations(supplierId: number): Promise<{
    highPriority: TenderMatch[];
    mediumPriority: TenderMatch[];
    watchList: TenderMatch[];
  }> {
    const matchingRequest: TenderMatchingRequest = {
      supplierId,
      matchingCriteria: {
        specificationWeight: 0.4,
        priceWeight: 0.3,
        deliveryWeight: 0.1,
        complianceWeight: 0.2,
        minimumMatchScore: 0.3,
      },
    };

    const matches = await this.findMatchingTenders(matchingRequest);

    return {
      highPriority: matches.filter(
        m => m.matchScore > 0.8 && m.estimatedWinProbability > 0.6
      ),
      mediumPriority: matches.filter(
        m => m.matchScore > 0.6 && m.matchScore <= 0.8
      ),
      watchList: matches.filter(m => m.matchScore > 0.4 && m.matchScore <= 0.6),
    };
  }
}

export const aiTenderIntelligence = new AITenderIntelligence();
