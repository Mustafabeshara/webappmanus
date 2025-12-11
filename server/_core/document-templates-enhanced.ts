/**
 * Enhanced Document Templates for All Modules
 * Comprehensive templates for tenders, invoices, POs, price lists, catalogs
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  category: "procurement" | "financial" | "supplier" | "tender" | "inventory";
  documentType: string;
  fields: TemplateField[];
  aiPrompt: string;
  validationRules: ValidationRule[];
  autoPopulationRules: AutoPopulationRule[];
  workflowSteps: WorkflowStep[];
}

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "currency"
    | "table"
    | "boolean"
    | "select"
    | "multiselect"
    | "file";
  required: boolean;
  extractionHints: string[];
  validationPattern?: string;
  defaultValue?: any;
  options?: string[]; // For select fields
  dependsOn?: string[]; // Field dependencies
  aiEnhanced: boolean; // Whether to use AI for this field
}

export interface ValidationRule {
  field: string;
  rule: "required" | "format" | "range" | "cross_reference" | "business_logic";
  parameters: any;
  errorMessage: string;
}

export interface AutoPopulationRule {
  sourceField: string;
  targetEntity: string;
  targetField: string;
  transformation?: string; // JS function to transform value
  condition?: string; // When to apply this rule
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "ocr" | "ai_extraction" | "validation" | "approval" | "integration";
  required: boolean;
  assignedRole?: string;
  automatable: boolean;
}

class DocumentTemplateManager {
  private templates: Map<string, DocumentTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize all document templates
   */
  private initializeTemplates(): void {
    // Tender Templates
    this.templates.set("tender-rfp", this.createTenderRFPTemplate());
    this.templates.set("tender-rfq", this.createTenderRFQTemplate());
    this.templates.set("tender-eoi", this.createTenderEOITemplate());

    // Financial Templates
    this.templates.set(
      "invoice-standard",
      this.createStandardInvoiceTemplate()
    );
    this.templates.set("invoice-medical", this.createMedicalInvoiceTemplate());
    this.templates.set("po-standard", this.createPurchaseOrderTemplate());
    this.templates.set("receipt", this.createReceiptTemplate());

    // Supplier Templates
    this.templates.set("price-list", this.createPriceListTemplate());
    this.templates.set("catalog-medical", this.createMedicalCatalogTemplate());
    this.templates.set("catalog-office", this.createOfficeCatalogTemplate());
    this.templates.set("catalog-it", this.createITCatalogTemplate());
    this.templates.set(
      "supplier-profile",
      this.createSupplierProfileTemplate()
    );

    // Compliance Templates
    this.templates.set("certificate", this.createCertificateTemplate());
    this.templates.set(
      "compliance-report",
      this.createComplianceReportTemplate()
    );
  }

  /**
   * Tender RFP Template
   */
  private createTenderRFPTemplate(): DocumentTemplate {
    return {
      id: "tender-rfp",
      name: "Request for Proposal (RFP)",
      category: "tender",
      documentType: "tender",
      fields: [
        {
          id: "rfp_number",
          name: "rfpNumber",
          label: "RFP Number",
          type: "text",
          required: true,
          extractionHints: [
            "RFP number",
            "reference number",
            "tender number",
            "RFP #",
          ],
          validationPattern: "^[A-Z0-9-/]+$",
          aiEnhanced: true,
        },
        {
          id: "title",
          name: "title",
          label: "Tender Title",
          type: "text",
          required: true,
          extractionHints: ["title", "subject", "tender title", "project name"],
          aiEnhanced: true,
        },
        {
          id: "issuing_organization",
          name: "issuingOrganization",
          label: "Issuing Organization",
          type: "text",
          required: true,
          extractionHints: [
            "issuing organization",
            "client",
            "buyer",
            "organization",
          ],
          aiEnhanced: true,
        },
        {
          id: "submission_deadline",
          name: "submissionDeadline",
          label: "Submission Deadline",
          type: "date",
          required: true,
          extractionHints: [
            "submission deadline",
            "due date",
            "closing date",
            "deadline",
          ],
          aiEnhanced: true,
        },
        {
          id: "estimated_value",
          name: "estimatedValue",
          label: "Estimated Value",
          type: "currency",
          required: false,
          extractionHints: [
            "estimated value",
            "budget",
            "maximum amount",
            "contract value",
          ],
          aiEnhanced: true,
        },
        {
          id: "requirements",
          name: "requirements",
          label: "Requirements",
          type: "table",
          required: true,
          extractionHints: [
            "requirements",
            "specifications",
            "scope of work",
            "deliverables",
          ],
          aiEnhanced: true,
        },
        {
          id: "evaluation_criteria",
          name: "evaluationCriteria",
          label: "Evaluation Criteria",
          type: "table",
          required: false,
          extractionHints: [
            "evaluation criteria",
            "scoring",
            "assessment criteria",
          ],
          aiEnhanced: true,
        },
      ],
      aiPrompt: `Extract RFP information focusing on:
        1. Unique identifiers and reference numbers
        2. Submission deadlines and key dates
        3. Technical requirements and specifications
        4. Evaluation criteria and scoring methods
        5. Budget or estimated contract value`,
      validationRules: [
        {
          field: "rfpNumber",
          rule: "required",
          parameters: {},
          errorMessage: "RFP number is required",
        },
        {
          field: "submissionDeadline",
          rule: "business_logic",
          parameters: { mustBeFuture: true },
          errorMessage: "Submission deadline must be in the future",
        },
      ],
      autoPopulationRules: [
        {
          sourceField: "rfpNumber",
          targetEntity: "tender",
          targetField: "referenceNumber",
        },
        {
          sourceField: "title",
          targetEntity: "tender",
          targetField: "title",
        },
      ],
      workflowSteps: [
        {
          id: "ocr",
          name: "OCR Processing",
          type: "ocr",
          required: true,
          automatable: true,
        },
        {
          id: "ai_extract",
          name: "AI Field Extraction",
          type: "ai_extraction",
          required: true,
          automatable: true,
        },
        {
          id: "validate",
          name: "Data Validation",
          type: "validation",
          required: true,
          automatable: true,
        },
        {
          id: "review",
          name: "Human Review",
          type: "approval",
          required: false,
          assignedRole: "tender_manager",
          automatable: false,
        },
      ],
    };
  }

  /**
   * Medical Invoice Template
   */
  private createMedicalInvoiceTemplate(): DocumentTemplate {
    return {
      id: "invoice-medical",
      name: "Medical Equipment Invoice",
      category: "financial",
      documentType: "invoice",
      fields: [
        {
          id: "invoice_number",
          name: "invoiceNumber",
          label: "Invoice Number",
          type: "text",
          required: true,
          extractionHints: ["invoice number", "invoice #", "bill number"],
          aiEnhanced: true,
        },
        {
          id: "supplier_name",
          name: "supplierName",
          label: "Supplier Name",
          type: "text",
          required: true,
          extractionHints: ["supplier", "vendor", "from", "company name"],
          aiEnhanced: true,
        },
        {
          id: "medical_license",
          name: "medicalLicense",
          label: "Medical Equipment License",
          type: "text",
          required: true,
          extractionHints: [
            "medical license",
            "FDA approval",
            "CE marking",
            "license number",
          ],
          aiEnhanced: true,
        },
        {
          id: "equipment_items",
          name: "equipmentItems",
          label: "Medical Equipment Items",
          type: "table",
          required: true,
          extractionHints: [
            "medical equipment",
            "devices",
            "instruments",
            "line items",
          ],
          aiEnhanced: true,
        },
        {
          id: "compliance_certificates",
          name: "complianceCertificates",
          label: "Compliance Certificates",
          type: "multiselect",
          required: false,
          options: ["ISO 13485", "FDA 510(k)", "CE Marking", "ISO 14971"],
          extractionHints: ["certificates", "compliance", "ISO", "FDA"],
          aiEnhanced: true,
        },
      ],
      aiPrompt: `Extract medical invoice data with focus on:
        1. Medical equipment specifications and model numbers
        2. Regulatory compliance information (FDA, CE, ISO)
        3. License numbers and certifications
        4. Lot numbers and expiration dates for consumables`,
      validationRules: [
        {
          field: "medicalLicense",
          rule: "cross_reference",
          parameters: { type: "medical_license_registry" },
          errorMessage: "Medical license not found in registry",
        },
      ],
      autoPopulationRules: [
        {
          sourceField: "supplierName",
          targetEntity: "supplier",
          targetField: "name",
        },
      ],
      workflowSteps: [
        {
          id: "ocr",
          name: "OCR Processing",
          type: "ocr",
          required: true,
          automatable: true,
        },
        {
          id: "ai_extract",
          name: "AI Extraction",
          type: "ai_extraction",
          required: true,
          automatable: true,
        },
        {
          id: "compliance_check",
          name: "Compliance Validation",
          type: "validation",
          required: true,
          automatable: true,
        },
        {
          id: "medical_review",
          name: "Medical Review",
          type: "approval",
          required: true,
          assignedRole: "medical_officer",
          automatable: false,
        },
      ],
    };
  }

  /**
   * Medical Catalog Template
   */
  private createMedicalCatalogTemplate(): DocumentTemplate {
    return {
      id: "catalog-medical",
      name: "Medical Equipment Catalog",
      category: "supplier",
      documentType: "catalog",
      fields: [
        {
          id: "supplier_name",
          name: "supplierName",
          label: "Supplier Name",
          type: "text",
          required: true,
          extractionHints: ["supplier", "manufacturer", "company"],
          aiEnhanced: true,
        },
        {
          id: "catalog_date",
          name: "catalogDate",
          label: "Catalog Date",
          type: "date",
          required: false,
          extractionHints: [
            "catalog date",
            "version date",
            "updated",
            "effective date",
          ],
          aiEnhanced: true,
        },
        {
          id: "medical_products",
          name: "medicalProducts",
          label: "Medical Products",
          type: "table",
          required: true,
          extractionHints: [
            "products",
            "medical devices",
            "equipment",
            "instruments",
          ],
          aiEnhanced: true,
        },
        {
          id: "regulatory_info",
          name: "regulatoryInfo",
          label: "Regulatory Information",
          type: "table",
          required: true,
          extractionHints: [
            "FDA approval",
            "CE marking",
            "regulatory",
            "compliance",
          ],
          aiEnhanced: true,
        },
        {
          id: "technical_specs",
          name: "technicalSpecs",
          label: "Technical Specifications",
          type: "table",
          required: true,
          extractionHints: [
            "specifications",
            "technical data",
            "features",
            "dimensions",
          ],
          aiEnhanced: true,
        },
      ],
      aiPrompt: `Extract medical catalog information with emphasis on:
        1. Product names, model numbers, and SKUs
        2. Technical specifications and features
        3. Regulatory approvals and certifications
        4. Intended use and clinical applications
        5. Pricing and availability information`,
      validationRules: [],
      autoPopulationRules: [
        {
          sourceField: "medicalProducts",
          targetEntity: "product",
          targetField: "catalog_data",
          transformation: "parseMedicalProductTable",
        },
      ],
      workflowSteps: [
        {
          id: "ocr",
          name: "OCR Processing",
          type: "ocr",
          required: true,
          automatable: true,
        },
        {
          id: "ai_extract",
          name: "AI Product Extraction",
          type: "ai_extraction",
          required: true,
          automatable: true,
        },
        {
          id: "product_matching",
          name: "Product Matching",
          type: "validation",
          required: true,
          automatable: true,
        },
        {
          id: "catalog_integration",
          name: "Catalog Integration",
          type: "integration",
          required: true,
          automatable: true,
        },
      ],
    };
  }

  /**
   * Price List Template
   */
  private createPriceListTemplate(): DocumentTemplate {
    return {
      id: "price-list",
      name: "Supplier Price List",
      category: "supplier",
      documentType: "price_list",
      fields: [
        {
          id: "supplier_name",
          name: "supplierName",
          label: "Supplier Name",
          type: "text",
          required: true,
          extractionHints: ["supplier", "company", "vendor name"],
          aiEnhanced: true,
        },
        {
          id: "effective_date",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
          extractionHints: ["effective date", "valid from", "price date"],
          aiEnhanced: true,
        },
        {
          id: "expiry_date",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: false,
          extractionHints: ["expiry date", "valid until", "expires"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["USD", "EUR", "SAR", "AED", "GBP"],
          extractionHints: ["currency", "USD", "EUR", "SAR"],
          aiEnhanced: true,
        },
        {
          id: "products",
          name: "products",
          label: "Products and Prices",
          type: "table",
          required: true,
          extractionHints: [
            "products",
            "items",
            "price list",
            "catalog",
            "SKU",
            "unit price",
          ],
          aiEnhanced: true,
        },
        {
          id: "discount_tiers",
          name: "discountTiers",
          label: "Volume Discounts",
          type: "table",
          required: false,
          extractionHints: [
            "volume discount",
            "quantity breaks",
            "bulk pricing",
          ],
          aiEnhanced: true,
        },
      ],
      aiPrompt: `Extract price list data focusing on:
        1. Product codes, names, and descriptions
        2. Unit prices and currency
        3. Minimum order quantities
        4. Volume discount structures
        5. Validity periods and terms`,
      validationRules: [
        {
          field: "effectiveDate",
          rule: "business_logic",
          parameters: { mustBeValid: true },
          errorMessage: "Effective date must be valid",
        },
      ],
      autoPopulationRules: [
        {
          sourceField: "products",
          targetEntity: "product_price",
          targetField: "price_data",
          transformation: "parsePriceTable",
        },
      ],
      workflowSteps: [
        {
          id: "ocr",
          name: "OCR Processing",
          type: "ocr",
          required: true,
          automatable: true,
        },
        {
          id: "ai_extract",
          name: "Price Extraction",
          type: "ai_extraction",
          required: true,
          automatable: true,
        },
        {
          id: "price_validation",
          name: "Price Validation",
          type: "validation",
          required: true,
          automatable: true,
        },
        {
          id: "price_update",
          name: "Price Database Update",
          type: "integration",
          required: true,
          automatable: true,
        },
      ],
    };
  }

  // Additional template creation methods...
  private createTenderRFQTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createTenderEOITemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createStandardInvoiceTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createPurchaseOrderTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createReceiptTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createOfficeCatalogTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createITCatalogTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createSupplierProfileTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createCertificateTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }
  private createComplianceReportTemplate(): DocumentTemplate {
    /* Implementation */ return {} as DocumentTemplate;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): DocumentTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): DocumentTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.category === category
    );
  }

  /**
   * Get all templates
   */
  getAllTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create custom template
   */
  createCustomTemplate(template: DocumentTemplate): void {
    this.templates.set(template.id, template);
  }
}

export const documentTemplateManager = new DocumentTemplateManager();
