import { describe, expect, it } from "vitest";
import { boardColumns, byDueDate, dueState, formatDue, sortTasks, summarizeTasks, upcomingTasks, visibleTasks } from "./tasks";
import type { TaskListRow } from "./types";

const TODAY = "2026-10-13"; // a Tuesday

let n = 0;
const task = (over: Partial<TaskListRow> & { title: string }): TaskListRow => ({
  id: `t${++n}`,
  module_id: null,
  kind: "task",
  priority: "normal",
  status: "open",
  due_date: null,
  done_at: null,
  created_at: `2026-10-01T00:00:${String(n).padStart(2, "0")}Z`,
  ...over,
});

describe("dueState and formatDue", () => {
  it("classifies dates relative to today", () => {
    expect(dueState(null, TODAY)).toBe("none");
    expect(dueState("2026-10-12", TODAY)).toBe("overdue");
    expect(dueState("2026-10-13", TODAY)).toBe("today");
    expect(dueState("2026-10-14", TODAY)).toBe("tomorrow");
    expect(dueState("2026-10-19", TODAY)).toBe("week");
    expect(dueState("2026-10-20", TODAY)).toBe("later");
  });

  it("names today and tomorrow, otherwise weekday and date", () => {
    expect(formatDue("2026-10-13", TODAY)).toBe("Heute");
    expect(formatDue("2026-10-14", TODAY)).toBe("Morgen");
    expect(formatDue("2026-10-20", TODAY)).toBe("Di 20.10.");
    expect(formatDue("2026-10-12", TODAY)).toBe("Mo 12.10.");
  });
});

describe("sortTasks", () => {
  it("orders by due date, then priority, then age; undated after dated; done last", () => {
    const list = [
      task({ title: "undated low", priority: "low" }),
      task({ title: "done late", status: "done", done_at: "2026-10-10T10:00:00Z" }),
      task({ title: "later", due_date: "2026-10-20" }),
      task({ title: "soon normal", due_date: "2026-10-14" }),
      task({ title: "soon high", due_date: "2026-10-14", priority: "high" }),
      task({ title: "undated high", priority: "high" }),
      task({ title: "done early", status: "done", done_at: "2026-10-01T10:00:00Z" }),
      task({ title: "overdue doing", due_date: "2026-10-01", status: "doing" }),
    ];
    expect(sortTasks(list).map((t) => t.title)).toEqual(["overdue doing", "soon high", "soon normal", "later", "undated high", "undated low", "done late", "done early"]);
  });

  it("does not mutate the input", () => {
    const list = [task({ title: "b", due_date: "2026-10-20" }), task({ title: "a", due_date: "2026-10-14" })];
    sortTasks(list);
    expect(list.map((t) => t.title)).toEqual(["b", "a"]);
  });
});

describe("visibleTasks and boardColumns", () => {
  const list = [
    task({ title: "open", due_date: "2026-10-14" }),
    task({ title: "doing", status: "doing" }),
    task({ title: "done this week", status: "done", done_at: "2026-10-10T10:00:00Z" }),
    task({ title: "done long ago", status: "done", done_at: "2026-09-01T10:00:00Z" }),
  ];

  it("hides done tasks unless asked", () => {
    expect(visibleTasks(list, false).map((t) => t.title)).toEqual(["open", "doing", "done this week", "done long ago"].slice(0, 2));
    expect(visibleTasks(list, true)).toHaveLength(4);
  });

  it("fills three columns; the done column keeps only the last week by default", () => {
    const columns = boardColumns(list, TODAY, false);
    expect([...columns.keys()]).toEqual(["open", "doing", "done"]);
    expect(columns.get("open")!.map((t) => t.title)).toEqual(["open"]);
    expect(columns.get("doing")!.map((t) => t.title)).toEqual(["doing"]);
    expect(columns.get("done")!.map((t) => t.title)).toEqual(["done this week"]);
    expect(boardColumns(list, TODAY, true).get("done")!.map((t) => t.title)).toEqual(["done this week", "done long ago"]);
  });
});

describe("byDueDate, summarizeTasks and upcomingTasks", () => {
  const list = [
    task({ title: "overdue", due_date: "2026-10-12" }),
    task({ title: "today a", due_date: "2026-10-13", priority: "low" }),
    task({ title: "today b", due_date: "2026-10-13", priority: "high" }),
    task({ title: "next week", due_date: "2026-10-19" }),
    task({ title: "far", due_date: "2026-11-30" }),
    task({ title: "undated" }),
    task({ title: "done", status: "done", due_date: "2026-10-12", done_at: "2026-10-12T10:00:00Z" }),
  ];

  it("groups dated tasks by day in list order", () => {
    const map = byDueDate(list);
    expect([...map.keys()]).toEqual(["2026-10-12", "2026-10-13", "2026-10-19", "2026-11-30"]);
    expect(map.get("2026-10-13")!.map((t) => t.title)).toEqual(["today b", "today a"]);
    expect(map.get("2026-10-12")!.map((t) => t.title)).toEqual(["overdue", "done"]);
  });

  it("counts open, overdue, today, undated and done", () => {
    expect(summarizeTasks(list, TODAY)).toEqual({ open: 6, overdue: 1, today: 2, done: 1, undated: 1 });
  });

  it("picks the open tasks due within a week, soonest first, capped", () => {
    expect(upcomingTasks(list, TODAY, 10).map((t) => t.title)).toEqual(["overdue", "today b", "today a", "next week"]);
    expect(upcomingTasks(list, TODAY, 2).map((t) => t.title)).toEqual(["overdue", "today b"]);
  });
});
