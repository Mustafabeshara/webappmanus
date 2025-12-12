import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  BarChart3,
  Target,
  ShoppingCart,
  Calendar,
  DollarSign,
  Activity,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Search,
} from "lucide-react";

// =============================================================================
// INTERFACES
// =============================================================================

interface DemandForecast {
  period: string;
  predictedQuantity: number;
  predictedRevenue: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable" | "seasonal";
  factors: string[];
}

interface ProductInsight {
  type: "trend" | "risk" | "opportunity" | "anomaly" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
  suggestedAction?: string;
  relatedMetric?: string;
}

interface ProductForecastResult {
  productId: number;
  productName: string;
  sku: string;
  currentMetrics: {
    avgMonthlySales: number;
    avgMonthlyRevenue: number;
    salesVelocity: number;
    stockCoverDays: number;
    turnoverRate: number;
  };
  demandForecast: DemandForecast[];
  inventoryRecommendations: {
    reorderPoint: number;
    economicOrderQuantity: number;
    safetyStock: number;
    recommendedMaxStock: number;
    nextReorderDate?: string;
    stockoutRisk: "low" | "medium" | "high" | "critical";
  };
  pricingInsights: {
    currentMargin?: number;
    priceElasticity?: "high" | "medium" | "low";
    recommendedPriceAdjustment?: number;
    competitivePosition?: "premium" | "competitive" | "budget";
  };
  insights: ProductInsight[];
  summary: {
    healthScore: number;
    overallTrend: "positive" | "negative" | "neutral";
    primaryOpportunity: string;
    primaryRisk: string;
    actionItems: string[];
  };
}

interface ProductForecastProps {
  productId?: number;
  onClose?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProductForecast({ productId, onClose }: ProductForecastProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(productId || null);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastData, setForecastData] = useState<ProductForecastResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch products
  const { data: products = [] } = trpc.products.list.useQuery();

