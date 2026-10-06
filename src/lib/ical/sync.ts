import type { SupabaseClient } from "@supabase/supabase-js";
import type { Semester } from "@/lib/db/types";
import { normalizeFeedUrl } from "./feed-url";
import { parseFeed } from "./parse";
import { planSync, type ExistingLecture, type SyncStats } from "./plan";

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

/**
 * Imports the semester's iCal feed into `lectures`. Safe to run repeatedly: rows are keyed by
 * (user_id, ical_uid), manual module assignments are kept and nothing is ever deleted.
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
    db.from("modules").select("id, ical_match").eq("semester_id", semester.id),
    db
      .from("lectures")
      .select("id, ical_uid, module_id, title, starts_at, ends_at, location, status")
      .eq("semester_id", semester.id)
      .eq("source", "ical"),
  ]);
  if (modulesRes.error) throw new Error(`Module laden: ${modulesRes.error.message}`);
  if (existingRes.error) throw new Error(`Vorlesungen laden: ${existingRes.error.message}`);

  const plan = planSync({
    events,
    existing: (existingRes.data ?? []) as ExistingLecture[],
    modules: modulesRes.data ?? [],
    semester,
    now,
  });

  for (let i = 0; i < plan.upserts.length; i += CHUNK) {
    const { error } = await db
      .from("lectures")
      .upsert(plan.upserts.slice(i, i + CHUNK), { onConflict: "user_id,ical_uid" });
    if (error) throw new Error(`Vorlesungen speichern: ${error.message}`);
  }
  if (plan.cancelIds.length > 0) {
    const { error } = await db.from("lectures").update({ status: "cancelled" }).in("id", plan.cancelIds);
    if (error) throw new Error(`Absagen speichern: ${error.message}`);
  }
  const { error } = await db.from("semesters").update({ last_synced_at: now.toISOString() }).eq("id", semester.id);
  if (error) throw new Error(`Sync-Zeitpunkt speichern: ${error.message}`);

  return { ...plan.stats, skippedFullDay, fetchedEvents: events.length };
}
