import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TenderMatchingDashboard } from "@/components/TenderMatchingDashboard";
import { SemanticSearch } from "@/components/SemanticSearch";
import { NLPSearchBar } from "@/components/NLPSearchBar";
import { ProductForecast } from "@/components/ProductForecast";
import {
  Brain,
  Target,
  Sparkles,
  TrendingUp,
  Package,
  FileText,
  Building2,
  BarChart3,
  Lightbulb,
  Zap,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AIInsights() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("matching");
  const [nlpResults, setNlpResults] = useState<any>(null);

  // Handle search result selection
  const handleSearchSelect = (result: any) => {
    switch (result.type) {
      case "product":
        setLocation(`/inventory/${result.id}`);
        break;
      case "tender":
        setLocation(`/tenders/${result.id}`);
        break;
      case "supplier":
        setLocation(`/suppliers/${result.id}`);
        break;
      default:
        toast.info(`Selected: ${result.title}`);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Brain className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Business Intelligence</h1>
              <p className="text-white/80 mt-1">
                Leverage AI to find opportunities, analyze products, and make smarter decisions
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-white/70">AI Status</div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-300 animate-pulse" />
                <span className="font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">127</div>
            <div className="text-sm text-white/70">Documents Processed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">94%</div>
            <div className="text-sm text-white/70">Match Accuracy</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">23</div>
            <div className="text-sm text-white/70">Active Opportunities</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">$2.4M</div>
            <div className="text-sm text-white/70">Pipeline Value</div>
          </div>
        </div>
      </div>

      {/* Global Semantic Search - Enhanced */}
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Smart Search</CardTitle>
                <CardDescription>
                  Search across products, tenders, and suppliers using natural language
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              <Activity className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <SemanticSearch
            onSelect={handleSearchSelect}
            placeholder="Try: 'medical diagnostic equipment' or 'cardiac monitors for hospitals'"
            showRecent={true}
            showSuggestions={true}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs - Enhanced */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="matching" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Tender Matching</span>
            <span className="sm:hidden">Match</span>
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Forecasting</span>
            <span className="sm:hidden">Forecast</span>
          </TabsTrigger>
          <TabsTrigger value="nlp" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">NLP Query</span>
            <span className="sm:hidden">NLP</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
            <span className="sm:hidden">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">AI Recs</span>
            <span className="sm:hidden">Recs</span>
          </TabsTrigger>
        </TabsList>

        {/* Tender Matching Tab */}
        <TabsContent value="matching" className="mt-6">
          <TenderMatchingDashboard />
        </TabsContent>

        {/* Product Forecasting Tab */}
        <TabsContent value="forecasting" className="mt-6">
          <ProductForecast />
        </TabsContent>

        {/* NLP Query Tab - Enhanced */}
        <TabsContent value="nlp" className="mt-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <MessageSquare className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Natural Language Query</CardTitle>
                  <CardDescription>
                    Ask questions in plain English and get intelligent results
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <NLPSearchBar
                onSearch={(query, parsed) => {
                  setNlpResults({ query, parsed, timestamp: new Date() });
                  toast.success(`Query understood: ${parsed.intent}`);
                }}
                placeholder="Ask anything... e.g., 'Show me medical equipment under $5000'"
              />

              {nlpResults && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted border">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">Query Analysis</h4>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Intent:</span>
                        <Badge variant="secondary">{nlpResults.parsed.intent}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Confidence:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${nlpResults.parsed.confidence * 100}%` }}
                            />
                          </div>
                          <span className="font-medium">{Math.round(nlpResults.parsed.confidence * 100)}%</span>
                        </div>
                      </div>
                      {nlpResults.parsed.filters.length > 0 && (
                        <div className="p-3 bg-background rounded-lg">
                          <span className="text-muted-foreground block mb-2">Filters:</span>
                          <div className="flex flex-wrap gap-2">
                            {nlpResults.parsed.filters.map((f: any, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {f.field} {f.operator} {f.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {nlpResults.parsed.entities.length > 0 && (
                        <div className="p-3 bg-background rounded-lg">
                          <span className="text-muted-foreground block mb-2">Entities:</span>
                          <div className="flex flex-wrap gap-2">
                            {nlpResults.parsed.entities.map((e: any, idx: number) => (
                              <Badge key={idx} variant="secondary">
                                {e.type}: {e.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Insights Tab - Enhanced */}
        <TabsContent value="insights" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  Market Trends
                </CardTitle>
                <CardDescription>AI-detected patterns in tender activity</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-green-500/20">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Growing Demand</p>
                      <p className="text-sm text-green-700 mt-1">
                        Medical diagnostic equipment requests up 23% this quarter
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/20">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800">Emerging Opportunity</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Increase in telemedicine equipment tenders across Gulf region
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/20">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-800">Seasonal Pattern</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Q4 typically shows 35% increase in healthcare procurement
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  Product Performance
                </CardTitle>
                <CardDescription>How your products match tender requirements</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Patient Monitors</span>
                    <span className="text-sm font-bold text-green-600">92%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style={{ width: "92%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Surgical Equipment</span>
                    <span className="text-sm font-bold text-yellow-600">76%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all" style={{ width: "76%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lab Analyzers</span>
                    <span className="text-sm font-bold text-blue-600">85%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: "85%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Imaging Systems</span>
                    <span className="text-sm font-bold text-purple-600">88%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all" style={{ width: "88%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  Supplier Analysis
                </CardTitle>
                <CardDescription>AI assessment of supplier performance</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="p-4 rounded-xl border bg-gradient-to-r from-green-50/50 to-transparent flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Top Performers</p>
                      <p className="text-xs text-muted-foreground">95%+ on-time delivery</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <div className="p-4 rounded-xl border bg-gradient-to-r from-yellow-50/50 to-transparent flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Need Attention</p>
                      <p className="text-xs text-muted-foreground">Quality issues detected</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">2</span>
                </div>
                <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-50/50 to-transparent flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Price Alerts</p>
                      <p className="text-xs text-muted-foreground">Better pricing available</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">5</span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  Document Intelligence
                </CardTitle>
                <CardDescription>Insights from processed documents</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200">
                    <div className="text-3xl font-bold text-purple-700">127</div>
                    <div className="text-xs text-purple-600 font-medium">Documents Processed</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-200">
                    <div className="text-3xl font-bold text-green-700">94%</div>
                    <div className="text-xs text-green-600 font-medium">Extraction Accuracy</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm font-medium mb-3">Document Types Processed:</p>
                  <div className="space-y-2">
                    {[
                      { name: "Tender specifications", count: 45, color: "bg-blue-500" },
                      { name: "Product catalogs", count: 32, color: "bg-green-500" },
                      { name: "Invoices", count: 28, color: "bg-yellow-500" },
                      { name: "Price lists", count: 22, color: "bg-purple-500" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-sm flex-1">{item.name}</span>
                        <span className="text-sm font-medium text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab - Enhanced */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle>Win Rate Analysis</CardTitle>
                <CardDescription>AI-powered analysis of your tender success rates</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-72 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted rounded-xl border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Interactive Chart Coming Soon</p>
                    <p className="text-sm mt-1">Win rate by category, time, and region</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 font-medium">Overall Win Rate</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-700 mt-1">68%</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 font-medium">Pipeline Value</span>
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">$2.4M</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-700 font-medium">Active Opportunities</span>
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-700 mt-1">12</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Recommendations Tab - Enhanced */}
        <TabsContent value="recommendations" className="mt-6">
          <div className="space-y-4">
            {[
              {
                priority: "high",
                title: "High Priority Opportunity",
                description: "Tender MOH-2024-045 for cardiac monitors closely matches your product catalog. Your existing products meet 94% of requirements. Deadline in 12 days.",
                icon: Zap,
                actions: ["View Tender", "Start Proposal"],
                color: "green",
              },
              {
                priority: "medium",
                title: "Catalog Enhancement",
                description: "Adding extended warranty options to 5 products could increase your match rate by 15% for government tenders. This is a common requirement you're currently missing.",
                icon: Package,
                actions: ["View Products"],
                color: "blue",
              },
              {
                priority: "attention",
                title: "Supplier Review Needed",
                description: "MedTech Supplies has a new price list available that could reduce your costs by 8% on imaging equipment. Last catalog update was 6 months ago.",
                icon: Building2,
                actions: ["Review Supplier", "Request Updated Catalog"],
                color: "yellow",
              },
              {
                priority: "opportunity",
                title: "Market Opportunity",
                description: "Based on tender trends, demand for telemedicine equipment is projected to grow 40% next quarter. Consider expanding your product line in this category.",
                icon: TrendingUp,
                actions: ["View Analysis"],
                color: "purple",
              },
            ].map((rec, idx) => {
              const colorMap = {
                green: { border: "border-l-green-500", bg: "bg-green-100", text: "text-green-600", title: "text-green-800", btn: "bg-green-100 text-green-700 hover:bg-green-200" },
                blue: { border: "border-l-blue-500", bg: "bg-blue-100", text: "text-blue-600", title: "text-blue-800", btn: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
                yellow: { border: "border-l-yellow-500", bg: "bg-yellow-100", text: "text-yellow-600", title: "text-yellow-800", btn: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
                purple: { border: "border-l-purple-500", bg: "bg-purple-100", text: "text-purple-600", title: "text-purple-800", btn: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
              };
              const colorClasses = colorMap[rec.color as keyof typeof colorMap] || colorMap.blue;

              return (
                <Card key={idx} className={`border-l-4 ${colorClasses.border} overflow-hidden hover:shadow-md transition-shadow`}>
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${colorClasses.bg}`}>
                        <rec.icon className={`h-6 w-6 ${colorClasses.text}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${colorClasses.title}`}>{rec.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {rec.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {rec.actions.map((action, actionIdx) => (
                            <Button
                              key={actionIdx}
                              variant="ghost"
                              size="sm"
                              className={`${colorClasses.btn} rounded-full`}
                            >
                              {action}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
