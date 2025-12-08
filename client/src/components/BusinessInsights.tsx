/**
 * Business Insights Component
 * AI-powered comprehensive business analytics and insights
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Truck,
  FileText,
  AlertCircle,
  Target,
  BarChart3,
} from "lucide-react";

export function BusinessInsights() {
  const { data: insights, isLoading } = trpc.analytics.aiInsights.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Business Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) return null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />;
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  SAR {insights.summary.totalRevenue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  SAR {insights.summary.totalExpenses.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${insights.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  SAR {insights.summary.netProfit.toLocaleString()}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${insights.summary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">
                  SAR {insights.summary.pendingRevenue.toLocaleString()}
                </p>
              </div>
              <FileText className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  SAR {insights.summary.overdueRevenue.toLocaleString()}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">
                  SAR {insights.summary.inventoryValue.toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Business Insights
            </CardTitle>
            <CardDescription>Automated analysis and recommendations for your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${getInsightStyle(insight.type)}`}
                >
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-1 text-xs">
                      {insight.category}
                    </Badge>
                    <p className="text-sm">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key business performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tender Win Rate</span>
                <span className="font-medium">{insights.metrics.tenderWinRate}%</span>
              </div>
              <Progress value={insights.metrics.tenderWinRate} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>On-Time Delivery Rate</span>
                <span className="font-medium">{insights.metrics.onTimeDeliveryRate}%</span>
              </div>
              <Progress value={insights.metrics.onTimeDeliveryRate} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Utilization</span>
                <span className="font-medium">{insights.metrics.budgetUtilization}%</span>
              </div>
              <Progress
                value={insights.metrics.budgetUtilization}
                className={`h-2 ${insights.metrics.budgetUtilization > 90 ? '[&>div]:bg-red-500' : ''}`}
              />
            </div>
            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Tender Value</span>
                  <p className="font-medium">SAR {insights.metrics.avgTenderValue.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Supplier Rating</span>
                  <p className="font-medium">{insights.metrics.avgSupplierRating}/100</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-red-500" />
                  <span>Over Budget</span>
                </div>
                <Badge variant={insights.alerts.overBudgetCount > 0 ? "destructive" : "secondary"}>
                  {insights.alerts.overBudgetCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-orange-500" />
                  <span>Low Stock Items</span>
                </div>
                <Badge variant={insights.alerts.lowStockCount > 0 ? "secondary" : "outline"}>
                  {insights.alerts.lowStockCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-red-500" />
                  <span>Out of Stock</span>
                </div>
                <Badge variant={insights.alerts.outOfStockCount > 0 ? "destructive" : "outline"}>
                  {insights.alerts.outOfStockCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-yellow-500" />
                  <span>Overdue Invoices</span>
                </div>
                <Badge variant={insights.alerts.overdueInvoices > 0 ? "destructive" : "outline"}>
                  {insights.alerts.overdueInvoices}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <span>Pending Deliveries</span>
                </div>
                <Badge variant="secondary">
                  {insights.alerts.pendingDeliveries}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Monthly Trends (Last 6 Months)
          </CardTitle>
          <CardDescription>Revenue, expenses, and tender activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-center">Tenders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.trends.map((trend, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{trend.month}</TableCell>
                  <TableCell className="text-right text-green-600">
                    SAR {trend.revenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    SAR {trend.expenses.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${trend.revenue - trend.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    SAR {(trend.revenue - trend.expenses).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{trend.tenders}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Top Customers by Revenue
          </CardTitle>
          <CardDescription>Your highest value customer relationships</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.topCustomers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No customer revenue data yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.topCustomers.map((customer, idx) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Badge variant={idx === 0 ? "default" : idx === 1 ? "secondary" : "outline"}>
                        #{idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right text-green-600">
                      SAR {customer.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">{customer.invoiceCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer & Supplier Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Activity</p>
                <p className="text-2xl font-bold">
                  {insights.metrics.activeCustomers} / {insights.metrics.totalCustomers}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active in last 30 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="text-2xl font-bold">
                  {insights.metrics.activeSuppliers}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Rating: {insights.metrics.avgSupplierRating}/100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BusinessInsights;
