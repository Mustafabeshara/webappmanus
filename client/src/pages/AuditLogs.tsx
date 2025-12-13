import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Edit, FileText, Plus, Trash2, type LucideIcon } from "lucide-react";

const actionConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: LucideIcon;
  }
> = {
  create: { label: "Created", variant: "default", icon: Plus },
  update: { label: "Updated", variant: "secondary", icon: Edit },
  delete: { label: "Deleted", variant: "destructive", icon: Trash2 },
  approve: { label: "Approved", variant: "default", icon: CheckCircle },
  reject: { label: "Rejected", variant: "destructive", icon: CheckCircle },
};

export default function AuditLogs() {
  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all system activities and changes
        </p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Activities
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{logs?.length || 0}</div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {logs?.length || 0} activity(ies) recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map(log => {
                const config = actionConfig[log.action] || {
                  label: log.action,
                  variant: "outline" as const,
                  icon: FileText,
                };
                const Icon = config.icon;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>User #{log.userId}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.entityType}
                    </TableCell>
                    <TableCell>#{log.entityId}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
