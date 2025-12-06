import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CreateBudget() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    departmentId: "",
    fiscalYear: currentYear.toString(),
    allocatedAmount: "",
    notes: "",
  });

  const categories = trpc.budgetCategories.list.useQuery();

  const createMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success("Budget created successfully!");
      setLocation("/budgets");
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId || !formData.allocatedAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    createMutation.mutate({
      name: formData.name,
      categoryId: parseInt(formData.categoryId),
      departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
      fiscalYear: parseInt(formData.fiscalYear),
      allocatedAmount: Math.round(parseFloat(formData.allocatedAmount) * 100),
      notes: formData.notes || undefined,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/budgets")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Budgets
        </Button>
        <h1 className="text-3xl font-bold">Create New Budget</h1>
        <p className="text-muted-foreground">Set up a new budget allocation</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Information</CardTitle>
            <CardDescription>Enter the budget details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Budget Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2024 Medical Supplies"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.data?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fiscalYear">Fiscal Year *</Label>
                <Input
                  id="fiscalYear"
                  type="number"
                  min="2020"
                  max="2100"
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="departmentId">Department (Optional)</Label>
              <Input
                id="departmentId"
                type="number"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                placeholder="Department ID"
              />
            </div>

            <div>
              <Label htmlFor="allocatedAmount">Allocated Amount ($) *</Label>
              <Input
                id="allocatedAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.allocatedAmount}
                onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                placeholder="0.00"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter the total budget amount to be allocated
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or comments"
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
            Create Budget
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/budgets")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
