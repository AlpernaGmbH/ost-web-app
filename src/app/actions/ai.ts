"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { startRun, syncRuns, type SyncResult } from "@/lib/ai/runs";
import { MAX_HINT_LENGTH } from "@/lib/ai/config";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

/** Starts a generation job for the chosen documents of a module (the result arrives later, see `syncAiRuns`). */
export async function generateExercises(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ moduleId: uuid, documentIds: z.array(uuid).min(1, "Bitte mindestens ein PDF wählen."), hint: z.string().max(MAX_HINT_LENGTH, `Hinweis: höchstens ${MAX_HINT_LENGTH} Zeichen`) })
    .safeParse({ moduleId: formData.get("moduleId"), documentIds: formData.getAll("documentIds"), hint: String(formData.get("hint") ?? "") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" };

  const supabase = await createClient();
  const result = await startRun({ supabase, userId: user.id, moduleId: parsed.data.moduleId, documentIds: parsed.data.documentIds, hint: parsed.data.hint });
  revalidatePath(`/m/${parsed.data.moduleId}`, "layout");
  return result;
}

/** Fetches finished results of the module's open runs; called by the page while runs are pending. */
export async function syncAiRuns(moduleId: string): Promise<SyncResult> {
  const user = await requireUser();
  const id = uuid.safeParse(moduleId);
  if (!id.success) return { changed: false, queued: 0 };
  const supabase = await createClient();
  const result = await syncRuns({ supabase, userId: user.id, moduleId: id.data });
  if (result.changed) revalidatePath(`/m/${id.data}`, "layout");
  return result;
}

const draftTarget = z.object({
  moduleId: uuid,
  exerciseId: uuid.optional(),
  runId: uuid.optional(),
  back: z.string().regex(/^\/m\/[0-9a-f-]{36}(\/|\?|$)/).optional(),
});

/** Which drafts a form targets: one exercise, one run, or every draft of the module. */
function parseTarget(formData: FormData) {
  return draftTarget.safeParse({
    moduleId: formData.get("moduleId"),
    exerciseId: formData.get("exerciseId") || undefined,
    runId: formData.get("runId") || undefined,
    back: formData.get("back") || undefined,
  });
}

function applyScope<T extends { eq: (column: string, value: string) => T }>(query: T, target: { exerciseId?: string; runId?: string }): T {
  if (target.exerciseId) return query.eq("id", target.exerciseId);
  if (target.runId) return query.eq("ai_run_id", target.runId);
  return query;
}

/** Accepted drafts become regular exercises; afterwards the form's `back` page opens. */
export async function acceptDrafts(formData: FormData): Promise<void> {
  await requireUser();
  const target = parseTarget(formData);
  if (!target.success) return;
  const supabase = await createClient();
  const query = supabase.from("exercises").update({ status: "active" }).eq("module_id", target.data.moduleId).eq("status", "draft");
  await applyScope(query, target.data);
  revalidatePath(`/m/${target.data.moduleId}`, "layout");
  redirect(target.data.back ?? `/m/${target.data.moduleId}?tab=uebungen`);
}

/** Discarded drafts are deleted; the run record stays as history. */
export async function discardDrafts(formData: FormData): Promise<void> {
  await requireUser();
  const target = parseTarget(formData);
  if (!target.success) return;
  const supabase = await createClient();
  const query = supabase.from("exercises").delete().eq("module_id", target.data.moduleId).eq("status", "draft");
  await applyScope(query, target.data);
  revalidatePath(`/m/${target.data.moduleId}`, "layout");
  redirect(target.data.back ?? `/m/${target.data.moduleId}?tab=uebungen`);
}
