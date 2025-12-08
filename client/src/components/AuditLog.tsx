/**
 * Audit Log Component
 * Displays audit trail for entities or system-wide activity
 */

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  History,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
} from "lucide-react";

interface AuditLogProps {
  entityType?: string;
  entityId?: number;
  showTitle?: boolean;
  limit?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <Plus className="h-4 w-4 text-green-500" />,
  UPDATE: <Edit className="h-4 w-4 text-blue-500" />,
  DELETE: <Trash2 className="h-4 w-4 text-red-500" />,
  VIEW: <Eye className="h-4 w-4 text-gray-500" />,
  EXPORT: <Download className="h-4 w-4 text-purple-500" />,
  LOGIN: <LogIn className="h-4 w-4 text-green-500" />,
  LOGOUT: <LogOut className="h-4 w-4 text-gray-500" />,
  APPROVE: <CheckCircle className="h-4 w-4 text-green-500" />,
  REJECT: <XCircle className="h-4 w-4 text-red-500" />,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VIEW: "bg-gray-100 text-gray-800",
  EXPORT: "bg-purple-100 text-purple-800",
  LOGIN: "bg-green-100 text-green-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  APPROVE: "bg-green-100 text-green-800",
  REJECT: "bg-red-100 text-red-800",
};

export function AuditLog({ entityType, entityId, showTitle = true, limit = 50 }: AuditLogProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Fetch audit logs based on whether we're viewing entity-specific or all logs
  const { data: entityLogs, isLoading: entityLoading } = trpc.auditLogs.forEntity.useQuery(
    { entityType: entityType!, entityId: entityId!, limit },
    { enabled: !!entityType && !!entityId }
  );

  const logs = entityLogs || [];
  const isLoading = entityLoading;

  const filteredLogs = actionFilter === "all"
    ? logs
    : logs.filter(log => log.action === actionFilter);

  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChanges = (changes: string | null) => {
    if (!changes) return null;

    try {
      const parsed = JSON.parse(changes);

      if (parsed.diff) {
        return (
          <div className="space-y-1">
            {Object.entries(parsed.diff).map(([key, value]: [string, any]) => (
              <div key={key} className="text-sm">
                <span className="font-medium">{key}:</span>
                <span className="text-red-500 line-through ml-2">{String(value.from)}</span>
                <span className="text-green-500 ml-2">{String(value.to)}</span>
              </div>
            ))}
          </div>
        );
      }

      if (parsed.before || parsed.after) {
        return (
          <div className="space-y-2">
            {parsed.before && (
              <div>
                <span className="text-xs font-medium text-red-600">Before:</span>
                <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(parsed.before, null, 2)}
                </pre>
              </div>
            )}
            {parsed.after && (
              <div>
                <span className="text-xs font-medium text-green-600">After:</span>
                <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(parsed.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }

      return (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-sm text-muted-foreground">{changes}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Log
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Activity history {entityType ? `for ${entityType} #${entityId}` : ""}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="VIEW">View</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredLogs.length} record(s)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No audit records found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
                {!entityType && <TableHead>Entity</TableHead>}
                <TableHead>User</TableHead>
                <TableHead className="w-[100px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <>
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="text-sm">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={ACTION_COLORS[log.action] || "bg-gray-100"}>
                        <span className="flex items-center gap-1">
                          {ACTION_ICONS[log.action]}
                          {log.action}
                        </span>
                      </Badge>
                    </TableCell>
                    {!entityType && (
                      <TableCell>
                        <span className="font-mono text-sm">
                          {log.entityType} #{log.entityId}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      User #{log.userId}
                    </TableCell>
                    <TableCell>
                      {log.changes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          {expandedRow === log.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRow === log.id && log.changes && (
                    <TableRow>
                      <TableCell colSpan={entityType ? 4 : 5} className="bg-muted/30">
                        <div className="p-4">
                          <h4 className="text-sm font-medium mb-2">Changes:</h4>
                          {renderChanges(log.changes)}
                          {log.ipAddress && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              IP: {log.ipAddress}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditLog;
