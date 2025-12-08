import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, TrendingUp, Target, AlertTriangle, CheckCircle, XCircle, Zap, RefreshCw, ShieldAlert, Lightbulb } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TenderAnalysisProps {
  tenderId: number;
  tenderTitle: string;
}

// Matches TenderAnalysis from server/ai/tender-analysis.ts
interface TenderAnalysisData {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  winProbability: {
    score: number;
    confidence: number;
    factors: Array<{
      name: string;
      impact: "positive" | "negative" | "neutral";
      weight: number;
      description: string;
    }>;
  };
  competitiveScore: {
    overall: number;
    breakdown: {
      priceCompetitiveness: number;
      technicalCapability: number;
      deliveryCapacity: number;
      pastPerformance: number;
      compliance: number;
    };
  };
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    rationale: string;
  }>;
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
    mitigations: string[];
  };
}

export function TenderAnalysis({ tenderId, tenderTitle }: TenderAnalysisProps) {
  const [analysis, setAnalysis] = useState<TenderAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMutation = trpc.tenders.analyze.useMutation({
    onSuccess: (data) => {
      if (data.analysis) {
        setAnalysis(data.analysis as unknown as TenderAnalysisData);
      }
      toast.success("AI analysis completed");
    },
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
    onSettled: () => {
      setIsAnalyzing(false);
    },
  });

  const aiStatus = trpc.tenders.getAIStatus.useQuery(undefined, {
    staleTime: 60000,
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    analyzeMutation.mutate({ id: tenderId });
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!aiStatus.data?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            AI-powered tender analysis is not configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>To enable AI analysis, configure an AI provider (Groq, Gemini, or OpenAI) in your environment variables.</p>
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
              AI Analysis
            </CardTitle>
            <CardDescription>
              AI-powered SWOT analysis, win probability & competitive scoring
            </CardDescription>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant={analysis ? "outline" : "default"}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analyze
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Analyze Tender
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis && !isAnalyzing && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Click "Analyze Tender" to generate AI-powered insights</p>
            <p className="text-sm mt-1">Includes SWOT analysis, win probability assessment, and competitive scoring</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="font-medium">Analyzing "{tenderTitle}"...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Win Probability */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Win Probability
              </h4>
              <div className="flex items-center gap-4 mb-3">
                <div className={`text-4xl font-bold ${getScoreColor(analysis.winProbability.score)}`}>
                  {analysis.winProbability.score}%
                </div>
                <div>
                  <Badge variant="outline">
                    {analysis.winProbability.confidence}% confidence
                  </Badge>
                </div>
              </div>
              <Progress
                value={analysis.winProbability.score}
                className="h-2 mb-3"
              />
              <div className="space-y-2">
                {analysis.winProbability.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <div>
                      <span className="font-medium">{factor.name}</span>
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                    </div>
                    <Badge variant={factor.impact === "positive" ? "default" : factor.impact === "negative" ? "destructive" : "secondary"}>
                      {factor.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitive Score */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Competitive Score: <span className={getScoreColor(analysis.competitiveScore.overall)}>{analysis.competitiveScore.overall}/100</span>
              </h4>
              <div className="space-y-3">
                {Object.entries(analysis.competitiveScore.breakdown).map(([key, score]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={getScoreColor(score)}>{score}/100</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded overflow-hidden">
                      <div
                        className={`absolute h-full ${getProgressColor(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Risk Assessment
              </h4>
              <Badge className={`${getRiskColor(analysis.riskAssessment.level)} mb-3`}>
                {analysis.riskAssessment.level.toUpperCase()} RISK
              </Badge>
              {analysis.riskAssessment.factors.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Risk Factors:</p>
                  <ul className="text-sm space-y-1">
                    {analysis.riskAssessment.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.riskAssessment.mitigations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Mitigations:</p>
                  <ul className="text-sm space-y-1">
                    {analysis.riskAssessment.mitigations.map((mitigation, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {mitigation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <span className="font-medium text-sm">{rec.action}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWOT Analysis */}
            <div>
              <h4 className="font-semibold mb-3">SWOT Analysis</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                  <h5 className="font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Strengths
                  </h5>
                  <ul className="space-y-1">
                    {analysis.swot.strengths.map((item, idx) => (
                      <li key={idx} className="text-sm">• {item}</li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                  <h5 className="font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Weaknesses
                  </h5>
                  <ul className="space-y-1">
                    {analysis.swot.weaknesses.map((item, idx) => (
                      <li key={idx} className="text-sm">• {item}</li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Opportunities
                  </h5>
                  <ul className="space-y-1">
                    {analysis.swot.opportunities.map((item, idx) => (
                      <li key={idx} className="text-sm">• {item}</li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <h5 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Threats
                  </h5>
                  <ul className="space-y-1">
                    {analysis.swot.threats.map((item, idx) => (
                      <li key={idx} className="text-sm">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
