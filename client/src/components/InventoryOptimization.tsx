import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, TrendingUp, TrendingDown, Package, AlertTriangle, CheckCircle, XCircle, Zap, RefreshCw, ShoppingCart, Clock, Lightbulb, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface OptimizationData {
  demandForecast: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    confidence: number;
    trend: "increasing" | "decreasing" | "stable" | "seasonal";
  };
  reorderRecommendations: Array<{
    productId: number;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
    suggestedOrderQty: number;
    urgency: "critical" | "high" | "medium" | "low";
    estimatedCost: number;
    reason: string;
  }>;
  stockOptimization: {
    overstock: Array<{
      productId: number;
      productName: string;
      sku: string;
      currentStock: number;
      suggestedStock: number;
      excessValue: number;
      recommendation: string;
    }>;
    understock: Array<{
      productId: number;
      productName: string;
      sku: string;
      currentStock: number;
      recommendedStock: number;
      stockoutRisk: number;
      recommendation: string;
    }>;
    expiringItems: Array<{
      productId: number;
      productName: string;
      sku: string;
      quantity: number;
      expiryDate: string;
      daysUntilExpiry: number;
      recommendation: string;
    }>;
  };
  insights: Array<{
    type: "opportunity" | "risk" | "recommendation" | "trend";
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    actionable: boolean;
  }>;
  metrics: {
    turnoverRate: number;
    stockoutRisk: number;
    inventoryHealth: number;
    potentialSavings: number;
  };
}

export function InventoryOptimization() {
  const [optimization, setOptimization] = useState<OptimizationData | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeMutation = trpc.inventory.optimize.useMutation({
    onSuccess: (data) => {
      if (data.analysis) {
        setOptimization(data.analysis as unknown as OptimizationData);
      }
      toast.success("AI optimization completed");
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
    onSettled: () => {
      setIsOptimizing(false);
    },
  });

  const aiStatus = trpc.inventory.getAIStatus.useQuery(undefined, {
    staleTime: 60000,
  });

  const handleOptimize = () => {
    setIsOptimizing(true);
    optimizeMutation.mutate();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "opportunity": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "risk": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "recommendation": return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case "trend": return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decreasing": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!aiStatus.data?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Inventory Optimization
          </CardTitle>
          <CardDescription>
            AI-powered inventory optimization is not configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>To enable AI optimization, configure an AI provider (Groq, Gemini, or OpenAI) in your environment variables.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Inventory Optimization
            </CardTitle>
            <CardDescription>
              Demand forecasting, reorder recommendations & stock optimization
            </CardDescription>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            variant={optimization ? "outline" : "default"}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : optimization ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-optimize
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Optimize Inventory
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!optimization && !isOptimizing && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Click "Optimize Inventory" to generate AI-powered insights</p>
            <p className="text-sm mt-1">Includes demand forecasting, reorder recommendations, and stock optimization</p>
          </div>
        )}

        {isOptimizing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="font-medium">Analyzing inventory data...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
          </div>
        )}

        {optimization && !isOptimizing && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className={`text-2xl font-bold ${getScoreColor(optimization.metrics.inventoryHealth)}`}>
                  {optimization.metrics.inventoryHealth}%
                </div>
                <div className="text-sm text-muted-foreground">Inventory Health</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className={`text-2xl font-bold ${getScoreColor(100 - optimization.metrics.stockoutRisk)}`}>
                  {optimization.metrics.stockoutRisk}%
                </div>
                <div className="text-sm text-muted-foreground">Stockout Risk</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {optimization.metrics.turnoverRate.toFixed(1)}x
                </div>
                <div className="text-sm text-muted-foreground">Turnover Rate</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${optimization.metrics.potentialSavings.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Potential Savings</div>
              </div>
            </div>

            {/* Demand Forecast */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Demand Forecast
                {getTrendIcon(optimization.demandForecast.trend)}
                <Badge variant="outline" className="ml-2">
                  {optimization.demandForecast.trend}
                </Badge>
              </h4>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xl font-bold">{optimization.demandForecast.nextMonth}</div>
                  <div className="text-sm text-muted-foreground">Next Month</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xl font-bold">{optimization.demandForecast.next3Months}</div>
                  <div className="text-sm text-muted-foreground">Next 3 Months</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xl font-bold">{optimization.demandForecast.next6Months}</div>
                  <div className="text-sm text-muted-foreground">Next 6 Months</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Confidence:</span>
                <Progress value={optimization.demandForecast.confidence} className="h-2 flex-1 max-w-[200px]" />
                <span>{optimization.demandForecast.confidence}%</span>
              </div>
            </div>

            {/* Reorder Recommendations */}
            {optimization.reorderRecommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Reorder Recommendations
                  <Badge variant="secondary">{optimization.reorderRecommendations.length}</Badge>
                </h4>
                <div className="space-y-2">
                  {optimization.reorderRecommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{rec.productName}</span>
                          <span className="text-sm text-muted-foreground ml-2">({rec.sku})</span>
                        </div>
                        <Badge className={getUrgencyColor(rec.urgency)}>
                          {rec.urgency}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium ml-1">{rec.currentStock}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reorder Point:</span>
                          <span className="font-medium ml-1">{rec.reorderPoint}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Order:</span>
                          <span className="font-medium ml-1 text-green-600">{rec.suggestedOrderQty}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Est. Cost:</span>
                          <span className="font-medium ml-1">${rec.estimatedCost.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Optimization */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Understock */}
              {optimization.stockOptimization.understock.length > 0 && (
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <h5 className="font-medium text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Low Stock Alert ({optimization.stockOptimization.understock.length})
                  </h5>
                  <div className="space-y-2">
                    {optimization.stockOptimization.understock.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-red-600">{item.stockoutRisk}% risk</span>
                        </div>
                        <div className="text-muted-foreground">
                          Current: {item.currentStock} | Recommended: {item.recommendedStock}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overstock */}
              {optimization.stockOptimization.overstock.length > 0 && (
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <h5 className="font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Overstock Alert ({optimization.stockOptimization.overstock.length})
                  </h5>
                  <div className="space-y-2">
                    {optimization.stockOptimization.overstock.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-yellow-600">${item.excessValue} excess</span>
                        </div>
                        <div className="text-muted-foreground">
                          Current: {item.currentStock} | Suggested: {item.suggestedStock}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expiring Items */}
            {optimization.stockOptimization.expiringItems.length > 0 && (
              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                <h5 className="font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expiring Soon ({optimization.stockOptimization.expiringItems.length})
                </h5>
                <div className="space-y-2">
                  {optimization.stockOptimization.expiringItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-900 rounded">
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground ml-2">({item.quantity} units)</span>
                      </div>
                      <Badge variant={item.daysUntilExpiry <= 7 ? "destructive" : "secondary"}>
                        {item.daysUntilExpiry} days
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {optimization.insights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI Insights
                </h4>
                <div className="space-y-2">
                  {optimization.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{insight.title}</span>
                          <Badge variant={insight.impact === "high" ? "default" : insight.impact === "medium" ? "secondary" : "outline"}>
                            {insight.impact} impact
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Actionable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
