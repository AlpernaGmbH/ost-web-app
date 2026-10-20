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

/** An existing row that keeps its id (and notes) but takes over a new iCal UID and the feed's current data. */
export type LectureRekey = { id: string; patch: LectureUpsert };

/** A stale duplicate row (`from`) whose notes and documents move to `into` before it is deleted. */
export type LectureMerge = { from: string; into: string };

export type SyncStats = {
  created: number;
  updated: number;
  unchanged: number;
  cancelled: number;
  /** events that ended up without any module (ambiguous match or no administration module) */
  unmatched: number;
  /** events without a keyword match that were filed under the administration module */
  administration: number;
  /** rows whose feed UID changed: updated in place instead of being cancelled and re-created */
  rekeyed: number;
  /** stale duplicates (same lecture under an old UID) merged into the row the feed now uses */
  merged: number;
};

const sameTime = (iso: string | null, date: Date | null) =>
  (iso === null && date === null) || (iso !== null && date !== null && new Date(iso).getTime() === date.getTime());

const instant = (value: string | Date | null) => (value === null ? "" : String(new Date(value).getTime()));

/** Identity of a lecture independent of its iCal UID: same title at the same time. The room may change. */
const contentKey = (title: string, startsAt: string | Date, endsAt: string | Date | null) =>
  `${title.trim().toLowerCase()}|${instant(startsAt)}|${instant(endsAt)}`;

/**
 * Pure planning step of the iCal sync: decides which rows to upsert and which future lectures that
 * vanished from the feed to mark as cancelled. Lectures are never deleted, so notes survive.
 *
 * Feeds do not always keep their UIDs: when an event comes back under a new UID, the stored row that
 * carries the same title and time (and whose old UID vanished) is re-keyed in place instead of being
 * cancelled next to a freshly created twin. Twins that an earlier sync already created are merged.
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
}): { upserts: LectureUpsert[]; rekeys: LectureRekey[]; merges: LectureMerge[]; cancelIds: string[]; stats: SyncStats } {
  const { events, existing, modules, semester, now } = input;
  const fallbackModuleId = input.fallbackModuleId ?? null;
  const existingByUid = new Map(existing.map((l) => [l.ical_uid, l]));
  const stats: SyncStats = { created: 0, updated: 0, unchanged: 0, cancelled: 0, unmatched: 0, administration: 0, rekeyed: 0, merged: 0 };
  const upserts: LectureUpsert[] = [];
  const rekeys: LectureRekey[] = [];
  const merges: LectureMerge[] = [];

  // rows whose UID no longer appears in the feed, grouped by what they are (title + time)
  const inFeed = new Set(events.map((e) => e.key));
  const orphans = new Map<string, ExistingLecture[]>();
  for (const l of existing) {
    if (inFeed.has(l.ical_uid)) continue;
    const key = contentKey(l.title, l.starts_at, l.ends_at);
    orphans.set(key, [...(orphans.get(key) ?? []), l]);
  }
  const claimed = new Set<string>();

  for (const event of events) {
    let current = existingByUid.get(event.key);
    let rekeyOf: ExistingLecture | null = null;

    // the same lecture under an old UID: prefer the row in the same room, otherwise the only candidate
    const candidates = (orphans.get(contentKey(event.title, event.startsAt, event.endsAt)) ?? []).filter((l) => !claimed.has(l.id));
    const twin = candidates.find((l) => l.location === event.location) ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (twin) {
      claimed.add(twin.id);
      if (current) {
        merges.push({ from: twin.id, into: current.id });
        stats.merged++;
      } else {
        current = twin;
        rekeyOf = twin;
      }
    }

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

    const row: LectureUpsert = {
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
    };

    if (rekeyOf) {
      rekeys.push({ id: rekeyOf.id, patch: row });
      stats.rekeyed++;
      continue;
    }

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
    upserts.push(row);
  }

  // Only future lectures can "vanish": the feed may legitimately drop past events.
  const cancelIds = existing
    .filter((l) => !inFeed.has(l.ical_uid) && !claimed.has(l.id) && l.status === "scheduled" && new Date(l.starts_at) > now)
    .map((l) => l.id);
  stats.cancelled = cancelIds.length;

  return { upserts, rekeys, merges, cancelIds, stats };
}
