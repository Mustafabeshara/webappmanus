import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormField,
  FormSection,
  FormActions,
  ValidatedInput,
  ValidatedTextarea,
} from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { validateRequired, validateEmail, validatePhone, validateNumberRange } from "@/lib/validation";
import { Loader2, AlertCircle, Building2, User, Mail, Phone, MapPin, FileText, Star } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  rating?: string;
}

export default function CreateSupplier() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    complianceStatus: "pending" as "pending" | "compliant" | "non_compliant",
    rating: "",
    notes: "",
  });

  // Validation functions
  const validateField = useCallback(
    (field: string, value: unknown): string | undefined => {
      switch (field) {
        case "name": {
          const required = validateRequired(value as string, "Supplier name");
          if (!required.valid) return required.error;
          return undefined;
        }
        case "email": {
          if (!value) return undefined;
          const email = validateEmail(value as string);
          if (!email.valid) return email.error;
          return undefined;
        }
        case "phone": {
          if (!value) return undefined;
          const phone = validatePhone(value as string);
          if (!phone.valid) return phone.error;
          return undefined;
        }
        case "rating": {
          if (!value) return undefined;
          const range = validateNumberRange(value as string, 1, 5, "Rating");
          if (!range.valid) return range.error;
          return undefined;
        }
        default:
          return undefined;
      }
    },
    []
  );

  // Validate all fields before submission
  const validateAll = useCallback(() => {
    const newErrors: FormErrors = {};

    const nameError = validateField("name", formData.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateField("email", formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validateField("phone", formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    const ratingError = validateField("rating", formData.rating);
    if (ratingError) newErrors.rating = ratingError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

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

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Supplier created successfully!");
      setLocation("/suppliers");
    },
    onError: (error) => {
      toast.error(`Failed to create supplier: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      phone: true,
      rating: true,
    });

    if (!validateAll()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsSubmitting(true);
    createMutation.mutate({
      name: formData.name,
      contactPerson: formData.contactPerson || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      taxId: formData.taxId || undefined,
      notes: formData.notes || undefined,
    });
  };

  const hasErrors = Object.values(errors).some(Boolean);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Create New Supplier"
        description="Add a new supplier or manufacturer to your network"
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
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

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
            <CardDescription>Enter the supplier details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info Section */}
            <FormSection title="Basic Information" columns={2}>
              <FormField
                id="name"
                label="Supplier Name"
                required
                error={touched.name ? errors.name : undefined}
              >
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="e.g., Medical Supplies Inc."
                    error={touched.name && !!errors.name}
                    className="pl-10"
                    required
                  />
                </div>
              </FormField>

              <FormField
                id="contactPerson"
                label="Contact Person"
                hint="Primary contact at this supplier"
              >
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange("contactPerson", e.target.value)}
                    placeholder="e.g., John Doe"
                    className="pl-10"
                  />
                </div>
              </FormField>
            </FormSection>

            {/* Contact Info Section */}
            <FormSection title="Contact Information" columns={2}>
              <FormField
                id="email"
                label="Email"
                error={touched.email ? errors.email : undefined}
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder="supplier@example.com"
                    error={touched.email && !!errors.email}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField
                id="phone"
                label="Phone"
                error={touched.phone ? errors.phone : undefined}
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    placeholder="+1 234 567 8900"
                    error={touched.phone && !!errors.phone}
                    className="pl-10"
                  />
                </div>
              </FormField>
            </FormSection>

            {/* Address Section */}
            <FormField
              id="address"
              label="Address"
              hint="Full business address"
            >
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <ValidatedTextarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                  className="pl-10"
                />
              </div>
            </FormField>

            {/* Business Info Section */}
            <FormSection title="Business Details" columns={2}>
              <FormField
                id="taxId"
                label="Tax ID"
                hint="Tax identification number"
              >
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => handleChange("taxId", e.target.value)}
                    placeholder="Tax identification number"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField
                id="complianceStatus"
                label="Compliance Status"
                hint="Current compliance verification status"
              >
                <Select
                  value={formData.complianceStatus}
                  onValueChange={(value: "pending" | "compliant" | "non_compliant") =>
                    setFormData({ ...formData, complianceStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            {/* Rating Section */}
            <FormSection columns={2}>
              <FormField
                id="rating"
                label="Rating (1-5)"
                error={touched.rating ? errors.rating : undefined}
                hint="Overall supplier performance rating"
              >
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <ValidatedInput
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => handleChange("rating", e.target.value)}
                    onBlur={() => handleBlur("rating")}
                    placeholder="1-5"
                    error={touched.rating && !!errors.rating}
                    className="pl-10"
                  />
                </div>
              </FormField>
            </FormSection>

            {/* Notes Section */}
            <FormField
              id="notes"
              label="Notes"
              hint="Additional notes or comments about this supplier"
            >
              <ValidatedTextarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes or comments"
                rows={4}
              />
            </FormField>

            {/* Actions */}
            <FormActions>
              <Button type="submit" disabled={isSubmitting || hasErrors}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Supplier
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/suppliers")}
              >
                Cancel
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
