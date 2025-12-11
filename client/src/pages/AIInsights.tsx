import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenderMatchingDashboard } from "@/components/TenderMatchingDashboard";
import { SemanticSearch } from "@/components/SemanticSearch";
import { NLPSearchBar } from "@/components/NLPSearchBar";
import {
  Brain,
  Target,
  Search,
  Sparkles,
  TrendingUp,
  Package,
  FileText,
  Building2,
  BarChart3,
  Lightbulb,
  Zap,
  MessageSquare,
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Business Intelligence</h1>
          <p className="text-muted-foreground">
            Leverage AI to find opportunities, analyze products, and make smarter decisions
          </p>
        </div>
      </div>

      {/* Global Semantic Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Search
          </CardTitle>
          <CardDescription>
            Search across products, tenders, and suppliers using natural language
          </CardDescription>
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Tender Matching
          </TabsTrigger>
          <TabsTrigger value="nlp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            NLP Query
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Business Insights
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Tender Matching Tab */}
        <TabsContent value="matching" className="mt-6">
          <TenderMatchingDashboard />
        </TabsContent>

        {/* NLP Query Tab */}
        <TabsContent value="nlp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Natural Language Query
              </CardTitle>
              <CardDescription>
                Ask questions in plain English and get intelligent results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <NLPSearchBar
                onSearch={(query, parsed) => {
                  setNlpResults({ query, parsed, timestamp: new Date() });
                  toast.success(`Query understood: ${parsed.intent}`);
                }}
                placeholder="Ask anything... e.g., 'Show me medical equipment under $5000'"
              />

              {nlpResults && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Query Analysis</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Intent:</span>
                        <span className="font-medium">{nlpResults.parsed.intent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">{Math.round(nlpResults.parsed.confidence * 100)}%</span>
                      </div>
                      {nlpResults.parsed.filters.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Filters:</span>
                          <ul className="list-disc list-inside mt-1">
                            {nlpResults.parsed.filters.map((f: any, idx: number) => (
                              <li key={idx}>{f.field} {f.operator} {f.value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {nlpResults.parsed.entities.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Entities:</span>
                          <ul className="list-disc list-inside mt-1">
                            {nlpResults.parsed.entities.map((e: any, idx: number) => (
                              <li key={idx}>{e.type}: {e.value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Insights Tab */}
        <TabsContent value="insights" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Market Trends
                </CardTitle>
                <CardDescription>AI-detected patterns in tender activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="font-medium text-green-800">Growing Demand</p>
                  <p className="text-sm text-green-700 mt-1">
                    Medical diagnostic equipment requests up 23% this quarter
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-blue-800">Emerging Opportunity</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Increase in telemedicine equipment tenders across Gulf region
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="font-medium text-purple-800">Seasonal Pattern</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Q4 typically shows 35% increase in healthcare procurement
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Product Performance
                </CardTitle>
                <CardDescription>How your products match tender requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Patient Monitors</span>
                    <span className="text-sm font-medium text-green-600">92% match rate</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: "92%" }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Surgical Equipment</span>
                    <span className="text-sm font-medium text-yellow-600">76% match rate</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: "76%" }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lab Analyzers</span>
                    <span className="text-sm font-medium text-blue-600">85% match rate</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: "85%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  Supplier Analysis
                </CardTitle>
                <CardDescription>AI assessment of supplier performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="font-medium">Top Performers</p>
                    <p className="text-xs text-muted-foreground">3 suppliers with 95%+ on-time delivery</p>
                  </div>
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <div className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="font-medium">Need Attention</p>
                    <p className="text-xs text-muted-foreground">Suppliers with quality issues</p>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">2</span>
                </div>
                <div className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="font-medium">Price Alerts</p>
                    <p className="text-xs text-muted-foreground">Products with competitive pricing available</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">5</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Document Intelligence
                </CardTitle>
                <CardDescription>Insights from processed documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold">127</div>
                    <div className="text-xs text-muted-foreground">Documents Processed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold">94%</div>
                    <div className="text-xs text-muted-foreground">Extraction Accuracy</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Most common document types:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Tender specifications (45)</li>
                    <li>Product catalogs (32)</li>
                    <li>Invoices (28)</li>
                    <li>Price lists (22)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Win Rate Analysis</CardTitle>
                <CardDescription>AI-powered analysis of your tender success rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chart visualization coming soon</p>
                    <p className="text-xs mt-1">Win rate by category, time, and region</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-700">68%</div>
                  <div className="text-sm text-green-600">Overall Win Rate</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-700">$2.4M</div>
                  <div className="text-sm text-blue-600">Pipeline Value</div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-700">12</div>
                  <div className="text-sm text-purple-600">Active Opportunities</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="mt-6">
          <div className="space-y-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">High Priority Opportunity</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tender MOH-2024-045 for cardiac monitors closely matches your product catalog.
                      Your existing products meet 94% of requirements. Deadline in 12 days.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200">
                        View Tender
                      </button>
                      <button className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200">
                        Start Proposal
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Catalog Enhancement</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Adding extended warranty options to 5 products could increase your match rate
                      by 15% for government tenders. This is a common requirement you're currently missing.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200">
                        View Products
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Building2 className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-800">Supplier Review Needed</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      MedTech Supplies has a new price list available that could reduce your costs
                      by 8% on imaging equipment. Last catalog update was 6 months ago.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                        Review Supplier
                      </button>
                      <button className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                        Request Updated Catalog
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-800">Market Opportunity</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on tender trends, demand for telemedicine equipment is projected to
                      grow 40% next quarter. Consider expanding your product line in this category.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">
                        View Analysis
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
