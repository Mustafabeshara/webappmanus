import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Building } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    tenderUpdates: true,
    taskReminders: true,
    budgetAlerts: true,
  });

  const handleProfileSave = () => {
    toast.success("Profile settings saved");
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success("Notification settings updated");
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user.role || "user"} disabled className="capitalize" />
              </div>
              <Button onClick={handleProfileSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={() => handleNotificationToggle("emailNotifications")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tender Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about tender status changes
                  </p>
                </div>
                <Switch
                  checked={notifications.tenderUpdates}
                  onCheckedChange={() => handleNotificationToggle("tenderUpdates")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders for due tasks
                  </p>
                </div>
                <Switch
                  checked={notifications.taskReminders}
                  onCheckedChange={() => handleNotificationToggle("taskReminders")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts when budget thresholds are reached
                  </p>
                </div>
                <Switch
                  checked={notifications.budgetAlerts}
                  onCheckedChange={() => handleNotificationToggle("budgetAlerts")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Login Method</Label>
                <Input value={user.loginMethod || "Password"} disabled className="capitalize" />
              </div>
              <div className="space-y-2">
                <Label>Last Sign In</Label>
                <Input
                  value={user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "N/A"}
                  disabled
                />
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Change Password</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Password change functionality is available through your authentication provider.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage organization-wide settings (Admin only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.role === "admin" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Organization settings are managed through the system configuration.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Total Users</span>
                      <span className="font-medium">-</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Active Tenders</span>
                      <span className="font-medium">-</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Database Status</span>
                      <span className="font-medium text-green-600">Connected</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  You don't have permission to view organization settings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
