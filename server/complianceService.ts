/**
 * Compliance checking service for tender bids
 * Validates bids against multiple compliance rules
 */

export interface ComplianceCheck {
  isCompliant: boolean;
  issues: string[];
  priceCompliant: boolean;
  deadlineCompliant: boolean;
  documentsCompliant: boolean;
  specsCompliant: boolean;
  supplierCompliant: boolean;
  quantityCompliant: boolean;
}

export interface BidComplianceInput {
  // Bid details
  unitPrice: number; // in cents
  totalPrice: number;
  submissionDate: Date;
  quantity: number;
  
  // Tender requirements
  estimatedPrice?: number; // in cents
  submissionDeadline?: Date;
  requiredQuantity: number;
  requiredSpecs?: string;
  
  // Supplier details
  supplierCertified: boolean;
  supplierActive: boolean;
  
  // Documents
  documentsProvided: boolean;
  requiredDocuments?: string[];
  providedDocuments?: string[];
}

export interface ComplianceThresholds {
  priceVariancePercent: number; // e.g., 20 = allow 20% over estimated price
  requireAllDocuments: boolean;
  requireCertification: boolean;
  allowQuantityVariance: boolean;
  quantityVariancePercent: number;
}

const DEFAULT_THRESHOLDS: ComplianceThresholds = {
  priceVariancePercent: 20,
  requireAllDocuments: true,
  requireCertification: true,
  allowQuantityVariance: false,
  quantityVariancePercent: 5,
};

/**
 * Check if a bid complies with all tender requirements
 */
export function checkBidCompliance(
  input: BidComplianceInput,
  thresholds: ComplianceThresholds = DEFAULT_THRESHOLDS
): ComplianceCheck {
  const issues: string[] = [];
  
  // 1. Price Compliance Check
  let priceCompliant = true;
  if (input.estimatedPrice && input.estimatedPrice > 0) {
    const maxAllowedPrice = input.estimatedPrice * (1 + thresholds.priceVariancePercent / 100);
    if (input.unitPrice > maxAllowedPrice) {
      priceCompliant = false;
      const variance = ((input.unitPrice - input.estimatedPrice) / input.estimatedPrice * 100).toFixed(1);
      issues.push(`Price exceeds estimated by ${variance}% (max allowed: ${thresholds.priceVariancePercent}%)`);
    }
  }
  
  // 2. Deadline Compliance Check
  let deadlineCompliant = true;
  if (input.submissionDeadline) {
    if (input.submissionDate > input.submissionDeadline) {
      deadlineCompliant = false;
      const daysLate = Math.ceil((input.submissionDate.getTime() - input.submissionDeadline.getTime()) / (1000 * 60 * 60 * 24));
      issues.push(`Bid submitted ${daysLate} day(s) after deadline`);
    }
  }
  
  // 3. Document Compliance Check
  let documentsCompliant = true;
  if (thresholds.requireAllDocuments) {
    if (!input.documentsProvided) {
      documentsCompliant = false;
      issues.push("Required documents not provided");
    } else if (input.requiredDocuments && input.providedDocuments) {
      const missing = input.requiredDocuments.filter(
        doc => !input.providedDocuments?.includes(doc)
      );
      if (missing.length > 0) {
        documentsCompliant = false;
        issues.push(`Missing documents: ${missing.join(", ")}`);
      }
    }
  }
  
  // 4. Technical Specifications Compliance
  // This is a placeholder - in real implementation, would parse and validate specs
  let specsCompliant = true;
  if (input.requiredSpecs && input.requiredSpecs.length > 0) {
    // For now, assume specs are compliant unless explicitly marked otherwise
    // In production, this would involve detailed spec validation
    specsCompliant = true;
  }
  
  // 5. Supplier Compliance Check
  let supplierCompliant = true;
  if (thresholds.requireCertification) {
    if (!input.supplierCertified) {
      supplierCompliant = false;
      issues.push("Supplier not certified/approved");
    }
  }
  if (!input.supplierActive) {
    supplierCompliant = false;
    issues.push("Supplier account is inactive");
  }
  
  // 6. Quantity Compliance Check
  let quantityCompliant = true;
  if (!thresholds.allowQuantityVariance) {
    if (input.quantity !== input.requiredQuantity) {
      quantityCompliant = false;
      issues.push(`Quantity mismatch: bid ${input.quantity}, required ${input.requiredQuantity}`);
    }
  } else {
    const variance = Math.abs(input.quantity - input.requiredQuantity) / input.requiredQuantity * 100;
    if (variance > thresholds.quantityVariancePercent) {
      quantityCompliant = false;
      issues.push(`Quantity variance ${variance.toFixed(1)}% exceeds allowed ${thresholds.quantityVariancePercent}%`);
    }
  }
  
  // Overall compliance
  const isCompliant = 
    priceCompliant &&
    deadlineCompliant &&
    documentsCompliant &&
    specsCompliant &&
    supplierCompliant &&
    quantityCompliant;
  
  return {
    isCompliant,
    issues,
    priceCompliant,
    deadlineCompliant,
    documentsCompliant,
    specsCompliant,
    supplierCompliant,
    quantityCompliant,
  };
}

/**
 * Batch check compliance for multiple bid items
 */
export function checkMultipleBidsCompliance(
  bids: BidComplianceInput[],
  thresholds?: ComplianceThresholds
): ComplianceCheck[] {
  return bids.map(bid => checkBidCompliance(bid, thresholds));
}
