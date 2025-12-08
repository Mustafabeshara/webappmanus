/**
 * Delivery Analytics Component
 * AI-powered delivery insights, performance tracking, and predictions
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
  Truck,
  Clock,
  Package,
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
} from "lucide-react";

export function DeliveryAnalytics() {
  const { data: analysis, isLoading } = trpc.deliveries.aiAnalysis.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Delivery Analysis
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{analysis.summary.totalDeliveries}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.summary.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On-Time Rate</p>
                <p className="text-2xl font-bold text-green-600">{analysis.summary.onTimeRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={analysis.summary.onTimeRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Variance</p>
                <p className="text-2xl font-bold">{analysis.summary.avgDeliveryVariance}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
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
        {/* Overdue Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Overdue Deliveries
            </CardTitle>
            <CardDescription>Deliveries requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.overdueDeliveries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No overdue deliveries!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.overdueDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono text-sm">{delivery.deliveryNumber}</TableCell>
                      <TableCell>{delivery.customerName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{delivery.daysOverdue} days</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Upcoming Deliveries
            </CardTitle>
            <CardDescription>Deliveries due within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.upcomingDeliveries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No upcoming deliveries</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Due In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.upcomingDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono text-sm">{delivery.deliveryNumber}</TableCell>
                      <TableCell>{delivery.customerName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={delivery.daysUntil <= 2 ? "secondary" : "outline"}>
                          {delivery.daysUntil === 0 ? 'Today' : `${delivery.daysUntil} days`}
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

      {/* Customer Delivery Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Customer Delivery Performance
          </CardTitle>
          <CardDescription>Delivery success rates by customer</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.customerScores.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No customer delivery data yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">On-Time</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.customerScores.map((customer) => (
                  <TableRow key={customer.customerId}>
                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                    <TableCell className="text-center">{customer.totalDeliveries}</TableCell>
                    <TableCell className="text-center text-green-600">{customer.onTimeDeliveries}</TableCell>
                    <TableCell className="text-center text-red-600">{customer.lateDeliveries}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={customer.successRate} className="w-16" />
                        <span className="text-sm">{customer.successRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(analysis.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <Badge
                  variant={
                    status === 'delivered'
                      ? 'default'
                      : status === 'in_transit'
                      ? 'secondary'
                      : status === 'cancelled'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {status.replace('_', ' ')}
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

export default DeliveryAnalytics;
