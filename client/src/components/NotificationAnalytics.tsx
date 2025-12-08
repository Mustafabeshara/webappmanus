/**
 * Notification Analytics Component
 * AI-powered notification analysis, smart alerts, and engagement insights
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  Bell,
  BellRing,
  Mail,
  MailOpen,
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

export function NotificationAnalytics() {
  const { data: analysis, isLoading } = trpc.notifications.aiAnalysis.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Notification Analysis
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
      default:
        return 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{analysis.summary.totalNotifications}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.summary.unreadCount}</p>
              </div>
              <BellRing className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{analysis.summary.urgentCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Read Rate</p>
                <p className="text-2xl font-bold text-green-600">{analysis.summary.readRate}%</p>
              </div>
              <MailOpen className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={analysis.summary.readRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Smart Alerts - Proactive Business Alerts */}
      {analysis.smartAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Smart Business Alerts
            </CardTitle>
            <CardDescription>AI-generated alerts based on your business data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.smartAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between gap-3 p-4 rounded-lg ${getAlertStyle(alert.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs">
                        {alert.category}
                      </Badge>
                      <p className="text-sm">{alert.message}</p>
                    </div>
                  </div>
                  {alert.actionUrl && (
                    <Link href={alert.actionUrl}>
                      <Button variant="outline" size="sm" className="shrink-0">
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                      : insight.type === 'success'
                      ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
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
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : insight.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-blue-800 dark:text-blue-200'
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
        {/* Prioritized Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-blue-500" />
              Priority Queue
            </CardTitle>
            <CardDescription>Top notifications by importance</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.prioritizedNotifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All caught up! No unread notifications.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.prioritizedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            notification.priority === 'urgent'
                              ? 'destructive'
                              : notification.priority === 'high'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {notification.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Activity Metrics
            </CardTitle>
            <CardDescription>Notification activity overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>Avg per Day (7 days)</span>
              </div>
              <Badge variant="outline" className="text-lg">
                {analysis.metrics.avgNotificationsPerDay}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-500" />
                <span>Last 24 Hours</span>
              </div>
              <Badge variant="outline" className="text-lg">
                {analysis.metrics.last24hCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <span>Previous 24 Hours</span>
              </div>
              <Badge variant="outline" className="text-lg">
                {analysis.metrics.previous24hCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Weekly Total</span>
              </div>
              <Badge variant="outline" className="text-lg">
                {analysis.metrics.weeklyTotal}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(analysis.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <Badge variant="outline">{type}</Badge>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(analysis.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center gap-2">
                  <Badge variant="secondary">{category}</Badge>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NotificationAnalytics;
