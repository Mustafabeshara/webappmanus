import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Search, Eye, DollarSign } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { BudgetForecast } from "@/components/BudgetForecast";
import { ExportButton } from "@/components/ExportButton";

export default function Budgets() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: budgets, isLoading } = trpc.budgets.list.useQuery();

  const filteredBudgets = budgets?.filter((budget) => {
    const matchesSearch = budget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      budget.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (!user) {
    return null;
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Budgets</h1>
          <p className="text-muted-foreground">Manage budgets and track spending</p>
        </div>
        <div className="flex gap-2">
          <ExportButton module="budgets" />
          <Button onClick={() => setLocation("/budgets/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>
      </div>

      {/* AI Budget Forecasting */}
      <BudgetForecast />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search budgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>
            {filteredBudgets.length} budget(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No budgets found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first budget to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setLocation("/budgets/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => {
                  const allocated = budget.allocatedAmount || 0;
                  const spent = budget.spentAmount || 0;
                  const remaining = allocated - spent;
                  const percentSpent = allocated > 0 ? (spent / allocated) * 100 : 0;

                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.name}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          FY {budget.fiscalYear}
                        </span>
                      </TableCell>
                      <TableCell>
                        {budget.departmentId ? `Dept #${budget.departmentId}` : "General"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(allocated / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(spent / 100).toFixed(2)}
                        <div className="text-xs text-muted-foreground">
                          {percentSpent.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={remaining < 0 ? "text-red-600 font-semibold" : ""}>
                          ${(remaining / 100).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              budget.status === "active" ? "default" :
                              budget.status === "closed" ? "secondary" :
                              "outline"
                            }
                          >
                            {budget.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {budget.approvalStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/budgets/${budget.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
