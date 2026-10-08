import { formatDay } from "./format";
import { addDays, zurichDate, zurichInstant } from "./week";

export type AgendaLecture = {
  id: string;
  module_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  status: "scheduled" | "cancelled";
};

export type AgendaItem = AgendaLecture & { ongoing: boolean; past: boolean };
export type AgendaDay = { date: string; label: string; isToday: boolean; items: AgendaItem[] };

const FALLBACK_DURATION_MS = 90 * 60_000; // events without an end time count as 90 minutes

/** UTC instants [from, to) of the week starting on `monday` in Zurich local time. */
export function weekBounds(monday: string): { from: Date; to: Date } {
  return { from: zurichInstant(monday, "00:00"), to: zurichInstant(addDays(monday, 7), "00:00") };
}

const eventEnd = (lecture: AgendaLecture) => (lecture.ends_at ? Date.parse(lecture.ends_at) : Date.parse(lecture.starts_at) + FALLBACK_DURATION_MS);

/** Events keyed by their Zurich local date, each day sorted by start time. */
export function groupByDate(lectures: AgendaLecture[], now: Date): Map<string, AgendaItem[]> {
  const byDate = new Map<string, AgendaItem[]>();
  for (const lecture of [...lectures].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    const start = Date.parse(lecture.starts_at);
    const end = eventEnd(lecture);
    const item: AgendaItem = {
      ...lecture,
      ongoing: lecture.status === "scheduled" && start <= now.getTime() && now.getTime() < end,
      past: end <= now.getTime(),
    };
    const date = zurichDate(new Date(lecture.starts_at));
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }
  return byDate;
}

/** Seven days Monday..Sunday with that week's events sorted by start time. Days follow Zurich local dates. */
export function groupWeek(monday: string, lectures: AgendaLecture[], now: Date): AgendaDay[] {
  const today = zurichDate(now);
  const byDate = groupByDate(lectures, now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      label: formatDay(zurichInstant(date, "12:00").toISOString()),
      isToday: date === today,
      items: byDate.get(date) ?? [],
    };
  });
}
