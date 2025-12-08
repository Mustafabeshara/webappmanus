import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  PieChart,
  Shield,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CategorySuggestion {
  expenseId: number;
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: Array<{
    category: string;
    confidence: number;
  }>;
}

interface AnomalyDetection {
  expenseId: number;
  expenseTitle: string;
  amount: number;
  anomalyType: 'unusual_amount' | 'duplicate' | 'unusual_timing' | 'unusual_category' | 'potential_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
  relatedExpenseIds?: number[];
}

interface ExpenseAnalysisResult {
  categorySuggestions: CategorySuggestion[];
  anomalies: AnomalyDetection[];
  insights: Array<{
    type: 'trend' | 'savings' | 'policy' | 'optimization';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggestedAction?: string;
  }>;
  summary: {
    totalExpenses: number;
    totalAmount: number;
    uncategorizedCount: number;
    anomalyCount: number;
    riskScore: number;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      totalAmount: number;
      percentOfTotal: number;
    }>;
  };
}

export function ExpenseAnalysis() {
  const [analysis, setAnalysis] = useState<ExpenseAnalysisResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { data: aiStatus } = trpc.expenses.getAIStatus.useQuery();
  const analyzeMutation = trpc.expenses.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
      case 'unusual_amount': return 'Unusual Amount';
      case 'duplicate': return 'Potential Duplicate';
      case 'unusual_timing': return 'Unusual Timing';
      case 'unusual_category': return 'Category Mismatch';
      case 'potential_fraud': return 'Potential Fraud';
      default: return type;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Expense Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {aiStatus?.configured && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Enabled
              </Badge>
            )}
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              size="sm"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Expenses
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Auto-categorize expenses and detect anomalies using AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis && !analyzeMutation.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Analyze Expenses" to get AI-powered insights</p>
            <p className="text-sm mt-2">
              Includes auto-categorization, anomaly detection, and spending insights
            </p>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your expenses...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a moment for large datasets
            </p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{analysis.summary.totalExpenses}</div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    ${(analysis.summary.totalAmount / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysis.summary.uncategorizedCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Uncategorized</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">
                    {analysis.summary.anomalyCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Anomalies</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className={`text-2xl font-bold ${getRiskScoreColor(analysis.summary.riskScore)}`}>
                    {analysis.summary.riskScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                </CardContent>
              </Card>
            </div>

            {/* Risk Score Indicator */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Expense Health Score</span>
                  </div>
                  <span className={`font-bold ${getRiskScoreColor(analysis.summary.riskScore)}`}>
                    {analysis.summary.riskScore}%
                  </span>
                </div>
                <Progress value={analysis.summary.riskScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.summary.riskScore >= 80
                    ? "Excellent expense health - low risk detected"
                    : analysis.summary.riskScore >= 60
                    ? "Good expense health - some items need attention"
                    : "Action needed - multiple anomalies detected"}
                </p>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            {analysis.summary.categoryBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.summary.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cat.category}</span>
                          <span className="text-sm text-muted-foreground">
                            ${(cat.totalAmount / 100).toFixed(2)} ({cat.percentOfTotal.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={cat.percentOfTotal} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anomalies Section */}
            {analysis.anomalies.length > 0 && (
              <Collapsible open={showAnomalies} onOpenChange={setShowAnomalies}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Detected Anomalies ({analysis.anomalies.length})
                        </CardTitle>
                        {showAnomalies ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Expense</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.anomalies.map((anomaly, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {anomaly.expenseTitle}
                              </TableCell>
                              <TableCell>
                                ${(anomaly.amount / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {getAnomalyTypeLabel(anomaly.anomalyType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getSeverityColor(anomaly.severity)}>
                                  {anomaly.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {anomaly.description}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                {anomaly.suggestedAction}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Category Suggestions */}
            {analysis.categorySuggestions.length > 0 && (
              <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-600" />
                          Category Suggestions ({analysis.categorySuggestions.length})
                        </CardTitle>
                        {showSuggestions ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Expense ID</TableHead>
                            <TableHead>Suggested Category</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Reasoning</TableHead>
                            <TableHead>Alternatives</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.categorySuggestions.map((suggestion, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                #{suggestion.expenseId}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {suggestion.suggestedCategory}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={suggestion.confidence} className="w-16 h-2" />
                                  <span className="text-xs">{suggestion.confidence}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-sm">
                                {suggestion.reasoning}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {suggestion.alternativeCategories.slice(0, 2).map((alt, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {alt.category} ({alt.confidence}%)
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Insights Section */}
            {analysis.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="mt-0.5">
                          {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                          {insight.type === 'savings' && <TrendingDown className="h-4 w-4 text-green-600" />}
                          {insight.type === 'policy' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {insight.type === 'optimization' && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge variant="outline" className={`text-xs ${getImpactColor(insight.impact)}`}>
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                          {insight.suggestedAction && (
                            <p className="text-xs text-primary mt-2">
                              Recommended: {insight.suggestedAction}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
