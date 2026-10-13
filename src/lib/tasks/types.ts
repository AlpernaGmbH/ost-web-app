// Row type and vocabularies of the task list (mirrors supabase/migrations/007_tasks.sql).

export const TASK_STATUSES = [
  { id: "open", label: "Offen" },
  { id: "doing", label: "In Arbeit" },
  { id: "done", label: "Erledigt" },
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number]["id"];
export const TASK_STATUS_IDS = ["open", "doing", "done"] as const satisfies readonly TaskStatus[];

export const TASK_PRIORITIES = [
  { id: "high", label: "Hoch" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Tief" },
] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["id"];
export const TASK_PRIORITY_IDS = ["high", "normal", "low"] as const satisfies readonly TaskPriority[];

export const TASK_KINDS = [
  { id: "task", label: "Aufgabe" },
  { id: "deadline", label: "Abgabe" },
  { id: "exam", label: "Prüfung" },
  { id: "study", label: "Lernen" },
] as const;
export type TaskKind = (typeof TASK_KINDS)[number]["id"];
export const TASK_KIND_IDS = ["task", "deadline", "exam", "study"] as const satisfies readonly TaskKind[];

export type TaskRow = {
  id: string;
  module_id: string | null;
  title: string;
  notes_md: string | null;
  kind: TaskKind;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null; // YYYY-MM-DD
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

/** What the list, board and calendar need per task. */
export type TaskListRow = Pick<TaskRow, "id" | "module_id" | "title" | "kind" | "priority" | "status" | "due_date" | "done_at" | "created_at">;

export const taskLabel = <T extends { id: string; label: string }>(list: readonly T[], id: string | null | undefined): string =>
  list.find((item) => item.id === id)?.label ?? "";
