import { CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function PendingApprovalsWidget() {
  const { data: expenses } = trpc.expenses.list.useQuery();
  const { data: purchaseOrders } = trpc.purchaseOrders.list.useQuery();

  const pendingExpenses = expenses?.filter(e => e.status === 'pending') || [];
  const pendingPOs = purchaseOrders?.filter(po => po.status === 'submitted') || [];
  const totalPending = pendingExpenses.length + pendingPOs.length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalPending}</div>
        <p className="text-xs text-muted-foreground">Items awaiting approval</p>
        <div className="mt-4 space-y-2">
          {pendingExpenses.length > 0 && (
            <Link href="/expenses/approvals">
              <a className="flex items-center justify-between text-sm hover:underline">
                <span>{pendingExpenses.length} Expenses</span>
                <Badge variant="outline">Review</Badge>
              </a>
            </Link>
          )}
          {pendingPOs.length > 0 && (
            <Link href="/purchase-orders">
              <a className="flex items-center justify-between text-sm hover:underline">
                <span>{pendingPOs.length} Purchase Orders</span>
                <Badge variant="outline">Review</Badge>
              </a>
            </Link>
          )}
          {totalPending === 0 && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
              All caught up!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
