import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, UserCog, Mail, Phone, Building, Calendar } from "lucide-react";

const MODULES = [
  "tenders",
  "budgets",
  "inventory",
  "suppliers",
  "customers",
  "invoices",
  "purchase_orders",
  "expenses",
  "deliveries",
  "tasks",
];

export default function Users() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: permissions } = trpc.users.getPermissions.useQuery(
    { userId: selectedUser! },
    { enabled: !!selectedUser }
  );

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePermissionMutation = trpc.users.updatePermission.useMutation({
    onSuccess: () => {
      toast.success("Permissions updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRoleChange = (userId: number, role: "admin" | "user") => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handlePermissionChange = (
    userId: number,
    module: string,
    permission: string,
    value: boolean
  ) => {
    updatePermissionMutation.mutate({
      userId,
      module,
      [permission]: value,
    } as any);
  };

  const openPermissionsDialog = (userId: number) => {
    setSelectedUser(userId);
    setPermissionsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and module permissions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            View and manage user access levels and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.position || "No position"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.departmentId ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>Dept #{user.departmentId}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        handleRoleChange(user.id, value as "admin" | "user")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active"
                          ? "default"
                          : user.status === "inactive"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.lastSignedIn).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPermissionsDialog(user.id)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Permissions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Module Permissions
            </DialogTitle>
            <DialogDescription>
              Configure access permissions for each module
            </DialogDescription>
          </DialogHeader>

          {selectedUser && permissions && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center">Approve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((module) => {
                    const perm = permissions.find((p) => p.module === module);
                    return (
                      <TableRow key={module}>
                        <TableCell className="font-medium capitalize">
                          {module.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.canView ?? true}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                selectedUser,
                                module,
                                "canView",
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.canCreate ?? false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                selectedUser,
                                module,
                                "canCreate",
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.canEdit ?? false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                selectedUser,
                                module,
                                "canEdit",
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.canDelete ?? false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                selectedUser,
                                module,
                                "canDelete",
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.canApprove ?? false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                selectedUser,
                                module,
                                "canApprove",
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
