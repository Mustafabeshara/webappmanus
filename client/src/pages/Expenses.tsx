import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, FileText, CheckCircle, XCircle, Clock, DollarSign, Upload } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";

type ExpenseStatus = "draft" | "pending" | "approved" | "rejected" | "paid";

const statusConfig: Record<ExpenseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  paid: { label: "Paid", variant: "default", icon: DollarSign },
};

export default function Expenses() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus | "all">("all");
  
  const { data: expenses, isLoading, refetch } = trpc.expenses.list.useQuery();
  const { data: categories } = trpc.budgetCategories.list.useQuery();
  const { data: budgets } = trpc.budgets.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();
  
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });
  
  const approveMutation = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      toast.success("Expense status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    budgetId: "",
    departmentId: "",
    amount: "",
    notes: "",
  });
  
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  
  const uploadToS3Mutation = trpc.files.uploadToS3.useMutation();
  
  const handleReceiptUpload = async (files: File[]) => {
    setReceiptFiles(files);
    toast.success(`${files.length} receipt(s) ready to upload`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.categoryId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Create expense first
      const expense = await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        categoryId: parseInt(formData.categoryId),
        budgetId: formData.budgetId ? parseInt(formData.budgetId) : undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
        amount: Math.round(parseFloat(formData.amount) * 100), // Convert to cents
        notes: formData.notes || undefined,
      });
      
      // Upload receipts if any
      if (receiptFiles.length > 0) {
        for (const file of receiptFiles) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            await uploadToS3Mutation.mutateAsync({
              fileName: file.name,
              fileData: base64,
              mimeType: file.type,
              entityType: 'expense',
              entityId: expense.id,
              category: 'receipt',
            });
          };
          reader.readAsDataURL(file);
        }
      }
      
      toast.success("Expense created successfully");
      setIsCreateDialogOpen(false);
      setReceiptFiles([]);
      setFormData({
        title: "",
        description: "",
        categoryId: "",
        budgetId: "",
        departmentId: "",
        amount: "",
        notes: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(`Failed to create expense: ${error.message}`);
    }
  };

  const handleApprove = (id: number, approved: boolean) => {
    approveMutation.mutate({ id, approved });
  };

  const filteredExpenses = expenses?.filter(expense => 
    selectedStatus === "all" || expense.status === selectedStatus
  );

  const stats = {
    total: expenses?.length || 0,
    pending: expenses?.filter(e => e.status === "pending").length || 0,
    approved: expenses?.filter(e => e.status === "approved").length || 0,
    totalAmount: expenses?.reduce((sum, e) => sum + e.amount, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all company expenses
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalAmount / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            {filteredExpenses?.length || 0} expense(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses?.map((expense) => {
                const config = statusConfig[expense.status];
                const Icon = config.icon;
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.expenseNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.title}</div>
                        {expense.description && (
                          <div className="text-sm text-muted-foreground">{expense.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${(expense.amount / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {expense.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(expense.id, true)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApprove(expense.id, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredExpenses || filteredExpenses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No expenses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Add a new expense to the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter expense title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter expense description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budgetId">Budget</Label>
                  <Select
                    value={formData.budgetId}
                    onValueChange={(value) => setFormData({ ...formData, budgetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgets?.map((budget) => (
                        <SelectItem key={budget.id} value={budget.id.toString()}>
                          {budget.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
              <div className="grid gap-2">
                <Label>Receipt Upload</Label>
                <FileUpload
                  onUpload={handleReceiptUpload}
                  accept="image/*,application/pdf"
                  maxSize={5 * 1024 * 1024}
                  multiple
                />
                {receiptFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {receiptFiles.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
