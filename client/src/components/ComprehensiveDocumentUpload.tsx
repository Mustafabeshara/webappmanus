import { FileUpload } from "@/components/FileUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc, trpcClient } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Building,
  Building2,
  Calculator,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  Edit3,
  FileCode,
  FileSignature,
  FileText,
  Filter,
  Grid3X3,
  History,
  Landmark,
  List,
  Loader2,
  MapPin,
  Package,
  Pen,
  PiggyBank,
  Receipt,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Upload,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// TEMPLATE DEFINITIONS - Comprehensive Document Templates
// =============================================================================

type TemplateCategory =
  | "data_upload"
  | "tender_submission"
  | "registration"
  | "supplier_compliance"
  | "financial";

interface DocumentTemplate {
  id: string;
  name: string;
  nameAr?: string;
  category: TemplateCategory;
  subcategory: string;
  description: string;
  icon: string;
  fields: TemplateField[];
  requiredFor?: string[];
}

interface TemplateField {
  id: string;
  name: string;
  label: string;
  labelAr?: string;
  type:
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
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

interface ExtractedField {
  value: any;
  confidence: number;
  source: "ocr" | "ai_inference" | "template_match";
}

interface ExtractionResult {
  [fieldName: string]: ExtractedField;
}

// Icon mapping
const iconMap: Record<string, any> = {
  FileText,
  Building2,
  Package,
  DollarSign,
  Receipt,
  ShoppingCart,
  Wallet,
  PiggyBank,
  FileCode,
  Calculator,
  Shield,
  Building,
  History,
  CheckSquare,
  Landmark,
  Users,
  MapPin,
  Pen,
  FileSignature,
  Award,
  BadgeCheck,
};

// Category labels
const categoryLabels: Record<
  TemplateCategory,
  { label: string; labelAr: string; color: string }
> = {
  data_upload: {
    label: "Data Upload",
    labelAr: "تحميل البيانات",
    color: "bg-blue-100 text-blue-800",
  },
  tender_submission: {
    label: "Tender Submission",
    labelAr: "تقديم المناقصات",
    color: "bg-green-100 text-green-800",
  },
  registration: {
    label: "Registration",
    labelAr: "التسجيل",
    color: "bg-purple-100 text-purple-800",
  },
  supplier_compliance: {
    label: "Supplier Compliance",
    labelAr: "امتثال الموردين",
    color: "bg-orange-100 text-orange-800",
  },
  financial: {
    label: "Financial",
    labelAr: "المالية",
    color: "bg-yellow-100 text-yellow-800",
  },
};

// =============================================================================
// COMPREHENSIVE DOCUMENT TEMPLATES
// =============================================================================

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  // DATA UPLOAD TEMPLATES
  {
    id: "supplier-data-upload",
    name: "Supplier Data Import",
    nameAr: "استيراد بيانات الموردين",
    category: "data_upload",
    subcategory: "suppliers",
    description:
      "Upload supplier information including company details, contacts, and banking",
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
      },
      {
        id: "companyNameAr",
        name: "companyNameAr",
        label: "Company Name (Arabic)",
        type: "text",
        required: false,
      },
      {
        id: "commercialRegistration",
        name: "commercialRegistration",
        label: "CR Number",
        labelAr: "رقم السجل التجاري",
        type: "text",
        required: true,
        placeholder: "10 digits",
        validation: { pattern: "^[0-9]{10}$" },
      },
      {
        id: "vatNumber",
        name: "vatNumber",
        label: "VAT Number",
        labelAr: "الرقم الضريبي",
        type: "text",
        required: true,
        placeholder: "15 digits",
        validation: { pattern: "^3[0-9]{13}3$" },
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
        label: "Email",
        type: "email",
        required: true,
      },
      {
        id: "phone",
        name: "phone",
        label: "Phone",
        type: "phone",
        required: true,
        placeholder: "+966 XX XXX XXXX",
      },
      {
        id: "address",
        name: "address",
        label: "Business Address",
        type: "textarea",
        required: true,
      },
      {
        id: "city",
        name: "city",
        label: "City",
        type: "select",
        required: true,
        options: [
          "Riyadh",
          "Jeddah",
          "Dammam",
          "Makkah",
          "Madinah",
          "Khobar",
          "Other",
        ],
      },
      {
        id: "country",
        name: "country",
        label: "Country",
        type: "select",
        required: true,
        options: [
          "Saudi Arabia",
          "UAE",
          "Kuwait",
          "Bahrain",
          "Qatar",
          "Oman",
          "Egypt",
          "Jordan",
          "USA",
          "Germany",
          "UK",
          "Other",
        ],
      },
      {
        id: "supplierType",
        name: "supplierType",
        label: "Supplier Type",
        type: "multiselect",
        required: true,
        options: [
          "Manufacturer",
          "Distributor",
          "Agent",
          "Service Provider",
          "Contractor",
        ],
      },
    ],
  },
  {
    id: "product-catalog-upload",
    name: "Product Catalog Import",
    nameAr: "استيراد كتالوج المنتجات",
    category: "data_upload",
    subcategory: "products",
    description: "Upload product catalogs with specifications and pricing",
    icon: "Package",
    fields: [
      {
        id: "supplierId",
        name: "supplierId",
        label: "Supplier",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "catalogName",
        name: "catalogName",
        label: "Catalog Name/Version",
        type: "text",
        required: true,
        placeholder: "e.g., Medical Equipment Catalog 2024",
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
        options: ["SAR", "USD", "EUR", "AED", "GBP"],
      },
    ],
  },
  {
    id: "price-list-upload",
    name: "Price List Import",
    nameAr: "استيراد قائمة الأسعار",
    category: "data_upload",
    subcategory: "pricing",
    description: "Upload supplier price lists with volume discounts",
    icon: "DollarSign",
    fields: [
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
        required: true,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD", "EUR", "AED"],
      },
      {
        id: "paymentTerms",
        name: "paymentTerms",
        label: "Payment Terms",
        type: "select",
        required: false,
        options: [
          "Net 30",
          "Net 60",
          "Net 90",
          "Cash on Delivery",
          "Letter of Credit",
        ],
      },
    ],
  },
  {
    id: "invoice-upload",
    name: "Invoice Processing",
    nameAr: "معالجة الفواتير",
    category: "financial",
    subcategory: "invoices",
    description:
      "Upload and process supplier invoices with line item extraction",
    icon: "Receipt",
    fields: [
      {
        id: "invoiceNumber",
        name: "invoiceNumber",
        label: "Invoice Number",
        labelAr: "رقم الفاتورة",
        type: "text",
        required: true,
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
        id: "supplierId",
        name: "supplierId",
        label: "Supplier",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "supplierVatNumber",
        name: "supplierVatNumber",
        label: "Supplier VAT Number",
        type: "text",
        required: true,
      },
      {
        id: "poNumber",
        name: "poNumber",
        label: "PO Reference",
        type: "text",
        required: false,
      },
      {
        id: "subtotal",
        name: "subtotal",
        label: "Subtotal",
        type: "currency",
        required: true,
      },
      {
        id: "vatAmount",
        name: "vatAmount",
        label: "VAT Amount (15%)",
        type: "currency",
        required: true,
      },
      {
        id: "totalAmount",
        name: "totalAmount",
        label: "Total Amount",
        labelAr: "المبلغ الإجمالي",
        type: "currency",
        required: true,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD", "EUR", "AED"],
      },
    ],
  },
  {
    id: "purchase-order-upload",
    name: "Purchase Order Import",
    nameAr: "استيراد أوامر الشراء",
    category: "financial",
    subcategory: "purchase_orders",
    description: "Upload and process purchase orders",
    icon: "ShoppingCart",
    fields: [
      {
        id: "poNumber",
        name: "poNumber",
        label: "PO Number",
        labelAr: "رقم أمر الشراء",
        type: "text",
        required: true,
      },
      {
        id: "poDate",
        name: "poDate",
        label: "PO Date",
        type: "date",
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
        id: "deliveryDate",
        name: "deliveryDate",
        label: "Expected Delivery Date",
        type: "date",
        required: true,
      },
      {
        id: "deliveryAddress",
        name: "deliveryAddress",
        label: "Delivery Address",
        type: "textarea",
        required: true,
      },
      {
        id: "subtotal",
        name: "subtotal",
        label: "Subtotal",
        type: "currency",
        required: true,
      },
      {
        id: "vatAmount",
        name: "vatAmount",
        label: "VAT Amount",
        type: "currency",
        required: true,
      },
      {
        id: "totalAmount",
        name: "totalAmount",
        label: "Total Amount",
        type: "currency",
        required: true,
      },
    ],
  },
  {
    id: "expense-report-upload",
    name: "Expense Report Import",
    nameAr: "استيراد تقارير المصروفات",
    category: "financial",
    subcategory: "expenses",
    description: "Upload expense reports and receipts",
    icon: "Wallet",
    fields: [
      {
        id: "reportTitle",
        name: "reportTitle",
        label: "Report Title",
        type: "text",
        required: true,
        placeholder: "e.g., Business Trip - Riyadh Q4 2024",
      },
      {
        id: "employeeId",
        name: "employeeId",
        label: "Employee",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "departmentId",
        name: "departmentId",
        label: "Department",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "reportDate",
        name: "reportDate",
        label: "Report Date",
        type: "date",
        required: true,
      },
      {
        id: "periodStart",
        name: "periodStart",
        label: "Period Start",
        type: "date",
        required: true,
      },
      {
        id: "periodEnd",
        name: "periodEnd",
        label: "Period End",
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
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD", "EUR", "AED"],
      },
      {
        id: "justification",
        name: "justification",
        label: "Business Justification",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "budget-upload",
    name: "Budget Import",
    nameAr: "استيراد الميزانية",
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
      },
      {
        id: "fiscalYear",
        name: "fiscalYear",
        label: "Fiscal Year",
        type: "select",
        required: true,
        options: ["2024", "2025", "2026"],
      },
      {
        id: "departmentId",
        name: "departmentId",
        label: "Department",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "categoryId",
        name: "categoryId",
        label: "Budget Category",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "totalAmount",
        name: "totalAmount",
        label: "Total Budget Amount",
        type: "currency",
        required: true,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD"],
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
    ],
  },

  // TENDER SUBMISSION DOCUMENTS
  {
    id: "tender-document-upload",
    name: "Tender Document (RFP/RFQ)",
    nameAr: "وثيقة المناقصة",
    category: "tender_submission",
    subcategory: "main_document",
    description: "Upload tender/RFP documents for automatic extraction",
    icon: "FileText",
    requiredFor: ["tender"],
    fields: [
      {
        id: "tenderNumber",
        name: "tenderNumber",
        label: "Tender Reference Number",
        labelAr: "رقم المناقصة",
        type: "text",
        required: true,
      },
      {
        id: "title",
        name: "title",
        label: "Tender Title",
        labelAr: "عنوان المناقصة",
        type: "text",
        required: true,
      },
      {
        id: "issuingOrganization",
        name: "issuingOrganization",
        label: "Issuing Organization",
        type: "text",
        required: true,
      },
      {
        id: "customerId",
        name: "customerId",
        label: "Customer",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "tenderType",
        name: "tenderType",
        label: "Tender Type",
        type: "select",
        required: true,
        options: [
          "Open Tender",
          "Limited Tender",
          "Direct Purchase",
          "Framework Agreement",
          "Reverse Auction",
        ],
      },
      {
        id: "submissionDeadline",
        name: "submissionDeadline",
        label: "Submission Deadline",
        labelAr: "آخر موعد للتقديم",
        type: "date",
        required: true,
      },
      {
        id: "submissionTime",
        name: "submissionTime",
        label: "Submission Time",
        type: "text",
        required: false,
        placeholder: "e.g., 14:00",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Estimated Value",
        type: "currency",
        required: false,
      },
      {
        id: "bidBondAmount",
        name: "bidBondAmount",
        label: "Bid Bond Amount",
        type: "currency",
        required: false,
      },
      {
        id: "bidBondPercentage",
        name: "bidBondPercentage",
        label: "Bid Bond %",
        type: "number",
        required: false,
      },
    ],
  },
  {
    id: "technical-proposal-upload",
    name: "Technical Proposal",
    nameAr: "العرض الفني",
    category: "tender_submission",
    subcategory: "proposals",
    description: "Upload technical proposals for tender submissions",
    icon: "FileCode",
    requiredFor: ["tender"],
    fields: [
      {
        id: "tenderId",
        name: "tenderId",
        label: "Related Tender",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "proposalVersion",
        name: "proposalVersion",
        label: "Version",
        type: "text",
        required: true,
        placeholder: "e.g., v1.0",
      },
      {
        id: "executiveSummary",
        name: "executiveSummary",
        label: "Executive Summary",
        type: "textarea",
        required: true,
      },
      {
        id: "technicalApproach",
        name: "technicalApproach",
        label: "Technical Approach",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "financial-proposal-upload",
    name: "Financial Proposal",
    nameAr: "العرض المالي",
    category: "tender_submission",
    subcategory: "proposals",
    description: "Upload financial/commercial proposals",
    icon: "Calculator",
    requiredFor: ["tender"],
    fields: [
      {
        id: "tenderId",
        name: "tenderId",
        label: "Related Tender",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD", "EUR"],
      },
      {
        id: "subtotal",
        name: "subtotal",
        label: "Subtotal (Before VAT)",
        type: "currency",
        required: true,
      },
      {
        id: "vatAmount",
        name: "vatAmount",
        label: "VAT (15%)",
        type: "currency",
        required: true,
      },
      {
        id: "grandTotal",
        name: "grandTotal",
        label: "Grand Total",
        type: "currency",
        required: true,
      },
      {
        id: "validityPeriod",
        name: "validityPeriod",
        label: "Price Validity Period",
        type: "text",
        required: true,
        placeholder: "e.g., 90 days",
      },
      {
        id: "paymentTerms",
        name: "paymentTerms",
        label: "Payment Terms",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "bid-bond-upload",
    name: "Bid Bond / Bank Guarantee",
    nameAr: "ضمان العطاء / خطاب ضمان",
    category: "tender_submission",
    subcategory: "guarantees",
    description: "Upload bid bonds and bank guarantees",
    icon: "Shield",
    requiredFor: ["tender"],
    fields: [
      {
        id: "tenderId",
        name: "tenderId",
        label: "Related Tender",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "guaranteeNumber",
        name: "guaranteeNumber",
        label: "Guarantee Number",
        type: "text",
        required: true,
      },
      {
        id: "bankName",
        name: "bankName",
        label: "Issuing Bank",
        type: "text",
        required: true,
      },
      {
        id: "amount",
        name: "amount",
        label: "Guarantee Amount",
        type: "currency",
        required: true,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD"],
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
        id: "beneficiary",
        name: "beneficiary",
        label: "Beneficiary",
        type: "text",
        required: true,
      },
      {
        id: "guaranteeType",
        name: "guaranteeType",
        label: "Guarantee Type",
        type: "select",
        required: true,
        options: [
          "Bid Bond",
          "Performance Bond",
          "Advance Payment Guarantee",
          "Retention Guarantee",
        ],
      },
    ],
  },
  {
    id: "company-profile-upload",
    name: "Company Profile",
    nameAr: "ملف الشركة",
    category: "tender_submission",
    subcategory: "company_docs",
    description: "Upload company profile documents",
    icon: "Building",
    requiredFor: ["tender", "registration"],
    fields: [
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
      },
      {
        id: "yearEstablished",
        name: "yearEstablished",
        label: "Year Established",
        type: "number",
        required: true,
      },
      {
        id: "employeeCount",
        name: "employeeCount",
        label: "Number of Employees",
        type: "number",
        required: false,
      },
      {
        id: "annualRevenue",
        name: "annualRevenue",
        label: "Annual Revenue",
        type: "currency",
        required: false,
      },
      {
        id: "businessLines",
        name: "businessLines",
        label: "Business Lines",
        type: "multiselect",
        required: true,
        options: [
          "Medical Equipment",
          "Pharmaceuticals",
          "Healthcare Services",
          "IT Solutions",
          "Construction",
          "Consulting",
        ],
      },
      {
        id: "certifications",
        name: "certifications",
        label: "Certifications",
        type: "multiselect",
        required: false,
        options: [
          "ISO 9001",
          "ISO 14001",
          "ISO 13485",
          "OHSAS 18001",
          "ISO 45001",
        ],
      },
    ],
  },
  {
    id: "past-experience-upload",
    name: "Past Experience / References",
    nameAr: "الخبرات السابقة",
    category: "tender_submission",
    subcategory: "company_docs",
    description: "Upload project experience and references",
    icon: "History",
    requiredFor: ["tender"],
    fields: [
      {
        id: "totalContractValue",
        name: "totalContractValue",
        label: "Total Contract Value (5 years)",
        type: "currency",
        required: false,
      },
      {
        id: "completionCertificates",
        name: "completionCertificates",
        label: "Completion Certificates Available",
        type: "boolean",
        required: true,
      },
    ],
  },
  {
    id: "technical-compliance-upload",
    name: "Technical Compliance Statement",
    nameAr: "بيان الامتثال الفني",
    category: "tender_submission",
    subcategory: "compliance",
    description: "Upload technical compliance statements",
    icon: "CheckSquare",
    requiredFor: ["tender"],
    fields: [
      {
        id: "tenderId",
        name: "tenderId",
        label: "Related Tender",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "compliancePercentage",
        name: "compliancePercentage",
        label: "Overall Compliance %",
        type: "number",
        required: false,
      },
    ],
  },

  // REGISTRATION PROCESS DOCUMENTS
  {
    id: "commercial-registration-upload",
    name: "Commercial Registration (CR)",
    nameAr: "السجل التجاري",
    category: "registration",
    subcategory: "legal",
    description: "Upload commercial registration certificate",
    icon: "FileText",
    requiredFor: ["supplier", "tender"],
    fields: [
      {
        id: "crNumber",
        name: "crNumber",
        label: "CR Number",
        labelAr: "رقم السجل التجاري",
        type: "text",
        required: true,
        validation: { pattern: "^[0-9]{10}$" },
      },
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        labelAr: "اسم الشركة",
        type: "text",
        required: true,
      },
      {
        id: "companyNameAr",
        name: "companyNameAr",
        label: "Company Name (Arabic)",
        type: "text",
        required: true,
      },
      {
        id: "legalForm",
        name: "legalForm",
        label: "Legal Form",
        type: "select",
        required: true,
        options: [
          "LLC",
          "Joint Stock",
          "Sole Proprietorship",
          "Partnership",
          "Branch of Foreign Company",
        ],
      },
      {
        id: "capital",
        name: "capital",
        label: "Paid-up Capital",
        type: "currency",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
        id: "activities",
        name: "activities",
        label: "Business Activities",
        type: "multiselect",
        required: true,
        options: [
          "Import/Export",
          "Wholesale",
          "Retail",
          "Manufacturing",
          "Services",
          "Contracting",
          "Healthcare",
        ],
      },
      { id: "city", name: "city", label: "City", type: "text", required: true },
    ],
  },
  {
    id: "vat-certificate-upload",
    name: "VAT Registration Certificate",
    nameAr: "شهادة تسجيل ضريبة القيمة المضافة",
    category: "registration",
    subcategory: "tax",
    description: "Upload VAT registration certificate",
    icon: "Receipt",
    requiredFor: ["supplier", "tender"],
    fields: [
      {
        id: "vatNumber",
        name: "vatNumber",
        label: "VAT Number",
        labelAr: "الرقم الضريبي",
        type: "text",
        required: true,
        validation: { pattern: "^3[0-9]{13}3$" },
      },
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
      },
      {
        id: "registrationDate",
        name: "registrationDate",
        label: "Registration Date",
        type: "date",
        required: true,
      },
      {
        id: "status",
        name: "status",
        label: "Registration Status",
        type: "select",
        required: true,
        options: ["Active", "Suspended", "Cancelled"],
      },
    ],
  },
  {
    id: "zakat-certificate-upload",
    name: "Zakat & Tax Certificate",
    nameAr: "شهادة الزكاة والدخل",
    category: "registration",
    subcategory: "tax",
    description: "Upload Zakat certificate",
    icon: "FileText",
    requiredFor: ["supplier", "tender"],
    fields: [
      {
        id: "certificateNumber",
        name: "certificateNumber",
        label: "Certificate Number",
        labelAr: "رقم الشهادة",
        type: "text",
        required: true,
      },
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
      },
      {
        id: "taxNumber",
        name: "taxNumber",
        label: "Tax Number",
        type: "text",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
    ],
  },
  {
    id: "gosi-certificate-upload",
    name: "GOSI Certificate",
    nameAr: "شهادة التأمينات الاجتماعية",
    category: "registration",
    subcategory: "compliance",
    description: "Upload GOSI certificate",
    icon: "Users",
    requiredFor: ["supplier", "tender"],
    fields: [
      {
        id: "certificateNumber",
        name: "certificateNumber",
        label: "Certificate Number",
        type: "text",
        required: true,
      },
      {
        id: "establishmentNumber",
        name: "establishmentNumber",
        label: "Establishment Number",
        labelAr: "رقم المنشأة",
        type: "text",
        required: true,
      },
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
        id: "complianceStatus",
        name: "complianceStatus",
        label: "Compliance Status",
        type: "select",
        required: true,
        options: ["Compliant", "Non-Compliant", "Pending"],
      },
    ],
  },
  {
    id: "bank-guarantee-upload",
    name: "Bank Guarantee",
    nameAr: "خطاب ضمان بنكي",
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
      },
      {
        id: "bankName",
        name: "bankName",
        label: "Issuing Bank",
        type: "text",
        required: true,
      },
      {
        id: "bankBranch",
        name: "bankBranch",
        label: "Bank Branch",
        type: "text",
        required: false,
      },
      {
        id: "amount",
        name: "amount",
        label: "Guarantee Amount",
        type: "currency",
        required: true,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD"],
      },
      {
        id: "beneficiary",
        name: "beneficiary",
        label: "Beneficiary",
        type: "text",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
        id: "guaranteeType",
        name: "guaranteeType",
        label: "Guarantee Type",
        type: "select",
        required: true,
        options: [
          "Bid Bond",
          "Performance Bond",
          "Advance Payment",
          "Retention",
          "Credit Facility",
        ],
      },
    ],
  },
  {
    id: "insurance-certificate-upload",
    name: "Insurance Certificate",
    nameAr: "شهادة التأمين",
    category: "registration",
    subcategory: "compliance",
    description: "Upload insurance certificates",
    icon: "Shield",
    fields: [
      {
        id: "policyNumber",
        name: "policyNumber",
        label: "Policy Number",
        type: "text",
        required: true,
      },
      {
        id: "insuranceCompany",
        name: "insuranceCompany",
        label: "Insurance Company",
        type: "text",
        required: true,
      },
      {
        id: "insuredParty",
        name: "insuredParty",
        label: "Insured Party",
        type: "text",
        required: true,
      },
      {
        id: "insuranceType",
        name: "insuranceType",
        label: "Insurance Type",
        type: "multiselect",
        required: true,
        options: [
          "General Liability",
          "Professional Liability",
          "Product Liability",
          "Workers Compensation",
          "Property Insurance",
          "Medical Malpractice",
        ],
      },
      {
        id: "coverageAmount",
        name: "coverageAmount",
        label: "Coverage Amount",
        type: "currency",
        required: true,
      },
      {
        id: "startDate",
        name: "startDate",
        label: "Coverage Start Date",
        type: "date",
        required: true,
      },
      {
        id: "expiryDate",
        name: "expiryDate",
        label: "Coverage End Date",
        type: "date",
        required: true,
      },
    ],
  },
  {
    id: "authorized-signatory-upload",
    name: "Authorized Signatory Letter",
    nameAr: "خطاب المفوض بالتوقيع",
    category: "registration",
    subcategory: "legal",
    description: "Upload authorized signatory letters",
    icon: "Pen",
    requiredFor: ["supplier"],
    fields: [
      {
        id: "companyName",
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
      },
      {
        id: "authorizationScope",
        name: "authorizationScope",
        label: "Authorization Scope",
        type: "multiselect",
        required: true,
        options: [
          "Full Authority",
          "Contracts Only",
          "Financial Transactions",
          "Tender Submissions",
          "Banking",
          "Limited Authority",
        ],
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
        id: "resolutionNumber",
        name: "resolutionNumber",
        label: "Board Resolution Number",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "saudi-post-address-upload",
    name: "Saudi Post National Address",
    nameAr: "العنوان الوطني",
    category: "registration",
    subcategory: "address",
    description: "Upload Saudi Post national address certificate",
    icon: "MapPin",
    requiredFor: ["supplier"],
    fields: [
      {
        id: "shortAddress",
        name: "shortAddress",
        label: "Short Address",
        labelAr: "العنوان المختصر",
        type: "text",
        required: true,
      },
      {
        id: "buildingNumber",
        name: "buildingNumber",
        label: "Building Number",
        type: "text",
        required: true,
      },
      {
        id: "streetName",
        name: "streetName",
        label: "Street Name",
        type: "text",
        required: true,
      },
      {
        id: "district",
        name: "district",
        label: "District",
        type: "text",
        required: true,
      },
      { id: "city", name: "city", label: "City", type: "text", required: true },
      {
        id: "postalCode",
        name: "postalCode",
        label: "Postal Code",
        type: "text",
        required: true,
        validation: { pattern: "^[0-9]{5}$" },
      },
      {
        id: "additionalNumber",
        name: "additionalNumber",
        label: "Additional Number",
        type: "text",
        required: true,
      },
    ],
  },

  // SUPPLIER COMPLIANCE DOCUMENTS
  {
    id: "supplier-contract-upload",
    name: "Supplier Contract / Agreement",
    nameAr: "عقد المورد",
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
      },
      {
        id: "contractTitle",
        name: "contractTitle",
        label: "Contract Title",
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
        id: "contractType",
        name: "contractType",
        label: "Contract Type",
        type: "select",
        required: true,
        options: [
          "Supply Agreement",
          "Distribution Agreement",
          "Service Contract",
          "Maintenance Contract",
          "Framework Agreement",
          "Exclusive Distribution",
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
        required: false,
      },
      {
        id: "currency",
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: ["SAR", "USD", "EUR"],
      },
      {
        id: "autoRenewal",
        name: "autoRenewal",
        label: "Auto Renewal",
        type: "boolean",
        required: true,
      },
      {
        id: "noticePeriod",
        name: "noticePeriod",
        label: "Notice Period (days)",
        type: "number",
        required: false,
      },
      {
        id: "territory",
        name: "territory",
        label: "Territory/Region",
        type: "multiselect",
        required: false,
        options: ["Saudi Arabia", "GCC", "Middle East", "Worldwide"],
      },
      {
        id: "productCategories",
        name: "productCategories",
        label: "Product Categories",
        type: "multiselect",
        required: true,
        options: [
          "Medical Equipment",
          "Consumables",
          "Pharmaceuticals",
          "Services",
          "All Products",
        ],
      },
      {
        id: "exclusivity",
        name: "exclusivity",
        label: "Exclusivity",
        type: "select",
        required: true,
        options: ["Exclusive", "Non-Exclusive", "Semi-Exclusive"],
      },
    ],
  },
  {
    id: "loa-upload",
    name: "Letter of Authorization (LOA)",
    nameAr: "خطاب التفويض",
    category: "supplier_compliance",
    subcategory: "authorization",
    description: "Upload manufacturer letter of authorization",
    icon: "Award",
    fields: [
      {
        id: "loaNumber",
        name: "loaNumber",
        label: "LOA Reference Number",
        type: "text",
        required: false,
      },
      {
        id: "manufacturerName",
        name: "manufacturerName",
        label: "Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "manufacturerCountry",
        name: "manufacturerCountry",
        label: "Manufacturer Country",
        type: "text",
        required: true,
      },
      {
        id: "authorizedDistributor",
        name: "authorizedDistributor",
        label: "Authorized Distributor",
        type: "text",
        required: true,
      },
      {
        id: "authorizationType",
        name: "authorizationType",
        label: "Authorization Type",
        type: "select",
        required: true,
        options: [
          "Exclusive Distributor",
          "Non-Exclusive Distributor",
          "Authorized Agent",
          "Authorized Reseller",
          "Service Provider",
        ],
      },
      {
        id: "territory",
        name: "territory",
        label: "Territory",
        type: "multiselect",
        required: true,
        options: ["Saudi Arabia", "GCC", "Middle East", "MENA", "Worldwide"],
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
        id: "signatoryName",
        name: "signatoryName",
        label: "Signatory Name",
        type: "text",
        required: false,
      },
      {
        id: "signatoryTitle",
        name: "signatoryTitle",
        label: "Signatory Title",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "moci-letter-upload",
    name: "MOCI Letter / Agency Registration",
    nameAr: "خطاب وزارة التجارة",
    category: "supplier_compliance",
    subcategory: "authorization",
    description: "Upload Ministry of Commerce agency registration",
    icon: "Building2",
    fields: [
      {
        id: "registrationNumber",
        name: "registrationNumber",
        label: "Registration Number",
        labelAr: "رقم التسجيل",
        type: "text",
        required: true,
      },
      {
        id: "agentName",
        name: "agentName",
        label: "Agent/Distributor Name",
        type: "text",
        required: true,
      },
      {
        id: "principalName",
        name: "principalName",
        label: "Principal/Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "principalCountry",
        name: "principalCountry",
        label: "Principal Country",
        type: "text",
        required: true,
      },
      {
        id: "agencyType",
        name: "agencyType",
        label: "Agency Type",
        type: "select",
        required: true,
        options: ["Commercial Agency", "Distribution Agreement", "Franchise"],
      },
      {
        id: "productDescription",
        name: "productDescription",
        label: "Products/Services Covered",
        type: "textarea",
        required: true,
      },
      {
        id: "registrationDate",
        name: "registrationDate",
        label: "Registration Date",
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
    ],
  },
  {
    id: "fda-certificate-upload",
    name: "FDA Certificate / 510(k)",
    nameAr: "شهادة FDA",
    category: "supplier_compliance",
    subcategory: "regulatory",
    description: "Upload FDA certificates and 510(k) clearances",
    icon: "BadgeCheck",
    fields: [
      {
        id: "fdaNumber",
        name: "fdaNumber",
        label: "FDA/510(k) Number",
        type: "text",
        required: true,
      },
      {
        id: "certificateType",
        name: "certificateType",
        label: "Certificate Type",
        type: "select",
        required: true,
        options: [
          "510(k) Clearance",
          "PMA Approval",
          "De Novo",
          "FDA Registration",
          "Establishment Registration",
          "Device Listing",
        ],
      },
      {
        id: "deviceName",
        name: "deviceName",
        label: "Device/Product Name",
        type: "text",
        required: true,
      },
      {
        id: "deviceClass",
        name: "deviceClass",
        label: "Device Class",
        type: "select",
        required: true,
        options: ["Class I", "Class II", "Class III"],
      },
      {
        id: "productCode",
        name: "productCode",
        label: "Product Code",
        type: "text",
        required: false,
      },
      {
        id: "manufacturerName",
        name: "manufacturerName",
        label: "Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "clearanceDate",
        name: "clearanceDate",
        label: "Clearance/Approval Date",
        type: "date",
        required: true,
      },
      {
        id: "intendedUse",
        name: "intendedUse",
        label: "Intended Use",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "ce-marking-upload",
    name: "CE Marking Certificate",
    nameAr: "شهادة علامة CE",
    category: "supplier_compliance",
    subcategory: "regulatory",
    description: "Upload CE marking certificates",
    icon: "Shield",
    fields: [
      {
        id: "certificateNumber",
        name: "certificateNumber",
        label: "Certificate Number",
        type: "text",
        required: true,
      },
      {
        id: "certificateType",
        name: "certificateType",
        label: "Certificate Type",
        type: "select",
        required: true,
        options: [
          "EC Certificate",
          "Declaration of Conformity",
          "Technical File Review",
          "Type Examination Certificate",
        ],
      },
      {
        id: "notifiedBody",
        name: "notifiedBody",
        label: "Notified Body",
        type: "text",
        required: true,
      },
      {
        id: "notifiedBodyNumber",
        name: "notifiedBodyNumber",
        label: "Notified Body Number",
        type: "text",
        required: true,
      },
      {
        id: "manufacturerName",
        name: "manufacturerName",
        label: "Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "productName",
        name: "productName",
        label: "Product/Device Name",
        type: "text",
        required: true,
      },
      {
        id: "directive",
        name: "directive",
        label: "Applicable Directive",
        type: "multiselect",
        required: true,
        options: [
          "MDR 2017/745",
          "MDD 93/42/EEC",
          "IVDR 2017/746",
          "IVDD 98/79/EC",
          "LVD 2014/35/EU",
          "EMC 2014/30/EU",
        ],
      },
      {
        id: "classification",
        name: "classification",
        label: "Device Classification",
        type: "select",
        required: true,
        options: [
          "Class I",
          "Class IIa",
          "Class IIb",
          "Class III",
          "Class A",
          "Class B",
          "Class C",
          "Class D",
        ],
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
    ],
  },
  {
    id: "iso-certificate-upload",
    name: "ISO Certificate",
    nameAr: "شهادة ISO",
    category: "supplier_compliance",
    subcategory: "quality",
    description: "Upload ISO certification documents",
    icon: "Award",
    fields: [
      {
        id: "certificateNumber",
        name: "certificateNumber",
        label: "Certificate Number",
        type: "text",
        required: true,
      },
      {
        id: "isoStandard",
        name: "isoStandard",
        label: "ISO Standard",
        type: "multiselect",
        required: true,
        options: [
          "ISO 9001:2015",
          "ISO 13485:2016",
          "ISO 14001:2015",
          "ISO 45001:2018",
          "ISO 27001:2022",
          "ISO 22000:2018",
          "ISO 14971:2019",
        ],
      },
      {
        id: "certificationBody",
        name: "certificationBody",
        label: "Certification Body",
        type: "text",
        required: true,
      },
      {
        id: "accreditationBody",
        name: "accreditationBody",
        label: "Accreditation Body",
        type: "text",
        required: false,
      },
      {
        id: "companyName",
        name: "companyName",
        label: "Certified Organization",
        type: "text",
        required: true,
      },
      {
        id: "scope",
        name: "scope",
        label: "Certification Scope",
        type: "textarea",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
    ],
  },
  {
    id: "sfda-certificate-upload",
    name: "SFDA Certificate / Registration",
    nameAr: "شهادة هيئة الغذاء والدواء",
    category: "supplier_compliance",
    subcategory: "regulatory",
    description: "Upload SFDA medical device registration",
    icon: "BadgeCheck",
    fields: [
      {
        id: "sfdaNumber",
        name: "sfdaNumber",
        label: "SFDA Registration Number",
        labelAr: "رقم تسجيل الهيئة",
        type: "text",
        required: true,
      },
      {
        id: "certificateType",
        name: "certificateType",
        label: "Certificate Type",
        type: "select",
        required: true,
        options: [
          "Marketing Authorization",
          "Device Listing",
          "Establishment License",
          "Import License",
          "Free Sale Certificate",
        ],
      },
      {
        id: "deviceName",
        name: "deviceName",
        label: "Device/Product Name",
        type: "text",
        required: true,
      },
      {
        id: "deviceNameAr",
        name: "deviceNameAr",
        label: "Device Name (Arabic)",
        type: "text",
        required: false,
      },
      {
        id: "riskClass",
        name: "riskClass",
        label: "Risk Classification",
        type: "select",
        required: true,
        options: ["Class A", "Class B", "Class C", "Class D"],
      },
      {
        id: "manufacturerName",
        name: "manufacturerName",
        label: "Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "manufacturerCountry",
        name: "manufacturerCountry",
        label: "Country of Origin",
        type: "text",
        required: true,
      },
      {
        id: "localAgent",
        name: "localAgent",
        label: "Local Authorized Representative",
        type: "text",
        required: true,
      },
      {
        id: "issueDate",
        name: "issueDate",
        label: "Issue Date",
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
    ],
  },
  {
    id: "manufacturer-authorization-upload",
    name: "Manufacturer Authorization Letter",
    nameAr: "خطاب تفويض من المصنع",
    category: "supplier_compliance",
    subcategory: "authorization",
    description: "Upload manufacturer authorization letters for bids",
    icon: "FileSignature",
    fields: [
      {
        id: "referenceNumber",
        name: "referenceNumber",
        label: "Reference Number",
        type: "text",
        required: false,
      },
      {
        id: "manufacturerName",
        name: "manufacturerName",
        label: "Manufacturer Name",
        type: "text",
        required: true,
      },
      {
        id: "manufacturerCountry",
        name: "manufacturerCountry",
        label: "Manufacturer Country",
        type: "text",
        required: true,
      },
      {
        id: "authorizedCompany",
        name: "authorizedCompany",
        label: "Authorized Company",
        type: "text",
        required: true,
      },
      {
        id: "authorizationPurpose",
        name: "authorizationPurpose",
        label: "Authorization Purpose",
        type: "select",
        required: true,
        options: [
          "Tender Participation",
          "General Distribution",
          "Service Provision",
          "After-Sales Support",
          "Project Specific",
        ],
      },
      {
        id: "tenderReference",
        name: "tenderReference",
        label: "Tender/Project Reference",
        type: "text",
        required: false,
      },
      {
        id: "customerName",
        name: "customerName",
        label: "End Customer Name",
        type: "text",
        required: false,
      },
      {
        id: "letterDate",
        name: "letterDate",
        label: "Letter Date",
        type: "date",
        required: true,
      },
      {
        id: "validUntil",
        name: "validUntil",
        label: "Valid Until",
        type: "date",
        required: false,
      },
      {
        id: "signatoryName",
        name: "signatoryName",
        label: "Signatory Name",
        type: "text",
        required: true,
      },
      {
        id: "signatoryTitle",
        name: "signatoryTitle",
        label: "Signatory Title",
        type: "text",
        required: true,
      },
    ],
  },
];

// =============================================================================
// COMPONENT IMPLEMENTATION
// =============================================================================

interface ComprehensiveDocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: TemplateCategory;
  defaultTemplate?: string;
  onSuccess?: (result: any) => void;
}

type WizardStep =
  | "select-template"
  | "upload-file"
  | "extract-data"
  | "review-confirm";
type ViewMode = "grid" | "list";

export function ComprehensiveDocumentUpload({
  open,
  onOpenChange,
  defaultCategory,
  defaultTemplate,
  onSuccess,
}: ComprehensiveDocumentUploadProps) {
  const queryClient = useQueryClient();

  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-template");
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | "all"
  >(defaultCategory || "all");
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(
      defaultTemplate
        ? DOCUMENT_TEMPLATES.find(t => t.id === defaultTemplate) || null
        : null
    );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(
    null
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Fetch data for dropdowns
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const { data: customers = [] } = trpc.customers.list.useQuery();

  // Filter templates based on category and search
  const filteredTemplates = useMemo(() => {
    return DOCUMENT_TEMPLATES.filter(t => {
      const matchesCategory =
        selectedCategory === "all" || t.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subcategory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Group templates by subcategory
  const templatesBySubcategory = useMemo(() => {
    const groups: Record<string, DocumentTemplate[]> = {};
    filteredTemplates.forEach(t => {
      if (!groups[t.subcategory]) {
        groups[t.subcategory] = [];
      }
      groups[t.subcategory].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setCurrentStep("select-template");
    setSelectedTemplate(null);
    setUploadedFiles([]);
    setExtractedData(null);
    setFormData({});
    setIsExtracting(false);
    setExtractionProgress(0);
    setExtractionStatus("");
    setSearchQuery("");
  }, []);

  // Handle template selection
  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep("upload-file");
  };

  // Handle file upload
  const handleFilesSelected = async (files: File[]) => {
    setUploadedFiles(files);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Perform AI extraction
  const performExtraction = async () => {
    if (uploadedFiles.length === 0 || !selectedTemplate) return;

    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionStatus("Uploading document...");

    try {
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      setExtractionStatus("Performing OCR extraction...");
      const file = uploadedFiles[0];
      const base64 = await fileToBase64(file);

      setExtractionStatus("Analyzing document with AI...");

      // Map template category to document type
      const documentTypeMap: Record<string, string> = {
        data_upload: "suppliers",
        financial: "invoices",
        tender_submission: "tenders",
        registration: "suppliers",
        supplier_compliance: "suppliers",
      };

      const response = await trpcClient.documents.extractFromBase64.mutate({
        fileData: base64,
        fileName: file.name,
        documentType:
          (documentTypeMap[selectedTemplate.category] as any) || "tenders",
      });

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setExtractionStatus("Extraction complete!");

      if (response.extractedData) {
        setExtractedData(response.extractedData);

        // Auto-populate form fields
        const populatedData: Record<string, any> = {};
        selectedTemplate.fields.forEach(field => {
          const extracted = response.extractedData[field.name];
          if (extracted?.value) {
            populatedData[field.name] = extracted.value;
          }
        });
        setFormData(populatedData);
      }

      setCurrentStep("extract-data");
      toast.success("Document extracted successfully!");
    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Extraction failed. Please fill in the fields manually.");
      setCurrentStep("extract-data");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle form field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9)
      return (
        <Badge className="bg-green-100 text-green-800">
          High ({Math.round(confidence * 100)}%)
        </Badge>
      );
    if (confidence >= 0.7)
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Medium ({Math.round(confidence * 100)}%)
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-800">
        Low ({Math.round(confidence * 100)}%)
      </Badge>
    );
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return <IconComponent className="h-5 w-5" />;
  };

  // Render field based on type
  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || "";

    switch (field.type) {
      case "file":
        return null;
      case "select": {
        let options: { value: string; label: string }[] = [];
        if (field.name === "supplierId") {
          options = suppliers.map((s: any) => ({
            value: s.id.toString(),
            label: s.name,
          }));
        } else if (field.name === "customerId") {
          options = customers.map((c: any) => ({
            value: c.id.toString(),
            label: c.name,
          }));
        } else if (field.options) {
          options = field.options.map(o => ({ value: o, label: o }));
        }
        return (
          <Select
            value={value}
            onValueChange={v => handleFieldChange(field.name, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "multiselect": {
        const multiOptions = field.options || [];
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {multiOptions.map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${opt}`}
                  checked={selectedValues.includes(opt)}
                  onCheckedChange={checked => {
                    const newValues = checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v: string) => v !== opt);
                    handleFieldChange(field.name, newValues);
                  }}
                />
                <label htmlFor={`${field.id}-${opt}`} className="text-sm">
                  {opt}
                </label>
              </div>
            ))}
          </div>
        );
      }
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      case "currency":
      case "number":
        return (
          <Input
            type="number"
            step={field.type === "currency" ? "0.01" : "1"}
            placeholder={field.placeholder}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            rows={3}
          />
        );
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={checked =>
                handleFieldChange(field.name, checked)
              }
            />
            <label htmlFor={field.id} className="text-sm">
              Yes
            </label>
          </div>
        );
      case "email":
        return (
          <Input
            type="email"
            placeholder={field.placeholder || "email@example.com"}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      case "phone":
        return (
          <Input
            type="tel"
            placeholder={field.placeholder || "+966 XX XXX XXXX"}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    try {
      const missingFields = selectedTemplate.fields
        .filter(f => f.required && f.type !== "file" && !formData[f.name])
        .map(f => f.label);

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      // Upload file if present
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        const base64 = await fileToBase64(file);

        await trpcClient.files.uploadToS3.mutate({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          base64Data: base64,
          entityType: selectedTemplate.category,
          entityId: 0,
        });
      }

      toast.success(`${selectedTemplate.name} uploaded successfully!`);
      onSuccess?.({ template: selectedTemplate, data: formData });
      onOpenChange(false);
      resetWizard();
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Failed to upload document. Please try again.");
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "select-template":
        return (
          <div className="space-y-4">
            {/* Category Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={selectedCategory}
                onValueChange={v =>
                  setSelectedCategory(v as TemplateCategory | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Template Count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredTemplates.length} of {DOCUMENT_TEMPLATES.length}{" "}
              templates
            </div>

            {/* Templates Grid/List */}
            <ScrollArea className="h-[400px] pr-4">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTemplates.map(template => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                        selectedTemplate?.id === template.id
                          ? "border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getIcon(template.icon)}
                            </div>
                            <div>
                              <CardTitle className="text-sm leading-tight">
                                {template.name}
                              </CardTitle>
                              {template.nameAr && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {template.nameAr}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {template.description}
                        </p>
                        <Badge
                          className={categoryLabels[template.category].color}
                          variant="secondary"
                        >
                          {categoryLabels[template.category].label}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(templatesBySubcategory).map(
                    ([subcategory, templates]) => (
                      <div key={subcategory}>
                        <h4 className="text-sm font-medium text-muted-foreground capitalize mb-2 mt-4 first:mt-0">
                          {subcategory.replace(/_/g, " ")}
                        </h4>
                        {templates.map(template => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer transition-all hover:border-primary mb-2 ${
                              selectedTemplate?.id === template.id
                                ? "border-primary ring-2 ring-primary/20"
                                : ""
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                {getIcon(template.icon)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {template.name}
                                  </span>
                                  <Badge
                                    className={
                                      categoryLabels[template.category].color
                                    }
                                    variant="secondary"
                                  >
                                    {categoryLabels[template.category].label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {template.description}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case "upload-file":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                {selectedTemplate && getIcon(selectedTemplate.icon)}
              </div>
              <div>
                <h3 className="font-medium">{selectedTemplate?.name}</h3>
                {selectedTemplate?.nameAr && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.nameAr}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate?.description}
                </p>
              </div>
            </div>

            <FileUpload
              onFilesSelected={handleFilesSelected}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
              multiple={false}
              maxSize={25}
              maxFiles={1}
            />

            {uploadedFiles.length > 0 && !isExtracting && (
              <Button onClick={performExtraction} className="w-full">
                <Wand2 className="h-4 w-4 mr-2" />
                Extract Data with AI
              </Button>
            )}

            {isExtracting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{extractionStatus}</span>
                </div>
                <Progress value={extractionProgress} />
              </div>
            )}
          </div>
        );

      case "extract-data":
        return (
          <div className="space-y-6">
            <Tabs defaultValue="extracted" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="extracted">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extracted Data
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Fields
                </TabsTrigger>
              </TabsList>

              <TabsContent value="extracted" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {extractedData ? (
                    <div className="space-y-3">
                      {selectedTemplate?.fields
                        .filter(f => f.type !== "file")
                        .map(field => {
                          const extracted = extractedData[field.name];
                          return (
                            <div
                              key={field.id}
                              className="flex items-start justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {field.label}
                                </p>
                                <p className="text-sm">
                                  {extracted?.value || formData[field.name] || (
                                    <span className="text-muted-foreground italic">
                                      Not extracted
                                    </span>
                                  )}
                                </p>
                              </div>
                              {extracted && (
                                <div className="flex items-center gap-2">
                                  {getConfidenceBadge(extracted.confidence)}
                                  <Badge variant="outline" className="text-xs">
                                    {extracted.source === "ai_inference"
                                      ? "AI"
                                      : "OCR"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>
                        No data was extracted. Please fill in the fields
                        manually.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="grid gap-4">
                    {selectedTemplate?.fields
                      .filter(f => f.type !== "file")
                      .map(field => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>
                            {field.label}
                            {field.labelAr && (
                              <span className="text-muted-foreground ml-2">
                                ({field.labelAr})
                              </span>
                            )}
                            {field.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          {renderField(field)}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        );

      case "review-confirm":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Ready to Submit</h3>
                <p className="text-sm text-green-700">
                  Review the information below and confirm.
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">
                        Document Type
                      </span>
                      <span className="font-medium">
                        {selectedTemplate?.name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">File</span>
                      <span className="font-medium">
                        {uploadedFiles[0]?.name || "No file"}
                      </span>
                    </div>
                    {selectedTemplate?.fields
                      .filter(f => f.type !== "file" && formData[f.name])
                      .map(field => (
                        <div
                          key={field.id}
                          className="flex justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-muted-foreground">
                            {field.label}
                          </span>
                          <span className="font-medium text-right max-w-[200px] truncate">
                            {Array.isArray(formData[field.name])
                              ? formData[field.name].join(", ")
                              : formData[field.name]}
                          </span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  // Navigation buttons
  const renderNavigation = () => {
    const canGoBack = currentStep !== "select-template";
    const canGoNext =
      (currentStep === "select-template" && selectedTemplate) ||
      (currentStep === "upload-file" &&
        uploadedFiles.length > 0 &&
        !isExtracting) ||
      currentStep === "extract-data";

    const handleNext = () => {
      if (currentStep === "select-template") {
        setCurrentStep("upload-file");
      } else if (currentStep === "upload-file") {
        if (extractedData) {
          setCurrentStep("extract-data");
        } else {
          performExtraction();
        }
      } else if (currentStep === "extract-data") {
        setCurrentStep("review-confirm");
      } else if (currentStep === "review-confirm") {
        handleSubmit();
      }
    };

    const handleBack = () => {
      if (currentStep === "upload-file") {
        setCurrentStep("select-template");
      } else if (currentStep === "extract-data") {
        setCurrentStep("upload-file");
      } else if (currentStep === "review-confirm") {
        setCurrentStep("extract-data");
      }
    };

    return (
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleBack} disabled={!canGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canGoNext}>
          {currentStep === "review-confirm" ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit Document
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    );
  };

  // Step indicator
  const steps = [
    { id: "select-template", label: "Select Type", icon: FileText },
    { id: "upload-file", label: "Upload", icon: Upload },
    { id: "extract-data", label: "Extract", icon: Wand2 },
    { id: "review-confirm", label: "Confirm", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Document Upload Center
          </DialogTitle>
          <DialogDescription>
            Upload and process documents with AI-powered data extraction
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between py-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}
                >
                  <div
                    className={`p-2 rounded-full ${isActive ? "bg-primary/10" : isCompleted ? "bg-green-100" : "bg-muted"}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-0.5 mx-2 ${index < currentStepIndex ? "bg-green-500" : "bg-muted"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden">{renderStepContent()}</div>

        {/* Navigation */}
        {renderNavigation()}
      </DialogContent>
    </Dialog>
  );
}

export default ComprehensiveDocumentUpload;

// =============================================================================
// EXPORT HELPER FUNCTIONS FOR CHECKLISTS
// =============================================================================

export function getTenderSubmissionChecklist() {
  return [
    {
      document: "Tender Document (RFP/RFQ)",
      templateId: "tender-document-upload",
      required: true,
    },
    {
      document: "Technical Proposal",
      templateId: "technical-proposal-upload",
      required: true,
    },
    {
      document: "Financial Proposal",
      templateId: "financial-proposal-upload",
      required: true,
    },
    {
      document: "Bid Bond / Bank Guarantee",
      templateId: "bid-bond-upload",
      required: true,
    },
    {
      document: "Company Profile",
      templateId: "company-profile-upload",
      required: true,
    },
    {
      document: "Past Experience / References",
      templateId: "past-experience-upload",
      required: true,
    },
    {
      document: "Technical Compliance Statement",
      templateId: "technical-compliance-upload",
      required: true,
    },
    {
      document: "Commercial Registration",
      templateId: "commercial-registration-upload",
      required: true,
    },
    {
      document: "VAT Certificate",
      templateId: "vat-certificate-upload",
      required: true,
    },
    {
      document: "Zakat Certificate",
      templateId: "zakat-certificate-upload",
      required: true,
    },
    {
      document: "GOSI Certificate",
      templateId: "gosi-certificate-upload",
      required: true,
    },
    {
      document: "Manufacturer Authorization",
      templateId: "manufacturer-authorization-upload",
      required: false,
    },
    {
      document: "Letter of Authorization (LOA)",
      templateId: "loa-upload",
      required: false,
    },
    {
      document: "FDA/CE Certificates",
      templateId: "fda-certificate-upload",
      required: false,
    },
    {
      document: "SFDA Registration",
      templateId: "sfda-certificate-upload",
      required: false,
    },
  ];
}

export function getSupplierRegistrationChecklist() {
  return [
    {
      document: "Commercial Registration",
      templateId: "commercial-registration-upload",
      required: true,
    },
    {
      document: "VAT Certificate",
      templateId: "vat-certificate-upload",
      required: true,
    },
    {
      document: "Zakat Certificate",
      templateId: "zakat-certificate-upload",
      required: true,
    },
    {
      document: "GOSI Certificate",
      templateId: "gosi-certificate-upload",
      required: true,
    },
    {
      document: "National Address",
      templateId: "saudi-post-address-upload",
      required: true,
    },
    {
      document: "Bank Guarantee",
      templateId: "bank-guarantee-upload",
      required: false,
    },
    {
      document: "Insurance Certificate",
      templateId: "insurance-certificate-upload",
      required: false,
    },
    {
      document: "Authorized Signatory",
      templateId: "authorized-signatory-upload",
      required: true,
    },
    {
      document: "Company Profile",
      templateId: "company-profile-upload",
      required: true,
    },
    {
      document: "ISO Certificates",
      templateId: "iso-certificate-upload",
      required: false,
    },
  ];
}

export function getSupplierComplianceChecklist() {
  return [
    {
      document: "Supplier Contract",
      templateId: "supplier-contract-upload",
      required: true,
    },
    {
      document: "Letter of Authorization (LOA)",
      templateId: "loa-upload",
      required: true,
    },
    {
      document: "MOCI Agency Letter",
      templateId: "moci-letter-upload",
      required: false,
    },
    {
      document: "FDA Certificate",
      templateId: "fda-certificate-upload",
      required: false,
    },
    {
      document: "CE Marking Certificate",
      templateId: "ce-marking-upload",
      required: false,
    },
    {
      document: "ISO Certificate",
      templateId: "iso-certificate-upload",
      required: false,
    },
    {
      document: "SFDA Registration",
      templateId: "sfda-certificate-upload",
      required: true,
    },
    {
      document: "Manufacturer Authorization",
      templateId: "manufacturer-authorization-upload",
      required: false,
    },
  ];
}

export { categoryLabels, DOCUMENT_TEMPLATES };
export type { DocumentTemplate, TemplateCategory, TemplateField };
