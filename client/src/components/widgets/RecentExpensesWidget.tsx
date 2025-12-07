import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function RecentExpensesWidget() {
  const { data: expenses } = trpc.expenses.list.useQuery();

  const recentExpenses = expenses?.slice(0, 5) || [];
  const totalAmount = recentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Recent Expenses</CardTitle>
        <Receipt className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Last 5 expenses</p>
        <div className="mt-4 space-y-2">
          {recentExpenses.map(expense => (
            <Link key={expense.id} href={`/expenses/${expense.id}`}>
              <a className="flex items-center justify-between text-sm hover:underline">
                <span className="truncate flex-1">{expense.title}</span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs font-medium">${Number(expense.amount).toLocaleString()}</span>
                  <Badge variant={getStatusColor(expense.status)} className="text-xs">
                    {expense.status}
                  </Badge>
                </div>
              </a>
            </Link>
          ))}
          {recentExpenses.length === 0 && (
            <p className="text-xs text-muted-foreground">No recent expenses</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
