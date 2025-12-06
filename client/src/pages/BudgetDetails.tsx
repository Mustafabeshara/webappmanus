import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function BudgetDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/budgets/:id");
  const budgetId = params?.id ? parseInt(params.id) : 0;

  const { data: budget, isLoading } = trpc.budgets.get.useQuery({ id: budgetId });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Budget Not Found</h2>
          <p className="text-muted-foreground mb-4">The budget you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/budgets")}>Back to Budgets</Button>
        </div>
      </div>
    );
  }

  const allocated = budget.allocatedAmount || 0;
  const spent = budget.spentAmount || 0;
  const remaining = allocated - spent;
  const percentSpent = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isNearLimit = !isOverBudget && percentSpent > 90;

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/budgets")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Budgets
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{budget.name}</h1>
            <p className="text-muted-foreground">Fiscal Year {budget.fiscalYear}</p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={
                budget.status === "active" ? "default" :
                budget.status === "closed" ? "secondary" :
                "outline"
              }
            >
              {budget.status}
            </Badge>
            <Badge variant="outline">
              {budget.approvalStatus}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Budget Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Allocated Amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(allocated / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Spent Amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(spent / 100).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {percentSpent.toFixed(1)}% of budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Remaining</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${isOverBudget ? "text-red-600" : ""}`}>
                ${(remaining / 100).toFixed(2)}
              </div>
              {isOverBudget && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Over budget
                </p>
              )}
              {isNearLimit && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Near limit
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spending Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Progress</CardTitle>
            <CardDescription>Visual breakdown of budget utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm text-muted-foreground">
                  {percentSpent.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(percentSpent, 100)} 
                className="h-3"
              />
            </div>

            {isOverBudget && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100">Budget Exceeded</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      This budget has exceeded its allocated amount by ${(Math.abs(remaining) / 100).toFixed(2)}.
                      Please review spending or request additional allocation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isNearLimit && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Approaching Limit</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This budget is at {percentSpent.toFixed(1)}% utilization. Consider monitoring spending closely.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Details */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Category</Label>
                <div className="mt-1 font-medium">
                  Category #{budget.categoryId}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Department</Label>
                <div className="mt-1 font-medium">
                  {budget.departmentId ? `Department #${budget.departmentId}` : "General"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Created By</Label>
                <div className="mt-1">User #{budget.createdBy}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Created At</Label>
                <div className="mt-1">{new Date(budget.createdAt).toLocaleString()}</div>
              </div>
              {budget.approvedBy && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Approved By</Label>
                    <div className="mt-1">User #{budget.approvedBy}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Approved At</Label>
                    <div className="mt-1">
                      {budget.approvedAt ? new Date(budget.approvedAt).toLocaleString() : "-"}
                    </div>
                  </div>
                </>
              )}
            </div>

            {budget.notes && (
              <div>
                <Label className="text-muted-foreground">Notes</Label>
                <p className="mt-1 whitespace-pre-wrap">{budget.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
