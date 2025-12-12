import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Clock, AlertCircle, LayoutGrid, List, GripVertical, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";

type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "cancelled";

// Task type matching the database schema
type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: TaskStatus;
  assignedTo: number | null;
  departmentId: number | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
};

const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "To Do", color: "bg-gray-100 border-gray-300" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-50 border-blue-300" },
  { id: "review", title: "Review", color: "bg-yellow-50 border-yellow-300" },
  { id: "completed", title: "Completed", color: "bg-green-50 border-green-300" },
];

export default function Tasks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [view, setView] = useState<"all" | "my">("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const { data: allTasks = [], refetch } = trpc.tasks.getAll.useQuery();
  const { data: myTasks = [], refetch: refetchMy } = trpc.tasks.getMyTasks.useQuery();
  const { data: users = [] } = trpc.users.listBasic.useQuery();

  const tasks = view === "all" ? allTasks : myTasks;

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: (data) => {
      setCreatedTaskId(data.id);
      toast.success("Task created successfully");
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreatedTaskId(null);
        refetch();
        refetchMy();
      }, 1000);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated");
      refetch();
      refetchMy();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      refetch();
      refetchMy();
    },
  });

  const filteredTasks = selectedStatus === "all"
    ? tasks
    : tasks.filter((task: any) => task.status === selectedStatus);

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === "todo").length,
    inProgress: tasks.filter((t: any) => t.status === "in_progress").length,
    review: tasks.filter((t: any) => t.status === "review").length,
    completed: tasks.filter((t: any) => t.status === "completed").length,
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      const updates: any = { id: draggedTask.id, status };
      if (status === "completed") {
        updates.completedAt = new Date().toISOString();
      }
      updateMutation.mutate(updates);
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter((t: Task) => t.status === status);
  };

  const getUserName = (userId?: number) => {
    if (!userId) return null;
    const user = users.find((u: any) => u.id === userId);
    return user?.name || "Unknown";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-1">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="my">My Tasks</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <CreateTaskForm
                users={users}
                onSubmit={(data: any) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
                createdTaskId={createdTaskId}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "kanban" ? (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((column) => (
            <div
              key={column.id}
              className={`rounded-lg border-2 ${column.color} min-h-[500px]`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary">{getTasksByStatus(column.id).length}</Badge>
                </div>
              </div>
              <div className="p-2 space-y-2">
                {getTasksByStatus(column.id).map((task: Task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    users={users}
                    onDragStart={() => handleDragStart(task)}
                    onStatusChange={(status) => {
                      const updates: any = { id: task.id, status };
                      if (status === "completed") {
                        updates.completedAt = new Date().toISOString();
                      }
                      updateMutation.mutate(updates);
                    }}
                    onDelete={() => {
                      if (confirm("Delete this task?")) {
                        deleteMutation.mutate({ id: task.id });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Tasks</CardTitle>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        {task.assignedTo
                          ? users.find((u: any) => u.id === task.assignedTo)?.name || "Unknown"
                          : "Unassigned"}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(status) => {
                              const updates: any = { id: task.id, status: status as any };
                              if (status === "completed") {
                                updates.completedAt = new Date().toISOString();
                              }
                              updateMutation.mutate(updates);
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Delete this task?")) {
                                deleteMutation.mutate({ id: task.id });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KanbanCard({
  task,
  users,
  onDragStart,
  onStatusChange,
  onDelete
}: {
  task: Task;
  users: any[];
  onDragStart: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}) {
  const getUserName = (userId?: number) => {
    if (!userId) return null;
    const user = users.find((u: any) => u.id === userId);
    return user?.name || "Unknown";
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <PriorityBadge priority={task.priority} />
        </div>
        <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{getUserName(task.assignedTo)}</span>
              </div>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: any }> = {
    todo: { color: "bg-gray-500", icon: Clock },
    in_progress: { color: "bg-blue-500", icon: Clock },
    review: { color: "bg-yellow-500", icon: AlertCircle },
    completed: { color: "bg-green-500", icon: CheckCircle2 },
    cancelled: { color: "bg-red-500", icon: AlertCircle },
  };

  const { color, icon: Icon } = config[status] || config.todo;

  return (
    <Badge className={color}>
      <Icon className="h-3 w-3 mr-1" />
      {status.replace("_", " ").toUpperCase()}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-gray-400",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-600",
  };

  return (
    <Badge className={colors[priority] || "bg-gray-400"}>
      {priority.toUpperCase()}
    </Badge>
  );
}

function CreateTaskForm({ users, onSubmit, isLoading, createdTaskId }: any) {
  const uploadToS3Mutation = trpc.files.uploadToS3.useMutation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    dueDate: "",
  });

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...formData,
      assignedTo: formData.assignedTo && formData.assignedTo !== "none" ? parseInt(formData.assignedTo) : undefined,
    });
  };

  // Upload files when createdTaskId is available
  useEffect(() => {
    if (createdTaskId && attachedFiles.length > 0) {
      (async () => {
      for (const file of attachedFiles) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64 = reader.result as string;
              await uploadToS3Mutation.mutateAsync({
                fileName: file.name,
                fileData: base64,
                mimeType: file.type,
                entityType: 'task',
                entityId: createdTaskId,
                category: 'attachment',
              });
              resolve(true);
            } catch (error) {
              reject(error);
            }
          };
        });
      }
      toast.success(`${attachedFiles.length} file(s) uploaded successfully`);
      })();
    }
  }, [createdTaskId, attachedFiles]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assign To</Label>
          <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Due Date</Label>
        <Input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />
      </div>

      <div>
        <Label>Attachments</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload supporting documents or files
        </p>
        <FileUpload
          onFilesSelected={setAttachedFiles}
          maxFiles={5}
          maxSizeMB={10}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
