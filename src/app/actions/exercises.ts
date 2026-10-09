"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import { describeOutcome, exerciseRow, upsertExercises } from "@/lib/exercises/import";
import { exerciseFromForm, exerciseInput, parseExerciseFile } from "@/lib/exercises/schema";
import { RESULT_IDS } from "@/lib/exercises/types";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const MAX_IMPORT_BYTES = 900_000; // Server Actions accept 1 MB bodies by default

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
    const { data, error } = await supabase.from("exercises").update(exerciseRow(parsed.data)).eq("id", exerciseId).eq("module_id", moduleId).select("id").maybeSingle();
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data) return { ok: false, message: "Aufgabe nicht gefunden" };
  } else {
    const { data: module } = await supabase.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (!module) return { ok: false, message: "Modul nicht gefunden" };
    // new exercises go to the end of the list
    const { data: last } = await supabase.from("exercises").select("position").eq("module_id", moduleId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("exercises")
      .insert({ ...exerciseRow(parsed.data), user_id: user.id, module_id: moduleId, position: (last?.position ?? 0) + 1 })
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

  const outcome = await upsertExercises(supabase, user.id, module.id, parsed);
  revalidatePath(`/m/${module.id}`, "layout");
  if (outcome.error) {
    return { ok: false, message: `${outcome.created + outcome.updated} importiert, dann Fehler: ${outcome.error} Der Import kann gefahrlos wiederholt werden.` };
  }
  if (outcome.created + outcome.updated === 0) {
    const first = outcome.invalid[0];
    return { ok: false, message: first ? `Nichts importiert. ${first.id ? `„${first.id}“` : `Eintrag ${first.index}`}: ${first.reason}.` : "Nichts zum Importieren gefunden." };
  }
  return { ok: true, message: describeOutcome(outcome) };
}
