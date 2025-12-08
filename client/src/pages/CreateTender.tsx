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
  validateFutureDate,
} from "@/lib/validation";
import { Loader2, Plus, Trash2, AlertCircle, DollarSign } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
          const futureDate = validateFutureDate(
            value as string,
            "Submission deadline"
          );
          if (!futureDate.valid) return futureDate.error;
          return undefined;
        }
        case "evaluationDeadline": {
          if (!value) return undefined;
          const futureDate = validateFutureDate(
            value as string,
            "Evaluation deadline"
          );
          if (!futureDate.valid) return futureDate.error;
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
