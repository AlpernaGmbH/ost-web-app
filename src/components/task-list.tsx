import { ArrowDown, ArrowUp, CircleAlert } from "lucide-react";
import Link from "next/link";
import { dueState, formatDue } from "@/lib/tasks/tasks";
import { TASK_KINDS, taskLabel, type TaskListRow, type TaskStatus } from "@/lib/tasks/types";
import { ModuleChip } from "./module-chip";
import { TaskStatusSelect } from "./task-forms";

/** Module label and tone, keyed by module id. */
export type TaskModule = { code: string; tone: number };

const chip = "inline-flex h-7 shrink-0 items-center gap-1 rounded-pill bg-sunken px-3 text-[13px] font-bold leading-none text-foreground";

/** "Mi 14.10." in the urgency it deserves: overdue in red with icon and word, today in petrol. */
function Due({ task, today }: { task: TaskListRow; today: string }) {
  if (!task.due_date) return <span className="text-sm text-muted">–</span>;
  const state = dueState(task.due_date, today);
  const label = formatDue(task.due_date, today);
  if (task.status === "done") return <span className="text-sm text-muted">{label}</span>;
  if (state === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-danger">
        <CircleAlert aria-hidden className="size-4" strokeWidth={2.5} />
        {label} · überfällig
      </span>
    );
  }
  return <span className={`text-sm ${state === "today" || state === "tomorrow" ? "font-bold text-primary-ink" : ""}`}>{label}</span>;
}

function Priority({ priority }: { priority: TaskListRow["priority"] }) {
  if (priority === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-bold text-accent-ink">
        <ArrowUp aria-hidden className="size-4" strokeWidth={2.5} />
        Hoch
      </span>
    );
  }
  if (priority === "low") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowDown aria-hidden className="size-4" strokeWidth={2.5} />
        Tief
      </span>
    );
  }
  return <span className="text-sm text-muted">Normal</span>;
}

function Title({ task }: { task: TaskListRow }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Link href={`/aufgaben/${task.id}`} className={`min-w-0 truncate font-semibold hover:underline ${task.status === "done" ? "text-muted line-through" : ""}`}>
        {task.title}
      </Link>
      {task.kind !== "task" ? <span className={chip}>{taskLabel(TASK_KINDS, task.kind)}</span> : null}
    </span>
  );
}

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_5.5rem_10rem_5rem_9.5rem]";

/**
 * The list: on a phone two lines per task (title with status, then subject, due date and priority);
 * from `lg` up a table with one column each, like a task tool on the desk.
 */
export function TaskRows({ tasks, modules, today, emptyText }: { tasks: TaskListRow[]; modules: Map<string, TaskModule>; today: string; emptyText: string }) {
  if (tasks.length === 0) return <p className="rounded-card border border-border bg-card p-6 text-muted">{emptyText}</p>;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className={`label hidden gap-x-3 border-b border-border px-4 py-3 text-muted lg:grid ${COLUMNS}`} aria-hidden>
        <span>Titel</span>
        <span>Fach</span>
        <span>Fällig am</span>
        <span>Priorität</span>
        <span>Status</span>
      </div>
      <ul className="divide-y divide-border">
        {tasks.map((task) => {
          const subject = task.module_id ? modules.get(task.module_id) : undefined;
          return (
            <li key={task.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 ${COLUMNS} ${task.status === "done" ? "opacity-70" : ""}`}>
              <Title task={task} />
              <span className="col-start-2 row-start-1 justify-self-end lg:col-start-5">
                <TaskStatusSelect taskId={task.id} status={task.status} title={task.title} />
              </span>
              <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                <span>{subject ? <ModuleChip code={subject.code} tone={subject.tone} /> : <span className="text-sm text-muted">ohne Fach</span>}</span>
                <Due task={task} today={today} />
                <Priority priority={task.priority} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const COLUMN_TITLES: Record<TaskStatus, string> = { open: "Offen", doing: "In Arbeit", done: "Erledigt" };

/** Board: one column per status. On a phone the columns scroll sideways and snap; from `sm` up they sit side by side. */
export function TaskBoard({ columns, modules, today }: { columns: Map<TaskStatus, TaskListRow[]>; modules: Map<string, TaskModule>; today: string }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
      {[...columns.entries()].map(([status, tasks]) => (
        <section key={status} aria-label={COLUMN_TITLES[status]} className="w-[82vw] shrink-0 snap-start rounded-card border border-border bg-sunken p-3 sm:w-auto">
          <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-bold">
            {COLUMN_TITLES[status]}
            <span className="num text-muted">{tasks.length}</span>
          </h2>
          {tasks.length === 0 ? (
            <p className="px-1 text-sm text-muted">{status === "done" ? "Noch nichts erledigt." : "Nichts hier."}</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => {
                const subject = task.module_id ? modules.get(task.module_id) : undefined;
                return (
                  <li key={task.id} className="space-y-2 rounded-field border border-border bg-card p-3">
                    <Title task={task} />
                    {subject || task.due_date || task.priority !== "normal" ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {subject ? <ModuleChip code={subject.code} tone={subject.tone} /> : null}
                        {task.due_date ? <Due task={task} today={today} /> : null}
                        {task.priority !== "normal" ? <Priority priority={task.priority} /> : null}
                      </div>
                    ) : null}
                    <TaskStatusSelect taskId={task.id} status={task.status} title={task.title} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
