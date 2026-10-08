"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import { exerciseFromForm, exerciseInput, parseExerciseFile, type ExerciseInput } from "@/lib/exercises/schema";
import { RESULT_IDS } from "@/lib/exercises/types";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const MAX_IMPORT_BYTES = 900_000; // Server Actions accept 1 MB bodies by default
const UPSERT_CHUNK = 100;

/** Column values of an exercise row (shared by the form, the editor and the import). */
function toRow(input: ExerciseInput) {
  return {
    title: input.title,
    topic: input.topic,
    kind: input.kind,
    task_md: input.task,
    solution_md: input.solution,
    solution_source: input.solution_source,
    aids: input.aids,
    aids_confirmed: input.aids_confirmed,
    minutes: input.minutes,
    difficulty: input.difficulty,
    points: input.points,
    source_label: input.source,
    source_ref: input.source_ref,
  };
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Ungültige Eingabe";
}

/** Creates (no exerciseId) or updates an exercise, then opens its page. */
export async function saveExercise(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ids = z.object({ moduleId: uuid, exerciseId: uuid.optional() }).safeParse({
    moduleId: formData.get("moduleId"),
    exerciseId: formData.get("exerciseId") || undefined,
  });
  if (!ids.success) return { ok: false, message: "Ungültige Anfrage" };
  const parsed = exerciseInput.safeParse(exerciseFromForm(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { moduleId, exerciseId } = ids.data;
  let savedId = exerciseId;

  if (exerciseId) {
    const { data, error } = await supabase.from("exercises").update(toRow(parsed.data)).eq("id", exerciseId).eq("module_id", moduleId).select("id").maybeSingle();
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data) return { ok: false, message: "Aufgabe nicht gefunden" };
  } else {
    const { data: module } = await supabase.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (!module) return { ok: false, message: "Modul nicht gefunden" };
    // new exercises go to the end of the list
    const { data: last } = await supabase.from("exercises").select("position").eq("module_id", moduleId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("exercises")
      .insert({ ...toRow(parsed.data), user_id: user.id, module_id: moduleId, position: (last?.position ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, message: describeDbError(error) };
    savedId = data.id as string;
  }

  revalidatePath(`/m/${moduleId}`, "layout");
  redirect(`/m/${moduleId}/ex/${savedId}`);
}

export async function deleteExercise(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ moduleId: uuid, exerciseId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", parsed.data.exerciseId).eq("module_id", parsed.data.moduleId);
  revalidatePath(`/m/${parsed.data.moduleId}`, "layout");
  redirect(`/m/${parsed.data.moduleId}?tab=uebungen`);
}

/** One self-assessed attempt (optionally with the time the timer measured). */
export async function recordAttempt(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      exerciseId: uuid,
      result: z.enum(RESULT_IDS, { error: "Bitte eine Bewertung wählen" }),
      seconds: z
        .string()
        .regex(/^\d{1,5}$/)
        .transform(Number)
        .pipe(z.number().max(86_400))
        .optional(),
    })
    .safeParse({ ...Object.fromEntries(formData), seconds: formData.get("seconds") || undefined });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: exercise } = await supabase.from("exercises").select("id, module_id").eq("id", parsed.data.exerciseId).maybeSingle();
  if (!exercise) return { ok: false, message: "Aufgabe nicht gefunden" };

  const { error } = await supabase
    .from("exercise_attempts")
    .insert({ user_id: user.id, exercise_id: exercise.id, result: parsed.data.result, seconds: parsed.data.seconds ?? null });
  if (error) return { ok: false, message: describeDbError(error) };
  revalidatePath(`/m/${exercise.module_id}`, "layout");
  return { ok: true, message: "Versuch gespeichert." };
}

/** Imports an exercise file (JSON, see README). Same id again = update, so a corrected file can be re-imported. */
export async function importExercises(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const moduleId = uuid.safeParse(formData.get("moduleId"));
  if (!moduleId.success) return { ok: false, message: "Ungültige Anfrage" };

  const file = formData.get("file");
  let text = String(formData.get("text") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: "Die Datei ist zu gross (max. 900 KB)." };
    text = await file.text();
  }
  if (!text.trim()) return { ok: false, message: "Bitte eine Datei wählen oder den Inhalt einfügen." };
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, message: "Der Text ist zu lang (max. 900 KB)." };

  const parsed = parseExerciseFile(text);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id, code").eq("id", moduleId.data).maybeSingle();
  if (!module) return { ok: false, message: "Modul nicht gefunden" };
  if (parsed.module.toLowerCase() !== String(module.code).toLowerCase()) {
    return { ok: false, message: `Diese Datei ist für ${parsed.module}, du bist im Modul ${module.code}. Nichts importiert.` };
  }

  // ids that already exist: same module = update, other module = refuse (an id never moves between modules)
  const { data: known, error: knownError } = await supabase.from("exercises").select("external_id, module_id").not("external_id", "is", null).limit(10_000);
  if (knownError) return { ok: false, message: describeDbError(knownError) };
  const moduleOfId = new Map((known ?? []).map((row) => [String(row.external_id), String(row.module_id)]));

  const invalid = [...parsed.invalid];
  const importable = parsed.exercises
    .map((exercise, i) => ({ exercise, position: i + 1 }))
    .filter(({ exercise }) => {
      const owner = moduleOfId.get(exercise.external_id);
      if (owner && owner !== module.id) {
        invalid.push({ index: 0, id: exercise.external_id, reason: "id gehört schon zu einem anderen Modul" });
        return false;
      }
      return true;
    });
  if (importable.length === 0) {
    const first = invalid[0];
    return { ok: false, message: first ? `Nichts importiert. ${first.id ? `„${first.id}“` : `Eintrag ${first.index}`}: ${first.reason}.` : "Nichts zum Importieren gefunden." };
  }

  let created = 0;
  let updated = 0;
  for (let i = 0; i < importable.length; i += UPSERT_CHUNK) {
    const chunk = importable.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from("exercises").upsert(
      chunk.map(({ exercise, position }) => ({ ...toRow(exercise), user_id: user.id, module_id: module.id, external_id: exercise.external_id, position })),
      { onConflict: "user_id,external_id" },
    );
    if (error) {
      revalidatePath(`/m/${module.id}`, "layout");
      return { ok: false, message: `${created + updated} importiert, dann Fehler: ${describeDbError(error)} Der Import kann gefahrlos wiederholt werden.` };
    }
    for (const { exercise } of chunk) {
      if (moduleOfId.has(exercise.external_id)) updated++;
      else created++;
    }
  }

  revalidatePath(`/m/${module.id}`, "layout");
  const parts = [`${created} neu`];
  if (updated > 0) parts.push(`${updated} aktualisiert`);
  if (invalid.length > 0) {
    const first = invalid[0];
    parts.push(`${invalid.length} übersprungen (${first.id ? `„${first.id}“` : `Eintrag ${first.index}`}: ${first.reason})`);
  }
  return { ok: true, message: `${parts.join(", ")}.` };
}
