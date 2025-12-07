import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Edit } from "lucide-react";

export default function ExpenseDetails() {
  const [, params] = useRoute("/expenses/:id");
  const [, setLocation] = useLocation();
  const expenseId = params?.id ? parseInt(params.id) : 0;

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<boolean>(true);
  const [rejectionReason, setRejectionReason] = useState("");

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: expense, isLoading } = trpc.expenses.get.useQuery({ id: expenseId });
  const { data: budgetCategories = [] } = trpc.budgetCategories.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: tenders = [] } = trpc.tenders.list.useQuery();

  const approveMutation = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      toast.success(approvalDecision ? "Expense approved" : "Expense rejected");
      utils.expenses.get.invalidate({ id: expenseId });
      setApprovalDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense status updated");
      utils.expenses.get.invalidate({ id: expenseId });
      setStatusDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      id: expenseId,
      approved: approvalDecision,
      rejectionReason: approvalDecision ? undefined : rejectionReason,
    });
  };

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    updateStatusMutation.mutate({
      id: expenseId,
      status: newStatus as "draft" | "pending" | "approved" | "rejected" | "paid",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Expense not found</h3>
          <Link href="/expenses">
            <Button className="mt-4">Back to Expenses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      paid: { variant: "default", label: "Paid" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const getCategoryName = (categoryId: number) => {
    const category = budgetCategories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const getBudgetName = (budgetId: number | null) => {
    if (!budgetId) return "N/A";
    const budget = budgets.find((b) => b.id === budgetId);
    return budget?.name || "Unknown";
  };

  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return "N/A";
    const department = departments.find((d) => d.id === departmentId);
    return department?.name || "Unknown";
  };

  const getTenderTitle = (tenderId: number | null) => {
    if (!tenderId) return "N/A";
    const tender = tenders.find((t) => t.id === tenderId);
    return tender ? `${tender.referenceNumber} - ${tender.title}` : "Unknown";
  };

  const canApprove = expense.status === "pending";
  const canUpdateStatus = ["draft", "pending", "approved"].includes(expense.status);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{expense.expenseNumber}</h1>
            <p className="text-muted-foreground">Expense Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(expense.status)}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Title</Label>
              <p className="font-medium">{expense.title}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p className="font-medium">{getCategoryName(expense.categoryId)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="text-2xl font-bold">{formatCurrency(expense.amount)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Expense Date</Label>
              <p className="font-medium">{formatDate(expense.expenseDate)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Linked Budget</Label>
              <p className="font-medium">{getBudgetName(expense.budgetId)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p className="font-medium">{getDepartmentName(expense.departmentId)}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-muted-foreground">Linked Tender</Label>
              <p className="font-medium">{getTenderTitle(expense.tenderId)}</p>
            </div>
          </div>

          {expense.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="font-medium whitespace-pre-wrap">{expense.description}</p>
            </div>
          )}

          {expense.receiptUrl && (
            <div>
              <Label className="text-muted-foreground">Receipt</Label>
              <div className="mt-2 border rounded-lg p-4 bg-muted/50">
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="max-w-full h-auto max-h-96 object-contain cursor-pointer"
                  onClick={() => window.open(expense.receiptUrl!, '_blank')}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Click image to view full size
                </p>
              </div>
            </div>
          )}

          {expense.notes && (
            <div>
              <Label className="text-muted-foreground">Notes</Label>
              <p className="font-medium whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}

          {expense.status === "rejected" && expense.rejectionReason && (
            <div className="bg-destructive/10 p-4 rounded-lg">
              <Label className="text-destructive">Rejection Reason</Label>
              <p className="text-destructive font-medium">{expense.rejectionReason}</p>
            </div>
          )}

          {expense.approvedBy && expense.approvedAt && (
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-muted-foreground">Approval Information</Label>
              <p className="font-medium">
                Approved on {expense.approvedAt ? formatDate(expense.approvedAt) : 'N/A'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {canApprove && (
          <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve / Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve or Reject Expense</DialogTitle>
                <DialogDescription>Review the expense and make your decision</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Decision</Label>
                  <Select
                    value={approvalDecision ? "approve" : "reject"}
                    onValueChange={(value) => setApprovalDecision(value === "approve")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!approvalDecision && (
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this expense is being rejected"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || (!approvalDecision && !rejectionReason)}
                >
                  {approveMutation.isPending ? "Processing..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canUpdateStatus && (
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Expense Status</DialogTitle>
                <DialogDescription>Change the status of this expense</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      {expense.status === "approved" && <SelectItem value="paid">Paid</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} disabled={updateStatusMutation.isPending}>
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
