import { matchModuleDetailed, type MatchableModule } from "./match";
import type { ParsedEvent } from "./parse";

export type ExistingLecture = {
  id: string;
  ical_uid: string;
  module_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  status: "scheduled" | "cancelled";
};

export type LectureUpsert = {
  user_id: string;
  semester_id: string;
  module_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  ical_uid: string;
  source: "ical";
  status: "scheduled" | "cancelled";
};

export type SyncStats = {
  created: number;
  updated: number;
  unchanged: number;
  cancelled: number;
  /** events that ended up without any module (ambiguous match or no administration module) */
  unmatched: number;
  /** events without a keyword match that were filed under the administration module */
  administration: number;
};

const sameTime = (iso: string | null, date: Date | null) =>
  (iso === null && date === null) || (iso !== null && date !== null && new Date(iso).getTime() === date.getTime());

/**
 * Pure planning step of the iCal sync: decides which rows to upsert and which future lectures that
 * vanished from the feed to mark as cancelled. Lectures are never deleted, so notes survive.
 */
export function planSync(input: {
  events: ParsedEvent[];
  existing: ExistingLecture[];
  /** modules that take part in keyword matching (not the administration module) */
  modules: MatchableModule[];
  /** receives every event that matches no module; ambiguous matches stay in the inbox instead */
  fallbackModuleId?: string | null;
  semester: { id: string; user_id: string };
  now: Date;
}): { upserts: LectureUpsert[]; cancelIds: string[]; stats: SyncStats } {
  const { events, existing, modules, semester, now } = input;
  const fallbackModuleId = input.fallbackModuleId ?? null;
  const existingByUid = new Map(existing.map((l) => [l.ical_uid, l]));
  const stats: SyncStats = { created: 0, updated: 0, unchanged: 0, cancelled: 0, unmatched: 0, administration: 0 };
  const upserts: LectureUpsert[] = [];

  for (const event of events) {
    const current = existingByUid.get(event.key);
    // keep a module the user (or an earlier sync) already assigned; only unassigned events get re-matched
    const before = current?.module_id ?? null;
    let moduleId = before;
    // Events in the inbox or in the administration fallback were never placed by the user, so they are
    // re-matched on every sync: fixing the keywords of a module moves them without manual work.
    if (before === null || (fallbackModuleId !== null && before === fallbackModuleId)) {
      const match = matchModuleDetailed(event.title, modules);
      if (match.id) moduleId = match.id;
      else if (before === null) moduleId = match.ambiguous ? null : fallbackModuleId;
      if (moduleId === fallbackModuleId && before !== fallbackModuleId) stats.administration++;
    }
    const status = event.cancelled ? "cancelled" : "scheduled";
    if (moduleId === null) stats.unmatched++;

    if (current) {
      const unchanged =
        current.title === event.title &&
        current.module_id === moduleId &&
        current.status === status &&
        current.location === event.location &&
        sameTime(current.starts_at, event.startsAt) &&
        sameTime(current.ends_at, event.endsAt);
      if (unchanged) {
        stats.unchanged++;
        continue;
      }
      stats.updated++;
    } else {
      stats.created++;
    }

    upserts.push({
      user_id: semester.user_id,
      semester_id: semester.id,
      module_id: moduleId,
      title: event.title,
      starts_at: event.startsAt.toISOString(),
      ends_at: event.endsAt ? event.endsAt.toISOString() : null,
      location: event.location,
      ical_uid: event.key,
      source: "ical",
      status,
    });
  }

  // Only future lectures can "vanish": the feed may legitimately drop past events.
  const inFeed = new Set(events.map((e) => e.key));
  const cancelIds = existing
    .filter((l) => !inFeed.has(l.ical_uid) && l.status === "scheduled" && new Date(l.starts_at) > now)
    .map((l) => l.id);
  stats.cancelled = cancelIds.length;

  return { upserts, cancelIds, stats };
}
