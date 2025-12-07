import { DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";

export function BudgetOverviewWidget() {
  const { data: budgets, isLoading } = trpc.budgets.list.useQuery();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const totalAllocated = budgets?.reduce((sum, b) => sum + Number(b.allocatedAmount), 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + Number(b.spentAmount), 0) || 0;
  const utilizationPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${totalAllocated.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          ${totalSpent.toLocaleString()} spent ({utilizationPercent.toFixed(1)}%)
        </p>
        <Progress value={utilizationPercent} className="mt-3" />
        <div className="mt-4 flex items-center text-xs text-muted-foreground">
          <TrendingUp className="mr-1 h-3 w-3" />
          {budgets?.length || 0} active budgets
        </div>
      </CardContent>
    </Card>
  );
}
