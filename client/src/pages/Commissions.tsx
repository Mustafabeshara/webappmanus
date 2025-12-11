import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  DollarSign,
  Users,
  FileText,
  Percent,
  CheckCircle,
  Clock,
  Wallet,
} from "lucide-react";

export default function Commissions() {
  const [activeTab, setActiveTab] = useState("rules");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Form states for new rule
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    percentage: "",
    flatAmount: "",
    minThreshold: "",
    maxThreshold: "",
  });

  // Form states for assignment
  const [assignment, setAssignment] = useState({
    userId: "",
    ruleId: "",
  });

  // Queries
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["commissions", "rules"],
    queryFn: () => trpc.commissions.listRules.query(),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["commissions", "assignments"],
    queryFn: () => trpc.commissions.assignments.query(),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["commissions", "entries"],
    queryFn: () => trpc.commissions.entries.query(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => trpc.users.list.query(),
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      percentage?: number;
      flatAmount?: number;
      minThreshold?: number;
      maxThreshold?: number;
    }) => trpc.commissions.createRule.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions", "rules"] });
      setIsRuleDialogOpen(false);
      setNewRule({
        name: "",
        description: "",
        percentage: "",
        flatAmount: "",
        minThreshold: "",
        maxThreshold: "",
      });
      toast.success("Commission rule created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create commission rule");
    },
  });

  const assignRuleMutation = useMutation({
    mutationFn: (data: { userId: number; ruleId: number }) =>
      trpc.commissions.assignRule.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions", "assignments"] });
      setIsAssignDialogOpen(false);
      setAssignment({ userId: "", ruleId: "" });
      toast.success("Commission rule assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign commission rule");
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      trpc.commissions.updateEntry.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions", "entries"] });
      toast.success("Commission entry updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update commission entry");
    },
  });

  const handleCreateRule = () => {
    createRuleMutation.mutate({
      name: newRule.name,
      description: newRule.description || undefined,
      percentage: newRule.percentage ? parseFloat(newRule.percentage) : undefined,
      flatAmount: newRule.flatAmount ? parseFloat(newRule.flatAmount) : undefined,
      minThreshold: newRule.minThreshold ? parseFloat(newRule.minThreshold) : undefined,
      maxThreshold: newRule.maxThreshold ? parseFloat(newRule.maxThreshold) : undefined,
    });
  };

  const handleAssignRule = () => {
    if (!assignment.userId || !assignment.ruleId) {
      toast.error("Please select both a user and a rule");
      return;
    }
    assignRuleMutation.mutate({
      userId: parseInt(assignment.userId),
      ruleId: parseInt(assignment.ruleId),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700"><Wallet className="w-3 h-3 mr-1" />Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate summary stats
  const totalPending = entries.filter((e: any) => e.status === "pending").reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalApproved = entries.filter((e: any) => e.status === "approved").reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalPaid = entries.filter((e: any) => e.status === "paid").reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Commission Management</h1>
          <p className="text-muted-foreground">
            Manage commission rules, assignments, and payouts
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalApproved.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Entries
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Commission Rule</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Rule Name</Label>
                    <Input
                      id="name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g., Sales Commission"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="percentage">Percentage (%)</Label>
                      <Input
                        id="percentage"
                        type="number"
                        step="0.01"
                        value={newRule.percentage}
                        onChange={(e) => setNewRule({ ...newRule, percentage: e.target.value })}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="flatAmount">Flat Amount ($)</Label>
                      <Input
                        id="flatAmount"
                        type="number"
                        step="0.01"
                        value={newRule.flatAmount}
                        onChange={(e) => setNewRule({ ...newRule, flatAmount: e.target.value })}
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="minThreshold">Min Threshold ($)</Label>
                      <Input
                        id="minThreshold"
                        type="number"
                        step="0.01"
                        value={newRule.minThreshold}
                        onChange={(e) => setNewRule({ ...newRule, minThreshold: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxThreshold">Max Threshold ($)</Label>
                      <Input
                        id="maxThreshold"
                        type="number"
                        step="0.01"
                        value={newRule.maxThreshold}
                        onChange={(e) => setNewRule({ ...newRule, maxThreshold: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateRule} disabled={createRuleMutation.isPending}>
                    {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Flat Amount</TableHead>
                  <TableHead>Min Threshold</TableHead>
                  <TableHead>Max Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No commission rules found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.description || "-"}</TableCell>
                      <TableCell>{rule.percentage ? `${rule.percentage}%` : "-"}</TableCell>
                      <TableCell>{rule.flatAmount ? `$${rule.flatAmount}` : "-"}</TableCell>
                      <TableCell>{rule.minThreshold ? `$${rule.minThreshold}` : "-"}</TableCell>
                      <TableCell>{rule.maxThreshold ? `$${rule.maxThreshold}` : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Commission Rule</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Select User</Label>
                    <Select
                      value={assignment.userId}
                      onValueChange={(value) => setAssignment({ ...assignment, userId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Select Rule</Label>
                    <Select
                      value={assignment.ruleId}
                      onValueChange={(value) => setAssignment({ ...assignment, ruleId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rule" />
                      </SelectTrigger>
                      <SelectContent>
                        {rules.map((rule: any) => (
                          <SelectItem key={rule.id} value={rule.id.toString()}>
                            {rule.name} {rule.percentage ? `(${rule.percentage}%)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignRule} disabled={assignRuleMutation.isPending}>
                    {assignRuleMutation.isPending ? "Assigning..." : "Assign Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Assigned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No assignments found. Assign a rule to a user to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.user?.name || assignment.user?.email || `User ${assignment.userId}`}
                      </TableCell>
                      <TableCell>{assignment.rule?.name || `Rule ${assignment.ruleId}`}</TableCell>
                      <TableCell>
                        {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Entries Tab */}
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No commission entries found. Entries are created automatically based on sales/orders.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.user?.name || entry.user?.email || `User ${entry.userId}`}
                      </TableCell>
                      <TableCell>{entry.rule?.name || `Rule ${entry.ruleId}`}</TableCell>
                      <TableCell>${(entry.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{entry.sourceType || "-"}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateEntryMutation.mutate({ id: entry.id, status: "approved" })}
                            disabled={updateEntryMutation.isPending}
                          >
                            Approve
                          </Button>
                        )}
                        {entry.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateEntryMutation.mutate({ id: entry.id, status: "paid" })}
                            disabled={updateEntryMutation.isPending}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
