import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormField,
  FormSection,
  FormActions,
  ValidatedInput,
  ValidatedTextarea,
  CharacterCounter,
} from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import {
  validateRequired,
  validateMinLength,
  validateDate,
} from "@/lib/validation";
import { Loader2, Plus, Trash2, AlertCircle, DollarSign, Upload, FileText, CheckCircle2 } from "lucide-react";
import { useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface TenderItem {
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
}

interface FormErrors {
  title?: string;
  description?: string;
  submissionDeadline?: string;
  evaluationDeadline?: string;
  items?: string;
}

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_REQUIREMENTS_LENGTH = 5000;

export default function CreateTender() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    terms: "",
    estimatedValue: "",
    submissionDeadline: "",
    evaluationDeadline: "",
  });

  const [items, setItems] = useState<TenderItem[]>([
    { description: "", quantity: 1, unit: "piece", estimatedPrice: 0 },
  ]);

  // OCR upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<{
    success: boolean;
    referenceNumber?: string;
    itemsCount?: number;
    confidence?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR upload mutation
  const ocrMutation = trpc.tenderOCR.uploadAndExtract.useMutation({
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress(100);

      if (data.extraction) {
        // Auto-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          title: data.extraction.title || prev.title,
          description: data.extraction.specifications_text || prev.description,
        }));

        // Auto-fill items if extracted
        if (data.extraction.items && data.extraction.items.length > 0) {
          const extractedItems: TenderItem[] = data.extraction.items.map((item) => ({
            description: item.description || "",
            quantity: parseInt(item.quantity) || 1,
            unit: item.unit || "piece",
            estimatedPrice: 0,
          }));
          setItems(extractedItems);
        }

        // If deadline was extracted
        if (data.extraction.closing_date) {
          try {
            let dateStr = '';
            const closingDate = data.extraction.closing_date;

            // Handle ISO format (YYYY-MM-DD) from backend
            if (closingDate.includes('-') && closingDate.length === 10) {
              dateStr = `${closingDate}T12:00`;
            }
            // Handle DD/MM/YYYY format (legacy)
            else if (closingDate.includes('/')) {
              const parts = closingDate.split('/');
              if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00`;
              }
            }

            if (dateStr) {
              setFormData(prev => ({ ...prev, submissionDeadline: dateStr }));
            }
          } catch {
            // Ignore date parsing errors
          }
        }

        setOcrResult({
          success: true,
          referenceNumber: data.extraction.reference_number,
          itemsCount: data.extraction.items_count,
          confidence: data.extraction.ocr_confidence,
        });

        toast.success(`Extracted ${data.extraction.items_count || 0} items from PDF`);
      }
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(`OCR extraction failed: ${error.message}`);
    },
  });

  // Handle PDF file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setOcrResult(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadProgress(30);

      ocrMutation.mutate({
        fileName: file.name,
        fileData: base64,
        department: "Biomedical Engineering",
        saveToTender: false,
      });
      setUploadProgress(50);
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  }, [ocrMutation]);

  // Validation functions
  const validateField = useCallback(
    (field: string, value: unknown): string | undefined => {
      switch (field) {
        case "title": {
          const required = validateRequired(value as string, "Title");
          if (!required.valid) return required.error;
          const minLen = validateMinLength(value as string, 5, "Title");
          if (!minLen.valid) return minLen.error;
          return undefined;
        }
        case "submissionDeadline": {
          if (!value) return undefined;
          const dateResult = validateDate(
            value as string,
            "Submission deadline"
          );
          if (!dateResult.valid) return dateResult.error;
          return undefined;
        }
        case "evaluationDeadline": {
          if (!value) return undefined;
          const dateResult = validateDate(
            value as string,
            "Evaluation deadline"
          );
          if (!dateResult.valid) return dateResult.error;
          // Must be after submission deadline
          if (formData.submissionDeadline && value) {
            const subDate = new Date(formData.submissionDeadline);
            const evalDate = new Date(value as string);
            if (evalDate <= subDate) {
              return "Evaluation deadline must be after submission deadline";
            }
          }
          return undefined;
        }
        default:
          return undefined;
      }
    },
    [formData.submissionDeadline]
  );

  // Validate all fields before submission
  const validateAll = useCallback(() => {
    const newErrors: FormErrors = {};

    const titleError = validateField("title", formData.title);
    if (titleError) newErrors.title = titleError;

    const subDeadlineError = validateField(
      "submissionDeadline",
      formData.submissionDeadline
    );
    if (subDeadlineError) newErrors.submissionDeadline = subDeadlineError;

    const evalDeadlineError = validateField(
      "evaluationDeadline",
      formData.evaluationDeadline
    );
    if (evalDeadlineError) newErrors.evaluationDeadline = evalDeadlineError;

    // Validate items
    const validItems = items.filter((item) => item.description.trim() !== "");
    if (validItems.length === 0) {
      newErrors.items = "At least one tender item is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, items, validateField]);

  // Handle field change with validation
  const handleChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Validate on change if field was already touched
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField]
  );

  // Handle field blur - mark as touched and validate
  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, formData[field as keyof typeof formData]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [formData, validateField]
  );

  const createMutation = trpc.tenders.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Tender created successfully! Reference: ${data.referenceNumber}`
      );
      setLocation("/tenders");
    },
    onError: (error) => {
      toast.error(`Failed to create tender: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      title: true,
      description: true,
      submissionDeadline: true,
      evaluationDeadline: true,
    });

    if (!validateAll()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsSubmitting(true);

    // Calculate total estimated value from items
    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.estimatedPrice,
      0
    );

    createMutation.mutate({
      ...formData,
      estimatedValue: totalValue,
      submissionDeadline: formData.submissionDeadline
        ? new Date(formData.submissionDeadline)
        : undefined,
      evaluationDeadline: formData.evaluationDeadline
        ? new Date(formData.evaluationDeadline)
        : undefined,
      items: items.filter((item) => item.description.trim() !== ""),
    });
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unit: "piece", estimatedPrice: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      // Clear items error if we have valid items after removal
      if (errors.items) {
        const remaining = items.filter((_, i) => i !== index);
        if (remaining.some((item) => item.description.trim() !== "")) {
          setErrors((prev) => ({ ...prev, items: undefined }));
        }
      }
    }
  };

  const updateItem = (
    index: number,
    field: keyof TenderItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);

    // Clear items error if we now have valid items
    if (errors.items && field === "description" && value) {
      setErrors((prev) => ({ ...prev, items: undefined }));
    }
  };

  const totalEstimatedValue = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.quantity * item.estimatedPrice, 0),
    [items]
  );

  const hasErrors = Object.values(errors).some(Boolean);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Create New Tender"
        description="Fill in the details to create a new tender"
        breadcrumbs={[
          { label: "Tenders", href: "/tenders" },
          { label: "Create New" },
        ]}
      />

      {/* OCR Upload Section */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Upload Tender PDF (OCR Extraction)
          </CardTitle>
          <CardDescription>
            Upload a PDF document to automatically extract tender details using OCR.
            Supports English and Arabic text.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload tender PDF file"
          />

          {!isUploading && !ocrResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload a PDF</p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 10MB - PDF files only
              </p>
            </div>
          )}

          {isUploading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Extracting tender data...</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take a moment for larger documents
              </p>
            </div>
          )}

          {ocrResult && ocrResult.success && (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Extraction Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                {ocrResult.referenceNumber && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <p className="font-medium">{ocrResult.referenceNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Items Found:</span>
                  <p className="font-medium">{ocrResult.itemsCount || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence:</span>
                  <p className="font-medium">{Math.round((ocrResult.confidence || 0) * 100)}%</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setOcrResult(null);
                  setUploadProgress(0);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Upload Another PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative flex items-center gap-4 py-2">
        <div className="flex-1 border-t border-muted" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          or fill in manually
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      {hasErrors && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the validation errors below before submitting.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the tender details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              id="title"
              label="Tender Title"
              required
              error={touched.title ? errors.title : undefined}
              hint="A clear, descriptive title for the tender"
            >
              <ValidatedInput
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                onBlur={() => handleBlur("title")}
                placeholder="e.g., Medical Equipment Procurement 2024"
                error={touched.title && !!errors.title}
                required
              />
            </FormField>

            <FormField
              id="description"
              label="Description"
              hint="Detailed description of the tender scope and requirements"
            >
              <div className="space-y-1.5">
                <ValidatedTextarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Detailed description of the tender..."
                  rows={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className="flex justify-end">
                  <CharacterCounter
                    current={formData.description.length}
                    max={MAX_DESCRIPTION_LENGTH}
                  />
                </div>
              </div>
            </FormField>

            <FormSection columns={2}>
              <FormField
                id="submissionDeadline"
                label="Submission Deadline"
                error={
                  touched.submissionDeadline
                    ? errors.submissionDeadline
                    : undefined
                }
                hint="When proposals must be submitted by"
              >
                <ValidatedInput
                  id="submissionDeadline"
                  type="datetime-local"
                  value={formData.submissionDeadline}
                  onChange={(e) =>
                    handleChange("submissionDeadline", e.target.value)
                  }
                  onBlur={() => handleBlur("submissionDeadline")}
                  error={
                    touched.submissionDeadline && !!errors.submissionDeadline
                  }
                />
              </FormField>

              <FormField
                id="evaluationDeadline"
                label="Evaluation Deadline"
                error={
                  touched.evaluationDeadline
                    ? errors.evaluationDeadline
                    : undefined
                }
                hint="When evaluation will be completed"
              >
                <ValidatedInput
                  id="evaluationDeadline"
                  type="datetime-local"
                  value={formData.evaluationDeadline}
                  onChange={(e) =>
                    handleChange("evaluationDeadline", e.target.value)
                  }
                  onBlur={() => handleBlur("evaluationDeadline")}
                  error={
                    touched.evaluationDeadline && !!errors.evaluationDeadline
                  }
                />
              </FormField>
            </FormSection>
          </CardContent>
        </Card>

        {/* Tender Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tender Items</CardTitle>
                <CardDescription>
                  Add items included in this tender
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.items && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.items}</AlertDescription>
              </Alert>
            )}

            {items.map((item, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <FormField
                  id={`item-${index}-description`}
                  label="Description"
                  required
                >
                  <ValidatedInput
                    id={`item-${index}-description`}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Item description"
                    required
                  />
                </FormField>

                <FormSection columns={3}>
                  <FormField
                    id={`item-${index}-quantity`}
                    label="Quantity"
                    required
                  >
                    <ValidatedInput
                      id={`item-${index}-quantity`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      required
                    />
                  </FormField>

                  <FormField id={`item-${index}-unit`} label="Unit">
                    <ValidatedInput
                      id={`item-${index}-unit`}
                      value={item.unit}
                      onChange={(e) => updateItem(index, "unit", e.target.value)}
                      placeholder="e.g., piece, kg"
                    />
                  </FormField>

                  <FormField
                    id={`item-${index}-price`}
                    label="Est. Price ($)"
                    hint="Per unit"
                  >
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <ValidatedInput
                        id={`item-${index}-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.estimatedPrice / 100}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "estimatedPrice",
                            Math.round(parseFloat(e.target.value || "0") * 100)
                          )
                        }
                        className="pl-8"
                      />
                    </div>
                  </FormField>
                </FormSection>

                <div className="text-sm text-muted-foreground pt-2 border-t flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium tabular-nums">
                    ${((item.quantity * item.estimatedPrice) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Estimated Value:</span>
                <span className="tabular-nums text-primary">
                  ${(totalEstimatedValue / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements & Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements & Terms</CardTitle>
            <CardDescription>
              Specify requirements and terms for this tender
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              id="requirements"
              label="Requirements"
              hint="List any specific requirements (certifications, qualifications, etc.)"
            >
              <div className="space-y-1.5">
                <ValidatedTextarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => handleChange("requirements", e.target.value)}
                  placeholder="List any specific requirements..."
                  rows={4}
                  maxLength={MAX_REQUIREMENTS_LENGTH}
                />
                <div className="flex justify-end">
                  <CharacterCounter
                    current={formData.requirements.length}
                    max={MAX_REQUIREMENTS_LENGTH}
                  />
                </div>
              </div>
            </FormField>

            <FormField
              id="terms"
              label="Terms & Conditions"
              hint="Payment terms, delivery terms, etc."
            >
              <ValidatedTextarea
                id="terms"
                value={formData.terms}
                onChange={(e) => handleChange("terms", e.target.value)}
                placeholder="Payment terms, delivery terms, etc."
                rows={4}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Actions */}
        <FormActions align="between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/tenders")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || hasErrors}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tender
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
