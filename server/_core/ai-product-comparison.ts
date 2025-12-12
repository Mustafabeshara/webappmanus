/**
 * AI-Powered Product Comparison and Tender Matching System
 * Compares product specifications with tender requirements using advanced AI
 */

import * as db from "../db";

export interface ProductComparisonRequest {
  productIds: number[];
  tenderRequirements?: string;
  comparisonCriteria: ComparisonCriteria;
  aiProvider?: "openai" | "anthropic" | "groq" | "gemini";
}

export interface ComparisonCriteria {
  technicalSpecs: number; // Weight 0-1
  pricing: number;
  compliance: number;
  availability: number;
  qualityRating: number;
}

export interface ProductComparison {
  products: ProductAnalysis[];
  overallRecommendation: ProductRecommendation;
  comparisonMatrix: ComparisonMatrix;
  tenderCompatibility?: TenderCompatibility[];
}

export interface ProductAnalysis {
  productId: number;
  productName: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  specifications: SpecificationAnalysis;
  pricing: PricingAnalysis;
  compliance: ComplianceAnalysis;
  availability: AvailabilityAnalysis;
}

export interface SpecificationAnalysis {
  score: number;
  matchedRequirements: string[];
  missingRequirements: string[];
  exceededRequirements: string[];
  technicalRating: number;
}

export interface PricingAnalysis {
  score: number;
  unitPrice: number;
  totalCost: number;
  competitiveness: "excellent" | "good" | "average" | "poor";
  pricePerformanceRatio: number;
}

export interface ComplianceAnalysis {
  score: number;
  certifications: string[];
  missingCertifications: string[];
  regulatoryCompliance: boolean;
  qualityStandards: string[];
}

export interface AvailabilityAnalysis {
  score: number;
  inStock: boolean;
  leadTime: number;
  minimumOrderQuantity: number;
  supplierReliability: number;
}

export interface ProductRecommendation {
  recommendedProductId: number;
  reason: string;
  confidenceLevel: number;
  alternativeOptions: number[];
}

export interface ComparisonMatrix {
  criteria: string[];
  products: {
    productId: number;
    scores: number[];
  }[];
}

export interface TenderCompatibility {
  tenderId: number;
  tenderTitle: string;
  compatibilityScore: number;
  matchingProducts: number[];
  gaps: string[];
  recommendations: string[];
}

class AIProductComparison {
  /**
   * Compare products using AI analysis
   */
  async compareProducts(
    request: ProductComparisonRequest
  ): Promise<ProductComparison> {
    try {
      // Get product details
      const products = await Promise.all(
        request.productIds.map(id => db.getProductById(id))
      );

      // Analyze each product
      const productAnalyses = await Promise.all(
        products.map(product => this.analyzeProduct(product, request))
      );

      // Generate comparison matrix
      const comparisonMatrix = this.generateComparisonMatrix(
        productAnalyses,
        request.comparisonCriteria
      );

      // Generate overall recommendation
      const overallRecommendation = this.generateRecommendation(
        productAnalyses,
        request.comparisonCriteria
      );

      // Check tender compatibility if requirements provided
      let tenderCompatibility: TenderCompatibility[] | undefined;
      if (request.tenderRequirements) {
        tenderCompatibility = await this.analyzeTenderCompatibility(
          productAnalyses,
          request.tenderRequirements
        );
      }

      return {
        products: productAnalyses,
        overallRecommendation,
        comparisonMatrix,
        tenderCompatibility,
      };
    } catch (error) {
      console.error("[AI Product] Comparison failed:", error);
      throw error;
    }
  }

  /**
   * Analyze individual product
   */
  private async analyzeProduct(
    product: any,
    request: ProductComparisonRequest
  ): Promise<ProductAnalysis> {
    // Analyze specifications
    const specifications = await this.analyzeSpecifications(
      product,
      request.tenderRequirements
    );

    // Analyze pricing
    const pricing = await this.analyzePricing(product);

    // Analyze compliance
    const compliance = await this.analyzeCompliance(product);

    // Analyze availability
    const availability = await this.analyzeAvailability(product);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      { specifications, pricing, compliance, availability },
      request.comparisonCriteria
    );

