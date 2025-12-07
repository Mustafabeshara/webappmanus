import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateTask() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    status: "todo" as "todo" | "in_progress" | "review" | "done" | "cancelled",
    dueDate: "",
    relatedModule: "",
    relatedId: "",
    tags: "",
  });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      setLocation("/tasks");
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      assigneeId: formData.assigneeId ? Number(formData.assigneeId) : undefined,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      relatedModule: formData.relatedModule || undefined,
      relatedId: formData.relatedId ? Number(formData.relatedId) : undefined,
      tags: formData.tags || undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Task</h1>
        <p className="text-muted-foreground mt-1">
          Create a new task and assign it to team members
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
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

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            {/* Module Linking */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relatedModule">Related Module</Label>
                <Select
                  value={formData.relatedModule}
                  onValueChange={(value) => setFormData({ ...formData, relatedModule: value })}
                >
                  <SelectTrigger id="relatedModule">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="tender">Tender</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="po">Purchase Order</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatedId">Related ID</Label>
                <Input
                  id="relatedId"
                  type="number"
                  value={formData.relatedId}
                  onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
                  placeholder="Enter ID"
                  disabled={!formData.relatedModule}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (JSON array)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder='["tag1", "tag2"]'
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/tasks")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
