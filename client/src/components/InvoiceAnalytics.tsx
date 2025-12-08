/**
 * Invoice Analytics Component
 * AI-powered invoice insights, overdue tracking, and payment predictions
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Clock,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export function InvoiceAnalytics() {
  const { data: analysis, isLoading } = trpc.invoices.aiAnalysis.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Invoice Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{analysis.summary.totalInvoices}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">SAR {analysis.summary.totalOutstanding.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">SAR {analysis.summary.totalOverdue.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold text-green-600">SAR {analysis.summary.totalPaid.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{analysis.summary.collectionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={analysis.summary.collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Insights
            </CardTitle>
            <CardDescription>Automated analysis and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : insight.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {insight.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  ) : insight.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${
                    insight.type === 'warning'
                      ? 'text-yellow-800'
                      : insight.type === 'success'
                      ? 'text-green-800'
                      : 'text-blue-800'
                  }`}>
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Overdue Invoices
            </CardTitle>
            <CardDescription>Invoices requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.overdueInvoices.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No overdue invoices!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.overdueInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.customerName}</TableCell>
                      <TableCell className="text-right">
                        SAR {(inv.amount / 100).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{inv.daysOverdue} days</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Upcoming Due
            </CardTitle>
            <CardDescription>Invoices due within 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.upcomingDue.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No invoices due soon</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Due In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.upcomingDue.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.customerName}</TableCell>
                      <TableCell className="text-right">
                        SAR {(inv.amount / 100).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{inv.daysUntilDue} days</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Payment Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Customer Payment Reliability
            </CardTitle>
            <CardDescription>Payment history analysis by customer</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.customerScores.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No customer data yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-center">Payment Rate</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.customerScores.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell>{customer.customerName}</TableCell>
                      <TableCell className="text-center">
                        {customer.paidInvoices}/{customer.totalInvoices}
                      </TableCell>
                      <TableCell className="text-center">
                        <Progress value={customer.paymentRate} className="w-20 inline-block" />
                        <span className="ml-2 text-sm">{customer.paymentRate}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            customer.riskLevel === 'low'
                              ? 'default'
                              : customer.riskLevel === 'medium'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {customer.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Unmatched Tenders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Tenders Awaiting Invoice
            </CardTitle>
            <CardDescription>Awarded tenders without invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.unmatchedTenders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All awarded tenders have invoices</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tender #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.unmatchedTenders.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell className="font-mono text-sm">{tender.tenderNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{tender.title}</TableCell>
                      <TableCell className="text-right">
                        {tender.awardedValue
                          ? `SAR ${(tender.awardedValue / 100).toLocaleString()}`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(analysis.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <Badge
                  variant={
                    status === 'paid'
                      ? 'default'
                      : status === 'overdue'
                      ? 'destructive'
                      : status === 'cancelled'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {status}
                </Badge>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceAnalytics;
