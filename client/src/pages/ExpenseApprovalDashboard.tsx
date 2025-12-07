import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ExpenseApprovalDashboard() {
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = trpc.useUtils();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery();
  const { data: budgetCategories = [] } = trpc.budgetCategories.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();

  const approveMutation = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      toast.success(`Approved ${selectedExpenses.size} expense(s)`);
      setSelectedExpenses(new Set());
      setShowApproveDialog(false);
      utils.expenses.list.invalidate();
    },
    onError: (error) => {
      toast.error("Approval failed: " + error.message);
    },
  });

  const rejectMutation = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      toast.success(`Rejected ${selectedExpenses.size} expense(s)`);
      setSelectedExpenses(new Set());
      setShowRejectDialog(false);
      setRejectionReason("");
      utils.expenses.list.invalidate();
    },
    onError: (error) => {
      toast.error("Rejection failed: " + error.message);
    },
  });

  // Filter pending expenses only
  const pendingExpenses = expenses.filter((e) => e.status === "pending");

  // Apply filters
  const filteredExpenses = pendingExpenses.filter((expense) => {
    const matchesSearch =
      expense.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || expense.departmentId?.toString() === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Group by department
  const expensesByDepartment = filteredExpenses.reduce((acc, expense) => {
    const deptId = expense.departmentId || 0;
    const deptName = departments.find((d) => d.id === deptId)?.name || "No Department";
    if (!acc[deptName]) {
      acc[deptName] = [];
    }
    acc[deptName].push(expense);
    return acc;
  }, {} as Record<string, typeof filteredExpenses>);

  // Calculate statistics
  const stats = {
    totalPending: pendingExpenses.length,
    totalAmount: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
    selected: selectedExpenses.size,
    selectedAmount: Array.from(selectedExpenses).reduce((sum, id) => {
      const expense = expenses.find((e) => e.id === id);
      return sum + (expense?.amount || 0);
    }, 0),
  };

  const toggleExpense = (id: number) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExpenses(newSelected);
  };

  const toggleAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const handleBatchApprove = async () => {
    for (const id of Array.from(selectedExpenses)) {
      await approveMutation.mutateAsync({ id, approved: true });
    }
  };

  const handleBatchReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    for (const id of Array.from(selectedExpenses)) {
      await rejectMutation.mutateAsync({ id, approved: false, rejectionReason });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "-";
    return budgetCategories.find((c) => c.id === categoryId)?.name || "-";
  };

  const getBudgetName = (budgetId: number | null) => {
    if (!budgetId) return "-";
    return budgets.find((b) => b.id === budgetId)?.name || "-";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expense Approval Dashboard</h1>
          <p className="text-muted-foreground">Review and approve pending expense submissions</p>
        </div>
        {selectedExpenses.size > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject Selected ({selectedExpenses.size})
            </Button>
            <Button onClick={() => setShowApproveDialog(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Selected ({selectedExpenses.size})
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPending}</div>
            <p className="text-xs text-muted-foreground">expenses awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.selected}</div>
            <p className="text-xs text-muted-foreground">expenses selected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.selectedAmount)}</div>
            <p className="text-xs text-muted-foreground">to be processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by expense number or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses by Department */}
      {Object.keys(expensesByDepartment).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Expenses</h3>
            <p className="text-muted-foreground">All expenses have been reviewed</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(expensesByDepartment).map(([deptName, deptExpenses]) => (
          <Card key={deptName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {deptName} ({deptExpenses.length})
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(deptExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={deptExpenses.every((e) => selectedExpenses.has(e.id))}
                          onCheckedChange={() => {
                            const allSelected = deptExpenses.every((e) => selectedExpenses.has(e.id));
                            const newSelected = new Set(selectedExpenses);
                            deptExpenses.forEach((e) => {
                              if (allSelected) {
                                newSelected.delete(e.id);
                              } else {
                                newSelected.add(e.id);
                              }
                            });
                            setSelectedExpenses(newSelected);
                          }}
                        />
                      </TableHead>
                      <TableHead>Expense #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedExpenses.has(expense.id)}
                            onCheckedChange={() => toggleExpense(expense.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{expense.expenseNumber}</TableCell>
                        <TableCell>{expense.title}</TableCell>
                        <TableCell>{getCategoryName(expense.categoryId)}</TableCell>
                        <TableCell>{getBudgetName(expense.budgetId)}</TableCell>
                        <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/expenses/${expense.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Selected Expenses</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedExpenses.size} expense(s) totaling{" "}
              {formatCurrency(stats.selectedAmount)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Selected Expenses</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedExpenses.size} expense(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
