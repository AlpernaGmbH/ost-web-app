// Week counting for the semester. W01 is the week (Mon-Sun) that contains the semester start date.
// All calendar math happens on Europe/Zurich dates so a lecture at 00:30 local time on a Monday
// lands in the right week even though its UTC timestamp is still Sunday.

export const TIME_ZONE = "Europe/Zurich";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of the given instant as seen in Europe/Zurich. */
export function zurichDate(at: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Week number relative to the semester start (a Monday, "YYYY-MM-DD"). Before the start: 0, -1, ... */
export function weekNumber(semesterStart: string, at: Date): number {
  const diff = dayNumber(zurichDate(at)) - dayNumber(semesterStart);
  return Math.floor(diff / 7) + 1;
}

/** Monday and Sunday ("YYYY-MM-DD") of week `week` (W01 = week of the semester start). */
export function weekRange(semesterStart: string, week: number): { monday: string; sunday: string } {
  const start = dayNumber(semesterStart) + (week - 1) * 7;
  const iso = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
  return { monday: iso(start), sunday: iso(start + 6) };
}

export function formatWeek(week: number): string {
  return week >= 1 ? `W${String(week).padStart(2, "0")}` : "Vor Semesterbeginn";
}

/** "05.10." style short date for a "YYYY-MM-DD" string. */
export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}.${m}.`;
}

/** Offset of Europe/Zurich from UTC at the given instant, in ms (e.g. +2h in summer). */
function zurichOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant at which the Zurich wall clock shows `date` ("YYYY-MM-DD") and `time` ("HH:MM"). */
export function zurichInstant(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const first = wall - zurichOffsetMs(new Date(wall));
  // the offset can differ at the DST boundary; re-evaluate once at the candidate instant
  return new Date(wall - zurichOffsetMs(new Date(first)));
}

/** "YYYY-MM-DD" plus `days` calendar days (pure date math, no time zone involved). */
export function addDays(isoDate: string, days: number): string {
  return new Date((dayNumber(isoDate) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Monday ("YYYY-MM-DD") of the week that contains the given date. */
export function mondayOf(isoDate: string): string {
  const weekday = new Date(dayNumber(isoDate) * DAY_MS).getUTCDay(); // 0 = Sunday
  return addDays(isoDate, -((weekday + 6) % 7));
}
