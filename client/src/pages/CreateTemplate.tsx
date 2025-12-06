import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface TemplateItem {
  description: string;
  quantity: number;
  unit: string;
  specifications: string;
}

export default function CreateTemplate() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultRequirements: "",
    defaultTerms: "",
    category: "",
  });

  const [items, setItems] = useState<TemplateItem[]>([
    { description: "", quantity: 1, unit: "piece", specifications: "" },
  ]);

  const createMutation = trpc.tenderTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully!");
      setLocation("/templates");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    createMutation.mutate({
      ...formData,
      items: items.filter(item => item.description.trim() !== ""),
    });
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit: "piece", specifications: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/templates")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        <h1 className="text-3xl font-bold">Create Tender Template</h1>
        <p className="text-muted-foreground">Create a reusable template for future tenders</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
            <CardDescription>Enter the template details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Medical Equipment Standard Template"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Medical, IT, Construction"
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Default Items</CardTitle>
                <CardDescription>Pre-defined items for this template</CardDescription>
              </div>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Default Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        placeholder="e.g., piece, kg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Specifications</Label>
                    <Textarea
                      value={item.specifications}
                      onChange={(e) => updateItem(index, "specifications", e.target.value)}
                      placeholder="Technical specifications or requirements"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Default Requirements & Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Default Requirements & Terms</CardTitle>
            <CardDescription>Standard requirements and terms for this template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="defaultRequirements">Default Requirements</Label>
              <Textarea
                id="defaultRequirements"
                value={formData.defaultRequirements}
                onChange={(e) => setFormData({ ...formData, defaultRequirements: e.target.value })}
                placeholder="Standard requirements (certifications, qualifications, etc.)"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="defaultTerms">Default Terms & Conditions</Label>
              <Textarea
                id="defaultTerms"
                value={formData.defaultTerms}
                onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
                placeholder="Standard payment terms, delivery terms, etc."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/templates")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
