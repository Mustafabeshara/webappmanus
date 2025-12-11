import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Edit3,
  RefreshCw,
  FileCheck,
  Sparkles,
} from "lucide-react";

// Document template types
interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "select" | "multiselect" | "file" | "table";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

interface DocumentTemplate {
  id: string;
  name: string;
  module: string;
  description: string;
  fields: TemplateField[];
  icon: string;
}

interface ExtractedField {
  value: any;
  confidence: number;
  source: "ocr" | "ai_inference" | "template_match";
}

interface ExtractionResult {
  [fieldName: string]: ExtractedField;
}

// Available document templates
const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tender-upload",
    name: "Tender Document",
    module: "tenders",
    description: "Upload tender documents with automatic extraction of requirements, deadlines, and specifications",
    icon: "FileText",
    fields: [
      { id: "document", name: "document", label: "Tender Document", type: "file", required: true, placeholder: "Upload PDF, DOC, or image" },
      { id: "tenderNumber", name: "tenderNumber", label: "Tender Reference Number", type: "text", required: true, placeholder: "e.g., RFP-2024-001" },
      { id: "title", name: "title", label: "Tender Title", type: "text", required: true, placeholder: "Brief description of the tender" },
      { id: "customerId", name: "customerId", label: "Customer/Organization", type: "select", required: true, options: [] },
      { id: "submissionDeadline", name: "submissionDeadline", label: "Submission Deadline", type: "date", required: true },
      { id: "estimatedValue", name: "estimatedValue", label: "Estimated Value", type: "currency", required: false, placeholder: "0.00" },
      { id: "department", name: "department", label: "Department", type: "text", required: false, placeholder: "e.g., Ministry of Health" },
    ],
  },
  {
    id: "invoice-upload",
    name: "Invoice",
    module: "invoices",
    description: "Process supplier invoices with automatic line item extraction and amount validation",
    icon: "Receipt",
    fields: [
      { id: "invoiceDocument", name: "invoiceDocument", label: "Invoice Document", type: "file", required: true },
      { id: "invoiceNumber", name: "invoiceNumber", label: "Invoice Number", type: "text", required: true },
      { id: "supplierId", name: "supplierId", label: "Supplier", type: "select", required: true, options: [] },
      { id: "invoiceDate", name: "invoiceDate", label: "Invoice Date", type: "date", required: true },
      { id: "dueDate", name: "dueDate", label: "Due Date", type: "date", required: true },
      { id: "totalAmount", name: "totalAmount", label: "Total Amount", type: "currency", required: true },
      { id: "poNumber", name: "poNumber", label: "Purchase Order Number", type: "text", required: false },
    ],
  },
  {
    id: "catalog-upload",
    name: "Product Catalog",
    module: "products",
    description: "Upload supplier catalogs to extract products with descriptions, specs, and pricing",
    icon: "BookOpen",
    fields: [
      { id: "catalogDocument", name: "catalogDocument", label: "Catalog Document", type: "file", required: true },
      { id: "supplierId", name: "supplierId", label: "Supplier", type: "select", required: true, options: [] },
      { id: "catalogName", name: "catalogName", label: "Catalog Name/Version", type: "text", required: true, placeholder: "e.g., 2024 Product Catalog v2.1" },
      { id: "effectiveDate", name: "effectiveDate", label: "Effective Date", type: "date", required: true },
      { id: "currency", name: "currency", label: "Currency", type: "select", required: true, options: ["USD", "EUR", "SAR", "AED", "GBP"] },
    ],
  },
  {
    id: "pricelist-upload",
    name: "Price List",
    module: "pricing",
    description: "Upload supplier price lists with OCR extraction of product pricing",
    icon: "DollarSign",
    fields: [
      { id: "priceListDocument", name: "priceListDocument", label: "Price List Document", type: "file", required: true },
      { id: "supplierId", name: "supplierId", label: "Supplier", type: "select", required: true, options: [] },
      { id: "priceListName", name: "priceListName", label: "Price List Name", type: "text", required: true },
      { id: "effectiveDate", name: "effectiveDate", label: "Effective Date", type: "date", required: true },
      { id: "expiryDate", name: "expiryDate", label: "Expiry Date", type: "date", required: false },
      { id: "currency", name: "currency", label: "Currency", type: "select", required: true, options: ["USD", "EUR", "SAR", "AED"] },
    ],
  },
  {
    id: "po-upload",
    name: "Purchase Order",
    module: "purchase_orders",
    description: "Process purchase order documents with automatic data extraction",
    icon: "ShoppingCart",
    fields: [
      { id: "poDocument", name: "poDocument", label: "Purchase Order Document", type: "file", required: true },
      { id: "poNumber", name: "poNumber", label: "PO Number", type: "text", required: true },
      { id: "supplierId", name: "supplierId", label: "Supplier", type: "select", required: true, options: [] },
      { id: "orderDate", name: "orderDate", label: "Order Date", type: "date", required: true },
      { id: "expectedDeliveryDate", name: "expectedDeliveryDate", label: "Expected Delivery Date", type: "date", required: false },
      { id: "totalAmount", name: "totalAmount", label: "Total Amount", type: "currency", required: true },
    ],
  },
  {
    id: "supplier-upload",
    name: "Supplier Registration",
    module: "suppliers",
    description: "Register new suppliers with company documents and certifications",
    icon: "Building2",
    fields: [
      { id: "companyDocument", name: "companyDocument", label: "Company Registration Document", type: "file", required: true },
      { id: "name", name: "name", label: "Company Name", type: "text", required: true },
      { id: "taxId", name: "taxId", label: "Tax ID / Registration Number", type: "text", required: true },
      { id: "contactPerson", name: "contactPerson", label: "Contact Person", type: "text", required: true },
      { id: "email", name: "email", label: "Email Address", type: "text", required: true },
      { id: "phone", name: "phone", label: "Phone Number", type: "text", required: true },
      { id: "address", name: "address", label: "Business Address", type: "text", required: true },
    ],
  },
];

