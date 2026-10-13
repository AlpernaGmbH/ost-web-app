// Pure helpers for the task list: ordering, due dates, grouping. No I/O.
import { formatDay } from "../format";
import { addDays, zurichInstant } from "../week";
import type { TaskListRow, TaskPriority, TaskStatus } from "./types";

export type DueState = "overdue" | "today" | "tomorrow" | "week" | "later" | "none";

/** How urgent a due date is, seen from `today` (both "YYYY-MM-DD"). */
export function dueState(due: string | null, today: string): DueState {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  if (due === addDays(today, 1)) return "tomorrow";
  if (due <= addDays(today, 6)) return "week";
  return "later";
}

/** "Heute", "Morgen" or "Mi 14.10." */
export function formatDue(due: string, today: string): string {
  const state = dueState(due, today);
  if (state === "today") return "Heute";
  if (state === "tomorrow") return "Morgen";
  return formatDay(zurichInstant(due, "12:00").toISOString());
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
const STATUS_RANK: Record<TaskStatus, number> = { open: 0, doing: 0, done: 1 };

/** Open tasks first (soonest due date, then priority, then oldest first), done tasks at the end (latest completion first). */
export function sortTasks<T extends TaskListRow>(tasks: readonly T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (a.status === "done" && b.status === "done") return (b.done_at ?? "").localeCompare(a.done_at ?? "");
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return a.created_at.localeCompare(b.created_at);
  });
}

/** Done tasks are hidden unless asked for. */
export function visibleTasks<T extends TaskListRow>(tasks: readonly T[], showDone: boolean): T[] {
  return showDone ? [...tasks] : tasks.filter((t) => t.status !== "done");
}

const RECENT_DAYS = 7;

/** Board columns: every open task; done tasks only from the last week unless all of them are wanted. */
export function boardColumns<T extends TaskListRow>(tasks: readonly T[], today: string, showAllDone: boolean): Map<TaskStatus, T[]> {
  const cutoff = zurichInstant(addDays(today, -RECENT_DAYS), "00:00").toISOString();
  const columns = new Map<TaskStatus, T[]>([
    ["open", []],
    ["doing", []],
    ["done", []],
  ]);
  for (const task of sortTasks(tasks)) {
    if (task.status === "done" && !showAllDone && (task.done_at ?? "") < cutoff) continue;
    columns.get(task.status)!.push(task);
  }
  return columns;
}

/** Tasks keyed by due date (tasks without a date are left out); each day in list order. */
export function byDueDate<T extends TaskListRow>(tasks: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const task of sortTasks(tasks)) {
    if (!task.due_date) continue;
    map.set(task.due_date, [...(map.get(task.due_date) ?? []), task]);
  }
  return map;
}

export type TaskSummary = { open: number; overdue: number; today: number; done: number; undated: number };

/** Numbers for the header line: "7 offen · 2 überfällig · 3 erledigt". */
export function summarizeTasks(tasks: readonly TaskListRow[], today: string): TaskSummary {
  const summary: TaskSummary = { open: 0, overdue: 0, today: 0, done: 0, undated: 0 };
  for (const task of tasks) {
    if (task.status === "done") {
      summary.done++;
      continue;
    }
    summary.open++;
    const state = dueState(task.due_date, today);
    if (state === "overdue") summary.overdue++;
    else if (state === "today") summary.today++;
    else if (state === "none") summary.undated++;
  }
  return summary;
}

/** What the dashboard shows: overdue, today and the next days, open tasks only, at most `limit`. */
export function upcomingTasks<T extends TaskListRow>(tasks: readonly T[], today: string, limit: number): T[] {
  const horizon = addDays(today, 6);
  return sortTasks(tasks)
    .filter((t) => t.status !== "done" && t.due_date !== null && t.due_date <= horizon)
    .slice(0, limit);
}
