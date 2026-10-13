"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { TASK_KIND_IDS, TASK_PRIORITY_IDS, TASK_STATUS_IDS } from "@/lib/tasks/types";

const uuid = z.string().uuid();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00Z`)), "Ungültiges Datum");
const title = z.string().trim().min(1, "Titel fehlt").max(200, "Der Titel ist zu lang (max. 200 Zeichen)");
const optionalModule = uuid.or(z.literal("")).transform((v) => v || null);
const optionalDate = isoDate.or(z.literal("")).transform((v) => v || null);
// where to go after saving: only pages of this app
const back = z.string().regex(/^\/(aufgaben|faecher|m\/|stundenplan|$)/).optional();

const taskForm = z.object({
  taskId: uuid.optional(),
  title,
  moduleId: optionalModule,
  due: optionalDate,
  priority: z.enum(TASK_PRIORITY_IDS),
  kind: z.enum(TASK_KIND_IDS),
  status: z.enum(TASK_STATUS_IDS),
  notes: z.string().trim().max(5000, "Die Notizen sind zu lang (max. 5000 Zeichen)"),
  back,
});

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Ungültige Eingabe";

/** Refreshes every page that lists tasks (the task pages and the dashboard). */
function refreshTaskPages() {
  revalidatePath("/aufgaben", "layout");
  revalidatePath("/");
}

/** Creates (no taskId) or updates a task, then opens the list (or the `back` page). */
export async function saveTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = taskForm.safeParse({
    ...Object.fromEntries(formData),
    taskId: formData.get("taskId") || undefined,
    back: formData.get("back") || undefined,
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { taskId, moduleId, due, notes, ...fields } = parsed.data;
  const row = { title: fields.title, module_id: moduleId, due_date: due, priority: fields.priority, kind: fields.kind, status: fields.status, notes_md: notes || null };

  const supabase = await createClient();
  if (moduleId) {
    const { data: module } = await supabase.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (!module) return { ok: false, message: "Fach nicht gefunden" };
  }
  if (taskId) {
    const { data, error } = await supabase.from("tasks").update(row).eq("id", taskId).select("id").maybeSingle();
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data) return { ok: false, message: "Aufgabe nicht gefunden" };
  } else {
    const { error } = await supabase.from("tasks").insert({ ...row, user_id: user.id });
    if (error) return { ok: false, message: describeDbError(error) };
  }
  refreshTaskPages();
  redirect(parsed.data.back ?? "/aufgaben");
}

const quickForm = z.object({
  title,
  moduleId: optionalModule.optional(),
  due: optionalDate.optional(),
});

/** One-line entry from the list: title only, optionally with the day (calendar view) already set. */
export async function quickAddTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = quickForm.safeParse({
    title: formData.get("title"),
    moduleId: formData.get("moduleId") ?? "",
    due: formData.get("due") ?? "",
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .insert({ user_id: user.id, title: parsed.data.title, module_id: parsed.data.moduleId ?? null, due_date: parsed.data.due ?? null });
  if (error) return { ok: false, message: describeDbError(error) };
  refreshTaskPages();
  return { ok: true, message: `«${parsed.data.title}» angelegt.` };
}

/** Status change straight from a row (the select submits on change). */
export async function setTaskStatus(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ taskId: uuid, status: z.enum(TASK_STATUS_IDS) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: parsed.data.status }).eq("id", parsed.data.taskId);
  refreshTaskPages();
}

export async function deleteTask(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ taskId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", parsed.data.taskId);
  refreshTaskPages();
  redirect("/aufgaben");
}
