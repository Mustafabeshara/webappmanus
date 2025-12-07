import { trpc } from "@/lib/trpc";
import { WidgetGrid } from "@/components/widgets/WidgetGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  DollarSign, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ClipboardCheck,
  BarChart3,
  Truck,
  ShoppingCart,
  Receipt
} from "lucide-react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [showWidgets, setShowWidgets] = useState(true);

  const { data: analytics, isLoading } = trpc.analytics.dashboard.useQuery();
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: tenderAnalytics } = trpc.dashboard.tenderAnalytics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: budgetAnalytics } = trpc.dashboard.budgetAnalytics.useQuery({});
  const { data: invoiceAnalytics } = trpc.dashboard.invoiceAnalytics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: poAnalytics } = trpc.dashboard.purchaseOrderAnalytics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: inventoryAnalytics } = trpc.dashboard.inventoryAnalytics.useQuery();
  const { data: deliveryAnalytics } = trpc.dashboard.deliveryAnalytics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: recentActivity } = trpc.dashboard.recentActivity.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      title: "Active Tenders",
      value: analytics?.tenders.open || 0,
      total: analytics?.tenders.total || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900",
      link: "/tenders",
    },
    {
      title: "Active Budgets",
      value: analytics?.budgets.active || 0,
      total: analytics?.budgets.total || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
      alert: analytics?.budgets.overBudget || 0,
      link: "/budgets",
    },
    {
      title: "Pending Invoices",
      value: analytics?.invoices.unpaid || 0,
      total: analytics?.invoices.total || 0,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900",
      link: "/invoices",
    },
    {
      title: "Low Stock Items",
      value: lowStock?.length || 0,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
      link: "/inventory",
    },
    {
      title: "Purchase Orders",
      value: poAnalytics?.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.count, 0) || 0,
      total: poAnalytics?.reduce((sum, p) => sum + p.count, 0) || 0,
      icon: ShoppingCart,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900",
      link: "/purchase-orders",
    },
    {
      title: "Deliveries",
      value: deliveryAnalytics?.filter(d => d.status === 'delivered').reduce((sum, d) => sum + d.count, 0) || 0,
      total: deliveryAnalytics?.reduce((sum, d) => sum + d.count, 0) || 0,
      icon: Truck,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900",
      link: "/deliveries",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Customizable Widgets */}
      {showWidgets && (
        <div className="mb-8">
          <WidgetGrid />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your AI-powered business management system
          </p>
        </div>
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {(analytics?.budgets.overBudget || 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Budget Alert</AlertTitle>
          <AlertDescription>
            {analytics?.budgets.overBudget} budget(s) have exceeded their allocated amount.
            <Link href="/budgets">
              <Button variant="link" className="p-0 h-auto ml-2">
                View Budgets <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {(lowStock?.length || 0) > 0 && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertTitle>Inventory Alert</AlertTitle>
          <AlertDescription>
            {lowStock?.length} item(s) are running low on stock.
            <Link href="/inventory">
              <Button variant="link" className="p-0 h-auto ml-2">
                View Inventory <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.total !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      out of {stat.total} total
                    </p>
                  )}
                  {stat.alert !== undefined && stat.alert > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      {stat.alert} over budget
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tender Status Distribution */}
        {tenderAnalytics && tenderAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tender Status Distribution</CardTitle>
              <CardDescription>Current status of all tenders</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tenderAnalytics.map(t => ({ name: t.status, value: t.count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tenderAnalytics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Budget Utilization */}
        {budgetAnalytics && budgetAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization by Category</CardTitle>
              <CardDescription>Allocated vs Spent amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoryName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${(Number(value) / 100).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="totalAllocated" fill="#3b82f6" name="Allocated" />
                  <Bar dataKey="totalSpent" fill="#10b981" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Invoice Status */}
        {invoiceAnalytics && invoiceAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Overview</CardTitle>
              <CardDescription>Invoice counts by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invoiceAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Purchase Order Status */}
        {poAnalytics && poAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Status</CardTitle>
              <CardDescription>PO distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={poAnalytics.map(p => ({ name: p.status, value: p.count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {poAnalytics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Inventory Overview */}
        {inventoryAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Overview</CardTitle>
              <CardDescription>Stock levels and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Items</span>
                  <span className="text-2xl font-bold">{inventoryAnalytics.totalItems}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Quantity</span>
                  <span className="text-2xl font-bold">{inventoryAnalytics.totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-yellow-600">Low Stock</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    {inventoryAnalytics.lowStockCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600">Out of Stock</span>
                  <Badge variant="destructive">
                    {inventoryAnalytics.outOfStockCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Status */}
        {deliveryAnalytics && deliveryAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery Status</CardTitle>
              <CardDescription>Delivery distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deliveryAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const typeIcons = {
                  tender: FileText,
                  invoice: Receipt,
                  po: ShoppingCart,
                  expense: DollarSign,
                  delivery: Truck,
                };
                const Icon = typeIcons[activity.type as keyof typeof typeIcons] || FileText;
                
                return (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{activity.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/tenders/create">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Create Tender
              </Button>
            </Link>
            <Link href="/invoices/create">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
            <Link href="/purchase-orders/create">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Purchase Order
              </Button>
            </Link>
            <Link href="/expenses/approvals">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Approve Expenses
              </Button>
            </Link>
            <Link href="/expenses/analytics">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Expense Analytics
              </Button>
            </Link>
            <Link href="/deliveries/create">
              <Button variant="outline" className="w-full justify-start">
                <Truck className="mr-2 h-4 w-4" />
                Create Delivery
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Manage Inventory
              </Button>
            </Link>
            <Link href="/budgets">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                View Budgets
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
