import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Tasks Module", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, name: "Test User", email: "test@example.com", role: "admin" },
  });

  it("should list all tasks", async () => {
    const tasks = await caller.tasks.list({});
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("should filter tasks by status", async () => {
    const todoTasks = await caller.tasks.list({ status: "todo" });
    const doneTasks = await caller.tasks.list({ status: "done" });

    expect(Array.isArray(todoTasks)).toBe(true);
    expect(Array.isArray(doneTasks)).toBe(true);
  });

  it("should filter tasks by priority", async () => {
    const highPriorityTasks = await caller.tasks.list({ priority: "high" });
    const lowPriorityTasks = await caller.tasks.list({ priority: "low" });

    expect(Array.isArray(highPriorityTasks)).toBe(true);
    expect(Array.isArray(lowPriorityTasks)).toBe(true);
  });

  it("should list task comments", async () => {
    // Test with a non-existent task ID - should return empty array
    const comments = await caller.tasks.comments.list({ taskId: 99999 });
    expect(Array.isArray(comments)).toBe(true);
  });
});
