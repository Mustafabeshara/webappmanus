import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, AlertCircle, XCircle, ListTodo, ArrowLeft, MessageSquare } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function TaskDetails() {
  const [, params] = useRoute("/tasks/:id");
  const [, setLocation] = useLocation();
  const taskId = params?.id ? Number(params.id) : 0;

  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: task, isLoading, refetch } = trpc.tasks.get.useQuery({ id: taskId });
  const { data: comments, refetch: refetchComments } = trpc.tasks.comments.list.useQuery({ taskId });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const createCommentMutation = trpc.tasks.comments.create.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setNewComment("");
      refetchComments();
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      setLocation("/tasks");
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg font-medium">Task not found</p>
        <Button onClick={() => setLocation("/tasks")} className="mt-4">
          Back to Tasks
        </Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo": return <ListTodo className="h-5 w-5" />;
      case "in_progress": return <Clock className="h-5 w-5" />;
      case "review": return <AlertCircle className="h-5 w-5" />;
      case "done": return <CheckCircle2 className="h-5 w-5" />;
      case "cancelled": return <XCircle className="h-5 w-5" />;
      default: return <ListTodo className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "review": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "done": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-gray-100 text-gray-600 dark:bg-gray-800";
      case "medium": return "bg-blue-100 text-blue-600 dark:bg-blue-900";
      case "high": return "bg-orange-100 text-orange-600 dark:bg-orange-900";
      case "urgent": return "bg-red-100 text-red-600 dark:bg-red-900";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateMutation.mutate({
      id: taskId,
      status: newStatus as any,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({
      taskId,
      comment: newComment,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/tasks")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{task.title}</h1>
        </div>
        <Button variant="destructive" onClick={handleDelete}>
          Delete Task
        </Button>
      </div>

      {/* Task Details */}
      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(task.status)}
                {task.status.replace("_", " ")}
              </span>
            </Badge>
          </div>

          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.dueDate && (
              <div>
                <span className="font-semibold">Due Date:</span>{" "}
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
            {task.completedAt && (
              <div>
                <span className="font-semibold">Completed:</span>{" "}
                {new Date(task.completedAt).toLocaleDateString()}
              </div>
            )}
            {task.relatedModule && (
              <div>
                <span className="font-semibold">Related Module:</span>{" "}
                <Badge variant="outline">{task.relatedModule}</Badge>
                {task.relatedId && ` #${task.relatedId}`}
              </div>
            )}
            <div>
              <span className="font-semibold">Created:</span>{" "}
              {new Date(task.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Status */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || updateMutation.isPending}>
              Update Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
            <Button onClick={handleAddComment} disabled={!newComment.trim() || createCommentMutation.isPending}>
              Add Comment
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4 mt-6">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
