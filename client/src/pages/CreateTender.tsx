import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface TenderItem {
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
}

export default function CreateTender() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createMutation = trpc.tenders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Tender created successfully! Reference: ${data.referenceNumber}`);
      setLocation("/tenders");
    },
    onError: (error) => {
      toast.error(`Failed to create tender: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Calculate total estimated value from items
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

    createMutation.mutate({
      ...formData,
      estimatedValue: totalValue,
      submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline) : undefined,
      evaluationDeadline: formData.evaluationDeadline ? new Date(formData.evaluationDeadline) : undefined,
      items: items.filter(item => item.description.trim() !== ""),
    });
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit: "piece", estimatedPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof TenderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalEstimatedValue = items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/tenders")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenders
        </Button>
        <h1 className="text-3xl font-bold">Create New Tender</h1>
        <p className="text-muted-foreground">Fill in the details to create a new tender</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the tender details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Tender Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Medical Equipment Procurement 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the tender"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="submissionDeadline">Submission Deadline</Label>
                <Input
                  id="submissionDeadline"
                  type="datetime-local"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="evaluationDeadline">Evaluation Deadline</Label>
                <Input
                  id="evaluationDeadline"
                  type="datetime-local"
                  value={formData.evaluationDeadline}
                  onChange={(e) => setFormData({ ...formData, evaluationDeadline: e.target.value })}
                />
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Tender Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tender Items</CardTitle>
                <CardDescription>Add items included in this tender</CardDescription>
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

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        required
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
                    <div>
                      <Label>Est. Price ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.estimatedPrice / 100}
                        onChange={(e) => updateItem(index, "estimatedPrice", Math.round(parseFloat(e.target.value || "0") * 100))}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Subtotal: ${((item.quantity * item.estimatedPrice) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Estimated Value:</span>
                <span>${(totalEstimatedValue / 100).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements & Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements & Terms</CardTitle>
            <CardDescription>Specify requirements and terms for this tender</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="List any specific requirements (certifications, qualifications, etc.)"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Payment terms, delivery terms, etc."
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
            Create Tender
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/tenders")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