    // Generate strengths and weaknesses
    const { strengths, weaknesses } = this.generateStrengthsWeaknesses({
      specifications,
      pricing,
      compliance,
      availability,
    });

    return {
      productId: product.id,
      productName: product.name,
      overallScore,
      strengths,
      weaknesses,
      specifications,
      pricing,
      compliance,
      availability,
    };
  }

  /**
   * Analyze product specifications using AI
   */
  private async analyzeSpecifications(
    product: any,
    tenderRequirements?: string
  ): Promise<SpecificationAnalysis> {
    const productSpecs = product.specifications || product.description || "";

    if (!tenderRequirements) {
      // Basic specification analysis without tender requirements
      return {
        score: 0.7, // Default good score
        matchedRequirements: [],
        missingRequirements: [],
        exceededRequirements: [],
        technicalRating: 7,
      };
    }

    // AI-powered specification matching
    const matchingResult = await this.performAISpecificationMatching(
      productSpecs,
      tenderRequirements
    );

    return {
      score: matchingResult.matchScore,
      matchedRequirements: matchingResult.matched,
      missingRequirements: matchingResult.missing,
      exceededRequirements: matchingResult.exceeded,
      technicalRating: matchingResult.technicalRating,
    };
  }

  /**
   * Perform AI specification matching
   */
  private async performAISpecificationMatching(
    productSpecs: string,
    tenderRequirements: string
  ): Promise<{
    matchScore: number;
    matched: string[];
    missing: string[];
    exceeded: string[];
    technicalRating: number;
  }> {
    // AI-powered analysis (simplified implementation)
    // In real implementation, this would use OpenAI/Anthropic API

    const prompt = `
    Compare the following product specifications with tender requirements:

    Product Specifications:
    ${productSpecs}

    Tender Requirements:
    ${tenderRequirements}

    Analyze and return:
    1. Match score (0-1)
    2. Matched requirements
    3. Missing requirements
    4. Exceeded requirements
    5. Technical rating (1-10)
    `;

    // Mock AI response (replace with actual AI API call)
    const mockResponse = {
      matchScore: 0.85,
      matched: ["Technical specification A", "Quality standard B"],
      missing: ["Certification C"],
      exceeded: ["Performance metric D"],
      technicalRating: 8.5,
    };

    return mockResponse;
  }

  /**
   * Analyze product pricing
   */
  private async analyzePricing(product: any): Promise<PricingAnalysis> {
    const unitPrice = product.unitPrice ? product.unitPrice / 100 : 0;

    // Get market pricing data for comparison
    const marketData = await this.getMarketPricingData(product.category);

    let competitiveness: "excellent" | "good" | "average" | "poor" = "average";
    let score = 0.5;

    if (marketData.averagePrice > 0) {
      const priceRatio = unitPrice / marketData.averagePrice;

      if (priceRatio <= 0.8) {
        competitiveness = "excellent";
        score = 0.9;
      } else if (priceRatio <= 0.95) {
        competitiveness = "good";
        score = 0.75;
      } else if (priceRatio <= 1.1) {
        competitiveness = "average";
        score = 0.5;
      } else {
        competitiveness = "poor";
        score = 0.3;
      }
    }

    return {
      score,
      unitPrice,
      totalCost: unitPrice, // Would calculate based on quantity
      competitiveness,
      pricePerformanceRatio: score * 0.8 + 0.2, // Simplified calculation
    };
  }

  /**
   * Analyze product compliance
   */
  private async analyzeCompliance(product: any): Promise<ComplianceAnalysis> {
    const certifications = product.certifications || [];
    const requiredCertifications = ["ISO 9001", "CE Marking"]; // Would be dynamic

    const missingCertifications = requiredCertifications.filter(
      cert => !certifications.includes(cert)
    );

    const score = Math.max(0, 1 - missingCertifications.length * 0.2);

    return {
      score,
      certifications,
      missingCertifications,
      regulatoryCompliance: missingCertifications.length === 0,
      qualityStandards: certifications.filter((cert: string) => cert.includes("ISO")),
    };
  }

  /**
   * Analyze product availability
   */
  private async analyzeAvailability(
    product: any
  ): Promise<AvailabilityAnalysis> {
    const inStock = product.stockQuantity > 0;
    const leadTime = product.leadTimeDays || 0;
    const minimumOrderQuantity = product.minimumOrderQuantity || 1;

    // Get supplier reliability score
    const supplier = await db.getSupplierById(product.supplierId);
    const supplierReliability = supplier?.rating || 0.7;

    let score = 0.5;
    if (inStock) score += 0.3;
    if (leadTime <= 7) score += 0.2;
    if (leadTime <= 3) score += 0.1;
    score = Math.min(score, 1);

    return {
      score,
      inStock,
      leadTime,
      minimumOrderQuantity,
      supplierReliability,
    };
  }

  /**
   * Calculate overall product score
   */
  private calculateOverallScore(
    analyses: {
      specifications: SpecificationAnalysis;
      pricing: PricingAnalysis;
      compliance: ComplianceAnalysis;
      availability: AvailabilityAnalysis;
    },
    criteria: ComparisonCriteria
  ): number {
    const weightedScore =
      analyses.specifications.score * criteria.technicalSpecs +
      analyses.pricing.score * criteria.pricing +
      analyses.compliance.score * criteria.compliance +
      analyses.availability.score * criteria.availability;

    const totalWeight =
      criteria.technicalSpecs +
      criteria.pricing +
      criteria.compliance +
      criteria.availability;

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Generate strengths and weaknesses
   */
  private generateStrengthsWeaknesses(analyses: {
    specifications: SpecificationAnalysis;
    pricing: PricingAnalysis;
    compliance: ComplianceAnalysis;
    availability: AvailabilityAnalysis;
  }): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze specifications
    if (analyses.specifications.score > 0.8) {
      strengths.push("Excellent technical specifications match");
    } else if (analyses.specifications.score < 0.5) {
      weaknesses.push("Technical specifications gaps identified");
    }

    // Analyze pricing
    if (analyses.pricing.competitiveness === "excellent") {
      strengths.push("Highly competitive pricing");
    } else if (analyses.pricing.competitiveness === "poor") {
      weaknesses.push("Above market pricing");
    }

    // Analyze compliance
    if (analyses.compliance.regulatoryCompliance) {
      strengths.push("Full regulatory compliance");
    } else {
      weaknesses.push("Missing required certifications");
    }

    // Analyze availability
    if (analyses.availability.inStock && analyses.availability.leadTime <= 7) {
      strengths.push("Immediate availability");
    } else if (!analyses.availability.inStock) {
      weaknesses.push("Currently out of stock");
    }

    return { strengths, weaknesses };
  }

  /**
   * Generate comparison matrix
   */
  private generateComparisonMatrix(
    analyses: ProductAnalysis[],
    criteria: ComparisonCriteria
  ): ComparisonMatrix {
    const criteriaNames = [
      "Technical Specs",
      "Pricing",
      "Compliance",
      "Availability",
      "Overall",
    ];

    const products = analyses.map(analysis => ({
      productId: analysis.productId,
      scores: [
        analysis.specifications.score,
        analysis.pricing.score,
        analysis.compliance.score,
        analysis.availability.score,
        analysis.overallScore,
      ],
    }));

    return {
      criteria: criteriaNames,
      products,
    };
  }

  /**
   * Generate overall recommendation
   */
  private generateRecommendation(
    analyses: ProductAnalysis[],
    criteria: ComparisonCriteria
  ): ProductRecommendation {
    // Sort by overall score
    const sortedAnalyses = [...analyses].sort(
      (a, b) => b.overallScore - a.overallScore
    );

    const recommended = sortedAnalyses[0];
    const alternatives = sortedAnalyses.slice(1, 3).map(a => a.productId);

    let reason = `Highest overall score (${Math.round(recommended.overallScore * 100)}%)`;
    if (recommended.strengths.length > 0) {
      reason += `. Key strengths: ${recommended.strengths.slice(0, 2).join(", ")}`;
    }

    return {
      recommendedProductId: recommended.productId,
      reason,
      confidenceLevel: recommended.overallScore,
      alternativeOptions: alternatives,
    };
  }

  /**
   * Analyze tender compatibility
   */
  private async analyzeTenderCompatibility(
    productAnalyses: ProductAnalysis[],
    tenderRequirements: string
  ): Promise<TenderCompatibility[]> {
    // Get active tenders
    const tenders = await db.getAllTenders();
    const activeTenders = tenders.filter(t => t.status === "open");

    const compatibilities: TenderCompatibility[] = [];

    for (const tender of activeTenders.slice(0, 5)) {
      // Limit for performance
      const compatibilityScore = await this.calculateTenderCompatibility(
        productAnalyses,
        tender,
        tenderRequirements
      );

      if (compatibilityScore.score > 0.5) {
        compatibilities.push({
          tenderId: tender.id,
          tenderTitle: tender.title,
          compatibilityScore: compatibilityScore.score,
          matchingProducts: compatibilityScore.matchingProducts,
          gaps: compatibilityScore.gaps,
          recommendations: compatibilityScore.recommendations,
        });
      }
    }

    return compatibilities.sort(
      (a, b) => b.compatibilityScore - a.compatibilityScore
    );
  }

  /**
   * Calculate tender compatibility score
   */
  private async calculateTenderCompatibility(
    productAnalyses: ProductAnalysis[],
    tender: any,
    tenderRequirements: string
  ): Promise<{
    score: number;
    matchingProducts: number[];
    gaps: string[];
    recommendations: string[];
  }> {
    const matchingProducts: number[] = [];
    const gaps: string[] = [];
    const recommendations: string[] = [];

    let totalScore = 0;
    let productCount = 0;

    for (const analysis of productAnalyses) {
      if (analysis.specifications.score > 0.6) {
        matchingProducts.push(analysis.productId);
        totalScore += analysis.overallScore;
        productCount++;
      } else {
        gaps.push(...analysis.specifications.missingRequirements);
      }
    }

    const averageScore = productCount > 0 ? totalScore / productCount : 0;

    // Generate recommendations
    if (matchingProducts.length > 0) {
      recommendations.push(
        `${matchingProducts.length} products match tender requirements`
      );
    }
    if (gaps.length > 0) {
      recommendations.push(`Address gaps: ${gaps.slice(0, 2).join(", ")}`);
    }

    return {
      score: averageScore,
      matchingProducts,
      gaps: [...new Set(gaps)], // Remove duplicates
      recommendations,
    };
  }

  /**
   * Get market pricing data
   */
  private async getMarketPricingData(category: string): Promise<{
    averagePrice: number;
    priceRange: { min: number; max: number };
  }> {
    // Mock implementation - would integrate with market data APIs
    return {
      averagePrice: 100,
      priceRange: { min: 80, max: 150 },
    };
  }

  /**
   * Find products matching tender requirements
   */
  async findProductsForTender(
    tenderId: number,
    supplierId?: number
  ): Promise<{
    matchingProducts: ProductAnalysis[];
    recommendations: string[];
    participationFeasibility: number;
  }> {
    const tender = await db.getTenderById(tenderId);
    if (!tender) {
      throw new Error("Tender not found");
    }

    // Get tender requirements
    const tenderRequirements = tender.requirements || tender.description || "";

    // Get products to analyze
    let products;
    if (supplierId) {
      products = await db.getProductsBySupplierId(supplierId);
    } else {
      products = await db.getAllProducts();
    }

    // Analyze products against tender
    const comparisonRequest: ProductComparisonRequest = {
      productIds: products.map(p => p.id),
      tenderRequirements,
      comparisonCriteria: {
        technicalSpecs: 0.4,
        pricing: 0.3,
        compliance: 0.2,
        availability: 0.1,
        qualityRating: 0.0,
      },
    };

    const comparison = await this.compareProducts(comparisonRequest);

    // Filter products with good compatibility
    const matchingProducts = comparison.products.filter(
      p => p.overallScore > 0.6
    );

    // Generate participation recommendations
    const recommendations: string[] = [];
    const participationFeasibility =
      matchingProducts.length > 0
        ? Math.max(...matchingProducts.map(p => p.overallScore))
        : 0;

    if (participationFeasibility > 0.8) {
      recommendations.push("Strong recommendation to participate");
    } else if (participationFeasibility > 0.6) {
      recommendations.push("Consider participation with risk mitigation");
    } else {
      recommendations.push(
        "Participation not recommended without significant improvements"
      );
    }

    return {
      matchingProducts,
      recommendations,
      participationFeasibility,
    };
  }
}

export const aiProductComparison = new AIProductComparison();
