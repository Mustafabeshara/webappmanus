import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase,
  UserPlus,
  CalendarDays,
} from "lucide-react";

export default function HR() {
  const [activeTab, setActiveTab] = useState("employees");
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  // Form states for new employee
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    hireDate: "",
    status: "active" as "active" | "on_leave" | "terminated",
  });

  // Form states for leave request
  const [newLeave, setNewLeave] = useState({
    employeeId: "",
    type: "vacation" as "vacation" | "sick" | "personal" | "unpaid",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Queries
  const { data: employees = [], isLoading: employeesLoading } = trpc.hr.employees.list.useQuery();

  const { data: leaveRequests = [], isLoading: leaveLoading } = trpc.hr.leave.list.useQuery();

  // Mutations
  const createEmployeeMutation = trpc.hr.employees.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      setIsEmployeeDialogOpen(false);
      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        title: "",
        hireDate: "",
        status: "active",
      });
      toast.success("Employee created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create employee");
    },
  });

  const updateEmployeeMutation = trpc.hr.employees.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      toast.success("Employee updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update employee");
    },
  });

  const createLeaveMutation = trpc.hr.leave.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leave"] });
      setIsLeaveDialogOpen(false);
      setNewLeave({
        employeeId: "",
        type: "vacation",
        startDate: "",
        endDate: "",
        reason: "",
      });
      toast.success("Leave request created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create leave request");
    },
  });

  const updateLeaveMutation = trpc.hr.leave.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leave"] });
      toast.success("Leave request updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update leave request");
    },
  });

  const handleCreateEmployee = () => {
    createEmployeeMutation.mutate({
      firstName: newEmployee.firstName || undefined,
      lastName: newEmployee.lastName || undefined,
      email: newEmployee.email || undefined,
      phone: newEmployee.phone || undefined,
      title: newEmployee.title || undefined,
      hireDate: newEmployee.hireDate || undefined,
      status: newEmployee.status,
    });
  };

  const handleCreateLeave = () => {
    if (!newLeave.employeeId || !newLeave.startDate || !newLeave.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createLeaveMutation.mutate({
      employeeId: parseInt(newLeave.employeeId),
      type: newLeave.type,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      reason: newLeave.reason || undefined,
    });
  };

  const getEmployeeStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "on_leave":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="w-3 h-3 mr-1" />On Leave</Badge>;
      case "terminated":
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="w-3 h-3 mr-1" />Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      vacation: "bg-blue-50 text-blue-700",
      sick: "bg-orange-50 text-orange-700",
      personal: "bg-purple-50 text-purple-700",
      unpaid: "bg-gray-50 text-gray-700",
    };
    return <Badge variant="outline" className={colors[type] || ""}>{type}</Badge>;
  };

  // Summary stats
  const activeEmployees = employees.filter((e: any) => e.status === "active").length;
  const onLeaveEmployees = employees.filter((e: any) => e.status === "on_leave").length;
  const pendingLeave = leaveRequests.filter((l: any) => l.status === "pending").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HR Management</h1>
          <p className="text-muted-foreground">
            Manage employees and leave requests
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onLeaveEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeave}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Leave Requests
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newEmployee.firstName}
                        onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newEmployee.lastName}
                        onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={newEmployee.title}
                      onChange={(e) => setNewEmployee({ ...newEmployee, title: e.target.value })}
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="hireDate">Hire Date</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={newEmployee.hireDate}
                        onChange={(e) => setNewEmployee({ ...newEmployee, hireDate: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={newEmployee.status}
                        onValueChange={(value: "active" | "on_leave" | "terminated") =>
                          setNewEmployee({ ...newEmployee, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateEmployee} disabled={createEmployeeMutation.isPending}>
                    {createEmployeeMutation.isPending ? "Creating..." : "Add Employee"}
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No employees found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee: any) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </TableCell>
                      <TableCell>{employee.email || "-"}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell>{employee.title || "-"}</TableCell>
                      <TableCell>
                        {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{getEmployeeStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        <Select
                          value={employee.status}
                          onValueChange={(value: "active" | "on_leave" | "terminated") =>
                            updateEmployeeMutation.mutate({ id: employee.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Leave Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Leave Request</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Employee</Label>
                    <Select
                      value={newLeave.employeeId}
                      onValueChange={(value) => setNewLeave({ ...newLeave, employeeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Leave Type</Label>
                    <Select
                      value={newLeave.type}
                      onValueChange={(value: "vacation" | "sick" | "personal" | "unpaid") =>
                        setNewLeave({ ...newLeave, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      placeholder="Reason for leave request..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateLeave} disabled={createLeaveMutation.isPending}>
                    {createLeaveMutation.isPending ? "Creating..." : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((leave: any) => {
                    const employee = employees.find((e: any) => e.id === leave.employeeId);
                    return (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">
                          {employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${leave.employeeId}`}
                        </TableCell>
                        <TableCell>{getLeaveTypeBadge(leave.type)}</TableCell>
                        <TableCell>
                          {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{leave.reason || "-"}</TableCell>
                        <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                        <TableCell>
                          {leave.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => updateLeaveMutation.mutate({ id: leave.id, status: "approved" })}
                                disabled={updateLeaveMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => updateLeaveMutation.mutate({ id: leave.id, status: "rejected" })}
                                disabled={updateLeaveMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