  // Filter products for selection
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 20);
    const search = searchTerm.toLowerCase();
    return products
      .filter((p: any) =>
        p.name?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [products, searchTerm]);

  // Generate forecast mutation
  const generateForecastMutation = trpc.ai.generateProductForecast.useMutation({
    onSuccess: (data) => {
      setForecastData(data as ProductForecastResult);
      setIsGenerating(false);
      toast.success("Forecast generated successfully!");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Failed to generate forecast: ${error.message}`);
    },
  });

  const handleGenerateForecast = () => {
    if (!selectedProductId) {
      toast.error("Please select a product first");
      return;
    }
    setIsGenerating(true);
    generateForecastMutation.mutate({
      productId: selectedProductId,
      forecastMonths,
    });
  };

  // Get selected product details
  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      {!forecastData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Product Demand Forecast
            </CardTitle>
            <CardDescription>
              Generate AI-powered demand forecasts, inventory recommendations, and insights for any product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Forecast Period</Label>
                <Select
                  value={forecastMonths.toString()}
                  onValueChange={(v) => setForecastMonths(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product list */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No products found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: any) => (
                      <TableRow
                        key={product.id}
                        className={`cursor-pointer ${selectedProductId === product.id ? "bg-primary/5" : ""}`}
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <TableCell>
                          <div className={`w-4 h-4 rounded-full border-2 ${selectedProductId === product.id ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                            {selectedProductId === product.id && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category || "General"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${((product.unitPrice || 0) / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleGenerateForecast}
                disabled={!selectedProductId || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Results */}
      {forecastData && (
        <ForecastResults
          data={forecastData}
          onBack={() => setForecastData(null)}
          onRegenerate={handleGenerateForecast}
        />
      )}
    </div>
  );
}

// =============================================================================
// FORECAST RESULTS COMPONENT
// =============================================================================

interface ForecastResultsProps {
  data: ProductForecastResult;
  onBack: () => void;
  onRegenerate: () => void;
}

function ForecastResults({ data, onBack, onRegenerate }: ForecastResultsProps) {
  const { currentMetrics, demandForecast, inventoryRecommendations, insights, summary } = data;

  // Calculate total predicted revenue
  const totalPredictedRevenue = demandForecast.reduce((sum, f) => sum + f.predictedRevenue, 0);
  const totalPredictedQuantity = demandForecast.reduce((sum, f) => sum + f.predictedQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Back to Products
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            {data.productName}
          </h2>
          <p className="text-muted-foreground">SKU: {data.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Health Score & Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className="text-3xl font-bold">{summary.healthScore}</p>
              </div>
              <div className={`p-3 rounded-full ${summary.healthScore >= 70 ? "bg-green-100" : summary.healthScore >= 40 ? "bg-yellow-100" : "bg-red-100"}`}>
                {summary.overallTrend === "positive" ? (
                  <TrendingUp className={`h-6 w-6 ${summary.healthScore >= 70 ? "text-green-600" : "text-yellow-600"}`} />
                ) : summary.overallTrend === "negative" ? (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                ) : (
                  <Minus className="h-6 w-6 text-gray-600" />
                )}
              </div>
            </div>
            <Progress value={summary.healthScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predicted Revenue</p>
                <p className="text-2xl font-bold">${(totalPredictedRevenue / 100).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next {demandForecast.length} months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predicted Sales</p>
                <p className="text-2xl font-bold">{totalPredictedQuantity.toLocaleString()} units</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(totalPredictedQuantity / demandForecast.length)}/month avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Risk</p>
                <Badge
                  className={
                    inventoryRecommendations.stockoutRisk === "critical" ? "bg-red-500" :
                    inventoryRecommendations.stockoutRisk === "high" ? "bg-orange-500" :
                    inventoryRecommendations.stockoutRisk === "medium" ? "bg-yellow-500" :
                    "bg-green-500"
                  }
                >
                  {inventoryRecommendations.stockoutRisk.toUpperCase()}
                </Badge>
              </div>
              <AlertTriangle className={`h-8 w-8 ${
                inventoryRecommendations.stockoutRisk === "critical" ? "text-red-500" :
                inventoryRecommendations.stockoutRisk === "high" ? "text-orange-500" :
                "text-muted-foreground/30"
              }`} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentMetrics.stockCoverDays} days of stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">
            <BarChart3 className="h-4 w-4 mr-2" />
            Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
        </TabsList>

        {/* Demand Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Demand Forecast</CardTitle>
              <CardDescription>
                AI-predicted demand for the next {demandForecast.length} months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple bar chart visualization */}
              <div className="space-y-4">
                {demandForecast.map((forecast, idx) => {
                  const maxQuantity = Math.max(...demandForecast.map(f => f.predictedQuantity));
                  const barWidth = maxQuantity > 0 ? (forecast.predictedQuantity / maxQuantity) * 100 : 0;

                  return (
                    <div key={forecast.period} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{forecast.period}</span>
                          {forecast.trend === "increasing" && (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          )}
                          {forecast.trend === "decreasing" && (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span>{forecast.predictedQuantity} units</span>
                          <span className="text-muted-foreground">
                            ${(forecast.predictedRevenue / 100).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {forecast.confidence}% conf
                          </Badge>
                        </div>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Inventory Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Reorder Point</span>
                    <span className="font-bold">{inventoryRecommendations.reorderPoint} units</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Economic Order Qty (EOQ)</span>
                    <span className="font-bold">{inventoryRecommendations.economicOrderQuantity} units</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Safety Stock</span>
                    <span className="font-bold">{inventoryRecommendations.safetyStock} units</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Recommended Max Stock</span>
                    <span className="font-bold">{inventoryRecommendations.recommendedMaxStock} units</span>
                  </div>
                  {inventoryRecommendations.nextReorderDate && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Next Reorder Date</span>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {inventoryRecommendations.nextReorderDate}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Avg Monthly Sales</span>
                    <span className="font-bold">{currentMetrics.avgMonthlySales} units</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Avg Monthly Revenue</span>
                    <span className="font-bold">${(currentMetrics.avgMonthlyRevenue / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Sales Velocity</span>
                    <span className="font-bold">{currentMetrics.salesVelocity} units/day</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Stock Cover</span>
                    <span className="font-bold">{currentMetrics.stockCoverDays} days</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Turnover Rate</span>
                    <span className="font-bold">{currentMetrics.turnoverRate}x/year</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Primary Opportunity
                  </h4>
                  <p className="text-sm">{summary.primaryOpportunity}</p>
                </div>
                <div>
                  <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Primary Risk
                  </h4>
                  <p className="text-sm">{summary.primaryRisk}</p>
                </div>
              </div>
              {summary.actionItems.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Recommended Actions
                  </h4>
                  <ul className="space-y-1">
                    {summary.actionItems.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Insights */}
          <div className="grid gap-4">
            {insights.map((insight, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      insight.type === "risk" ? "bg-red-100" :
                      insight.type === "opportunity" ? "bg-green-100" :
                      insight.type === "trend" ? "bg-blue-100" :
                      insight.type === "anomaly" ? "bg-orange-100" :
                      "bg-purple-100"
                    }`}>
                      {insight.type === "risk" && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      {insight.type === "opportunity" && <TrendingUp className="h-5 w-5 text-green-600" />}
                      {insight.type === "trend" && <BarChart3 className="h-5 w-5 text-blue-600" />}
                      {insight.type === "anomaly" && <AlertCircle className="h-5 w-5 text-orange-600" />}
                      {insight.type === "recommendation" && <Lightbulb className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={
                          insight.impact === "high" ? "destructive" :
                          insight.impact === "medium" ? "default" :
                          "secondary"
                        }>
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      {insight.suggestedAction && (
                        <div className="mt-2 p-2 bg-muted rounded-lg">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Suggested Action:
                          </p>
                          <p className="text-sm text-muted-foreground">{insight.suggestedAction}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {insights.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No specific insights available for this product
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Monthly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.avgMonthlySales}</div>
                <p className="text-xs text-muted-foreground">units per month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(currentMetrics.avgMonthlyRevenue / 100).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">per month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sales Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.salesVelocity}</div>
                <p className="text-xs text-muted-foreground">units per day</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stock Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.stockCoverDays}</div>
                <p className="text-xs text-muted-foreground">days of inventory</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.turnoverRate}x</div>
                <p className="text-xs text-muted-foreground">per year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(demandForecast.reduce((sum, f) => sum + f.confidence, 0) / demandForecast.length)}%
                </div>
                <p className="text-xs text-muted-foreground">forecast confidence</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// DIALOG WRAPPER
// =============================================================================

interface ProductForecastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: number;
}

export function ProductForecastDialog({ open, onOpenChange, productId }: ProductForecastDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Product Demand Forecast
          </DialogTitle>
        </DialogHeader>
        <ProductForecast productId={productId} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default ProductForecast;
