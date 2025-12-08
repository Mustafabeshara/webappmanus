import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  BarChart3,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Clock,
  RefreshCw,
} from "lucide-react";

interface ForecastMetric {
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

interface BudgetVariance {
  budgetId: number;
  budgetName: string;
  allocated: number;
  spent: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on-track';
  prediction: 'will-exceed' | 'will-underspend' | 'on-target';
  riskLevel: 'low' | 'medium' | 'high';
}

interface ForecastResult {
  metrics: {
    totalBudget: ForecastMetric;
    totalSpending: ForecastMetric;
    remainingBudget: ForecastMetric;
    burnRate: ForecastMetric;
  };
  monthlyProjections: Array<{
    month: string;
    projectedSpending: number;
    projectedRemaining: number;
    cumulative: number;
  }>;
  budgetVariances: BudgetVariance[];
  insights: Array<{
    type: 'trend' | 'risk' | 'opportunity' | 'forecast';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    suggestedAction?: string;
  }>;
  summary: {
    healthScore: number;
    overallTrend: 'positive' | 'negative' | 'neutral';
    primaryRisk: string;
    primaryOpportunity: string;
    timeframeDays: number;
  };
}

export function BudgetForecast() {
  const [timeframe, setTimeframe] = useState("90");
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  const { data: aiStatus } = trpc.budgets.getAIStatus.useQuery();
  const forecastMutation = trpc.budgets.forecast.useMutation({
    onSuccess: (data) => {
      setForecast(data.forecast);
    },
  });

  const generateForecast = () => {
    forecastMutation.mutate({ timeframeDays: parseInt(timeframe) });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-emerald-500" />;
      case 'trend': return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const variants: Record<string, string> = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-green-100 text-green-700 border-green-200",
    };
    return variants[impact] || variants.low;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
      case 'medium': return <Badge className="bg-amber-500 hover:bg-amber-600">Medium Risk</Badge>;
      default: return <Badge variant="secondary">Low Risk</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'over': return <Badge variant="destructive">Over Budget</Badge>;
      case 'under': return <Badge className="bg-blue-500 hover:bg-blue-600">Under Budget</Badge>;
      default: return <Badge variant="secondary">On Track</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>AI Budget Forecasting</CardTitle>
              <CardDescription>
                Predict spending patterns and identify budget risks
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="180">6 Months</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateForecast}
              disabled={forecastMutation.isPending || !aiStatus?.configured}
            >
              {forecastMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Generate Forecast
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!aiStatus?.configured && (
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              AI forecasting requires API configuration
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Groq, Gemini, or OpenAI API keys in environment variables
            </p>
          </div>
        )}

