/**
 * Document Templates and Upload System
 * Provides templates for each module and handles structured data uploads
 */

import * as db from "../db";
import { aiDocumentProcessor } from "./ai-document-processor";

export interface DocumentUploadTemplate {
  id: string;
  name: string;
  module: string;
  description: string;
  fields: TemplateField[];
  validationRules: ValidationRule[];
  autoPopulateRules: AutoPopulateRule[];
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
    | "select"
    | "multiselect"
    | "file"
    | "table";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ValidationRule {
  field: string;
  type: "required" | "format" | "range" | "custom";
  message: string;
  parameters?: any;
}

export interface AutoPopulateRule {
  sourceField: string;
  targetEntity: string;
  targetField: string;
  transformation?: string;
}

class DocumentTemplateManager {
  /**
   * Get all available templates
   */
  getAvailableTemplates(): DocumentUploadTemplate[] {
    return [
      this.getTenderTemplate(),
      this.getSupplierTemplate(),
      this.getProductCatalogTemplate(),
      this.getInvoiceTemplate(),
      this.getPriceListTemplate(),
      this.getPurchaseOrderTemplate(),
      this.getContractTemplate(),
      this.getComplianceTemplate(),
    ];
  }

  /**
template by ID
   */
  getTemplateById(templateId: string): DocumentUploadTemplate | null {
    const templates = this.getAvailableTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Get templates by module
   */
  getTemplatesByModule(module: string): DocumentUploadTemplate[] {
    return this.getAvailableTemplates().filter(t => t.module === module);
  }

  /**
   * Tender Document Template
   */
  private getTenderTemplate(): DocumentUploadTemplate {
    return {
      id: "tender-upload",
      name: "Tender Document Upload",
      module: "tenders",
      description: "Upload and extract data from tender documents",
      fields: [
        {
          id: "document",
          name: "document",
          label: "Tender Document",
          type: "file",
          required: true,
          placeholder: "Upload PDF, DOC, or image file",
        },
        {
          id: "tenderNumber",
          name: "tenderNumber",
          label: "Tender Reference Number",
          type: "text",
          required: true,
          placeholder: "e.g., RFP-2024-001",
        },
        {
          id: "title",
          name: "title",
          label: "Tender Title",
          type: "text",
          required: true,
          placeholder: "Brief description of the tender",
        },
        {
          id: "customerId",
          name: "customerId",
          label: "Customer/Organization",
          type: "select",
          required: true,
          options: [], // Will be populated from database
        },
        {
          id: "submissionDeadline",
          name: "submissionDeadline",
          label: "Submission Deadline",
          type: "date",
          required: true,
        },
        {
          id: "estimatedValue",
          name: "estimatedValue",
          label: "Estimated Value",
          type: "currency",
          required: false,
          placeholder: "0.00",
        },
        {
          id: "requirements",
          name: "requirements",
          label: "Requirements & Specifications",
          type: "table",
          required: true,
        },
      ],
      validationRules: [
        {
          field: "tenderNumber",
          type: "required",
          message: "Tender number is required",
        },
        {
          field: "submissionDeadline",
          type: "custom",
          message: "Submission deadline must be in the future",
          parameters: { validateFutureDate: true },
        },
      ],
      autoPopulateRules: [
        {
          sourceField: "tenderNumber",
          targetEntity: "tender",
          targetField: "referenceNumber",
        },
        {
          sourceField: "title",
          targetEntity: "tender",
          targetField: "title",
        },
        {
          sourceField: "requirements",
          targetEntity: "tenderItems",
          targetField: "items",
        },
      ],
    };
  }

  /**
   * Supplier Information Template
   */
  private getSupplierTemplate(): DocumentUploadTemplate {
    return {
      id: "supplier-upload",
      name: "Supplier Registration",
      module: "suppliers",
      description: "Register new supplier with documents",
      fields: [
        {
          id: "companyDocument",
          name: "companyDocument",
          label: "Company Registration Document",
          type: "file",
          required: true,
        },
        {
          id: "name",
          name: "name",
          label: "Company Name",
          type: "text",
          required: true,
        },
        {
          id: "taxId",
          name: "taxId",
          label: "Tax ID / Registration Number",
          type: "text",
          required: true,
        },
        {
          id: "contactPerson",
          name: "contactPerson",
          label: "Contact Person",
          type: "text",
          required: true,
        },
        {
          id: "email",
          name: "email",
          label: "Email Address",
          type: "text",
          required: true,
          validation: {
            pattern: "^[^@]+@[^@]+\\.[^@]+$",
          },
        },
        {
          id: "phone",
          name: "phone",
          label: "Phone Number",
          type: "text",
          required: true,
        },
        {
          id: "address",
          name: "address",
          label: "Business Address",
          type: "text",
          required: true,
        },
        {
          id: "certifications",
          name: "certifications",
          label: "Certifications & Licenses",
          type: "multiselect",
          required: false,
          options: [
            "ISO 9001",
            "ISO 14001",
            "OHSAS 18001",
            "FDA Approved",
            "CE Marking",
          ],
        },
      ],
      validationRules: [
        {
          field: "email",
          type: "format",
          message: "Please enter a valid email address",
        },
        {
          field: "taxId",
          type: "required",
          message: "Tax ID is required for supplier registration",
        },
      ],
      autoPopulateRules: [
        {
          sourceField: "name",
          targetEntity: "supplier",
          targetField: "name",
        },
        {
          sourceField: "taxId",
          targetEntity: "supplier",
          targetField: "taxId",
        },
      ],
    };
  }

  /**
   * Product Catalog Template
   */
  private getProductCatalogTemplate(): DocumentUploadTemplate {
    return {
      id: "catalog-upload",
      name: "Product Catalog Upload",
      module: "products",
      description: "Upload supplier product catalogs with AI extraction",
      fields: [
        {
          id: "catalogDocument",
          name: "catalogDocument",
          label: "Product Catalog Document",
          type: "file",
          required: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [], // Populated from database
        },
        {
          id: "catalogName",
          name: "catalogName",
          label: "Catalog Name/Version",
          type: "text",
          required: true,
          placeholder: "e.g., 2024 Product Catalog v2.1",
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["USD", "EUR", "SAR", "AED", "GBP"],
        },
        {
          id: "productCategories",
          name: "productCategories",
          label: "Product Categories",
          type: "multiselect",
          required: false,
          options: [
            "Medical Equipment",
            "Pharmaceuticals",
            "Office Supplies",
            "IT Equipment",
            "Laboratory Supplies",
          ],
        },
      ],
      validationRules: [
        {
          field: "supplierId",
          type: "required",
          message: "Please select a supplier",
        },
      ],
      autoPopulateRules: [
        {
          sourceField: "products",
          targetEntity: "products",
          targetField: "bulk_insert",
        },
      ],
    };
  }

  /**
   * Invoice Template
   */
  private getInvoiceTemplate(): DocumentUploadTemplate {
    return {
      id: "invoice-upload",
      name: "Invoice Processing",
      module: "invoices",
      description: "Upload and process supplier invoices",
      fields: [
        {
          id: "invoiceDocument",
          name: "invoiceDocument",
          label: "Invoice Document",
          type: "file",
          required: true,
        },
        {
          id: "invoiceNumber",
          name: "invoiceNumber",
          label: "Invoice Number",
          type: "text",
          required: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
        },
        {
          id: "invoiceDate",
          name: "invoiceDate",
          label: "Invoice Date",
          type: "date",
          required: true,
        },
        {
          id: "dueDate",
          name: "dueDate",
          label: "Due Date",
          type: "date",
          required: true,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Amount",
          type: "currency",
          required: true,
        },
        {
          id: "poNumber",
          name: "poNumber",
          label: "Purchase Order Number",
          type: "text",
          required: false,
        },
      ],
      validationRules: [
        {
          field: "totalAmount",
          type: "range",
          message: "Total amount must be greater than 0",
          parameters: { min: 0.01 },
        },
      ],
      autoPopulateRules: [
        {
          sourceField: "invoiceNumber",
          targetEntity: "invoice",
          targetField: "invoiceNumber",
        },
      ],
    };
  }

  /**
   * Price List Template
   */
  private getPriceListTemplate(): DocumentUploadTemplate {
    return {
      id: "pricelist-upload",
      name: "Price List Upload",
      module: "pricing",
      description: "Upload supplier price lists with OCR extraction",
      fields: [
        {
          id: "priceListDocument",
          name: "priceListDocument",
          label: "Price List Document",
          type: "file",
          required: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
        },
        {
          id: "priceListName",
          name: "priceListName",
          label: "Price List Name",
          type: "text",
          required: true,
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          required: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: false,
        },
        {
          id: "currency",
          name: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: ["USD", "EUR", "SAR", "AED"],
        },
      ],
      validationRules: [],
      autoPopulateRules: [
        {
          sourceField: "products",
          targetEntity: "supplierPrices",
          targetField: "bulk_insert",
        },
      ],
    };
  }

  /**
   * Purchase Order Template
   */
  private getPurchaseOrderTemplate(): DocumentUploadTemplate {
    return {
      id: "po-upload",
      name: "Purchase Order Processing",
      module: "purchase_orders",
      description: "Process purchase order documents",
      fields: [
        {
          id: "poDocument",
          name: "poDocument",
          label: "Purchase Order Document",
          type: "file",
          required: true,
        },
        {
          id: "poNumber",
          name: "poNumber",
          label: "PO Number",
          type: "text",
          required: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
        },
        {
          id: "orderDate",
          name: "orderDate",
          label: "Order Date",
          type: "date",
          required: true,
        },
        {
          id: "expectedDeliveryDate",
          name: "expectedDeliveryDate",
          label: "Expected Delivery Date",
          type: "date",
          required: false,
        },
        {
          id: "totalAmount",
          name: "totalAmount",
          label: "Total Amount",
          type: "currency",
          required: true,
        },
      ],
      validationRules: [],
      autoPopulateRules: [
        {
          sourceField: "poNumber",
          targetEntity: "purchaseOrder",
          targetField: "poNumber",
        },
      ],
    };
  }

  /**
   * Contract Template
   */
  private getContractTemplate(): DocumentUploadTemplate {
    return {
      id: "contract-upload",
      name: "Contract Document Upload",
      module: "contracts",
      description: "Upload and analyze contract documents",
      fields: [
        {
          id: "contractDocument",
          name: "contractDocument",
          label: "Contract Document",
          type: "file",
          required: true,
        },
        {
          id: "contractNumber",
          name: "contractNumber",
          label: "Contract Number",
          type: "text",
          required: true,
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier/Contractor",
          type: "select",
          required: true,
          options: [],
        },
        {
          id: "contractType",
          name: "contractType",
          label: "Contract Type",
          type: "select",
          required: true,
          options: [
            "Supply Agreement",
            "Service Contract",
            "Maintenance Agreement",
            "Consulting Agreement",
          ],
        },
        {
          id: "startDate",
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
        },
        {
          id: "endDate",
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
        },
        {
          id: "contractValue",
          name: "contractValue",
          label: "Contract Value",
          type: "currency",
          required: true,
        },
      ],
      validationRules: [
        {
          field: "endDate",
          type: "custom",
          message: "End date must be after start date",
          parameters: { validateDateRange: true },
        },
      ],
      autoPopulateRules: [],
    };
  }

  /**
   * Compliance Document Template
   */
  private getComplianceTemplate(): DocumentUploadTemplate {
    return {
      id: "compliance-upload",
      name: "Compliance Document Upload",
      module: "compliance",
      description: "Upload compliance and certification documents",
      fields: [
        {
          id: "complianceDocument",
          name: "complianceDocument",
          label: "Compliance Document",
          type: "file",
          required: true,
        },
        {
          id: "documentType",
          name: "documentType",
          label: "Document Type",
          type: "select",
          required: true,
          options: [
            "ISO Certificate",
            "FDA Approval",
            "CE Marking",
            "Safety Certificate",
            "Quality Certificate",
          ],
        },
        {
          id: "supplierId",
          name: "supplierId",
          label: "Supplier",
          type: "select",
          required: true,
          options: [],
        },
        {
          id: "certificateNumber",
          name: "certificateNumber",
          label: "Certificate Number",
          type: "text",
          required: true,
        },
        {
          id: "issuedDate",
          name: "issuedDate",
          label: "Issued Date",
          type: "date",
          required: true,
        },
        {
          id: "expiryDate",
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: true,
        },
        {
          id: "issuingAuthority",
          name: "issuingAuthority",
          label: "Issuing Authority",
          type: "text",
          required: true,
        },
      ],
      validationRules: [
        {
          field: "expiryDate",
          type: "custom",
          message: "Certificate should not be expired",
          parameters: { validateNotExpired: true },
        },
      ],
      autoPopulateRules: [],
    };
  }

  /**
   * Process uploaded document using template
   */
  async processUploadedDocument(
    templateId: string,
    documentFile: any,
    formData: any,
    userId: number
  ): Promise<{
    success: boolean;
    documentId?: number;
    extractedData?: any;
    errors?: string[];
  }> {
    try {
      const template = this.getTemplateById(templateId);
      if (!template) {
        return { success: false, errors: ["Template not found"] };
      }

      // Validate form data against template
      const validationErrors = this.validateFormData(formData, template);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      // Store document
      const document = await db.createDocument({
        entityType: template.module,
        entityId: 0, // Will be updated after entity creation
        fileName: documentFile.originalname,
        fileKey: documentFile.filename,
        fileUrl: documentFile.path,
        fileSize: documentFile.size,
        mimeType: documentFile.mimetype,
        documentType: template.name,
        uploadedBy: userId,
        status: "pending",
        extractionStatus: "not_started",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Process with AI if document uploaded
      let extractedData = null;
      if (document.insertId) {
        try {
          extractedData = await aiDocumentProcessor.processDocument({
            documentId: document.insertId,
            documentType: this.mapTemplateToDocumentType(template.id),
            extractionFields: template.fields.map(f => f.name),
            aiProvider: "openai",
            ocrProvider: "tesseract",
          });

          // Auto-populate fields based on template rules
          await this.autoPopulateFromTemplate(
            template,
            formData,
            extractedData,
            userId
          );
        } catch (error) {
          console.error("[Template] AI processing failed:", error);
          // Continue without AI extraction
        }
      }

      return {
        success: true,
        documentId: document.insertId,
        extractedData,
      };
    } catch (error) {
      console.error("[Template] Document processing failed:", error);
      return { success: false, errors: ["Document processing failed"] };
    }
  }

  /**
   * Validate form data against template
   */
  private validateFormData(
    formData: any,
    template: DocumentUploadTemplate
  ): string[] {
    const errors: string[] = [];

    for (const rule of template.validationRules) {
      const value = formData[rule.field];

      switch (rule.type) {
        case "required":
          if (!value || (typeof value === "string" && value.trim() === "")) {
            errors.push(rule.message);
          }
          break;
        case "format":
          if (value && rule.parameters?.pattern) {
            const regex = new RegExp(rule.parameters.pattern);
            if (!regex.test(value)) {
              errors.push(rule.message);
            }
          }
          break;
        case "range":
          if (value !== undefined) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              if (
                rule.parameters?.min !== undefined &&
                numValue < rule.parameters.min
              ) {
                errors.push(rule.message);
              }
              if (
                rule.parameters?.max !== undefined &&
                numValue > rule.parameters.max
              ) {
                errors.push(rule.message);
              }
            }
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Auto-populate database entities from template
   */
  private async autoPopulateFromTemplate(
    template: DocumentUploadTemplate,
    formData: any,
    extractedData: any,
    userId: number
  ): Promise<void> {
    for (const rule of template.autoPopulateRules) {
      const sourceValue =
        formData[rule.sourceField] || extractedData?.[rule.sourceField]?.value;

      if (sourceValue) {
        await this.populateEntity(
          rule.targetEntity,
          rule.targetField,
          sourceValue,
          formData,
          userId
        );
      }
    }
  }

  /**
   * Populate specific entity based on template rules
   */
  private async populateEntity(
    entityType: string,
    field: string,
    value: any,
    formData: any,
    userId: number
  ): Promise<void> {
    switch (entityType) {
      case "tender":
        if (field === "referenceNumber") {
          await db.createTender({
            referenceNumber: value,
            title: formData.title || "Imported Tender",
            customerId: formData.customerId,
            submissionDeadline: formData.submissionDeadline
              ? new Date(formData.submissionDeadline)
              : null,
            estimatedValue: formData.estimatedValue
              ? parseFloat(formData.estimatedValue) * 100
              : null,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        break;
      case "supplier":
        await db.createSupplier({
          name: formData.name,
          taxId: formData.taxId,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;
      // Add more entity types as needed
    }
  }

  /**
   * Map template ID to document type for AI processing
   */
  private mapTemplateToDocumentType(
    templateId: string
  ): "tender" | "invoice" | "price_list" | "catalog" | "po" | "contract" {
    const mapping: Record<string, any> = {
      "tender-upload": "tender",
      "invoice-upload": "invoice",
      "pricelist-upload": "price_list",
      "catalog-upload": "catalog",
      "po-upload": "po",
      "contract-upload": "contract",
    };
    return mapping[templateId] || "tender";
  }
}

export const documentTemplateManager = new DocumentTemplateManager();
