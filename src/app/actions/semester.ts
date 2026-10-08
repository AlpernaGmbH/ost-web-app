"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { Semester } from "@/lib/db/types";
import type { FormState } from "@/lib/form-state";
import { normalizeFeedUrl } from "@/lib/ical/feed-url";
import { syncSemester } from "@/lib/ical/sync";
import { createClient } from "@/lib/supabase/server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt");
const isMonday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 1;

// Defaults are a first guess at the OST titles; they are editable in the settings.
const DEFAULT_MODULES = [
  { code: "WMS", name: "Wirtschaftsmathematik & Statistik", kind: "course", color: "#4f46e5", ical_match: "wirtschaftsmathematik, statistik" },
  { code: "SYS", name: "Systemisches Management", kind: "course", color: "#0d9488", ical_match: "systemisch" },
  { code: "VHR", name: "Vertrags- und Haftpflichtrecht", kind: "course", color: "#d97706", ical_match: "vertrags, haftpflicht" },
  { code: "ENG", name: "Englisch", kind: "language", color: "#db2777", ical_match: "englisch, english" },
  // receives every timetable event that matches no subject; it never matches by keyword
  { code: "ADM", name: "Administration", kind: "admin", color: "#64748b", ical_match: null },
] as const;

/** First-run setup: HS26 (W01 = 14.09.2026) with the four modules. Does nothing if a semester exists. */
export async function bootstrapSemester(): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { count, error: countError } = await supabase.from("semesters").select("id", { count: "exact", head: true });
  if (countError) return { ok: false, message: describeDbError(countError) };
  if ((count ?? 0) > 0) {
    revalidatePath("/", "layout");
    return { ok: true, message: "Semester existiert bereits." };
  }

  const { data: semester, error } = await supabase
    .from("semesters")
    .insert({ user_id: user.id, name: "HS26", start_date: "2026-09-14" })
    .select("id")
    .single();
  if (error || !semester) return { ok: false, message: describeDbError(error ?? { message: "Semester konnte nicht angelegt werden" }) };

  const { error: moduleError } = await supabase.from("modules").insert(
    DEFAULT_MODULES.map((m, i) => ({ ...m, user_id: user.id, semester_id: semester.id, ects: m.kind === "course" ? 6 : 0, sort_order: i })),
  );
  if (moduleError) {
    // do not leave a half-initialised semester behind: the next click would see it and skip the modules
    await supabase.from("semesters").delete().eq("id", semester.id);
    return { ok: false, message: describeDbError(moduleError) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Semester HS26 eingerichtet." };
}

const semesterForm = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name fehlt").max(40),
  start_date: isoDate.refine(isMonday, "W01 muss an einem Montag beginnen"),
  ical_url: z.string().trim().max(2000).optional(),
  clear_ical: z.string().optional(),
});

export async function saveSemester(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = semesterForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  const { id, name, start_date, ical_url, clear_ical } = parsed.data;

  const update: Record<string, unknown> = { name, start_date };
  if (clear_ical) {
    update.ical_url = null;
  } else if (ical_url) {
    try {
      update.ical_url = normalizeFeedUrl(ical_url);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Ungültige iCal-URL" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("semesters").update(update).eq("id", id);
  if (error) return { ok: false, message: `Speichern fehlgeschlagen: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert." };
}

const moduleForm = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Modulname fehlt").max(80),
  ects: z.coerce.number().int().min(0).max(30),
  ical_match: z.string().trim().max(300),
});

export async function saveModule(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = moduleForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  const { id, name, ects, ical_match } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("modules").update({ name, ects, ical_match: ical_match || null }).eq("id", id);
  if (error) return { ok: false, message: `Speichern fehlgeschlagen: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert." };
}

export async function syncNow(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Semester fehlt" };

  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, user_id, start_date, ical_url")
    .eq("id", id.data)
    .single<Pick<Semester, "id" | "user_id" | "start_date" | "ical_url">>();
  if (!semester) return { ok: false, message: "Semester nicht gefunden" };

  try {
    const r = await syncSemester(supabase, semester);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `${r.created} neu, ${r.updated} aktualisiert, ${r.unchanged} unverändert, ${r.cancelled} abgesagt, ${r.administration} in Administration, ${r.unmatched} ohne Modul${r.skippedFullDay ? `, ${r.skippedFullDay} ganztägige übersprungen` : ""}.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sync fehlgeschlagen" };
  }
}

export async function assignLecture(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ lectureId: z.string().uuid(), moduleId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("lectures").update({ module_id: parsed.data.moduleId }).eq("id", parsed.data.lectureId);
  revalidatePath("/", "layout");
}
