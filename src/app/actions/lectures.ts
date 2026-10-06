"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { zurichInstant } from "@/lib/week";

const lectureForm = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(1, "Titel fehlt").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Startzeit fehlt"),
  end: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
});

/** Manual lecture (fallback when the iCal feed does not contain it). Times are Zurich wall-clock. */
export async function createLecture(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = lectureForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  const { moduleId, title, date, start, end } = parsed.data;

  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id, semester_id").eq("id", moduleId).single();
  if (!module) return { ok: false, message: "Modul nicht gefunden" };

  const startsAt = zurichInstant(date, start);
  const endsAt = end ? zurichInstant(date, end) : null;
  if (endsAt && endsAt <= startsAt) return { ok: false, message: "Das Ende muss nach dem Start liegen" };

  const { error } = await supabase.from("lectures").insert({
    user_id: user.id,
    semester_id: module.semester_id,
    module_id: module.id,
    title,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    source: "manual",
  });
  if (error) return { ok: false, message: `Speichern fehlgeschlagen: ${error.message}` };
  revalidatePath(`/m/${moduleId}`);
  return { ok: true, message: "Vorlesung angelegt." };
}
