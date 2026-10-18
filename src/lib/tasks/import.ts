import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { describeDbError } from "@/lib/db/errors";
import { TASK_KIND_IDS, TASK_PRIORITY_IDS, TASK_STATUS_IDS } from "./types";

export const TASK_FILE_FORMAT = "ost-tasks/1";
export const MAX_TASKS_PER_FILE = 200;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fälligkeit: Datum als JJJJ-MM-TT erwartet")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00Z`)), "Fälligkeit: ungültiges Datum");

/** One task as listed in an import file (see README, «Aufgaben»). */
export const taskInput = z.object({
  title: z.string().trim().min(1, "Titel fehlt").max(200, "Titel ist zu lang (max. 200)"),
  kind: z.enum(TASK_KIND_IDS, { error: "Typ ungültig (task, deadline, exam, study)" }).default("task"),
  priority: z.enum(TASK_PRIORITY_IDS, { error: "Priorität ungültig (low, normal, high)" }).default("normal"),
  status: z.enum(TASK_STATUS_IDS, { error: "Status ungültig (open, doing, done)" }).default("open"),
  due: isoDate.nullish().transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(5000, "Notizen sind zu lang (max. 5000)")
    .nullish()
    .transform((v) => (v ? v : null)),
});
export type TaskInput = z.output<typeof taskInput>;

export type ParsedTaskFile = {
  module: string;
  tasks: TaskInput[];
  /** Entries that could not be used, with their position (1 = first task) and a readable reason. */
  invalid: { index: number; title: string | null; reason: string }[];
};

/** Parses a task file (JSON). Never throws; a structural problem is returned as `error`. */
export function parseTaskFile(text: string): ParsedTaskFile | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "Die Datei ist kein gültiges JSON." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { error: "Unerwartetes Dateiformat." };
  const file = raw as Record<string, unknown>;
  if (file.format !== TASK_FILE_FORMAT) return { error: `Unbekanntes Dateiformat (erwartet „${TASK_FILE_FORMAT}“).` };
  if (typeof file.module !== "string" || !file.module.trim()) return { error: "In der Datei fehlt das Modul (Feld „module“, z. B. SYS)." };
  if (!Array.isArray(file.tasks)) return { error: "In der Datei fehlt die Liste „tasks“." };
  if (file.tasks.length === 0) return { error: "Die Datei enthält keine Aufgaben." };
  if (file.tasks.length > MAX_TASKS_PER_FILE) return { error: `Zu viele Aufgaben in einer Datei (max. ${MAX_TASKS_PER_FILE}).` };

  const tasks: TaskInput[] = [];
  const invalid: ParsedTaskFile["invalid"] = [];
  const seen = new Set<string>();
  file.tasks.forEach((entry, i) => {
    const index = i + 1;
    const title = typeof entry === "object" && entry !== null && typeof (entry as { title?: unknown }).title === "string" ? (entry as { title: string }).title.trim() : null;
    const result = taskInput.safeParse(entry);
    if (!result.success) {
      invalid.push({ index, title, reason: result.error.issues[0]?.message ?? "Ungültiger Eintrag" });
      return;
    }
    // the title is the key the import matches on, so it must be unique within the file
    if (seen.has(result.data.title)) {
      invalid.push({ index, title: result.data.title, reason: "Titel kommt in der Datei mehrfach vor" });
      return;
    }
    seen.add(result.data.title);
    tasks.push(result.data);
  });
  return { module: file.module.trim(), tasks, invalid };
}

export type TaskImportOutcome = {
  created: number;
  updated: number;
  invalid: ParsedTaskFile["invalid"];
  /** Set when the database refused a write; what was written before stays and the import can simply be repeated. */
  error?: string;
};

/**
 * Writes the tasks of a parsed file into one module of one user. A task with the same title in the same module is
 * updated (title, kind, priority, due date, notes), its status stays as the user left it; the rest are inserted.
 * Works with a user session (RLS) and with the service-role client alike: every query names the user explicitly.
 */
export async function upsertTasks(supabase: SupabaseClient, userId: string, moduleId: string, parsed: ParsedTaskFile): Promise<TaskImportOutcome> {
  const { data: known, error: knownError } = await supabase.from("tasks").select("id, title").eq("user_id", userId).eq("module_id", moduleId).limit(1000);
  if (knownError) return { created: 0, updated: 0, invalid: parsed.invalid, error: describeDbError(knownError) };
  const idOfTitle = new Map((known ?? []).map((row) => [String(row.title), String(row.id)]));

  let created = 0;
  let updated = 0;
  for (const task of parsed.tasks) {
    const fields = { title: task.title, kind: task.kind, priority: task.priority, due_date: task.due, notes_md: task.notes };
    const existing = idOfTitle.get(task.title);
    const { error } = existing
      ? await supabase.from("tasks").update(fields).eq("id", existing).eq("user_id", userId)
      : await supabase.from("tasks").insert({ ...fields, status: task.status, user_id: userId, module_id: moduleId });
    if (error) return { created, updated, invalid: parsed.invalid, error: describeDbError(error) };
    if (existing) updated++;
    else created++;
  }
  return { created, updated, invalid: parsed.invalid };
}

/** "8 neu, 1 aktualisiert, 1 übersprungen (…)" */
export function describeTaskOutcome(outcome: TaskImportOutcome): string {
  const parts = [`${outcome.created} neu`];
  if (outcome.updated > 0) parts.push(`${outcome.updated} aktualisiert`);
  if (outcome.invalid.length > 0) {
    const first = outcome.invalid[0];
    parts.push(`${outcome.invalid.length} übersprungen (${first.title ? `„${first.title}“` : `Eintrag ${first.index}`}: ${first.reason})`);
  }
  return `${parts.join(", ")}.`;
}
