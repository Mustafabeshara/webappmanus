import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function TaskSummaryWidget() {
  const { data: tasks } = trpc.tasks.list.useQuery();

  const todoTasks = tasks?.filter(t => t.status === 'todo') || [];
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || [];
  const doneTasks = tasks?.filter(t => t.status === 'done') || [];
  const totalTasks = tasks?.length || 0;
  const completionPercent = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Task Summary</CardTitle>
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalTasks}</div>
        <p className="text-xs text-muted-foreground">
          {doneTasks.length} completed ({completionPercent.toFixed(0)}%)
        </p>
        <Progress value={completionPercent} className="mt-3" />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Link href="/tasks">
            <a className="hover:underline">
              <div className="text-lg font-bold">{todoTasks.length}</div>
              <div className="text-xs text-muted-foreground">To Do</div>
            </a>
          </Link>
          <Link href="/tasks">
            <a className="hover:underline">
              <div className="text-lg font-bold">{inProgressTasks.length}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </a>
          </Link>
          <Link href="/tasks">
            <a className="hover:underline">
              <div className="text-lg font-bold">{doneTasks.length}</div>
              <div className="text-xs text-muted-foreground">Done</div>
            </a>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
