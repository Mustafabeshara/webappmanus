// Users management page - Backend router not yet implemented
// TODO: Implement users router in server/routers.ts with user CRUD operations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users as UsersIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Users() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Module Under Development</AlertTitle>
        <AlertDescription>
          The User Management module is currently under development. Backend infrastructure is complete, 
          but the frontend UI is not yet implemented. This module will allow you to:
          <ul className="list-disc list-inside mt-2 ml-4">
            <li>View and manage all system users</li>
            <li>Assign roles and permissions</li>
            <li>Track user activity and status</li>
            <li>Configure access control for each module</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            User management features will be available in the next update
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Backend API endpoints are ready. Frontend implementation is in progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
