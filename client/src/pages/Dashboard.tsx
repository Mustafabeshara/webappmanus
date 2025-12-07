import { trpc } from "@/lib/trpc";
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
  BarChart3
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: analytics, isLoading } = trpc.analytics.dashboard.useQuery();
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: unreadNotifications } = trpc.notifications.unread.useQuery();

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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your AI-powered business management system
        </p>
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
            {lowStock?.length} product(s) are running low on stock.
            <Link href="/inventory">
              <Button variant="link" className="p-0 h-auto ml-2">
                View Inventory <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Link key={index} href={stat.link}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.total !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    of {stat.total} total
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
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>System overview at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Awarded Tenders</span>
              </div>
              <span className="font-semibold">{analytics?.tenders.awarded || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Pending Expenses</span>
              </div>
              <span className="font-semibold">{analytics?.expenses.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm">Overdue Invoices</span>
              </div>
              <span className="font-semibold">{analytics?.invoices.overdue || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Low Stock Alerts</span>
              </div>
              <span className="font-semibold">{lowStock?.length || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              {unreadNotifications?.length || 0} unread notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unreadNotifications && unreadNotifications.length > 0 ? (
              <div className="space-y-3">
                {unreadNotifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No new notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/tenders/new">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                New Tender
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </Link>
            <Link href="/expenses/new">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </Link>
            <Link href="/expenses/approvals">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Approve Expenses
              </Button>
            </Link>
            <Link href="/expenses/analytics">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Expense Analytics
              </Button>
            </Link>
            <Link href="/templates">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
