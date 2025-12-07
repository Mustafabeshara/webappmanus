import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function RevenueExpenseChartWidget() {
  const { data: expenses } = trpc.expenses.list.useQuery();

  const { data: invoiceData } = trpc.invoices.list.useQuery();

  const totalExpenses = expenses?.reduce((sum: number, e) => sum + Number(e.amount), 0) || 0;
  const totalRevenue = invoiceData?.filter(i => i.status === 'paid')
    .reduce((sum: number, i) => sum + Number(i.totalAmount), 0) || 0;
  const netIncome = totalRevenue - totalExpenses;

  // Group expenses by date for chart
  const last30Days = expenses?.slice(0, 30) || [];
  const chartData = last30Days.map(e => ({ value: Number(e.amount) }));

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Revenue vs Expenses</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${netIncome.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Net income (30 days)</p>
        <div className="mt-4 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Revenue</div>
            <div className="font-medium text-green-600">${totalRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Expenses</div>
            <div className="font-medium text-red-600">${totalExpenses.toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
