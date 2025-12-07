import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CreateExpense() {
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [tenderId, setTenderId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: budgetCategories = [] } = trpc.budgetCategories.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: tenders = [] } = trpc.tenders.list.useQuery();

  const uploadReceiptMutation = trpc.expenses.uploadReceipt.useMutation({
    onSuccess: (data) => {
      setReceiptUrl(data.receiptUrl);
      setIsUploading(false);
      toast.success("Receipt uploaded and processed");
      
      // Auto-populate fields from OCR extraction
      if (data.extractedData?.success && data.extractedData.data) {
        const extracted = data.extractedData.data;
        if (extracted.title) setTitle(extracted.title);
        if (extracted.amount) setAmount((extracted.amount / 100).toString());
        if (extracted.expenseDate) setExpenseDate(new Date(extracted.expenseDate).toISOString().split("T")[0]);
        if (extracted.vendor) setDescription(`Vendor: ${extracted.vendor}`);
        if (extracted.description && !description) setDescription(extracted.description);
      }
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("Failed to upload receipt: " + error.message);
    },
  });

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Expense ${data.expenseNumber} created successfully`);
      setLocation("/expenses");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const parseCurrency = (value: string): number => {
    return Math.round(parseFloat(value || "0") * 100);
  };

  // Get selected budget details for validation
  const selectedBudget = budgetId ? budgets.find((b) => b.id === parseInt(budgetId)) : null;
  const expenseAmountCents = parseCurrency(amount);
  const budgetRemaining = selectedBudget
    ? selectedBudget.allocatedAmount - selectedBudget.spentAmount
    : 0;
  const wouldExceedBudget = selectedBudget && expenseAmountCents > budgetRemaining;
  const budgetUtilization = selectedBudget
    ? ((selectedBudget.spentAmount + expenseAmountCents) / selectedBudget.allocatedAmount) * 100
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !categoryId || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    createMutation.mutate({
      title,
      description: description || undefined,
      categoryId: parseInt(categoryId),
      budgetId: budgetId ? parseInt(budgetId) : undefined,
      departmentId: departmentId ? parseInt(departmentId) : undefined,
      tenderId: tenderId ? parseInt(tenderId) : undefined,
      amount: expenseAmountCents,
      expenseDate: new Date(expenseDate),
      receiptUrl: receiptUrl || undefined,
      notes: notes || undefined,
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setReceiptFile(file);
    setIsUploading(true);

    // Convert to base64 and upload
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      uploadReceiptMutation.mutate({
        file: base64,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Expense</h1>
          <p className="text-muted-foreground">Record a new business expense</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Office Supplies Purchase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about this expense"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt Upload (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Upload Receipt Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing receipt...
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a receipt image to automatically extract expense details using OCR. Supported
                formats: JPG, PNG. Max size: 5MB.
              </p>
            </div>

            {receiptUrl && (
              <div className="space-y-2">
                <Label>Receipt Preview</Label>
                <div className="border rounded-lg p-4">
                  <img
                    src={receiptUrl}
                    alt="Receipt"
                    className="max-w-full h-auto max-h-64 object-contain"
                  />
                </div>
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertTitle>Receipt Uploaded</AlertTitle>
                  <AlertDescription>
                    Expense details have been automatically extracted and populated in the form.
                    Please review and adjust as needed.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget & Links */}
        <Card>
          <CardHeader>
            <CardTitle>Budget & Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Link to Budget (Optional)</Label>
                <Select value={budgetId} onValueChange={setBudgetId}>
                  <SelectTrigger id="budget">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {budgets
                      .filter((b) => b.status === "active")
                      .map((budget) => (
                        <SelectItem key={budget.id} value={budget.id.toString()}>
                          {budget.name} ({formatCurrency(budget.allocatedAmount - budget.spentAmount)}{" "}
                          remaining)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department (Optional)</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tender">Link to Tender (Optional)</Label>
                <Select value={tenderId} onValueChange={setTenderId}>
                  <SelectTrigger id="tender">
                    <SelectValue placeholder="Select tender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {tenders.map((tender) => (
                      <SelectItem key={tender.id} value={tender.id.toString()}>
                        {tender.referenceNumber} - {tender.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget Validation Alert */}
            {selectedBudget && expenseAmountCents > 0 && (
              <div className="space-y-2">
                {wouldExceedBudget ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Budget Exceeded</AlertTitle>
                    <AlertDescription>
                      This expense ({formatCurrency(expenseAmountCents)}) would exceed the remaining
                      budget ({formatCurrency(budgetRemaining)}). The expense can still be created
                      but will require approval.
                    </AlertDescription>
                  </Alert>
                ) : budgetUtilization > 90 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Budget Warning</AlertTitle>
                    <AlertDescription>
                      This expense will bring the budget utilization to {budgetUtilization.toFixed(1)}
                      %. Remaining: {formatCurrency(budgetRemaining - expenseAmountCents)}.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Budget utilization after this expense: {budgetUtilization.toFixed(1)}% | Remaining:{" "}
                    {formatCurrency(budgetRemaining - expenseAmountCents)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or comments"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/expenses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}
