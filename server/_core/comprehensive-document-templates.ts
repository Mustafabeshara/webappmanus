/**
 * Comprehensive Document Templates for Manus WebApp
 * Covers all document types for:
 * - Data Uploads (Suppliers, Products, Price Lists, Invoices, POs, Expenses, Budgets)
 * - Tender Submission Documents
 * - Registration Process Documents
 * - Supplier Compliance Documents (Contracts, LOA, MOCI, FDA/CE)
 */

export interface ComprehensiveTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subcategory: string;
  description: string;
  icon: string;
  fields: TemplateField[];
  requiredDocuments?: string[];
  aiExtractionPrompt: string;
  validationRules: ValidationRule[];
  autoPopulationRules: AutoPopulationRule[];
  workflowSteps: WorkflowStep[];
}

export type TemplateCategory = 
  | "data_upload"
  | "tender_submission"
  | "registration"
  | "supplier_compliance"
  | "financial";

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  labelAr?: string; // Arabic label
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
  extractionHints: string[];
  aiEnhanced: boolean;
  dependsOn?: string[];
}

export type FieldType = 
  | "text"
  | "number"
  | "date"
  | "currency"
  | "select"
  | "multiselect"
  | "file"
  | "table"
  | "boolean"
  | "email"
  | "phone"
  | "textarea";

export interface FieldValidation {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  fileTypes?: string[];
  maxFileSize?: number; // in MB
}

export interface ValidationRule {
  field: string;
  rule: "required" | "format" | "range" | "cross_reference" | "business_logic" | "expiry_check";
  parameters: Record<string, any>;
  errorMessage: string;
  errorMessageAr?: string;
}

export interface AutoPopulationRule {
  sourceField: string;
  targetEntity: string;
  targetField: string;
  transformation?: string;
  condition?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "ocr" | "ai_extraction" | "validation" | "approval" | "integration" | "notification";
  required: boolean;
  assignedRole?: string;
  automatable: boolean;
}

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

class ComprehensiveTemplateManager {
  private templates: Map<string, ComprehensiveTemplate> = new Map();

  constructor() {
    this.initializeAllTemplates();
  }

  private initializeAllTemplates(): void {
    // DATA UPLOAD TEMPLATES
    this.registerTemplate(this.createSupplierDataTemplate());
    this.registerTemplate(this.createProductCatalogTemplate());
    this.registerTemplate(this.createPriceListTemplate());
    this.registerTemplate(this.createInvoiceTemplate());
    this.registerTemplate(this.createPurchaseOrderTemplate());
    this.registerTemplate(this.createExpenseReportTemplate());
    this.registerTemplate(this.createBudgetTemplate());

    // TENDER SUBMISSION DOCUMENTS
    this.registerTemplate(this.createTenderDocumentTemplate());
    this.registerTemplate(this.createTechnicalProposalTemplate());
    this.registerTemplate(this.createFinancialProposalTemplate());
    this.registerTemplate(this.createBidBondTemplate());
    this.registerTemplate(this.createCompanyProfileTemplate());
    this.registerTemplate(this.createPastExperienceTemplate());
    this.registerTemplate(this.createTechnicalComplianceTemplate());

    // REGISTRATION PROCESS DOCUMENTS
    this.registerTemplate(this.createCommercialRegistrationTemplate());
    this.registerTemplate(this.createTaxCertificateTemplate());
    this.registerTemplate(this.createBankGuaranteeTemplate());
    this.registerTemplate(this.createInsuranceCertificateTemplate());
    this.registerTemplate(this.createAuthorizedSignatoryTemplate());
    this.registerTemplate(this.createZakatCertificateTemplate());
    this.registerTemplate(this.createSaudiPostAddressTemplate());
    this.registerTemplate(this.createGOSICertificateTemplate());

    // SUPPLIER COMPLIANCE DOCUMENTS
    this.registerTemplate(this.createSupplierContractTemplate());
    this.registerTemplate(this.createLetterOfAuthorizationTemplate());
    this.registerTemplate(this.createMOCILetterTemplate());
    this.registerTemplate(this.createFDACertificateTemplate());
    this.registerTemplate(this.createCEMarkingTemplate());
    this.registerTemplate(this.createISOCertificateTemplate());
    this.registerTemplate(this.createSFDACertificateTemplate());
    this.registerTemplate(this.createManufacturerAuthorizationTemplate());
  }

  private registerTemplate(template: ComprehensiveTemplate): void {
    this.templates.set(template.id, template);
  }


  // =============================================================================
  // DATA UPLOAD TEMPLATES
  // =============================================================================