interface DocumentUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTemplate?: string;
  onSuccess?: (result: any) => void;
}

type WizardStep = "select-template" | "upload-file" | "extract-data" | "review-confirm";

export function DocumentUploadWizard({
  open,
  onOpenChange,
  defaultTemplate,
  onSuccess,
}: DocumentUploadWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-template");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(
    defaultTemplate ? DOCUMENT_TEMPLATES.find(t => t.id === defaultTemplate) || null : null
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState<string>("");

  // Fetch suppliers for dropdowns
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Fetch customers for dropdowns
  const { data: customers = [] } = trpc.customers.list.useQuery();

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setCurrentStep("select-template");
    setSelectedTemplate(defaultTemplate ? DOCUMENT_TEMPLATES.find(t => t.id === defaultTemplate) || null : null);
    setUploadedFiles([]);
    setExtractedData(null);
    setFormData({});
    setIsExtracting(false);
    setExtractionProgress(0);
    setExtractionStatus("");
  }, [defaultTemplate]);

  // Handle template selection
  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep("upload-file");
  };

  // Handle file upload and trigger extraction
  const handleFilesSelected = async (files: File[]) => {
    setUploadedFiles(files);
  };

  // Perform AI extraction
  const performExtraction = async () => {
    if (uploadedFiles.length === 0 || !selectedTemplate) return;

    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionStatus("Uploading document...");

    try {
      // Simulate extraction progress
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

      // Convert file to base64
      const file = uploadedFiles[0];
      const base64 = await fileToBase64(file);

      // Call extraction API
      setExtractionStatus("Analyzing document with AI...");

      const response = await trpcClient.documents.extractFromBase64.mutate({
        fileData: base64,
        fileName: file.name,
        documentType: selectedTemplate.module as any,
      });

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setExtractionStatus("Extraction complete!");

      // Map extracted data to form fields
      if (response.extractedData) {
        setExtractedData(response.extractedData);

        // Auto-populate form fields from extraction
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

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle form field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    try {
      // Validate required fields
      const missingFields = selectedTemplate.fields
        .filter(f => f.required && f.type !== "file" && !formData[f.name])
        .map(f => f.label);

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      // Upload file first
      let fileId = null;
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        const base64 = await fileToBase64(file);

        const uploadResult = await trpcClient.files.uploadToS3.mutate({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          base64Data: base64,
          entityType: selectedTemplate.module,
          entityId: 0, // Will be updated after entity creation
        });

        fileId = uploadResult.id;
      }

      // Create entity based on template type
      let result;
      switch (selectedTemplate.module) {
        case "tenders":
          result = await trpcClient.tenders.create.mutate({
            referenceNumber: formData.tenderNumber,
            title: formData.title,
            customerId: parseInt(formData.customerId),
            submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline) : null,
            estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) * 100 : null,
            department: formData.department || null,
            status: "draft",
          });
          break;
        case "invoices":
          result = await trpcClient.invoices.create.mutate({
            invoiceNumber: formData.invoiceNumber,
            supplierId: parseInt(formData.supplierId),
            issueDate: new Date(formData.invoiceDate),
            dueDate: new Date(formData.dueDate),
            totalAmount: parseFloat(formData.totalAmount) * 100,
            status: "pending",
            items: [],
          });
          break;
        case "suppliers":
          result = await trpcClient.suppliers.create.mutate({
            name: formData.name,
            code: formData.taxId,
            contactPerson: formData.contactPerson,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          });
          break;
        default:
          toast.info("Document uploaded successfully. Entity creation for this type is not yet implemented.");
          result = { success: true };
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [selectedTemplate.module] });

      toast.success(`${selectedTemplate.name} created successfully!`);
      onSuccess?.(result);
      onOpenChange(false);
      resetWizard();
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Failed to create record. Please try again.");
    }
  };

  // Get confidence badge color
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge className="bg-green-100 text-green-800">High ({Math.round(confidence * 100)}%)</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-100 text-yellow-800">Medium ({Math.round(confidence * 100)}%)</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low ({Math.round(confidence * 100)}%)</Badge>;
  };

  // Render field based on type
  const renderField = (field: TemplateField) => {
    const extractedField = extractedData?.[field.name];
    const value = formData[field.name] || "";

    switch (field.type) {
      case "file":
        return null; // File already uploaded
      case "select":
        let options: { value: string; label: string }[] = [];
        if (field.name === "supplierId") {
          options = suppliers.map((s: any) => ({ value: s.id.toString(), label: s.name }));
        } else if (field.name === "customerId") {
          options = customers.map((c: any) => ({ value: c.id.toString(), label: c.name }));
        } else if (field.options) {
          options = field.options.map(o => ({ value: o, label: o }));
        }
        return (
          <Select value={value} onValueChange={v => handleFieldChange(field.name, v)}>
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
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      case "currency":
        return (
          <Input
            type="number"
            step="0.01"
            placeholder={field.placeholder}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
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

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "select-template":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DOCUMENT_TEMPLATES.map(template => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    selectedTemplate?.id === template.id ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "upload-file":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-medium">{selectedTemplate?.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedTemplate?.description}</p>
              </div>
            </div>

            <FileUpload
              onFilesSelected={handleFilesSelected}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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

              <TabsContent value="extracted" className="space-y-4 mt-4">
                {extractedData ? (
                  <div className="space-y-3">
                    {selectedTemplate?.fields
                      .filter(f => f.type !== "file")
                      .map(field => {
                        const extracted = extractedData[field.name];
                        return (
                          <div key={field.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{field.label}</p>
                              <p className="text-sm">
                                {extracted?.value || formData[field.name] || (
                                  <span className="text-muted-foreground italic">Not extracted</span>
                                )}
                              </p>
                            </div>
                            {extracted && (
                              <div className="flex items-center gap-2">
                                {getConfidenceBadge(extracted.confidence)}
                                <Badge variant="outline" className="text-xs">
                                  {extracted.source === "ai_inference" ? "AI" : "OCR"}
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
                    <p>No data was extracted. Please fill in the fields manually.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {selectedTemplate?.fields
                    .filter(f => f.type !== "file")
                    .map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                        {extractedData?.[field.name] && (
                          <p className="text-xs text-muted-foreground">
                            AI extracted: {extractedData[field.name].value}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
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
                <p className="text-sm text-green-700">Review the information below and confirm.</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Document Type</span>
                  <span className="font-medium">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">File</span>
                  <span className="font-medium">{uploadedFiles[0]?.name}</span>
                </div>
                {selectedTemplate?.fields
                  .filter(f => f.type !== "file" && formData[f.name])
                  .map(field => (
                    <div key={field.id} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-medium">{formData[field.name]}</span>
                    </div>
                  ))}
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
      (currentStep === "upload-file" && uploadedFiles.length > 0 && !isExtracting) ||
      (currentStep === "extract-data");

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
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canGoNext}
        >
          {currentStep === "review-confirm" ? (
            <>
              <FileCheck className="h-4 w-4 mr-2" />
              Create Record
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Upload Wizard
          </DialogTitle>
          <DialogDescription>
            Upload documents and let AI extract data automatically
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                  <div className={`p-2 rounded-full ${isActive ? "bg-primary/10" : isCompleted ? "bg-green-100" : "bg-muted"}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-2 ${index < currentStepIndex ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {renderNavigation()}
      </DialogContent>
    </Dialog>
  );
}

export default DocumentUploadWizard;
