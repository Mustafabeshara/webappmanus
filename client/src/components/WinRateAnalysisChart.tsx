import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  PieChartIcon,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Target,
  Trophy,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChartView = "bar" | "pie" | "trend" | "area";
type TimeRange = "3m" | "6m" | "12m" | "all";

const COLORS = {
  awarded: "#22c55e",
  closed: "#ef4444",
  open: "#3b82f6",
  draft: "#94a3b8",
  archived: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  awarded: "Won",
  closed: "Lost",
  open: "In Progress",
  draft: "Draft",
  archived: "Archived",
};

export function WinRateAnalysisChart() {
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: analyticsData, isLoading, refetch } = trpc.analytics.aiInsights.useQuery();
  const { data: tenders } = trpc.tenders.list.useQuery();

  // Process tender data for charts
  const chartData = useMemo(() => {
    if (!tenders) return { byStatus: [], byMonth: [], byCategory: [], summary: null };

    const now = new Date();
    const monthsToShow = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : timeRange === "12m" ? 12 : 24;
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsToShow, 1);

    // Filter tenders by time range
    const filteredTenders = tenders.filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt >= cutoffDate;
    });

    // Filter by category if selected
    const categoryFiltered = selectedCategory === "all"
      ? filteredTenders
      : filteredTenders.filter(t => String(t.categoryId) === selectedCategory);

    // Status breakdown
    const statusCounts = categoryFiltered.reduce((acc, tender) => {
      const status = tender.status || "draft";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
      fill: COLORS[status as keyof typeof COLORS] || "#94a3b8",
    }));

    // Monthly trend data
    const byMonth: { month: string; won: number; lost: number; total: number; winRate: number }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const monthTenders = categoryFiltered.filter(t => {
        const d = new Date(t.createdAt);
        return d >= monthStart && d <= monthEnd;
      });

      const won = monthTenders.filter(t => t.status === "awarded").length;
      const lost = monthTenders.filter(t => t.status === "closed").length;
      const total = monthTenders.length;
      const decided = won + lost;
      const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

      byMonth.push({ month: monthName, won, lost, total, winRate });
    }

    // Category breakdown
    const categories = [...new Set(filteredTenders.map(t => t.categoryId ? String(t.categoryId) : "Uncategorized"))];
    const byCategory = categories.map(category => {
      const catTenders = filteredTenders.filter(t => (t.categoryId ? String(t.categoryId) : "Uncategorized") === category);
      const won = catTenders.filter(t => t.status === "awarded").length;
      const lost = catTenders.filter(t => t.status === "closed").length;
      const decided = won + lost;
      return {
        category,
        won,
        lost,
        total: catTenders.length,
        winRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);

    // Summary statistics
    const totalTenders = categoryFiltered.length;
    const wonTenders = categoryFiltered.filter(t => t.status === "awarded").length;
    const lostTenders = categoryFiltered.filter(t => t.status === "closed").length;
    const decidedTenders = wonTenders + lostTenders;
    const overallWinRate = decidedTenders > 0 ? Math.round((wonTenders / decidedTenders) * 100) : 0;
    const totalValue = categoryFiltered
      .filter(t => t.status === "awarded")
      .reduce((sum, t) => sum + (t.awardedValue || t.estimatedValue || 0), 0);

    return {
      byStatus,
      byMonth,
      byCategory,
      summary: {
        total: totalTenders,
        won: wonTenders,
        lost: lostTenders,
        inProgress: categoryFiltered.filter(t => t.status === "open").length,
        winRate: overallWinRate,
        totalValue: Math.round(totalValue / 100),
      },
    };
  }, [tenders, timeRange, selectedCategory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!tenders) return [];
    return [...new Set(tenders.map(t => t.categoryId ? String(t.categoryId) : "Uncategorized"))].sort((a, b) => a.localeCompare(b));
  }, [tenders]);

  const handleExport = useCallback(() => {
    if (!chartData.byMonth.length) return;

    const csvContent = [
      ["Month", "Won", "Lost", "Total", "Win Rate %"].join(","),
      ...chartData.byMonth.map(row =>
        [row.month, row.won, row.lost, row.total, row.winRate].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `win-rate-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chartData.byMonth]);

  if (isLoading) {
    return (
      <Card className="md:col-span-2">
        <CardContent className="h-72 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2 overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Win Rate Analysis
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your tender success rates
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">3 months</SelectItem>
                <SelectItem value="6m">6 months</SelectItem>
                <SelectItem value="12m">12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Summary Stats */}
        {chartData.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">{chartData.summary.total}</div>
              <div className="text-xs text-muted-foreground">Total Tenders</div>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4" />
                {chartData.summary.won}
              </div>
              <div className="text-xs text-green-600 dark:text-green-500">Won</div>
            </div>
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400 flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" />
                {chartData.summary.lost}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">Lost</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                {chartData.summary.inProgress}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-500">In Progress</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-center">
              <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                <Target className="h-4 w-4" />
                {chartData.summary.winRate}%
              </div>
              <div className="text-xs text-primary/80">Win Rate</div>
            </div>
          </div>
        )}

        {/* Chart Type Tabs */}
        <Tabs value={chartView} onValueChange={(v) => setChartView(v as ChartView)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="bar" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Bar
            </TabsTrigger>
            <TabsTrigger value="pie" className="text-xs">
              <PieChartIcon className="h-3 w-3 mr-1" />
              Pie
            </TabsTrigger>
            <TabsTrigger value="trend" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trend
            </TabsTrigger>
            <TabsTrigger value="area" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Area
            </TabsTrigger>
          </TabsList>

          {/* Bar Chart - Win/Loss by Month */}
          <TabsContent value="bar" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.byMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [value, name === "won" ? "Won" : "Lost"]}
                  />
                  <Legend />
                  <Bar dataKey="won" name="Won" fill={COLORS.awarded} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" name="Lost" fill={COLORS.closed} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Pie Chart - Status Distribution */}
          <TabsContent value="pie" className="mt-4">
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartData.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Line Chart - Win Rate Trend */}
          <TabsContent value="trend" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.byMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Win Rate"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    name="Win Rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Area Chart - Cumulative */}
          <TabsContent value="area" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.byMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="won"
                    name="Won"
                    stackId="1"
                    stroke={COLORS.awarded}
                    fill={COLORS.awarded}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="lost"
                    name="Lost"
                    stackId="1"
                    stroke={COLORS.closed}
                    fill={COLORS.closed}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Category Breakdown */}
        {chartData.byCategory.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Win Rate by Category</h4>
            <div className="space-y-2">
              {chartData.byCategory.slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-32 truncate">{cat.category}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        cat.winRate >= 50 ? "bg-green-500" : cat.winRate >= 25 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${cat.winRate}%` }}
                    />
                  </div>
                  <Badge variant="outline" className="text-xs min-w-[60px] justify-center">
                    {cat.winRate}% ({cat.won}/{cat.won + cat.lost})
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
