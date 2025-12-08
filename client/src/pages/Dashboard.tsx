import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  Bell,
  LayoutGrid,
  Brain,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { showNotificationToast, Notification } from "@/lib/toastNotifications";
import { soundNotifications } from "@/lib/soundNotifications";
import BusinessInsights from "@/components/BusinessInsights";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: analytics, isLoading } = trpc.analytics.dashboard.useQuery();
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: unreadNotifications } = trpc.notifications.unread.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const previousNotificationIds = useRef<Set<number>>(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!unreadNotifications) return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousNotificationIds.current = new Set(unreadNotifications.map(n => n.id));
      return;
    }

    const newNotifications = unreadNotifications.filter(
      n => !previousNotificationIds.current.has(n.id)
    );

    newNotifications.forEach(notification => {
      showNotificationToast(notification as Notification);
      soundNotifications.playForNotificationType(notification.type);
    });

    previousNotificationIds.current = new Set(unreadNotifications.map(n => n.id));
  }, [unreadNotifications]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const hasAlerts = (analytics?.budgets.overBudget || 0) > 0 || (lowStock?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to your AI-powered business management system"
        actions={
          <Link href="/tenders/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Tender
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Business Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-insights">
          <BusinessInsights />
        </TabsContent>

        <TabsContent value="overview">
      {/* Critical Alerts */}
      {hasAlerts && (
        <div className="space-y-3">
          {(analytics?.budgets.overBudget || 0) > 0 && (
            <Alert variant="destructive" className="border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Budget Alert</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{analytics?.budgets.overBudget} budget(s) have exceeded their allocated amount.</span>
                <Link href="/budgets">
                  <Button variant="outline" size="sm" className="ml-4 shrink-0">
                    View Budgets <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {(lowStock?.length || 0) > 0 && (
            <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <Package className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800 dark:text-orange-200">Inventory Alert</AlertTitle>
              <AlertDescription className="flex items-center justify-between text-orange-700 dark:text-orange-300">
                <span>{lowStock?.length} product(s) are running low on stock.</span>
                <Link href="/inventory">
                  <Button variant="outline" size="sm" className="ml-4 shrink-0">
                    View Inventory <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <StatCardGrid>
        <StatCard
          title="Active Tenders"
          value={analytics?.tenders.open || 0}
          subtitle={`of ${analytics?.tenders.total || 0} total`}
          icon={FileText}
          color="blue"
          onClick={() => setLocation("/tenders")}
        />
        <StatCard
          title="Active Budgets"
          value={analytics?.budgets.active || 0}
          subtitle={`of ${analytics?.budgets.total || 0} total`}
          icon={DollarSign}
          color="green"
          alert={
            (analytics?.budgets.overBudget || 0) > 0
              ? { count: analytics?.budgets.overBudget || 0, label: "over budget" }
              : undefined
          }
          onClick={() => setLocation("/budgets")}
        />
        <StatCard
          title="Pending Invoices"
          value={analytics?.invoices.unpaid || 0}
          subtitle={`of ${analytics?.invoices.total || 0} total`}
          icon={TrendingUp}
          color="purple"
          onClick={() => setLocation("/invoices")}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStock?.length || 0}
          subtitle="items need attention"
          icon={Package}
          color="orange"
          onClick={() => setLocation("/inventory")}
        />
      </StatCardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </div>
            <CardDescription>System overview at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <QuickStatRow
                icon={CheckCircle}
                iconColor="text-green-600 dark:text-green-400"
                label="Awarded Tenders"
                value={analytics?.tenders.awarded || 0}
              />
              <QuickStatRow
                icon={Clock}
                iconColor="text-yellow-600 dark:text-yellow-400"
                label="Pending Expenses"
                value={analytics?.expenses.pending || 0}
              />
              <QuickStatRow
                icon={AlertTriangle}
                iconColor="text-red-600 dark:text-red-400"
                label="Overdue Invoices"
                value={analytics?.invoices.overdue || 0}
                highlight={(analytics?.invoices.overdue || 0) > 0}
              />
              <QuickStatRow
                icon={Package}
                iconColor="text-orange-600 dark:text-orange-400"
                label="Low Stock Alerts"
                value={lowStock?.length || 0}
                highlight={(lowStock?.length || 0) > 0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Recent Notifications</CardTitle>
              </div>
              {(unreadNotifications?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadNotifications?.length} unread
                </Badge>
              )}
            </div>
            <CardDescription>Stay updated on important events</CardDescription>
          </CardHeader>
          <CardContent>
            {unreadNotifications && unreadNotifications.length > 0 ? (
              <div className="space-y-2">
                {unreadNotifications.slice(0, 4).map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No new notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionButton href="/tenders/create" icon={FileText} label="New Tender" />
            <QuickActionButton href="/invoices/new" icon={TrendingUp} label="New Invoice" />
            <QuickActionButton href="/expenses/new" icon={DollarSign} label="New Expense" />
            <QuickActionButton href="/templates" icon={LayoutGrid} label="Templates" />
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function QuickStatRow({
  icon: Icon,
  iconColor,
  label,
  value,
  highlight
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${highlight ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`font-semibold tabular-nums ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="w-full justify-start h-11 hover:bg-primary/5 hover:border-primary/20 transition-all"
      >
        <Icon className="h-4 w-4 mr-2.5 text-muted-foreground" />
        {label}
      </Button>
    </Link>
  );
}