  private createSupplierDataTemplate(): ComprehensiveTemplate {
    return {
      id: "supplier-data-upload",
      name: "Supplier Data Import",
      category: "data_upload",
      subcategory: "suppliers",
      description: "Upload and import supplier information including company details, contacts, and banking information",
      icon: "Building2",
      fields: [
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          labelAr: "اسم الشركة",
          type: "text",
          required: true,
          placeholder: "Enter company legal name",
          extractionHints: ["company name", "supplier name", "vendor name", "business name"],
          aiEnhanced: true,
        },
        {
          id: "companyNameAr",
          name: "companyNameAr",
          label: "Company Name (Arabic)",
          labelAr: "اسم الشركة بالعربية",
          type: "text",
          required: false,
          extractionHints: ["الاسم", "اسم الشركة"],
          aiEnhanced: true,
        },
        {
          id: "commercialRegistration",
          name: "commercialRegistration",
          label: "Commercial Registration Number",
          labelAr: "رقم السجل التجاري",
          type: "text",
          required: true,
          placeholder: "e.g., 1010XXXXXX",
          validation: { pattern: "^[0-9]{10}$" },
          extractionHints: ["CR number", "commercial registration", "سجل تجاري"],
          aiEnhanced: true,
        },
        {
          id: "vatNumber",
          name: "vatNumber",
          label: "VAT Registration Number",
          labelAr: "رقم التسجيل الضريبي",
          type: "text",
          required: true,
          placeholder: "e.g., 3XXXXXXXXXXXXX3",
          validation: { pattern: "^3[0-9]{13}3$" },
          extractionHints: ["VAT number", "tax ID", "الرقم الضريبي"],
          aiEnhanced: true,
        },
        {
          id: "contactPerson",
          name: "contactPerson",
          label: "Primary Contact Person",
          type: "text",
          required: true,
          extractionHints: ["contact person", "contact name", "representative"],
          aiEnhanced: true,
        },
        {
          id: "email",
          name: "email",
          label: "Email Address",
          type: "email",
          required: true,
          validation: { pattern: "^[^@]+@[^@]+\\.[^@]+$" },
          extractionHints: ["email", "e-mail", "البريد الإلكتروني"],
          aiEnhanced: true,
        },
        {
          id: "phone",
          name: "phone",
          label: "Phone Number",
          type: "phone",
          required: true,
          placeholder: "+966 XX XXX XXXX",
          extractionHints: ["phone", "telephone", "mobile", "الهاتف"],
          aiEnhanced: true,
        },
        {
          id: "address",
          name: "address",
          label: "Business Address",
          type: "textarea",
          required: true,
          extractionHints: ["address", "location", "العنوان"],
          aiEnhanced: true,
        },
        {
          id: "city",
          name: "city",
          label: "City",
          type: "select",
          required: true,
          options: ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah", "Khobar", "Other"],
          extractionHints: ["city", "المدينة"],
          aiEnhanced: true,
        },
        {
          id: "country",
          name: "country",
          label: "Country",
          type: "select",
          required: true,
          options: ["Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Egypt", "Jordan", "USA", "Germany", "UK", "Other"],
          extractionHints: ["country", "الدولة"],
          aiEnhanced: true,
        },
        {
          id: "bankName",
          name: "bankName",
          label: "Bank Name",
          type: "text",
          required: false,
          extractionHints: ["bank name", "اسم البنك"],
          aiEnhanced: true,
        },
        {
          id: "bankAccountNumber",
          name: "bankAccountNumber",
          label: "Bank Account Number (IBAN)",
          type: "text",
          required: false,
          placeholder: "SA XX XXXX XXXX XXXX XXXX XXXX",
          validation: { pattern: "^SA[0-9]{22}$" },
          extractionHints: ["IBAN", "account number", "رقم الحساب"],
          aiEnhanced: true,
        },
        {
          id: "supplierType",
          name: "supplierType",
          label: "Supplier Type",
          type: "multiselect",
          required: true,
          options: ["Manufacturer", "Distributor", "Agent", "Service Provider", "Contractor"],
          extractionHints: ["supplier type", "vendor type", "نوع المورد"],
          aiEnhanced: true,
        },
        {
          id: "productCategories",
          name: "productCategories",
          label: "Product/Service Categories",
          type: "multiselect",
          required: true,
          options: [
            "Medical Equipment",
            "Medical Consumables",
            "Pharmaceuticals",
            "Laboratory Equipment",
            "Surgical Instruments",
            "Diagnostic Equipment",
            "IT Equipment",
            "Office Supplies",
            "Furniture",
            "Maintenance Services",
          ],
          extractionHints: ["categories", "products", "services"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract supplier information from the document:
        1. Company legal name (English and Arabic if available)
        2. Commercial Registration (CR) number - 10 digits
        3. VAT number - starts and ends with 3, 15 digits total
        4. Contact details (name, email, phone)
        5. Full business address including city
        6. Banking information (IBAN format)
        7. Type of supplier and product categories`,
      validationRules: [
        { field: "commercialRegistration", rule: "format", parameters: { pattern: "^[0-9]{10}$" }, errorMessage: "CR must be 10 digits" },
        { field: "vatNumber", rule: "format", parameters: { pattern: "^3[0-9]{13}3$" }, errorMessage: "Invalid VAT number format" },
        { field: "email", rule: "format", parameters: { pattern: "email" }, errorMessage: "Invalid email format" },
      ],
      autoPopulationRules: [
        { sourceField: "companyName", targetEntity: "supplier", targetField: "name" },
        { sourceField: "commercialRegistration", targetEntity: "supplier", targetField: "code" },
        { sourceField: "email", targetEntity: "supplier", targetField: "email" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "AI Data Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Data Validation", type: "validation", required: true, automatable: true },
        { id: "review", name: "Manual Review", type: "approval", required: false, assignedRole: "procurement_manager", automatable: false },
      ],
    };
  }


  private createProductCatalogTemplate(): ComprehensiveTemplate {
    return {
      id: "product-catalog-upload",
      name: "Product Catalog Import",
      category: "data_upload",
      subcategory: "products",
      description: "Upload supplier product catalogs with automatic extraction of products, specifications, and pricing",
      icon: "Package",
      fields: [
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [], // Populated dynamically
          extractionHints: ["supplier", "vendor", "manufacturer"],
          aiEnhanced: false,
        },
        {
          id: "catalogName",
          name: "catalogName",
          label: "Catalog Name/Version",
          type: "text",
          required: true,
          placeholder: "e.g., Medical Equipment Catalog 2024 v2.1",
          extractionHints: ["catalog", "version", "edition"],
          aiEnhanced: true,
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
          extractionHints: ["effective date", "valid from", "date"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
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
          options: ["SAR", "USD", "EUR", "AED", "GBP"],
          extractionHints: ["currency", "SAR", "USD", "EUR"],
          aiEnhanced: true,
        },
        {
          id: "products",
          name: "products",
          label: "Product List",
          type: "table",
          required: true,
          extractionHints: ["products", "items", "SKU", "model", "description"],
          aiEnhanced: true,
        },
      ],
      requiredDocuments: ["Product Catalog PDF", "Price List (if separate)"],
      aiExtractionPrompt: `Extract product catalog information:
        1. Product codes/SKUs and model numbers
        2. Product names and descriptions
        3. Technical specifications
        4. Unit of measure
        5. List prices and currency
        6. Minimum order quantities
        7. Lead times if mentioned
        8. FDA/CE/SFDA approval status for medical products
        
        For each product, extract:
        - SKU/Model Number
        - Product Name
        - Description
        - Category
        - Unit Price
        - UOM (Unit of Measure)
        - Specifications (dimensions, weight, power, etc.)`,
      validationRules: [
        { field: "effectiveDate", rule: "required", parameters: {}, errorMessage: "Effective date is required" },
        { field: "products", rule: "required", parameters: { minItems: 1 }, errorMessage: "At least one product is required" },
      ],
      autoPopulationRules: [
        { sourceField: "products", targetEntity: "product", targetField: "bulk_import", transformation: "parseProductTable" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "AI Product Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Product Validation", type: "validation", required: true, automatable: true },
        { id: "duplicate_check", name: "Duplicate Check", type: "validation", required: true, automatable: true },
        { id: "import", name: "Bulk Import", type: "integration", required: true, automatable: true },
      ],
    };
  }

  private createPriceListTemplate(): ComprehensiveTemplate {
    return {
      id: "price-list-upload",
      name: "Price List Import",
      category: "data_upload",
      subcategory: "pricing",
      description: "Upload supplier price lists with volume discounts and validity periods",
      icon: "DollarSign",
      fields: [
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["supplier", "vendor"],
          aiEnhanced: false,
        },
        {
          id: "priceListName",
          name: "priceListName",
          label: "Price List Name",
          type: "text",
          required: true,
          placeholder: "e.g., Q4 2024 Price List",
          extractionHints: ["price list", "quotation", "pricing"],
          aiEnhanced: true,
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
          extractionHints: ["effective", "valid from", "start date"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry", "valid until", "end date"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD", "EUR", "AED"],
          extractionHints: ["currency", "SAR", "USD"],
          aiEnhanced: true,
        },
        {
          id: "priceItems",
          name: "priceItems",
          label: "Price Items",
          type: "table",
          required: true,
          extractionHints: ["price", "unit price", "cost", "amount"],
          aiEnhanced: true,
        },
        {
          id: "discountTiers",
          name: "discountTiers",
          label: "Volume Discount Tiers",
          type: "table",
          required: false,
          extractionHints: ["discount", "volume", "quantity break", "tier"],
          aiEnhanced: true,
        },
        {
          id: "paymentTerms",
          name: "paymentTerms",
          label: "Payment Terms",
          type: "select",
          required: false,
          options: ["Net 30", "Net 60", "Net 90", "Cash on Delivery", "Letter of Credit"],
          extractionHints: ["payment terms", "credit terms", "net days"],
          aiEnhanced: true,
        },
        {
          id: "deliveryTerms",
          name: "deliveryTerms",
          label: "Delivery Terms (Incoterms)",
          type: "select",
          required: false,
          options: ["EXW", "FOB", "CIF", "DDP", "DAP"],
          extractionHints: ["incoterms", "delivery terms", "shipping terms"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract price list information:
        1. Supplier/vendor name
        2. Price list validity period (start and end dates)
        3. Currency used
        4. For each item:
           - Product code/SKU
           - Product name
           - Unit price
           - Minimum order quantity
           - Unit of measure
        5. Volume discount tiers (quantity ranges and discount percentages)
        6. Payment terms
        7. Delivery/shipping terms`,
      validationRules: [
        { field: "expiryDate", rule: "business_logic", parameters: { mustBeAfter: "effectiveDate" }, errorMessage: "Expiry must be after effective date" },
        { field: "priceItems", rule: "required", parameters: { minItems: 1 }, errorMessage: "At least one price item required" },
      ],
      autoPopulationRules: [
        { sourceField: "priceItems", targetEntity: "supplier_price", targetField: "bulk_import" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Price Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Price Validation", type: "validation", required: true, automatable: true },
        { id: "compare", name: "Price Comparison", type: "validation", required: false, automatable: true },
        { id: "approve", name: "Price Approval", type: "approval", required: true, assignedRole: "procurement_manager", automatable: false },
      ],
    };
  }


  private createInvoiceTemplate(): ComprehensiveTemplate {
    return {
      id: "invoice-upload",
      name: "Invoice Processing",
      category: "financial",
      subcategory: "invoices",
      description: "Upload and process supplier invoices with automatic line item extraction",
      icon: "Receipt",
      fields: [
        {
          id: "invoiceNumber",
          name: "invoiceNumber",
          label: "Invoice Number",
          labelAr: "رقم الفاتورة",
          type: "text",
          required: true,
          extractionHints: ["invoice number", "invoice #", "bill number", "رقم الفاتورة"],
          aiEnhanced: true,
        },
        {
          id: "invoiceDate",
          name: "invoiceDate",
          label: "Invoice Date",
          labelAr: "تاريخ الفاتورة",
          type: "date",
          required: true,
          extractionHints: ["invoice date", "date", "تاريخ"],
          aiEnhanced: true,
        },
        {
          id: "dueDate",
          name: "dueDate",
          label: "Due Date",
          type: "date",
          required: true,
          extractionHints: ["due date", "payment due", "تاريخ الاستحقاق"],
          aiEnhanced: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["supplier", "vendor", "from"],
          aiEnhanced: true,
        },
        {
          id: "supplierVatNumber",
          name: "supplierVatNumber",
          label: "Supplier VAT Number",
          type: "text",
          required: true,
          extractionHints: ["VAT number", "tax ID", "الرقم الضريبي"],
          aiEnhanced: true,
        },
        {
          id: "poNumber",
          name: "poNumber",
          label: "PO Reference",
          type: "text",
          required: false,
          extractionHints: ["PO number", "purchase order", "رقم أمر الشراء"],
          aiEnhanced: true,
        },
        {
          id: "lineItems",
          name: "lineItems",
          label: "Line Items",
          type: "table",
          required: true,
          extractionHints: ["items", "description", "quantity", "unit price", "amount"],
          aiEnhanced: true,
        },
        {
          id: "subtotal",
          name: "subtotal",
          label: "Subtotal",
          type: "currency",
          required: true,
          extractionHints: ["subtotal", "total before VAT", "المجموع الفرعي"],
          aiEnhanced: true,
        },
        {
          id: "vatAmount",
          name: "vatAmount",
          label: "VAT Amount (15%)",
          type: "currency",
          required: true,
          extractionHints: ["VAT", "tax", "15%", "ضريبة القيمة المضافة"],
          aiEnhanced: true,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Amount",
          labelAr: "المبلغ الإجمالي",
          type: "currency",
          required: true,
          extractionHints: ["total", "grand total", "amount due", "الإجمالي"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD", "EUR", "AED"],
          extractionHints: ["currency", "SAR", "ريال"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract invoice information (Arabic or English):
        1. Invoice number and date
        2. Supplier details (name, VAT number)
        3. PO reference if available
        4. Line items with:
           - Description
           - Quantity
           - Unit price
           - Line total
        5. Subtotal (before VAT)
        6. VAT amount (15%)
        7. Grand total
        8. Payment terms and due date
        
        Validate: VAT should be 15% of subtotal
        Currency: Detect from symbols (SAR/ر.س, USD/$, EUR/€)`,
      validationRules: [
        { field: "invoiceNumber", rule: "required", parameters: {}, errorMessage: "Invoice number is required" },
        { field: "totalAmount", rule: "business_logic", parameters: { validateVAT: true }, errorMessage: "VAT calculation mismatch" },
        { field: "dueDate", rule: "business_logic", parameters: { mustBeAfterOrEqual: "invoiceDate" }, errorMessage: "Due date must be on or after invoice date" },
      ],
      autoPopulationRules: [
        { sourceField: "invoiceNumber", targetEntity: "invoice", targetField: "invoiceNumber" },
        { sourceField: "totalAmount", targetEntity: "invoice", targetField: "totalAmount", transformation: "toCents" },
        { sourceField: "lineItems", targetEntity: "invoice_items", targetField: "bulk_import" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Invoice Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "vat_validate", name: "VAT Validation", type: "validation", required: true, automatable: true },
        { id: "po_match", name: "PO Matching", type: "validation", required: false, automatable: true },
        { id: "approve", name: "Invoice Approval", type: "approval", required: true, assignedRole: "finance_manager", automatable: false },
        { id: "notify", name: "Payment Notification", type: "notification", required: false, automatable: true },
      ],
    };
  }

  private createPurchaseOrderTemplate(): ComprehensiveTemplate {
    return {
      id: "purchase-order-upload",
      name: "Purchase Order Import",
      category: "financial",
      subcategory: "purchase_orders",
      description: "Upload and process purchase orders with automatic data extraction",
      icon: "ShoppingCart",
      fields: [
        {
          id: "poNumber",
          name: "poNumber",
          label: "PO Number",
          labelAr: "رقم أمر الشراء",
          type: "text",
          required: true,
          extractionHints: ["PO number", "purchase order", "order number"],
          aiEnhanced: true,
        },
        {
          id: "poDate",
          name: "poDate",
          label: "PO Date",
          type: "date",
          required: true,
          extractionHints: ["date", "order date", "PO date"],
          aiEnhanced: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["supplier", "vendor", "to"],
          aiEnhanced: true,
        },
        {
          id: "deliveryDate",
          name: "deliveryDate",
          label: "Expected Delivery Date",
          type: "date",
          required: true,
          extractionHints: ["delivery date", "expected", "ship date"],
          aiEnhanced: true,
        },
        {
          id: "deliveryAddress",
          name: "deliveryAddress",
          label: "Delivery Address",
          type: "textarea",
          required: true,
          extractionHints: ["delivery address", "ship to", "destination"],
          aiEnhanced: true,
        },
        {
          id: "lineItems",
          name: "lineItems",
          label: "Order Items",
          type: "table",
          required: true,
          extractionHints: ["items", "products", "quantity", "price"],
          aiEnhanced: true,
        },
        {
          id: "subtotal",
          name: "subtotal",
          label: "Subtotal",
          type: "currency",
          required: true,
          extractionHints: ["subtotal", "total before VAT"],
          aiEnhanced: true,
        },
        {
          id: "vatAmount",
          name: "vatAmount",
          label: "VAT Amount",
          type: "currency",
          required: true,
          extractionHints: ["VAT", "tax"],
          aiEnhanced: true,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Amount",
          type: "currency",
          required: true,
          extractionHints: ["total", "grand total", "order total"],
          aiEnhanced: true,
        },
        {
          id: "paymentTerms",
          name: "paymentTerms",
          label: "Payment Terms",
          type: "text",
          required: false,
          extractionHints: ["payment terms", "terms", "net days"],
          aiEnhanced: true,
        },
        {
          id: "specialInstructions",
          name: "specialInstructions",
          label: "Special Instructions",
          type: "textarea",
          required: false,
          extractionHints: ["instructions", "notes", "remarks"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract purchase order information:
        1. PO number and date
        2. Supplier details
        3. Delivery date and address
        4. Line items:
           - Item code/SKU
           - Description
           - Quantity
           - Unit price
           - Line total
        5. Subtotal, VAT (15%), and Grand Total
        6. Payment and delivery terms
        7. Any special instructions`,
      validationRules: [
        { field: "poNumber", rule: "required", parameters: {}, errorMessage: "PO number is required" },
        { field: "deliveryDate", rule: "business_logic", parameters: { mustBeAfter: "poDate" }, errorMessage: "Delivery date must be after PO date" },
      ],
      autoPopulationRules: [
        { sourceField: "poNumber", targetEntity: "purchase_order", targetField: "poNumber" },
        { sourceField: "lineItems", targetEntity: "po_items", targetField: "bulk_import" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "PO Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Data Validation", type: "validation", required: true, automatable: true },
        { id: "budget_check", name: "Budget Check", type: "validation", required: true, automatable: true },
        { id: "approve", name: "PO Approval", type: "approval", required: true, assignedRole: "procurement_manager", automatable: false },
      ],
    };
  }


  private createExpenseReportTemplate(): ComprehensiveTemplate {
    return {
      id: "expense-report-upload",
      name: "Expense Report Import",
      category: "financial",
      subcategory: "expenses",
      description: "Upload expense reports and receipts with automatic categorization",
      icon: "Wallet",
      fields: [
        {
          id: "reportTitle",
          name: "reportTitle",
          label: "Report Title",
          type: "text",
          required: true,
          placeholder: "e.g., Business Trip - Riyadh Q4 2024",
          extractionHints: ["title", "report name", "expense report"],
          aiEnhanced: true,
        },
        {
          id: "employeeId",
          name: "employeeId",
          label: "Employee",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["employee", "submitted by", "name"],
          aiEnhanced: false,
        },
        {
          id: "departmentId",
          name: "departmentId",
          label: "Department",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["department", "division"],
          aiEnhanced: false,
        },
        {
          id: "reportDate",
          name: "reportDate",
          label: "Report Date",
          type: "date",
          required: true,
          extractionHints: ["date", "report date"],
          aiEnhanced: true,
        },
        {
          id: "periodStart",
          name: "periodStart",
          label: "Period Start",
          type: "date",
          required: true,
          extractionHints: ["from", "start date", "period start"],
          aiEnhanced: true,
        },
        {
          id: "periodEnd",
          name: "periodEnd",
          label: "Period End",
          type: "date",
          required: true,
          extractionHints: ["to", "end date", "period end"],
          aiEnhanced: true,
        },
        {
          id: "expenseItems",
          name: "expenseItems",
          label: "Expense Items",
          type: "table",
          required: true,
          extractionHints: ["expenses", "items", "receipts", "amount"],
          aiEnhanced: true,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Amount",
          type: "currency",
          required: true,
          extractionHints: ["total", "sum", "amount"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD", "EUR", "AED"],
          extractionHints: ["currency"],
          aiEnhanced: true,
        },
        {
          id: "budgetId",
          name: "budgetId",
          label: "Budget Allocation",
          type: "select",
          required: false,
          options: [],
          extractionHints: ["budget", "cost center"],
          aiEnhanced: false,
        },
        {
          id: "justification",
          name: "justification",
          label: "Business Justification",
          type: "textarea",
          required: true,
          extractionHints: ["purpose", "justification", "reason"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract expense report information:
        1. Report title and date
        2. Employee name and department
        3. Expense period (start and end dates)
        4. For each expense item:
           - Date of expense
           - Category (Travel, Meals, Accommodation, Transport, Supplies, Other)
           - Description
           - Vendor/Merchant name
           - Amount with currency
           - Receipt number if available
        5. Total amount
        6. Business purpose/justification`,
      validationRules: [
        { field: "periodEnd", rule: "business_logic", parameters: { mustBeAfterOrEqual: "periodStart" }, errorMessage: "Period end must be after start" },
        { field: "expenseItems", rule: "required", parameters: { minItems: 1 }, errorMessage: "At least one expense item required" },
      ],
      autoPopulationRules: [
        { sourceField: "expenseItems", targetEntity: "expense", targetField: "bulk_import" },
      ],
      workflowSteps: [
        { id: "ocr", name: "Receipt OCR", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Expense Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "categorize", name: "Auto-Categorization", type: "ai_extraction", required: true, automatable: true },
        { id: "policy_check", name: "Policy Compliance", type: "validation", required: true, automatable: true },
        { id: "manager_approve", name: "Manager Approval", type: "approval", required: true, assignedRole: "department_manager", automatable: false },
        { id: "finance_approve", name: "Finance Approval", type: "approval", required: true, assignedRole: "finance_manager", automatable: false },
      ],
    };
  }

  private createBudgetTemplate(): ComprehensiveTemplate {
    return {
      id: "budget-upload",
      name: "Budget Import",
      category: "financial",
      subcategory: "budgets",
      description: "Upload budget allocations and financial plans",
      icon: "PiggyBank",
      fields: [
        {
          id: "budgetName",
          name: "budgetName",
          label: "Budget Name",
          type: "text",
          required: true,
          placeholder: "e.g., Medical Equipment FY2024",
          extractionHints: ["budget name", "title"],
          aiEnhanced: true,
        },
        {
          id: "fiscalYear",
          name: "fiscalYear",
          label: "Fiscal Year",
          type: "select",
          required: true,
          options: ["2024", "2025", "2026"],
          extractionHints: ["fiscal year", "FY", "year"],
          aiEnhanced: true,
        },
        {
          id: "departmentId",
          name: "departmentId",
          label: "Department",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["department", "division"],
          aiEnhanced: false,
        },
        {
          id: "categoryId",
          name: "categoryId",
          label: "Budget Category",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["category", "type"],
          aiEnhanced: false,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Budget Amount",
          type: "currency",
          required: true,
          extractionHints: ["total", "budget amount", "allocation"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD"],
          extractionHints: ["currency"],
          aiEnhanced: true,
        },
        {
          id: "startDate",
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          extractionHints: ["start date", "from", "effective"],
          aiEnhanced: true,
        },
        {
          id: "endDate",
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          extractionHints: ["end date", "to", "expires"],
          aiEnhanced: true,
        },
        {
          id: "quarterlyBreakdown",
          name: "quarterlyBreakdown",
          label: "Quarterly Breakdown",
          type: "table",
          required: false,
          extractionHints: ["Q1", "Q2", "Q3", "Q4", "quarterly"],
          aiEnhanced: true,
        },
        {
          id: "description",
          name: "description",
          label: "Budget Description",
          type: "textarea",
          required: false,
          extractionHints: ["description", "purpose", "notes"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract budget information:
        1. Budget name and fiscal year
        2. Department and category
        3. Total budget amount and currency
        4. Budget period (start and end dates)
        5. Quarterly breakdown if available:
           - Q1, Q2, Q3, Q4 allocations
        6. Budget description and purpose`,
      validationRules: [
        { field: "totalAmount", rule: "range", parameters: { min: 0 }, errorMessage: "Budget amount must be positive" },
        { field: "endDate", rule: "business_logic", parameters: { mustBeAfter: "startDate" }, errorMessage: "End date must be after start date" },
      ],
      autoPopulationRules: [
        { sourceField: "budgetName", targetEntity: "budget", targetField: "name" },
        { sourceField: "totalAmount", targetEntity: "budget", targetField: "totalAmount", transformation: "toCents" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Budget Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Data Validation", type: "validation", required: true, automatable: true },
        { id: "approve", name: "Finance Approval", type: "approval", required: true, assignedRole: "cfo", automatable: false },
      ],
    };
  }


  // =============================================================================
  // TENDER SUBMISSION DOCUMENTS
  // =============================================================================

  private createTenderDocumentTemplate(): ComprehensiveTemplate {
    return {
      id: "tender-document-upload",
      name: "Tender Document (RFP/RFQ)",
      category: "tender_submission",
      subcategory: "main_document",
      description: "Upload tender/RFP documents for automatic extraction of requirements and deadlines",
      icon: "FileText",
      fields: [
        {
          id: "tenderNumber",
          name: "tenderNumber",
          label: "Tender Reference Number",
          labelAr: "رقم المناقصة",
          type: "text",
          required: true,
          extractionHints: ["tender number", "RFP number", "reference", "رقم المناقصة"],
          aiEnhanced: true,
        },
        {
          id: "title",
          name: "title",
          label: "Tender Title",
          labelAr: "عنوان المناقصة",
          type: "text",
          required: true,
          extractionHints: ["title", "subject", "project name", "عنوان"],
          aiEnhanced: true,
        },
        {
          id: "issuingOrganization",
          name: "issuingOrganization",
          label: "Issuing Organization",
          type: "text",
          required: true,
          extractionHints: ["organization", "ministry", "authority", "client", "الجهة"],
          aiEnhanced: true,
        },
        {
          id: "customerId",
          name: "customerId",
          label: "Customer",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["customer", "client"],
          aiEnhanced: false,
        },
        {
          id: "tenderType",
          name: "tenderType",
          label: "Tender Type",
          type: "select",
          required: true,
          options: ["Open Tender", "Limited Tender", "Direct Purchase", "Framework Agreement", "Reverse Auction"],
          extractionHints: ["tender type", "procurement method"],
          aiEnhanced: true,
        },
        {
          id: "submissionDeadline",
          name: "submissionDeadline",
          label: "Submission Deadline",
          labelAr: "آخر موعد للتقديم",
          type: "date",
          required: true,
          extractionHints: ["deadline", "closing date", "submission date", "آخر موعد"],
          aiEnhanced: true,
        },
        {
          id: "submissionTime",
          name: "submissionTime",
          label: "Submission Time",
          type: "text",
          required: false,
          placeholder: "e.g., 14:00",
          extractionHints: ["time", "hour", "الساعة"],
          aiEnhanced: true,
        },
        {
          id: "openingDate",
          name: "openingDate",
          label: "Envelope Opening Date",
          type: "date",
          required: false,
          extractionHints: ["opening date", "bid opening", "فتح المظاريف"],
          aiEnhanced: true,
        },
        {
          id: "estimatedValue",
          name: "estimatedValue",
          label: "Estimated Value",
          type: "currency",
          required: false,
          extractionHints: ["estimated value", "budget", "القيمة التقديرية"],
          aiEnhanced: true,
        },
        {
          id: "bidBondAmount",
          name: "bidBondAmount",
          label: "Bid Bond Amount",
          type: "currency",
          required: false,
          extractionHints: ["bid bond", "initial guarantee", "ضمان ابتدائي"],
          aiEnhanced: true,
        },
        {
          id: "bidBondPercentage",
          name: "bidBondPercentage",
          label: "Bid Bond Percentage",
          type: "number",
          required: false,
          placeholder: "e.g., 2%",
          extractionHints: ["percentage", "bid bond %"],
          aiEnhanced: true,
        },
        {
          id: "performanceBondPercentage",
          name: "performanceBondPercentage",
          label: "Performance Bond %",
          type: "number",
          required: false,
          extractionHints: ["performance bond", "final guarantee", "ضمان نهائي"],
          aiEnhanced: true,
        },
        {
          id: "requirements",
          name: "requirements",
          label: "Technical Requirements",
          type: "table",
          required: true,
          extractionHints: ["requirements", "specifications", "scope", "المتطلبات"],
          aiEnhanced: true,
        },
        {
          id: "evaluationCriteria",
          name: "evaluationCriteria",
          label: "Evaluation Criteria",
          type: "table",
          required: false,
          extractionHints: ["evaluation", "criteria", "scoring", "معايير التقييم"],
          aiEnhanced: true,
        },
        {
          id: "requiredDocuments",
          name: "requiredDocuments",
          label: "Required Submission Documents",
          type: "multiselect",
          required: true,
          options: [
            "Commercial Registration",
            "VAT Certificate",
            "Zakat Certificate",
            "GOSI Certificate",
            "Bank Guarantee",
            "Technical Proposal",
            "Financial Proposal",
            "Company Profile",
            "Past Experience",
            "Authorization Letter",
            "Manufacturer Authorization",
            "FDA/CE Certificates",
          ],
          extractionHints: ["documents required", "submission requirements", "المستندات المطلوبة"],
          aiEnhanced: true,
        },
      ],
      requiredDocuments: [
        "Technical Proposal",
        "Financial Proposal",
        "Company Profile",
        "Commercial Registration",
        "VAT Certificate",
        "Zakat Certificate",
        "GOSI Certificate",
        "Bid Bond/Bank Guarantee",
      ],
      aiExtractionPrompt: `Extract tender document information (Arabic and English):
        1. Tender reference number and title
        2. Issuing organization/ministry
        3. Tender type (open, limited, direct)
        4. Critical dates:
           - Submission deadline (date and time)
           - Envelope opening date
           - Validity period
        5. Financial requirements:
           - Estimated value
           - Bid bond amount/percentage
           - Performance bond percentage
        6. Technical requirements and specifications
        7. Evaluation criteria and weights
        8. List of required submission documents
        9. Contact information for queries`,
      validationRules: [
        { field: "submissionDeadline", rule: "business_logic", parameters: { mustBeFuture: true }, errorMessage: "Submission deadline must be in the future" },
        { field: "requirements", rule: "required", parameters: { minItems: 1 }, errorMessage: "At least one requirement is needed" },
      ],
      autoPopulationRules: [
        { sourceField: "tenderNumber", targetEntity: "tender", targetField: "referenceNumber" },
        { sourceField: "title", targetEntity: "tender", targetField: "title" },
        { sourceField: "requirements", targetEntity: "tender_items", targetField: "bulk_import" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Tender Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Data Validation", type: "validation", required: true, automatable: true },
        { id: "checklist", name: "Document Checklist", type: "validation", required: true, automatable: true },
        { id: "assign", name: "Team Assignment", type: "approval", required: true, assignedRole: "tender_manager", automatable: false },
        { id: "notify", name: "Deadline Notifications", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createTechnicalProposalTemplate(): ComprehensiveTemplate {
    return {
      id: "technical-proposal-upload",
      name: "Technical Proposal",
      category: "tender_submission",
      subcategory: "proposals",
      description: "Upload technical proposals for tender submissions",
      icon: "FileCode",
      fields: [
        {
          id: "tenderId",
          name: "tenderId",
          label: "Related Tender",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["tender", "RFP"],
          aiEnhanced: false,
        },
        {
          id: "proposalVersion",
          name: "proposalVersion",
          label: "Version",
          type: "text",
          required: true,
          placeholder: "e.g., v1.0",
          extractionHints: ["version", "revision"],
          aiEnhanced: true,
        },
        {
          id: "executiveSummary",
          name: "executiveSummary",
          label: "Executive Summary",
          type: "textarea",
          required: true,
          extractionHints: ["executive summary", "overview", "introduction"],
          aiEnhanced: true,
        },
        {
          id: "technicalApproach",
          name: "technicalApproach",
          label: "Technical Approach",
          type: "textarea",
          required: true,
          extractionHints: ["technical approach", "methodology", "solution"],
          aiEnhanced: true,
        },
        {
          id: "productOfferings",
          name: "productOfferings",
          label: "Product/Service Offerings",
          type: "table",
          required: true,
          extractionHints: ["products", "services", "offerings", "equipment"],
          aiEnhanced: true,
        },
        {
          id: "complianceMatrix",
          name: "complianceMatrix",
          label: "Technical Compliance Matrix",
          type: "table",
          required: true,
          extractionHints: ["compliance", "requirements matrix", "specifications"],
          aiEnhanced: true,
        },
        {
          id: "implementationPlan",
          name: "implementationPlan",
          label: "Implementation Plan",
          type: "table",
          required: false,
          extractionHints: ["implementation", "timeline", "schedule", "milestones"],
          aiEnhanced: true,
        },
        {
          id: "teamComposition",
          name: "teamComposition",
          label: "Project Team",
          type: "table",
          required: false,
          extractionHints: ["team", "personnel", "staff", "resources"],
          aiEnhanced: true,
        },
        {
          id: "warrantyTerms",
          name: "warrantyTerms",
          label: "Warranty Terms",
          type: "textarea",
          required: false,
          extractionHints: ["warranty", "guarantee", "support"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract technical proposal information:
        1. Executive summary
        2. Technical approach and methodology
        3. Product/service offerings with specifications
        4. Compliance matrix against requirements
        5. Implementation timeline and milestones
        6. Project team composition and qualifications
        7. Warranty and support terms
        8. Value-added services`,
      validationRules: [],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Proposal Analysis", type: "ai_extraction", required: true, automatable: true },
        { id: "compliance_check", name: "Compliance Check", type: "validation", required: true, automatable: true },
        { id: "review", name: "Technical Review", type: "approval", required: true, assignedRole: "technical_manager", automatable: false },
      ],
    };
  }

  private createFinancialProposalTemplate(): ComprehensiveTemplate {
    return {
      id: "financial-proposal-upload",
      name: "Financial Proposal",
      category: "tender_submission",
      subcategory: "proposals",
      description: "Upload financial/commercial proposals for tender submissions",
      icon: "Calculator",
      fields: [
        {
          id: "tenderId",
          name: "tenderId",
          label: "Related Tender",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["tender"],
          aiEnhanced: false,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD", "EUR"],
          extractionHints: ["currency"],
          aiEnhanced: true,
        },
        {
          id: "pricingItems",
          name: "pricingItems",
          label: "Pricing Breakdown",
          type: "table",
          required: true,
          extractionHints: ["price", "cost", "unit price", "total"],
          aiEnhanced: true,
        },
        {
          id: "subtotal",
          name: "subtotal",
          label: "Subtotal (Before VAT)",
          type: "currency",
          required: true,
          extractionHints: ["subtotal", "total before VAT"],
          aiEnhanced: true,
        },
        {
          id: "vatAmount",
          name: "vatAmount",
          label: "VAT (15%)",
          type: "currency",
          required: true,
          extractionHints: ["VAT", "tax", "15%"],
          aiEnhanced: true,
        },
        {
          id: "grandTotal",
          name: "grandTotal",
          label: "Grand Total",
          type: "currency",
          required: true,
          extractionHints: ["grand total", "total amount", "final price"],
          aiEnhanced: true,
        },
        {
          id: "validityPeriod",
          name: "validityPeriod",
          label: "Price Validity Period",
          type: "text",
          required: true,
          placeholder: "e.g., 90 days",
          extractionHints: ["validity", "valid for", "price validity"],
          aiEnhanced: true,
        },
        {
          id: "paymentTerms",
          name: "paymentTerms",
          label: "Payment Terms",
          type: "textarea",
          required: true,
          extractionHints: ["payment terms", "payment schedule"],
          aiEnhanced: true,
        },
        {
          id: "deliverySchedule",
          name: "deliverySchedule",
          label: "Delivery Schedule",
          type: "textarea",
          required: false,
          extractionHints: ["delivery", "lead time", "schedule"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract financial proposal information:
        1. Currency used
        2. Detailed pricing breakdown:
           - Item descriptions
           - Quantities
           - Unit prices
           - Extended prices
        3. Subtotal before VAT
        4. VAT calculation (15%)
        5. Grand total
        6. Price validity period
        7. Payment terms and schedule
        8. Delivery timeline`,
      validationRules: [
        { field: "grandTotal", rule: "business_logic", parameters: { validateVAT: true }, errorMessage: "VAT calculation error" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Price Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Price Validation", type: "validation", required: true, automatable: true },
        { id: "review", name: "Commercial Review", type: "approval", required: true, assignedRole: "commercial_manager", automatable: false },
      ],
    };
  }


  private createBidBondTemplate(): ComprehensiveTemplate {
    return {
      id: "bid-bond-upload",
      name: "Bid Bond / Initial Guarantee",
      category: "tender_submission",
      subcategory: "guarantees",
      description: "Upload bid bonds and initial bank guarantees for tender submissions",
      icon: "Shield",
      fields: [
        {
          id: "tenderId",
          name: "tenderId",
          label: "Related Tender",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["tender"],
          aiEnhanced: false,
        },
        {
          id: "guaranteeNumber",
          name: "guaranteeNumber",
          label: "Guarantee Number",
          type: "text",
          required: true,
          extractionHints: ["guarantee number", "bond number", "reference"],
          aiEnhanced: true,
        },
        {
          id: "bankName",
          name: "bankName",
          label: "Issuing Bank",
          type: "text",
          required: true,
          extractionHints: ["bank name", "issuing bank", "البنك"],
          aiEnhanced: true,
        },
        {
          id: "amount",
          name: "amount",
          label: "Guarantee Amount",
          type: "currency",
          required: true,
          extractionHints: ["amount", "value", "المبلغ"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD"],
          extractionHints: ["currency", "SAR"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "beneficiary",
          name: "beneficiary",
          label: "Beneficiary",
          type: "text",
          required: true,
          extractionHints: ["beneficiary", "in favor of", "المستفيد"],
          aiEnhanced: true,
        },
        {
          id: "guaranteeType",
          name: "guaranteeType",
          label: "Guarantee Type",
          type: "select",
          required: true,
          options: ["Bid Bond", "Performance Bond", "Advance Payment Guarantee", "Retention Guarantee"],
          extractionHints: ["type", "guarantee type"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract bank guarantee information:
        1. Guarantee/bond reference number
        2. Issuing bank name and branch
        3. Guarantee amount and currency
        4. Issue date and expiry date
        5. Beneficiary name (usually the tendering organization)
        6. Type of guarantee (bid bond, performance, etc.)
        7. Terms and conditions`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "Guarantee must be valid for at least 90 days" },
        { field: "expiryDate", rule: "business_logic", parameters: { mustBeAfter: "issueDate" }, errorMessage: "Expiry must be after issue date" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Guarantee Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validity Check", type: "validation", required: true, automatable: true },
        { id: "verify", name: "Bank Verification", type: "approval", required: false, assignedRole: "finance_manager", automatable: false },
      ],
    };
  }

  private createCompanyProfileTemplate(): ComprehensiveTemplate {
    return {
      id: "company-profile-upload",
      name: "Company Profile",
      category: "tender_submission",
      subcategory: "company_docs",
      description: "Upload company profile documents for tender submissions",
      icon: "Building",
      fields: [
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          extractionHints: ["company name", "اسم الشركة"],
          aiEnhanced: true,
        },
        {
          id: "yearEstablished",
          name: "yearEstablished",
          label: "Year Established",
          type: "number",
          required: true,
          extractionHints: ["established", "founded", "since", "تأسست"],
          aiEnhanced: true,
        },
        {
          id: "ownership",
          name: "ownership",
          label: "Ownership Structure",
          type: "textarea",
          required: false,
          extractionHints: ["ownership", "shareholders", "partners"],
          aiEnhanced: true,
        },
        {
          id: "employeeCount",
          name: "employeeCount",
          label: "Number of Employees",
          type: "number",
          required: false,
          extractionHints: ["employees", "staff", "workforce"],
          aiEnhanced: true,
        },
        {
          id: "annualRevenue",
          name: "annualRevenue",
          label: "Annual Revenue",
          type: "currency",
          required: false,
          extractionHints: ["revenue", "turnover", "sales"],
          aiEnhanced: true,
        },
        {
          id: "businessLines",
          name: "businessLines",
          label: "Business Lines",
          type: "multiselect",
          required: true,
          options: ["Medical Equipment", "Pharmaceuticals", "Healthcare Services", "IT Solutions", "Construction", "Consulting"],
          extractionHints: ["business lines", "services", "products"],
          aiEnhanced: true,
        },
        {
          id: "certifications",
          name: "certifications",
          label: "Certifications",
          type: "multiselect",
          required: false,
          options: ["ISO 9001", "ISO 14001", "ISO 13485", "OHSAS 18001", "ISO 45001"],
          extractionHints: ["certifications", "ISO", "accreditations"],
          aiEnhanced: true,
        },
        {
          id: "keyClients",
          name: "keyClients",
          label: "Key Clients",
          type: "table",
          required: false,
          extractionHints: ["clients", "customers", "references"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract company profile information:
        1. Company name and legal entity type
        2. Year established and history
        3. Ownership structure
        4. Number of employees
        5. Annual revenue/turnover
        6. Business lines and services
        7. Certifications and accreditations
        8. Key clients and references
        9. Office locations`,
      validationRules: [],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Profile Extraction", type: "ai_extraction", required: true, automatable: true },
      ],
    };
  }

  private createPastExperienceTemplate(): ComprehensiveTemplate {
    return {
      id: "past-experience-upload",
      name: "Past Experience / Project References",
      category: "tender_submission",
      subcategory: "company_docs",
      description: "Upload past project experience and references for tender submissions",
      icon: "History",
      fields: [
        {
          id: "projects",
          name: "projects",
          label: "Project References",
          type: "table",
          required: true,
          extractionHints: ["projects", "experience", "references", "contracts"],
          aiEnhanced: true,
        },
        {
          id: "totalContractValue",
          name: "totalContractValue",
          label: "Total Contract Value (5 years)",
          type: "currency",
          required: false,
          extractionHints: ["total value", "contract value"],
          aiEnhanced: true,
        },
        {
          id: "completionCertificates",
          name: "completionCertificates",
          label: "Completion Certificates Available",
          type: "boolean",
          required: true,
          extractionHints: ["completion certificate", "project completion"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract past experience information:
        For each project:
        1. Project name and description
        2. Client/organization name
        3. Contract value
        4. Project duration (start and end dates)
        5. Scope of work
        6. Project status (completed/ongoing)
        7. Contact person for reference
        
        Summary:
        - Total number of similar projects
        - Total contract value in last 5 years
        - Completion certificates available`,
      validationRules: [
        { field: "projects", rule: "required", parameters: { minItems: 3 }, errorMessage: "Minimum 3 project references required" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Experience Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Reference Validation", type: "validation", required: false, automatable: false },
      ],
    };
  }

  private createTechnicalComplianceTemplate(): ComprehensiveTemplate {
    return {
      id: "technical-compliance-upload",
      name: "Technical Compliance Statement",
      category: "tender_submission",
      subcategory: "compliance",
      description: "Upload technical compliance statements and specification sheets",
      icon: "CheckSquare",
      fields: [
        {
          id: "tenderId",
          name: "tenderId",
          label: "Related Tender",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["tender"],
          aiEnhanced: false,
        },
        {
          id: "complianceItems",
          name: "complianceItems",
          label: "Compliance Matrix",
          type: "table",
          required: true,
          extractionHints: ["compliance", "requirements", "specifications", "conform"],
          aiEnhanced: true,
        },
        {
          id: "deviations",
          name: "deviations",
          label: "Deviations/Exceptions",
          type: "table",
          required: false,
          extractionHints: ["deviation", "exception", "non-compliance", "alternative"],
          aiEnhanced: true,
        },
        {
          id: "compliancePercentage",
          name: "compliancePercentage",
          label: "Overall Compliance %",
          type: "number",
          required: false,
          extractionHints: ["compliance percentage", "conformance"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract technical compliance information:
        1. For each requirement:
           - Requirement ID/number
           - Requirement description
           - Compliance status (Comply/Partially Comply/Non-Comply)
           - Offered specification
           - Comments/clarifications
        2. List of deviations with justifications
        3. Alternative solutions proposed
        4. Overall compliance percentage`,
      validationRules: [],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Compliance Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "match", name: "Requirement Matching", type: "validation", required: true, automatable: true },
      ],
    };
  }


  // =============================================================================
  // REGISTRATION PROCESS DOCUMENTS
  // =============================================================================

  private createCommercialRegistrationTemplate(): ComprehensiveTemplate {
    return {
      id: "commercial-registration-upload",
      name: "Commercial Registration (CR)",
      category: "registration",
      subcategory: "legal",
      description: "Upload commercial registration certificate (السجل التجاري)",
      icon: "FileText",
      fields: [
        {
          id: "crNumber",
          name: "crNumber",
          label: "CR Number",
          labelAr: "رقم السجل التجاري",
          type: "text",
          required: true,
          validation: { pattern: "^[0-9]{10}$" },
          extractionHints: ["CR number", "registration number", "رقم السجل التجاري"],
          aiEnhanced: true,
        },
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          labelAr: "اسم الشركة",
          type: "text",
          required: true,
          extractionHints: ["company name", "اسم المنشأة", "الاسم التجاري"],
          aiEnhanced: true,
        },
        {
          id: "companyNameAr",
          name: "companyNameAr",
          label: "Company Name (Arabic)",
          type: "text",
          required: true,
          extractionHints: ["الاسم التجاري", "اسم الشركة"],
          aiEnhanced: true,
        },
        {
          id: "legalForm",
          name: "legalForm",
          label: "Legal Form",
          type: "select",
          required: true,
          options: ["LLC", "Joint Stock", "Sole Proprietorship", "Partnership", "Branch of Foreign Company"],
          extractionHints: ["legal form", "company type", "الشكل القانوني"],
          aiEnhanced: true,
        },
        {
          id: "capital",
          name: "capital",
          label: "Paid-up Capital",
          type: "currency",
          required: true,
          extractionHints: ["capital", "رأس المال"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          labelAr: "تاريخ الإصدار",
          type: "date",
          required: true,
          extractionHints: ["issue date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          labelAr: "تاريخ الانتهاء",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "activities",
          name: "activities",
          label: "Business Activities",
          type: "multiselect",
          required: true,
          options: ["Import/Export", "Wholesale", "Retail", "Manufacturing", "Services", "Contracting", "Healthcare"],
          extractionHints: ["activities", "الأنشطة", "النشاط"],
          aiEnhanced: true,
        },
        {
          id: "city",
          name: "city",
          label: "City",
          type: "text",
          required: true,
          extractionHints: ["city", "المدينة"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract Commercial Registration (CR) information (Arabic/English):
        1. CR number (10 digits)
        2. Company name (Arabic and English)
        3. Legal form (LLC, Joint Stock, etc.)
        4. Paid-up capital
        5. Issue date (Hijri and Gregorian)
        6. Expiry date (Hijri and Gregorian)
        7. Business activities listed
        8. Registered city/location
        9. Owner/manager names`,
      validationRules: [
        { field: "crNumber", rule: "format", parameters: { pattern: "^[0-9]{10}$" }, errorMessage: "CR must be 10 digits" },
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "CR must be valid for at least 30 days" },
      ],
      autoPopulationRules: [
        { sourceField: "companyName", targetEntity: "supplier", targetField: "name" },
        { sourceField: "crNumber", targetEntity: "supplier", targetField: "code" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "CR Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "CR Validation", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Expiry Alert Setup", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createTaxCertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "vat-certificate-upload",
      name: "VAT Registration Certificate",
      category: "registration",
      subcategory: "tax",
      description: "Upload VAT registration certificate (شهادة التسجيل في ضريبة القيمة المضافة)",
      icon: "Receipt",
      fields: [
        {
          id: "vatNumber",
          name: "vatNumber",
          label: "VAT Number",
          labelAr: "الرقم الضريبي",
          type: "text",
          required: true,
          validation: { pattern: "^3[0-9]{13}3$" },
          extractionHints: ["VAT number", "TIN", "الرقم الضريبي", "رقم التسجيل الضريبي"],
          aiEnhanced: true,
        },
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          extractionHints: ["company name", "taxpayer name", "اسم المكلف"],
          aiEnhanced: true,
        },
        {
          id: "registrationDate",
          name: "registrationDate",
          label: "Registration Date",
          type: "date",
          required: true,
          extractionHints: ["registration date", "تاريخ التسجيل"],
          aiEnhanced: true,
        },
        {
          id: "status",
          name: "status",
          label: "Registration Status",
          type: "select",
          required: true,
          options: ["Active", "Suspended", "Cancelled"],
          extractionHints: ["status", "الحالة"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract VAT certificate information:
        1. VAT registration number (15 digits, starts and ends with 3)
        2. Company/taxpayer name
        3. Registration date
        4. Registration status
        5. Business address`,
      validationRules: [
        { field: "vatNumber", rule: "format", parameters: { pattern: "^3[0-9]{13}3$" }, errorMessage: "Invalid VAT number format" },
      ],
      autoPopulationRules: [
        { sourceField: "vatNumber", targetEntity: "supplier", targetField: "vatNumber" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "VAT Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "VAT Validation", type: "validation", required: true, automatable: true },
      ],
    };
  }

  private createZakatCertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "zakat-certificate-upload",
      name: "Zakat & Tax Certificate",
      category: "registration",
      subcategory: "tax",
      description: "Upload Zakat certificate (شهادة الزكاة والدخل)",
      icon: "FileCheck",
      fields: [
        {
          id: "certificateNumber",
          name: "certificateNumber",
          label: "Certificate Number",
          labelAr: "رقم الشهادة",
          type: "text",
          required: true,
          extractionHints: ["certificate number", "رقم الشهادة"],
          aiEnhanced: true,
        },
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          extractionHints: ["company name", "اسم المكلف"],
          aiEnhanced: true,
        },
        {
          id: "taxNumber",
          name: "taxNumber",
          label: "Tax Number",
          type: "text",
          required: true,
          extractionHints: ["tax number", "الرقم المميز"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "تاريخ الانتهاء", "صالحة حتى"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract Zakat certificate information:
        1. Certificate number
        2. Company name
        3. Tax/distinctive number
        4. Issue date (Hijri and Gregorian)
        5. Expiry date (Hijri and Gregorian)
        6. Verification QR code data if present`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "Zakat certificate must be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Zakat Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validity Check", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Expiry Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createGOSICertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "gosi-certificate-upload",
      name: "GOSI Certificate",
      category: "registration",
      subcategory: "compliance",
      description: "Upload GOSI certificate (شهادة التأمينات الاجتماعية)",
      icon: "Users",
      fields: [
        {
          id: "certificateNumber",
          name: "certificateNumber",
          label: "Certificate Number",
          type: "text",
          required: true,
          extractionHints: ["certificate number", "رقم الشهادة"],
          aiEnhanced: true,
        },
        {
          id: "establishmentNumber",
          name: "establishmentNumber",
          label: "Establishment Number",
          labelAr: "رقم المنشأة",
          type: "text",
          required: true,
          extractionHints: ["establishment number", "رقم المنشأة"],
          aiEnhanced: true,
        },
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          extractionHints: ["company name", "اسم المنشأة"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "complianceStatus",
          name: "complianceStatus",
          label: "Compliance Status",
          type: "select",
          required: true,
          options: ["Compliant", "Non-Compliant", "Pending"],
          extractionHints: ["status", "compliant", "الحالة"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract GOSI certificate information:
        1. Certificate number
        2. Establishment/subscription number
        3. Company name
        4. Issue date
        5. Expiry date
        6. Compliance status
        7. Number of registered employees if shown`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "GOSI certificate must be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "GOSI Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validity Check", type: "validation", required: true, automatable: true },
      ],
    };
  }


  private createBankGuaranteeTemplate(): ComprehensiveTemplate {
    return {
      id: "bank-guarantee-upload",
      name: "Bank Guarantee",
      category: "registration",
      subcategory: "financial",
      description: "Upload bank guarantees for vendor registration",
      icon: "Landmark",
      fields: [
        {
          id: "guaranteeNumber",
          name: "guaranteeNumber",
          label: "Guarantee Number",
          type: "text",
          required: true,
          extractionHints: ["guarantee number", "LG number", "رقم الضمان"],
          aiEnhanced: true,
        },
        {
          id: "bankName",
          name: "bankName",
          label: "Issuing Bank",
          type: "text",
          required: true,
          extractionHints: ["bank name", "اسم البنك"],
          aiEnhanced: true,
        },
        {
          id: "bankBranch",
          name: "bankBranch",
          label: "Bank Branch",
          type: "text",
          required: false,
          extractionHints: ["branch", "الفرع"],
          aiEnhanced: true,
        },
        {
          id: "amount",
          name: "amount",
          label: "Guarantee Amount",
          type: "currency",
          required: true,
          extractionHints: ["amount", "value", "المبلغ"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD"],
          extractionHints: ["currency", "SAR", "ريال"],
          aiEnhanced: true,
        },
        {
          id: "beneficiary",
          name: "beneficiary",
          label: "Beneficiary",
          type: "text",
          required: true,
          extractionHints: ["beneficiary", "in favor of", "المستفيد"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "guaranteeType",
          name: "guaranteeType",
          label: "Guarantee Type",
          type: "select",
          required: true,
          options: ["Bid Bond", "Performance Bond", "Advance Payment", "Retention", "Credit Facility"],
          extractionHints: ["type", "guarantee type", "نوع الضمان"],
          aiEnhanced: true,
        },
        {
          id: "purpose",
          name: "purpose",
          label: "Purpose",
          type: "textarea",
          required: false,
          extractionHints: ["purpose", "for", "الغرض"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract bank guarantee information:
        1. Guarantee reference number
        2. Issuing bank name and branch
        3. Guarantee amount and currency
        4. Beneficiary name
        5. Issue date
        6. Expiry date
        7. Type of guarantee
        8. Purpose/related contract
        9. Terms and conditions`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "Guarantee must be valid for at least 90 days" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Guarantee Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validity Check", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Expiry Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createInsuranceCertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "insurance-certificate-upload",
      name: "Insurance Certificate",
      category: "registration",
      subcategory: "compliance",
      description: "Upload insurance certificates (professional liability, general liability, etc.)",
      icon: "Shield",
      fields: [
        {
          id: "policyNumber",
          name: "policyNumber",
          label: "Policy Number",
          type: "text",
          required: true,
          extractionHints: ["policy number", "رقم الوثيقة"],
          aiEnhanced: true,
        },
        {
          id: "insuranceCompany",
          name: "insuranceCompany",
          label: "Insurance Company",
          type: "text",
          required: true,
          extractionHints: ["insurance company", "insurer", "شركة التأمين"],
          aiEnhanced: true,
        },
        {
          id: "insuredParty",
          name: "insuredParty",
          label: "Insured Party",
          type: "text",
          required: true,
          extractionHints: ["insured", "policy holder", "المؤمن له"],
          aiEnhanced: true,
        },
        {
          id: "insuranceType",
          name: "insuranceType",
          label: "Insurance Type",
          type: "multiselect",
          required: true,
          options: ["General Liability", "Professional Liability", "Product Liability", "Workers Compensation", "Property Insurance", "Medical Malpractice"],
          extractionHints: ["type", "coverage", "نوع التأمين"],
          aiEnhanced: true,
        },
        {
          id: "coverageAmount",
          name: "coverageAmount",
          label: "Coverage Amount",
          type: "currency",
          required: true,
          extractionHints: ["coverage", "limit", "sum insured", "مبلغ التغطية"],
          aiEnhanced: true,
        },
        {
          id: "startDate",
          name: "startDate",
          label: "Coverage Start Date",
          type: "date",
          required: true,
          extractionHints: ["start date", "effective date", "تاريخ البدء"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Coverage End Date",
          type: "date",
          required: true,
          extractionHints: ["end date", "expiry date", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "deductible",
          name: "deductible",
          label: "Deductible Amount",
          type: "currency",
          required: false,
          extractionHints: ["deductible", "excess", "التحمل"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract insurance certificate information:
        1. Policy number
        2. Insurance company name
        3. Insured party (company name)
        4. Type of insurance coverage
        5. Coverage amount/limit
        6. Policy period (start and end dates)
        7. Deductible amount
        8. Special conditions or exclusions`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "Insurance must be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Insurance Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Coverage Validation", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createAuthorizedSignatoryTemplate(): ComprehensiveTemplate {
    return {
      id: "authorized-signatory-upload",
      name: "Authorized Signatory Letter",
      category: "registration",
      subcategory: "legal",
      description: "Upload authorized signatory letters and board resolutions",
      icon: "Pen",
      fields: [
        {
          id: "companyName",
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          extractionHints: ["company name", "اسم الشركة"],
          aiEnhanced: true,
        },
        {
          id: "signatories",
          name: "signatories",
          label: "Authorized Signatories",
          type: "table",
          required: true,
          extractionHints: ["signatory", "authorized", "المفوض بالتوقيع"],
          aiEnhanced: true,
        },
        {
          id: "authorizationScope",
          name: "authorizationScope",
          label: "Authorization Scope",
          type: "multiselect",
          required: true,
          options: ["Full Authority", "Contracts Only", "Financial Transactions", "Tender Submissions", "Banking", "Limited Authority"],
          extractionHints: ["authority", "scope", "صلاحيات"],
          aiEnhanced: true,
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
          extractionHints: ["effective date", "from", "تاريخ السريان"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: false,
          extractionHints: ["expiry", "until", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "resolutionNumber",
          name: "resolutionNumber",
          label: "Board Resolution Number",
          type: "text",
          required: false,
          extractionHints: ["resolution number", "رقم القرار"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract authorized signatory information:
        1. Company name
        2. For each signatory:
           - Full name
           - Position/title
           - ID/Iqama number
           - Signature specimen
        3. Scope of authorization
        4. Effective date
        5. Expiry date (if any)
        6. Board resolution reference`,
      validationRules: [
        { field: "signatories", rule: "required", parameters: { minItems: 1 }, errorMessage: "At least one signatory required" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Signatory Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
      ],
    };
  }

  private createSaudiPostAddressTemplate(): ComprehensiveTemplate {
    return {
      id: "saudi-post-address-upload",
      name: "Saudi Post National Address",
      category: "registration",
      subcategory: "address",
      description: "Upload Saudi Post national address certificate (العنوان الوطني)",
      icon: "MapPin",
      fields: [
        {
          id: "shortAddress",
          name: "shortAddress",
          label: "Short Address",
          labelAr: "العنوان المختصر",
          type: "text",
          required: true,
          extractionHints: ["short address", "العنوان المختصر"],
          aiEnhanced: true,
        },
        {
          id: "buildingNumber",
          name: "buildingNumber",
          label: "Building Number",
          type: "text",
          required: true,
          extractionHints: ["building number", "رقم المبنى"],
          aiEnhanced: true,
        },
        {
          id: "streetName",
          name: "streetName",
          label: "Street Name",
          type: "text",
          required: true,
          extractionHints: ["street", "اسم الشارع"],
          aiEnhanced: true,
        },
        {
          id: "district",
          name: "district",
          label: "District",
          type: "text",
          required: true,
          extractionHints: ["district", "الحي"],
          aiEnhanced: true,
        },
        {
          id: "city",
          name: "city",
          label: "City",
          type: "text",
          required: true,
          extractionHints: ["city", "المدينة"],
          aiEnhanced: true,
        },
        {
          id: "postalCode",
          name: "postalCode",
          label: "Postal Code",
          type: "text",
          required: true,
          validation: { pattern: "^[0-9]{5}$" },
          extractionHints: ["postal code", "zip", "الرمز البريدي"],
          aiEnhanced: true,
        },
        {
          id: "additionalNumber",
          name: "additionalNumber",
          label: "Additional Number",
          type: "text",
          required: true,
          extractionHints: ["additional number", "الرقم الإضافي"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract Saudi Post national address:
        1. Short address code
        2. Building number
        3. Street name
        4. District/neighborhood
        5. City
        6. Postal code (5 digits)
        7. Additional number (4 digits)
        8. Unit number if applicable`,
      validationRules: [
        { field: "postalCode", rule: "format", parameters: { pattern: "^[0-9]{5}$" }, errorMessage: "Postal code must be 5 digits" },
      ],
      autoPopulationRules: [
        { sourceField: "shortAddress", targetEntity: "supplier", targetField: "nationalAddress" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Address Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Address Validation", type: "validation", required: true, automatable: true },
      ],
    };
  }


  // =============================================================================
  // SUPPLIER COMPLIANCE DOCUMENTS
  // =============================================================================

  private createSupplierContractTemplate(): ComprehensiveTemplate {
    return {
      id: "supplier-contract-upload",
      name: "Supplier Contract / Agreement",
      category: "supplier_compliance",
      subcategory: "contracts",
      description: "Upload supplier contracts and agreements",
      icon: "FileSignature",
      fields: [
        {
          id: "contractNumber",
          name: "contractNumber",
          label: "Contract Number",
          type: "text",
          required: true,
          extractionHints: ["contract number", "agreement number", "رقم العقد"],
          aiEnhanced: true,
        },
        {
          id: "contractTitle",
          name: "contractTitle",
          label: "Contract Title",
          type: "text",
          required: true,
          extractionHints: ["title", "subject", "عنوان العقد"],
          aiEnhanced: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
          extractionHints: ["supplier", "vendor", "contractor"],
          aiEnhanced: false,
        },
        {
          id: "contractType",
          name: "contractType",
          label: "Contract Type",
          type: "select",
          required: true,
          options: ["Supply Agreement", "Distribution Agreement", "Service Contract", "Maintenance Contract", "Framework Agreement", "Exclusive Distribution"],
          extractionHints: ["contract type", "agreement type", "نوع العقد"],
          aiEnhanced: true,
        },
        {
          id: "startDate",
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          extractionHints: ["start date", "effective date", "commencement", "تاريخ البدء"],
          aiEnhanced: true,
        },
        {
          id: "endDate",
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          extractionHints: ["end date", "expiry date", "termination", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "contractValue",
          name: "contractValue",
          label: "Contract Value",
          type: "currency",
          required: false,
          extractionHints: ["contract value", "total value", "قيمة العقد"],
          aiEnhanced: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["SAR", "USD", "EUR"],
          extractionHints: ["currency"],
          aiEnhanced: true,
        },
        {
          id: "autoRenewal",
          name: "autoRenewal",
          label: "Auto Renewal",
          type: "boolean",
          required: true,
          extractionHints: ["auto renewal", "automatic renewal", "تجديد تلقائي"],
          aiEnhanced: true,
        },
        {
          id: "noticePeriod",
          name: "noticePeriod",
          label: "Notice Period (days)",
          type: "number",
          required: false,
          extractionHints: ["notice period", "termination notice", "فترة الإشعار"],
          aiEnhanced: true,
        },
        {
          id: "paymentTerms",
          name: "paymentTerms",
          label: "Payment Terms",
          type: "text",
          required: false,
          extractionHints: ["payment terms", "شروط الدفع"],
          aiEnhanced: true,
        },
        {
          id: "territory",
          name: "territory",
          label: "Territory/Region",
          type: "multiselect",
          required: false,
          options: ["Saudi Arabia", "GCC", "Middle East", "Worldwide"],
          extractionHints: ["territory", "region", "المنطقة"],
          aiEnhanced: true,
        },
        {
          id: "productCategories",
          name: "productCategories",
          label: "Product Categories Covered",
          type: "multiselect",
          required: true,
          options: ["Medical Equipment", "Consumables", "Pharmaceuticals", "Services", "All Products"],
          extractionHints: ["products", "categories", "المنتجات"],
          aiEnhanced: true,
        },
        {
          id: "exclusivity",
          name: "exclusivity",
          label: "Exclusivity",
          type: "select",
          required: true,
          options: ["Exclusive", "Non-Exclusive", "Semi-Exclusive"],
          extractionHints: ["exclusive", "exclusivity", "حصري"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract supplier contract information:
        1. Contract reference number
        2. Contract title/subject
        3. Parties involved (supplier and buyer)
        4. Contract type (supply, distribution, service)
        5. Contract period (start and end dates)
        6. Contract value and currency
        7. Auto-renewal clause
        8. Notice period for termination
        9. Payment terms
        10. Territory/geographic scope
        11. Products/services covered
        12. Exclusivity terms
        13. Key obligations of each party`,
      validationRules: [
        { field: "endDate", rule: "business_logic", parameters: { mustBeAfter: "startDate" }, errorMessage: "End date must be after start date" },
        { field: "endDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "Contract should have remaining validity" },
      ],
      autoPopulationRules: [
        { sourceField: "contractNumber", targetEntity: "contract", targetField: "contractNumber" },
      ],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Contract Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Contract Validation", type: "validation", required: true, automatable: true },
        { id: "legal_review", name: "Legal Review", type: "approval", required: true, assignedRole: "legal_manager", automatable: false },
        { id: "expiry_alert", name: "Expiry Alert Setup", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createLetterOfAuthorizationTemplate(): ComprehensiveTemplate {
    return {
      id: "loa-upload",
      name: "Letter of Authorization (LOA)",
      category: "supplier_compliance",
      subcategory: "authorization",
      description: "Upload manufacturer letter of authorization for distribution/representation",
      icon: "Award",
      fields: [
        {
          id: "loaNumber",
          name: "loaNumber",
          label: "LOA Reference Number",
          type: "text",
          required: false,
          extractionHints: ["reference", "LOA number", "letter number"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerName",
          name: "manufacturerName",
          label: "Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["manufacturer", "principal", "المصنع"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerCountry",
          name: "manufacturerCountry",
          label: "Manufacturer Country",
          type: "text",
          required: true,
          extractionHints: ["country", "origin", "بلد المصنع"],
          aiEnhanced: true,
        },
        {
          id: "authorizedDistributor",
          name: "authorizedDistributor",
          label: "Authorized Distributor",
          type: "text",
          required: true,
          extractionHints: ["distributor", "authorized", "agent", "الموزع المعتمد"],
          aiEnhanced: true,
        },
        {
          id: "authorizationType",
          name: "authorizationType",
          label: "Authorization Type",
          type: "select",
          required: true,
          options: ["Exclusive Distributor", "Non-Exclusive Distributor", "Authorized Agent", "Authorized Reseller", "Service Provider"],
          extractionHints: ["type", "authorization type", "exclusive", "non-exclusive"],
          aiEnhanced: true,
        },
        {
          id: "territory",
          name: "territory",
          label: "Territory",
          type: "multiselect",
          required: true,
          options: ["Saudi Arabia", "GCC", "Middle East", "MENA", "Worldwide"],
          extractionHints: ["territory", "region", "country", "المنطقة"],
          aiEnhanced: true,
        },
        {
          id: "productLines",
          name: "productLines",
          label: "Product Lines/Brands",
          type: "table",
          required: true,
          extractionHints: ["products", "brands", "product lines", "المنتجات"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "signatoryName",
          name: "signatoryName",
          label: "Signatory Name",
          type: "text",
          required: false,
          extractionHints: ["signed by", "signatory", "الموقع"],
          aiEnhanced: true,
        },
        {
          id: "signatoryTitle",
          name: "signatoryTitle",
          label: "Signatory Title",
          type: "text",
          required: false,
          extractionHints: ["title", "position", "المنصب"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract Letter of Authorization (LOA) information:
        1. LOA reference number (if any)
        2. Manufacturer/Principal details:
           - Company name
           - Country of origin
           - Contact information
        3. Authorized distributor/agent name
        4. Type of authorization (exclusive/non-exclusive)
        5. Territory/geographic coverage
        6. Product lines and brands covered
        7. Issue date
        8. Expiry date
        9. Signatory details (name and title)
        10. Any special conditions or limitations`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "LOA should be valid for at least 90 days" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "LOA Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "verify", name: "Manufacturer Verification", type: "approval", required: false, assignedRole: "procurement_manager", automatable: false },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createMOCILetterTemplate(): ComprehensiveTemplate {
    return {
      id: "moci-letter-upload",
      name: "MOCI Letter / Agency Registration",
      category: "supplier_compliance",
      subcategory: "authorization",
      description: "Upload Ministry of Commerce agency registration letter",
      icon: "Building2",
      fields: [
        {
          id: "registrationNumber",
          name: "registrationNumber",
          label: "Registration Number",
          labelAr: "رقم التسجيل",
          type: "text",
          required: true,
          extractionHints: ["registration number", "رقم التسجيل", "رقم السجل"],
          aiEnhanced: true,
        },
        {
          id: "agentName",
          name: "agentName",
          label: "Agent/Distributor Name",
          type: "text",
          required: true,
          extractionHints: ["agent", "distributor", "الوكيل"],
          aiEnhanced: true,
        },
        {
          id: "principalName",
          name: "principalName",
          label: "Principal/Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["principal", "manufacturer", "المصنع"],
          aiEnhanced: true,
        },
        {
          id: "principalCountry",
          name: "principalCountry",
          label: "Principal Country",
          type: "text",
          required: true,
          extractionHints: ["country", "بلد المصنع"],
          aiEnhanced: true,
        },
        {
          id: "agencyType",
          name: "agencyType",
          label: "Agency Type",
          type: "select",
          required: true,
          options: ["Commercial Agency", "Distribution Agreement", "Franchise"],
          extractionHints: ["agency type", "نوع الوكالة"],
          aiEnhanced: true,
        },
        {
          id: "productDescription",
          name: "productDescription",
          label: "Products/Services Covered",
          type: "textarea",
          required: true,
          extractionHints: ["products", "goods", "المنتجات"],
          aiEnhanced: true,
        },
        {
          id: "registrationDate",
          name: "registrationDate",
          label: "Registration Date",
          type: "date",
          required: true,
          extractionHints: ["registration date", "تاريخ التسجيل"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract MOCI agency registration information:
        1. Agency registration number
        2. Agent/distributor company name
        3. Principal/manufacturer name and country
        4. Type of agency registration
        5. Products and services covered
        6. Registration date
        7. Expiry date
        8. Geographic coverage within Saudi Arabia`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 30 }, errorMessage: "MOCI registration must be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "MOCI Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }


  private createFDACertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "fda-certificate-upload",
      name: "FDA Certificate / 510(k) Clearance",
      category: "supplier_compliance",
      subcategory: "regulatory",
      description: "Upload FDA certificates, 510(k) clearances, and approval letters",
      icon: "BadgeCheck",
      fields: [
        {
          id: "fdaNumber",
          name: "fdaNumber",
          label: "FDA Registration/510(k) Number",
          type: "text",
          required: true,
          extractionHints: ["510(k)", "K number", "FDA number", "registration number"],
          aiEnhanced: true,
        },
        {
          id: "certificateType",
          name: "certificateType",
          label: "Certificate Type",
          type: "select",
          required: true,
          options: ["510(k) Clearance", "PMA Approval", "De Novo", "FDA Registration", "Establishment Registration", "Device Listing"],
          extractionHints: ["510(k)", "PMA", "clearance type"],
          aiEnhanced: true,
        },
        {
          id: "deviceName",
          name: "deviceName",
          label: "Device/Product Name",
          type: "text",
          required: true,
          extractionHints: ["device name", "product name", "trade name"],
          aiEnhanced: true,
        },
        {
          id: "deviceClass",
          name: "deviceClass",
          label: "Device Class",
          type: "select",
          required: true,
          options: ["Class I", "Class II", "Class III"],
          extractionHints: ["class I", "class II", "class III", "device class"],
          aiEnhanced: true,
        },
        {
          id: "productCode",
          name: "productCode",
          label: "Product Code",
          type: "text",
          required: false,
          extractionHints: ["product code", "regulation number"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerName",
          name: "manufacturerName",
          label: "Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["manufacturer", "applicant", "company name"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerAddress",
          name: "manufacturerAddress",
          label: "Manufacturer Address",
          type: "textarea",
          required: false,
          extractionHints: ["address", "location"],
          aiEnhanced: true,
        },
        {
          id: "clearanceDate",
          name: "clearanceDate",
          label: "Clearance/Approval Date",
          type: "date",
          required: true,
          extractionHints: ["clearance date", "approval date", "decision date"],
          aiEnhanced: true,
        },
        {
          id: "predicateDevice",
          name: "predicateDevice",
          label: "Predicate Device (if 510k)",
          type: "text",
          required: false,
          extractionHints: ["predicate", "substantial equivalence"],
          aiEnhanced: true,
        },
        {
          id: "intendedUse",
          name: "intendedUse",
          label: "Intended Use",
          type: "textarea",
          required: true,
          extractionHints: ["intended use", "indication", "purpose"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract FDA certificate/clearance information:
        1. FDA registration or 510(k) number
        2. Type of clearance (510(k), PMA, De Novo)
        3. Device/product name and trade name
        4. Device classification (Class I, II, or III)
        5. Product code and regulation number
        6. Manufacturer details (name and address)
        7. Clearance/approval date
        8. Predicate device information (for 510k)
        9. Intended use statement
        10. Any special conditions or limitations`,
      validationRules: [
        { field: "fdaNumber", rule: "required", parameters: {}, errorMessage: "FDA number is required" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "FDA Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "verify", name: "FDA Database Verification", type: "approval", required: false, assignedRole: "regulatory_manager", automatable: false },
      ],
    };
  }

  private createCEMarkingTemplate(): ComprehensiveTemplate {
    return {
      id: "ce-marking-upload",
      name: "CE Marking Certificate",
      category: "supplier_compliance",
      subcategory: "regulatory",
      description: "Upload CE marking certificates and EC declarations of conformity",
      icon: "Shield",
      fields: [
        {
          id: "certificateNumber",
          name: "certificateNumber",
          label: "Certificate Number",
          type: "text",
          required: true,
          extractionHints: ["certificate number", "EC certificate", "رقم الشهادة"],
          aiEnhanced: true,
        },
        {
          id: "certificateType",
          name: "certificateType",
          label: "Certificate Type",
          type: "select",
          required: true,
          options: ["EC Certificate", "Declaration of Conformity", "Technical File Review", "Type Examination Certificate"],
          extractionHints: ["certificate type", "EC", "declaration"],
          aiEnhanced: true,
        },
        {
          id: "notifiedBody",
          name: "notifiedBody",
          label: "Notified Body",
          type: "text",
          required: true,
          extractionHints: ["notified body", "NB", "certification body"],
          aiEnhanced: true,
        },
        {
          id: "notifiedBodyNumber",
          name: "notifiedBodyNumber",
          label: "Notified Body Number",
          type: "text",
          required: true,
          extractionHints: ["NB number", "notified body number"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerName",
          name: "manufacturerName",
          label: "Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["manufacturer", "company name"],
          aiEnhanced: true,
        },
        {
          id: "productName",
          name: "productName",
          label: "Product/Device Name",
          type: "text",
          required: true,
          extractionHints: ["product name", "device name"],
          aiEnhanced: true,
        },
        {
          id: "productModels",
          name: "productModels",
          label: "Models Covered",
          type: "table",
          required: true,
          extractionHints: ["models", "variants", "product range"],
          aiEnhanced: true,
        },
        {
          id: "directive",
          name: "directive",
          label: "Applicable Directive/Regulation",
          type: "multiselect",
          required: true,
          options: ["MDR 2017/745", "MDD 93/42/EEC", "IVDR 2017/746", "IVDD 98/79/EC", "LVD 2014/35/EU", "EMC 2014/30/EU"],
          extractionHints: ["directive", "regulation", "MDR", "MDD", "IVDR"],
          aiEnhanced: true,
        },
        {
          id: "classification",
          name: "classification",
          label: "Device Classification",
          type: "select",
          required: true,
          options: ["Class I", "Class IIa", "Class IIb", "Class III", "Class A", "Class B", "Class C", "Class D"],
          extractionHints: ["class", "classification", "risk class"],
          aiEnhanced: true,
        },
        {
          id: "annexApplied",
          name: "annexApplied",
          label: "Conformity Assessment Annex",
          type: "multiselect",
          required: false,
          options: ["Annex II", "Annex III", "Annex IV", "Annex V", "Annex VI", "Annex VII", "Annex IX", "Annex X", "Annex XI"],
          extractionHints: ["annex", "conformity assessment"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "date of issue"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "validity"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract CE marking certificate information:
        1. Certificate number
        2. Type of certificate (EC Certificate, DoC, etc.)
        3. Notified Body name and number
        4. Manufacturer name and address
        5. Product/device name
        6. Models and variants covered
        7. Applicable directive (MDR, MDD, IVDR, etc.)
        8. Device classification (I, IIa, IIb, III)
        9. Conformity assessment annexes applied
        10. Issue date and expiry date
        11. Any conditions or limitations`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "CE certificate should be valid for at least 90 days" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "CE Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "verify", name: "NB Verification", type: "approval", required: false, assignedRole: "regulatory_manager", automatable: false },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createISOCertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "iso-certificate-upload",
      name: "ISO Certificate",
      category: "supplier_compliance",
      subcategory: "quality",
      description: "Upload ISO certification documents (9001, 13485, 14001, etc.)",
      icon: "Award",
      fields: [
        {
          id: "certificateNumber",
          name: "certificateNumber",
          label: "Certificate Number",
          type: "text",
          required: true,
          extractionHints: ["certificate number", "registration number"],
          aiEnhanced: true,
        },
        {
          id: "isoStandard",
          name: "isoStandard",
          label: "ISO Standard",
          type: "multiselect",
          required: true,
          options: ["ISO 9001:2015", "ISO 13485:2016", "ISO 14001:2015", "ISO 45001:2018", "ISO 27001:2022", "ISO 22000:2018", "ISO 14971:2019"],
          extractionHints: ["ISO", "standard", "9001", "13485", "14001"],
          aiEnhanced: true,
        },
        {
          id: "certificationBody",
          name: "certificationBody",
          label: "Certification Body",
          type: "text",
          required: true,
          extractionHints: ["certification body", "certifier", "registrar", "accredited body"],
          aiEnhanced: true,
        },
        {
          id: "accreditationBody",
          name: "accreditationBody",
          label: "Accreditation Body",
          type: "text",
          required: false,
          extractionHints: ["accreditation", "UKAS", "DAkkS", "ANAB"],
          aiEnhanced: true,
        },
        {
          id: "companyName",
          name: "companyName",
          label: "Certified Organization",
          type: "text",
          required: true,
          extractionHints: ["company name", "organization", "certified to"],
          aiEnhanced: true,
        },
        {
          id: "certifiedSites",
          name: "certifiedSites",
          label: "Certified Sites/Locations",
          type: "table",
          required: false,
          extractionHints: ["sites", "locations", "addresses"],
          aiEnhanced: true,
        },
        {
          id: "scope",
          name: "scope",
          label: "Certification Scope",
          type: "textarea",
          required: true,
          extractionHints: ["scope", "activities", "products", "services"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "initial certification", "date of issue"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "certificate expiry"],
          aiEnhanced: true,
        },
        {
          id: "lastAuditDate",
          name: "lastAuditDate",
          label: "Last Audit Date",
          type: "date",
          required: false,
          extractionHints: ["audit date", "surveillance", "last audit"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract ISO certificate information:
        1. Certificate number
        2. ISO standard(s) certified (9001, 13485, etc.)
        3. Certification body name
        4. Accreditation body (if mentioned)
        5. Certified organization name
        6. Certified site locations/addresses
        7. Scope of certification
        8. Issue date
        9. Expiry date
        10. Last surveillance audit date`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "ISO certificate should be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "ISO Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }


  private createSFDACertificateTemplate(): ComprehensiveTemplate {
    return {
      id: "sfda-certificate-upload",
      name: "SFDA Certificate / Registration",
      category: "supplier_compliance",
      subcategory: "regulatory",
      description: "Upload Saudi FDA (SFDA) medical device registration and marketing authorization",
      icon: "BadgeCheck",
      fields: [
        {
          id: "sfdaNumber",
          name: "sfdaNumber",
          label: "SFDA Registration Number",
          labelAr: "رقم تسجيل الهيئة",
          type: "text",
          required: true,
          extractionHints: ["SFDA number", "registration number", "رقم التسجيل", "MDN"],
          aiEnhanced: true,
        },
        {
          id: "certificateType",
          name: "certificateType",
          label: "Certificate Type",
          type: "select",
          required: true,
          options: ["Marketing Authorization", "Device Listing", "Establishment License", "Import License", "Free Sale Certificate"],
          extractionHints: ["certificate type", "authorization type"],
          aiEnhanced: true,
        },
        {
          id: "deviceName",
          name: "deviceName",
          label: "Device/Product Name",
          type: "text",
          required: true,
          extractionHints: ["device name", "product name", "trade name", "اسم المنتج"],
          aiEnhanced: true,
        },
        {
          id: "deviceNameAr",
          name: "deviceNameAr",
          label: "Device Name (Arabic)",
          type: "text",
          required: false,
          extractionHints: ["اسم الجهاز", "الاسم بالعربية"],
          aiEnhanced: true,
        },
        {
          id: "riskClass",
          name: "riskClass",
          label: "Risk Classification",
          type: "select",
          required: true,
          options: ["Class A", "Class B", "Class C", "Class D"],
          extractionHints: ["class", "risk class", "classification", "الفئة"],
          aiEnhanced: true,
        },
        {
          id: "gmdnCode",
          name: "gmdnCode",
          label: "GMDN Code",
          type: "text",
          required: false,
          extractionHints: ["GMDN", "nomenclature code"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerName",
          name: "manufacturerName",
          label: "Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["manufacturer", "المصنع"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerCountry",
          name: "manufacturerCountry",
          label: "Country of Origin",
          type: "text",
          required: true,
          extractionHints: ["country", "origin", "بلد المنشأ"],
          aiEnhanced: true,
        },
        {
          id: "localAgent",
          name: "localAgent",
          label: "Local Authorized Representative",
          type: "text",
          required: true,
          extractionHints: ["local agent", "authorized representative", "الوكيل المحلي"],
          aiEnhanced: true,
        },
        {
          id: "issueDate",
          name: "issueDate",
          label: "Issue Date",
          type: "date",
          required: true,
          extractionHints: ["issue date", "تاريخ الإصدار"],
          aiEnhanced: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
          extractionHints: ["expiry date", "valid until", "تاريخ الانتهاء"],
          aiEnhanced: true,
        },
        {
          id: "intendedUse",
          name: "intendedUse",
          label: "Intended Use",
          type: "textarea",
          required: false,
          extractionHints: ["intended use", "indication", "الاستخدام المقصود"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract SFDA registration information (Arabic and English):
        1. SFDA registration/MDN number
        2. Type of registration (marketing authorization, listing, etc.)
        3. Device/product name (Arabic and English)
        4. Risk classification (A, B, C, D)
        5. GMDN code if available
        6. Manufacturer name and country
        7. Local authorized representative
        8. Issue date and expiry date
        9. Intended use/indication
        10. Any conditions or limitations`,
      validationRules: [
        { field: "expiryDate", rule: "expiry_check", parameters: { minDaysValid: 90 }, errorMessage: "SFDA registration should be valid" },
      ],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "SFDA Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
        { id: "verify", name: "SFDA Portal Verification", type: "approval", required: false, assignedRole: "regulatory_manager", automatable: false },
        { id: "expiry_alert", name: "Renewal Alert", type: "notification", required: true, automatable: true },
      ],
    };
  }

  private createManufacturerAuthorizationTemplate(): ComprehensiveTemplate {
    return {
      id: "manufacturer-authorization-upload",
      name: "Manufacturer Authorization Letter",
      category: "supplier_compliance",
      subcategory: "authorization",
      description: "Upload manufacturer authorization letters for tender/bid submissions",
      icon: "FileSignature",
      fields: [
        {
          id: "referenceNumber",
          name: "referenceNumber",
          label: "Reference Number",
          type: "text",
          required: false,
          extractionHints: ["reference", "letter number"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerName",
          name: "manufacturerName",
          label: "Manufacturer Name",
          type: "text",
          required: true,
          extractionHints: ["manufacturer", "company name", "المصنع"],
          aiEnhanced: true,
        },
        {
          id: "manufacturerCountry",
          name: "manufacturerCountry",
          label: "Manufacturer Country",
          type: "text",
          required: true,
          extractionHints: ["country", "بلد المصنع"],
          aiEnhanced: true,
        },
        {
          id: "authorizedCompany",
          name: "authorizedCompany",
          label: "Authorized Company",
          type: "text",
          required: true,
          extractionHints: ["authorized", "distributor", "agent", "الشركة المفوضة"],
          aiEnhanced: true,
        },
        {
          id: "authorizationPurpose",
          name: "authorizationPurpose",
          label: "Authorization Purpose",
          type: "select",
          required: true,
          options: ["Tender Participation", "General Distribution", "Service Provision", "After-Sales Support", "Project Specific"],
          extractionHints: ["purpose", "authorization for"],
          aiEnhanced: true,
        },
        {
          id: "tenderReference",
          name: "tenderReference",
          label: "Tender/Project Reference",
          type: "text",
          required: false,
          extractionHints: ["tender", "project", "RFP", "المناقصة"],
          aiEnhanced: true,
        },
        {
          id: "customerName",
          name: "customerName",
          label: "End Customer Name",
          type: "text",
          required: false,
          extractionHints: ["customer", "client", "العميل"],
          aiEnhanced: true,
        },
        {
          id: "products",
          name: "products",
          label: "Products Authorized",
          type: "table",
          required: true,
          extractionHints: ["products", "equipment", "models", "المنتجات"],
          aiEnhanced: true,
        },
        {
          id: "letterDate",
          name: "letterDate",
          label: "Letter Date",
          type: "date",
          required: true,
          extractionHints: ["date", "التاريخ"],
          aiEnhanced: true,
        },
        {
          id: "validUntil",
          name: "validUntil",
          label: "Valid Until",
          type: "date",
          required: false,
          extractionHints: ["valid until", "expiry", "صالح حتى"],
          aiEnhanced: true,
        },
        {
          id: "signatoryName",
          name: "signatoryName",
          label: "Signatory Name",
          type: "text",
          required: true,
          extractionHints: ["signed by", "signatory", "الموقع"],
          aiEnhanced: true,
        },
        {
          id: "signatoryTitle",
          name: "signatoryTitle",
          label: "Signatory Title",
          type: "text",
          required: true,
          extractionHints: ["title", "position", "المنصب"],
          aiEnhanced: true,
        },
      ],
      aiExtractionPrompt: `Extract manufacturer authorization letter information:
        1. Letter reference number
        2. Manufacturer details (name, country, address)
        3. Authorized company name
        4. Purpose of authorization
        5. Tender/project reference if specific
        6. End customer name if mentioned
        7. Products authorized (models, descriptions)
        8. Letter date
        9. Validity period
        10. Signatory name and title
        11. Any conditions or limitations`,
      validationRules: [],
      autoPopulationRules: [],
      workflowSteps: [
        { id: "ocr", name: "OCR Processing", type: "ocr", required: true, automatable: true },
        { id: "ai_extract", name: "Authorization Extraction", type: "ai_extraction", required: true, automatable: true },
        { id: "validate", name: "Validation", type: "validation", required: true, automatable: true },
      ],
    };
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ComprehensiveTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ComprehensiveTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): ComprehensiveTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get templates by subcategory
   */
  getTemplatesBySubcategory(subcategory: string): ComprehensiveTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.subcategory === subcategory);
  }

  /**
   * Get template categories with counts
   */
  getTemplateCategorySummary(): Record<TemplateCategory, { count: number; templates: string[] }> {
    const summary: Record<string, { count: number; templates: string[] }> = {};
    
    for (const template of this.templates.values()) {
      if (!summary[template.category]) {
        summary[template.category] = { count: 0, templates: [] };
      }
      summary[template.category].count++;
      summary[template.category].templates.push(template.name);
    }
    
    return summary as Record<TemplateCategory, { count: number; templates: string[] }>;
  }

  /**
   * Search templates by keyword
   */
  searchTemplates(keyword: string): ComprehensiveTemplate[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.templates.values()).filter(t => 
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.subcategory.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get required documents for tender submission
   */
  getTenderSubmissionChecklist(): { document: string; templateId: string; required: boolean }[] {
    return [
      { document: "Tender Document (RFP/RFQ)", templateId: "tender-document-upload", required: true },
      { document: "Technical Proposal", templateId: "technical-proposal-upload", required: true },
      { document: "Financial Proposal", templateId: "financial-proposal-upload", required: true },
      { document: "Bid Bond / Bank Guarantee", templateId: "bid-bond-upload", required: true },
      { document: "Company Profile", templateId: "company-profile-upload", required: true },
      { document: "Past Experience / References", templateId: "past-experience-upload", required: true },
      { document: "Technical Compliance Statement", templateId: "technical-compliance-upload", required: true },
      { document: "Commercial Registration", templateId: "commercial-registration-upload", required: true },
      { document: "VAT Certificate", templateId: "vat-certificate-upload", required: true },
      { document: "Zakat Certificate", templateId: "zakat-certificate-upload", required: true },
      { document: "GOSI Certificate", templateId: "gosi-certificate-upload", required: true },
      { document: "Manufacturer Authorization", templateId: "manufacturer-authorization-upload", required: false },
      { document: "Letter of Authorization (LOA)", templateId: "loa-upload", required: false },
      { document: "FDA/CE Certificates", templateId: "fda-certificate-upload", required: false },
      { document: "SFDA Registration", templateId: "sfda-certificate-upload", required: false },
    ];
  }

  /**
   * Get required documents for supplier registration
   */
  getSupplierRegistrationChecklist(): { document: string; templateId: string; required: boolean }[] {
    return [
      { document: "Commercial Registration", templateId: "commercial-registration-upload", required: true },
      { document: "VAT Certificate", templateId: "vat-certificate-upload", required: true },
      { document: "Zakat Certificate", templateId: "zakat-certificate-upload", required: true },
      { document: "GOSI Certificate", templateId: "gosi-certificate-upload", required: true },
      { document: "National Address", templateId: "saudi-post-address-upload", required: true },
      { document: "Bank Account Details", templateId: "bank-guarantee-upload", required: false },
      { document: "Insurance Certificate", templateId: "insurance-certificate-upload", required: false },
      { document: "Authorized Signatory", templateId: "authorized-signatory-upload", required: true },
      { document: "Company Profile", templateId: "company-profile-upload", required: true },
      { document: "ISO Certificates", templateId: "iso-certificate-upload", required: false },
    ];
  }

  /**
   * Get required supplier compliance documents
   */
  getSupplierComplianceChecklist(): { document: string; templateId: string; required: boolean }[] {
    return [
      { document: "Supplier Contract", templateId: "supplier-contract-upload", required: true },
      { document: "Letter of Authorization (LOA)", templateId: "loa-upload", required: true },
      { document: "MOCI Agency Letter", templateId: "moci-letter-upload", required: false },
      { document: "FDA Certificate", templateId: "fda-certificate-upload", required: false },
      { document: "CE Marking Certificate", templateId: "ce-marking-upload", required: false },
      { document: "ISO Certificate", templateId: "iso-certificate-upload", required: false },
      { document: "SFDA Registration", templateId: "sfda-certificate-upload", required: true },
      { document: "Manufacturer Authorization", templateId: "manufacturer-authorization-upload", required: false },
    ];
  }
}

// Export singleton instance
export const comprehensiveTemplateManager = new ComprehensiveTemplateManager();
