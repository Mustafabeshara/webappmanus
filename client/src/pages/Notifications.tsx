/**
 * Notifications Page
 * Full notification management with AI-powered analytics and smart alerts
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BellRing,
  Brain,
  Check,
  CheckCheck,
  Trash2,
  List,
  AlertCircle,
} from "lucide-react";
import NotificationAnalytics from "@/components/NotificationAnalytics";

export default function Notifications() {
  const [selectedTab, setSelectedTab] = useState("all");
  const utils = trpc.useUtils();

  const { data: allNotifications, isLoading: loadingAll } = trpc.notifications.list.useQuery();
  const { data: unreadNotifications, isLoading: loadingUnread } = trpc.notifications.unread.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
      utils.notifications.aiAnalysis.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
      utils.notifications.aiAnalysis.invalidate();
    },
  });

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const isLoading = loadingAll || loadingUnread;

  const notifications = selectedTab === "unread" ? unreadNotifications : allNotifications;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage your notifications and view AI-powered insights"
        actions={
          (unreadNotifications?.length || 0) > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )
        }
      />

      <Tabs defaultValue="all-notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-notifications" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis">
          <NotificationAnalytics />
        </TabsContent>

        <TabsContent value="all-notifications">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{allNotifications?.length || 0}</p>
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
                    <p className="text-2xl font-bold text-blue-600">{unreadNotifications?.length || 0}</p>
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
                    <p className="text-2xl font-bold text-red-600">
                      {unreadNotifications?.filter(n => n.priority === 'urgent').length || 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("all")}
            >
              All ({allNotifications?.length || 0})
            </Button>
            <Button
              variant={selectedTab === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("unread")}
            >
              Unread ({unreadNotifications?.length || 0})
            </Button>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTab === "unread" ? "Unread Notifications" : "All Notifications"}
              </CardTitle>
              <CardDescription>
                {selectedTab === "unread"
                  ? "Notifications that need your attention"
                  : "Your complete notification history"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-sm mt-1">
                    {selectedTab === "unread"
                      ? "You're all caught up!"
                      : "You don't have any notifications yet"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                        notification.isRead
                          ? 'bg-muted/30 border-muted'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        notification.priority === 'urgent'
                          ? 'bg-red-100 dark:bg-red-950'
                          : notification.priority === 'high'
                          ? 'bg-orange-100 dark:bg-orange-950'
                          : 'bg-blue-100 dark:bg-blue-950'
                      }`}>
                        <Bell className={`h-4 w-4 ${
                          notification.priority === 'urgent'
                            ? 'text-red-600'
                            : notification.priority === 'high'
                            ? 'text-orange-600'
                            : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{notification.title}</span>
                          <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                            {notification.priority}
                          </Badge>
                          {notification.type && (
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkRead(notification.id)}
                            disabled={markReadMutation.isPending}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
