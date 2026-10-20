import type { SupabaseClient } from "@supabase/supabase-js";
import type { Semester } from "@/lib/db/types";
import { normalizeFeedUrl } from "./feed-url";
import { parseFeed } from "./parse";
import { planSync, type ExistingLecture, type LectureMerge, type SyncStats } from "./plan";

const MAX_FEED_BYTES = 5 * 1024 * 1024;
const SEMESTER_WEEKS = 26; // 14 teaching weeks + exam period + buffer
const CHUNK = 200;

export type SyncSummary = SyncStats & { skippedFullDay: number; fetchedEvents: number };

async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store", redirect: "follow" });
  if (!response.ok) throw new Error(`iCal-Feed nicht erreichbar (HTTP ${response.status})`);
  const body = await response.text();
  if (body.length > MAX_FEED_BYTES) throw new Error("iCal-Feed ist unerwartet gross");
  if (!body.includes("BEGIN:VCALENDAR")) throw new Error("Die URL liefert keinen iCal-Kalender");
  return body;
}

const fail = (what: string, error: { message: string }) => new Error(`${what}: ${error.message}`);

/**
 * Folds stale duplicate rows into the row the feed now uses: notes, documents and cards move over,
 * then the duplicate is deleted. A duplicate whose note would collide with a note on the target is kept.
 */
async function mergeLectures(db: SupabaseClient, merges: LectureMerge[]): Promise<number> {
  if (merges.length === 0) return 0;
  const ids = [...new Set(merges.flatMap((m) => [m.from, m.into]))];
  const { data: notes, error } = await db.from("notes").select("id, lecture_id").in("lecture_id", ids);
  if (error) throw fail("Notizen laden", error);
  const noteOf = new Map((notes ?? []).map((n) => [n.lecture_id as string, n.id as string]));

  const deletable: string[] = [];
  for (const { from, into } of merges) {
    const note = noteOf.get(from);
    if (note) {
      if (noteOf.has(into)) continue; // both carry a note: keep the duplicate rather than lose text
      const { error: moveError } = await db.from("notes").update({ lecture_id: into }).eq("id", note);
      if (moveError) throw fail("Notiz verschieben", moveError);
      noteOf.set(into, note);
    }
    for (const table of ["documents", "cards"] as const) {
      const { error: relinkError } = await db.from(table).update({ lecture_id: into }).eq("lecture_id", from);
      if (relinkError) throw fail("Verknüpfungen verschieben", relinkError);
    }
    deletable.push(from);
  }
  for (let i = 0; i < deletable.length; i += CHUNK) {
    const { error: deleteError } = await db.from("lectures").delete().in("id", deletable.slice(i, i + CHUNK));
    if (deleteError) throw fail("Duplikate löschen", deleteError);
  }
  return deletable.length;
}

/**
 * Imports the semester's iCal feed into `lectures`. Safe to run repeatedly: rows are keyed by
 * (user_id, ical_uid), manual module assignments are kept and nothing the user wrote is ever deleted.
 * `db` is either the user's session client (manual sync) or the service-role client (cron).
 */
export async function syncSemester(
  db: SupabaseClient,
  semester: Pick<Semester, "id" | "user_id" | "start_date" | "ical_url">,
  now: Date = new Date(),
): Promise<SyncSummary> {
  if (!semester.ical_url) throw new Error("Für dieses Semester ist keine iCal-URL hinterlegt");
  const url = normalizeFeedUrl(semester.ical_url);

  const from = new Date(`${semester.start_date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(from.getTime() + (SEMESTER_WEEKS * 7 + 1) * 86_400_000);

  const { events, skippedFullDay } = parseFeed(await fetchFeed(url), { from, to });

  const [modulesRes, existingRes] = await Promise.all([
    db.from("modules").select("id, ical_match, kind").eq("semester_id", semester.id),
    db
      .from("lectures")
      .select("id, ical_uid, module_id, title, starts_at, ends_at, location, status")
      .eq("semester_id", semester.id)
      .eq("source", "ical"),
  ]);
  if (modulesRes.error) throw fail("Module laden", modulesRes.error);
  if (existingRes.error) throw fail("Vorlesungen laden", existingRes.error);

  // the administration module collects everything that matches no subject and never matches by keyword
  const allModules = (modulesRes.data ?? []) as { id: string; ical_match: string | null; kind: string }[];
  const fallbackModuleId = allModules.find((m) => m.kind === "admin")?.id ?? null;

  const plan = planSync({
    events,
    existing: (existingRes.data ?? []) as ExistingLecture[],
    modules: allModules.filter((m) => m.kind !== "admin"),
    fallbackModuleId,
    semester,
    now,
  });

  // duplicates first, so their old UIDs are gone before re-keyed rows take over new ones
  const merged = await mergeLectures(db, plan.merges);

  for (let i = 0; i < plan.upserts.length; i += CHUNK) {
    const { error } = await db.from("lectures").upsert(plan.upserts.slice(i, i + CHUNK), { onConflict: "user_id,ical_uid" });
    if (error) throw fail("Vorlesungen speichern", error);
  }
  // a re-keyed row keeps its id (notes stay attached) and takes the feed's new UID and data
  const rekeyRows = plan.rekeys.map((r) => ({ id: r.id, ...r.patch }));
  for (let i = 0; i < rekeyRows.length; i += CHUNK) {
    const { error } = await db.from("lectures").upsert(rekeyRows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw fail("Vorlesungen umschlüsseln", error);
  }
  if (plan.cancelIds.length > 0) {
    const { error } = await db.from("lectures").update({ status: "cancelled" }).in("id", plan.cancelIds);
    if (error) throw fail("Absagen speichern", error);
  }
  const { error } = await db.from("semesters").update({ last_synced_at: now.toISOString() }).eq("id", semester.id);
  if (error) throw fail("Sync-Zeitpunkt speichern", error);

  return { ...plan.stats, merged, skippedFullDay, fetchedEvents: events.length };
}
