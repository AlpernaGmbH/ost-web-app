"use client";

import { Circle, CircleCheck, CircleDot, Plus } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { quickAddTask, saveTask, setTaskStatus } from "@/app/actions/tasks";
import type { FormState } from "@/lib/form-state";
import { TASK_KINDS, TASK_PRIORITIES, TASK_STATUSES, type TaskRow, type TaskStatus } from "@/lib/tasks/types";
import { Button, FormMessage, inputClass, textareaClass } from "./ui";

const initial: FormState = {};

export type TaskModuleOption = { id: string; code: string; name: string };

/** Create (no `task`) or edit a task. A successful save opens the list again. */
export function TaskForm({
  task,
  modules,
  defaults,
  back,
}: {
  task?: TaskRow;
  modules: TaskModuleOption[];
  defaults?: { due?: string | null; moduleId?: string | null };
  back?: string;
}) {
  const [state, action, pending] = useActionState(saveTask, initial);
  return (
    <form action={action} className="space-y-4">
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}

      <label className="block text-sm">
        Titel
        <input name="title" required maxLength={200} defaultValue={task?.title} placeholder="z. B. Übung 3 lösen" autoFocus={!task} className={`${inputClass} mt-1`} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Fach
          <select name="moduleId" defaultValue={task?.module_id ?? defaults?.moduleId ?? ""} className={`${inputClass} mt-1`}>
            <option value="">Ohne Fach</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Fällig am
          <input type="date" name="due" defaultValue={task?.due_date ?? defaults?.due ?? ""} className={`${inputClass} mt-1`} />
        </label>
      </div>

      <div className={`grid gap-2 ${task ? "grid-cols-3" : "grid-cols-2"}`}>
        <label className="block text-sm">
          Priorität
          <select name="priority" defaultValue={task?.priority ?? "normal"} className={`${inputClass} mt-1`}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Typ
          <select name="kind" defaultValue={task?.kind ?? "task"} className={`${inputClass} mt-1`}>
            {TASK_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {task ? (
          <label className="block text-sm">
            Status
            <select name="status" defaultValue={task.status} className={`${inputClass} mt-1`}>
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="status" value="open" />
        )}
      </div>

      <label className="block text-sm">
        Notizen (optional, Markdown)
        <textarea name="notes" rows={4} maxLength={5000} defaultValue={task?.notes_md ?? ""} placeholder="Links, Teilschritte, worauf es ankommt" className={`${textareaClass} mt-1`} />
      </label>

      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Speichert …" : task ? "Änderungen speichern" : "Aufgabe anlegen"}
      </Button>
    </form>
  );
}

/** One line at the end of the list: type a title, press Enter. `due` and `moduleId` preset what the row cannot ask for. */
export function QuickAddForm({ due, moduleId, placeholder = "Aufgabe hinzufügen …" }: { due?: string | null; moduleId?: string | null; placeholder?: string }) {
  const [state, action, pending] = useActionState(quickAddTask, initial);
  return (
    // a successful save remounts the form so the field is empty again
    <form key={state.ok ? state.message : "form"} action={action} className="space-y-2">
      {due ? <input type="hidden" name="due" value={due} /> : null}
      {moduleId ? <input type="hidden" name="moduleId" value={moduleId} /> : null}
      <label className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-card px-4 focus-within:border-primary">
        <Plus aria-hidden className="size-5 shrink-0 text-muted" strokeWidth={2.25} />
        <span className="sr-only">Neue Aufgabe</span>
        <input name="title" required maxLength={200} placeholder={placeholder} disabled={pending} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-3 text-base placeholder:text-muted focus:outline-none" />
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          {pending ? "Speichert …" : "Hinzufügen"}
        </Button>
      </label>
      {!state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}

const STATUS_ICON: Record<TaskStatus, typeof Circle> = { open: Circle, doing: CircleDot, done: CircleCheck };
const STATUS_TONE: Record<TaskStatus, string> = {
  open: "bg-card text-foreground",
  doing: "bg-primary-soft text-on-primary-soft",
  done: "bg-success-soft text-on-success-soft",
};

/** Status as icon and word; changing the select saves straight away. */
export function TaskStatusSelect({ taskId, status, title }: { taskId: string; status: TaskStatus; title: string }) {
  return (
    <form action={setTaskStatus} className="shrink-0">
      <input type="hidden" name="taskId" value={taskId} />
      <StatusSelect status={status} title={title} />
    </form>
  );
}

function StatusSelect({ status, title }: { status: TaskStatus; title: string }) {
  const { pending } = useFormStatus();
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex h-9 items-center gap-1.5 rounded-pill border border-control pl-2.5 pr-1 text-sm font-bold ${STATUS_TONE[status]} ${pending ? "opacity-60" : ""}`}>
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
      <select
        key={status}
        name="status"
        defaultValue={status}
        aria-label={`Status von «${title}»`}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 cursor-pointer rounded-pill bg-transparent pr-1 text-sm font-bold text-inherit focus:outline-none"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </span>
  );
}