        {forecastMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 font-medium">Error generating forecast</p>
            <p className="text-red-500 text-sm mt-1">{forecastMutation.error.message}</p>
          </div>
        )}

        {forecast && (
          <div className="space-y-6">
            {/* Health Score & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="col-span-1">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Budget Health Score</div>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={`${forecast.summary.healthScore * 2.51} 251`}
                          className={getHealthColor(forecast.summary.healthScore).replace('bg-', 'text-')}
                        />
                      </svg>
                      <span className="absolute text-2xl font-bold">
                        {forecast.summary.healthScore}
                      </span>
                    </div>
                    <Badge className={`mt-2 ${
                      forecast.summary.overallTrend === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                      forecast.summary.overallTrend === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {forecast.summary.overallTrend === 'positive' ? (
                        <><ArrowUp className="h-3 w-3 mr-1" /> Positive Trend</>
                      ) : forecast.summary.overallTrend === 'negative' ? (
                        <><ArrowDown className="h-3 w-3 mr-1" /> Negative Trend</>
                      ) : (
                        <><Minus className="h-3 w-3 mr-1" /> Neutral</>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card className="col-span-3">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Total Budget
                      </div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(forecast.metrics.totalBudget.current)}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(forecast.metrics.totalBudget.trend)}
                        <span className="text-muted-foreground">
                          {forecast.metrics.totalBudget.confidence}% confidence
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Current Spending
                      </div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(forecast.metrics.totalSpending.current)}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(forecast.metrics.totalSpending.trend)}
                        <span className={forecast.metrics.totalSpending.percentChange > 0 ? 'text-red-500' : 'text-emerald-500'}>
                          {forecast.metrics.totalSpending.percentChange > 0 ? '+' : ''}
                          {forecast.metrics.totalSpending.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Remaining Budget
                      </div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(forecast.metrics.remainingBudget.current)}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(forecast.metrics.remainingBudget.trend)}
                        <span className="text-muted-foreground">
                          Projected: {formatCurrency(forecast.metrics.remainingBudget.predicted)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Daily Burn Rate
                      </div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(forecast.metrics.burnRate.current)}/day
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(forecast.metrics.burnRate.trend)}
                        <span className="text-muted-foreground">
                          {forecast.metrics.burnRate.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Projections */}
            {forecast.monthlyProjections.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Monthly Projections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {forecast.monthlyProjections.map((proj, idx) => {
                      const percentOfBudget = forecast.metrics.totalBudget.current > 0
                        ? (proj.cumulative / forecast.metrics.totalBudget.current) * 100
                        : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{proj.month}</span>
                            <div className="flex gap-4">
                              <span className="text-muted-foreground">
                                Spending: {formatCurrency(proj.projectedSpending)}
                              </span>
                              <span className={proj.projectedRemaining < 0 ? 'text-red-600 font-medium' : ''}>
                                Remaining: {formatCurrency(proj.projectedRemaining)}
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={Math.min(percentOfBudget, 100)}
                            className={`h-2 ${percentOfBudget > 100 ? '[&>div]:bg-red-500' : percentOfBudget > 80 ? '[&>div]:bg-amber-500' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Variances */}
            {forecast.budgetVariances.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Budget Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {forecast.budgetVariances.slice(0, 5).map((variance) => {
                      const utilization = variance.allocated > 0
                        ? (variance.spent / variance.allocated) * 100
                        : 0;
                      return (
                        <div key={variance.budgetId} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{variance.budgetName}</span>
                              {getStatusBadge(variance.status)}
                              {getRiskBadge(variance.riskLevel)}
                            </div>
                            <Badge variant="outline">
                              {variance.prediction === 'will-exceed' ? 'Will Exceed' :
                               variance.prediction === 'will-underspend' ? 'Will Underspend' : 'On Target'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Allocated:</span>
                              <div className="font-medium">{formatCurrency(variance.allocated)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Spent:</span>
                              <div className="font-medium">{formatCurrency(variance.spent)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Variance:</span>
                              <div className={`font-medium ${variance.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {variance.variance >= 0 ? '+' : ''}{formatCurrency(variance.variance)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Utilization:</span>
                              <div className="font-medium">{utilization.toFixed(1)}%</div>
                            </div>
                          </div>
                          <Progress
                            value={Math.min(utilization, 100)}
                            className={`h-1.5 mt-2 ${utilization > 100 ? '[&>div]:bg-red-500' : utilization > 80 ? '[&>div]:bg-amber-500' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights */}
            {forecast.insights.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI Insights & Recommendations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {forecast.insights.map((insight, idx) => (
                      <div key={idx} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{insight.title}</span>
                              <Badge variant="outline" className={getImpactBadge(insight.impact)}>
                                {insight.impact} impact
                              </Badge>
                              {insight.actionable && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  Actionable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {insight.description}
                            </p>
                            {insight.suggestedAction && (
                              <div className="mt-2 p-2 bg-primary/5 rounded text-sm">
                                <span className="font-medium">Suggested Action:</span> {insight.suggestedAction}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Primary Risk
                    </div>
                    <p className="text-sm text-muted-foreground">{forecast.summary.primaryRisk}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Primary Opportunity
                    </div>
                    <p className="text-sm text-muted-foreground">{forecast.summary.primaryOpportunity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!forecast && aiStatus?.configured && !forecastMutation.isPending && (
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Click "Generate Forecast" to analyze your budget data
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              AI will predict spending patterns and identify potential risks
            </p>
          </div>
        )}

        {forecastMutation.isPending && (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="font-medium">Analyzing budget data...</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI is generating forecasts and insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
