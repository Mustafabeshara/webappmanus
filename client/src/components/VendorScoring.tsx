/**
 * Vendor Scoring Component
 * AI-powered vendor analysis and scoring dashboard
 */

import { trpc } from "@/lib/trpc";
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
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Truck,
  FileText,
  Shield,
  Users,
} from "lucide-react";

export function VendorScoring() {
  const { data: analysis, isLoading } = trpc.suppliers.aiAnalysis.useQuery();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Vendor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      default:
        return <Badge variant="outline">{risk}</Badge>;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Benchmarks Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Vendor Analysis Dashboard
          </CardTitle>
          <CardDescription>
            Comprehensive vendor performance scoring and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{analysis.benchmarks.totalVendors}</div>
              <div className="text-sm text-muted-foreground">Total Vendors</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{analysis.benchmarks.activeVendors}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Shield className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{analysis.benchmarks.compliantVendors}</div>
              <div className="text-sm text-muted-foreground">Compliant</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{analysis.benchmarks.avgWinRate}%</div>
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Truck className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{analysis.benchmarks.avgOnTimeRate}%</div>
              <div className="text-sm text-muted-foreground">On-Time Delivery</div>
            </div>
          </div>

          {/* AI Insights */}
          {analysis.insights.length > 0 && (
            <div className="space-y-3 mb-6">
              <h4 className="font-medium">AI Insights</h4>
              {analysis.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.type === 'success' ? 'bg-green-50' :
                    insight.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}
                >
                  {getInsightIcon(insight.type)}
                  <div>
                    <div className="font-medium">{insight.title}</div>
                    <div className="text-sm text-muted-foreground">{insight.message}</div>
                    {insight.vendors.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {insight.vendors.slice(0, 5).map((vendor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {vendor}
                          </Badge>
                        ))}
                        {insight.vendors.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{insight.vendors.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-medium">Recommendations</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg flex items-center gap-2"
                >
                  <Badge
                    variant={rec.priority === 'high' ? 'destructive' :
                            rec.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {rec.priority}
                  </Badge>
                  <span className="text-sm">{rec.action}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Scorecard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Vendor Scorecards
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for all vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors to analyze
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Win Rate</TableHead>
                  <TableHead className="text-center">On-Time</TableHead>
                  <TableHead className="text-center">Quality</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.vendors.slice(0, 10).map((vendor) => (
                  <TableRow key={vendor.supplierId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vendor.supplierName}</div>
                        <div className="text-xs text-muted-foreground">{vendor.supplierCode}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(vendor.overallScore)}`}>
                        {vendor.overallScore}
                      </div>
                      <Progress
                        value={vendor.overallScore * 20}
                        className="h-1 mt-1"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{vendor.metrics.winRate}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.metrics.wonTenders}/{vendor.metrics.totalTenders}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span>{vendor.metrics.onTimeRate}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.metrics.totalDeliveries} deliveries
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < vendor.metrics.qualityScore
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(vendor.riskLevel)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          vendor.complianceStatus === 'compliant' ? 'default' :
                          vendor.complianceStatus === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {vendor.complianceStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorScoring;
