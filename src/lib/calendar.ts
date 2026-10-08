// Pure layout helpers for the calendar views of the timetable (week time grid, month grid).
import type { AgendaDay, AgendaItem } from "./agenda";
import { addDays, mondayOf, weekNumber, zurichInstant, zurichMinutes } from "./week";

const DAY_MINUTES = 24 * 60;
const FALLBACK_MINUTES = 90; // events without an end time (same as the list view)
const MIN_BLOCK_MINUTES = 30; // very short events are still drawn this tall so they stay tappable

export type Placed = {
  item: AgendaItem;
  /** Minutes since local midnight. */
  start: number;
  end: number;
  /** Column inside a group of overlapping events, and how many columns that group needs. */
  col: number;
  cols: number;
};

/** Start and end of an event as minutes since local midnight; events that run past midnight stop at 24:00. */
export function eventSpan(item: AgendaItem): { start: number; end: number } {
  const startMs = Date.parse(item.starts_at);
  const start = zurichMinutes(new Date(startMs));
  const minutes = item.ends_at ? (Date.parse(item.ends_at) - startMs) / 60_000 : FALLBACK_MINUTES;
  const duration = Math.max(minutes > 0 ? minutes : FALLBACK_MINUTES, MIN_BLOCK_MINUTES);
  return { start, end: Math.min(DAY_MINUTES, start + duration) };
}

/** Side-by-side columns for overlapping events of one day; non-overlapping events keep the full width. */
export function layoutDay(items: AgendaItem[]): Placed[] {
  const spans = items
    .map((item) => ({ item, ...eventSpan(item) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: Placed[] = [];
  let group: Placed[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    for (const p of group) p.cols = columnEnds.length;
    placed.push(...group);
    group = [];
    columnEnds = [];
    groupEnd = -1;
  };

  for (const span of spans) {
    if (group.length > 0 && span.start >= groupEnd) flush();
    let col = columnEnds.findIndex((end) => end <= span.start);
    if (col === -1) col = columnEnds.length;
    columnEnds[col] = span.end;
    group.push({ ...span, col, cols: 1 });
    groupEnd = Math.max(groupEnd, span.end);
  }
  flush();
  return placed;
}

/** Hour range [start, end] (24h clock) the week grid has to cover; sensible default when the week is empty. */
export function hourRange(days: AgendaDay[]): { start: number; end: number } {
  const spans = days.flatMap((d) => d.items.map(eventSpan));
  if (spans.length === 0) return { start: 8, end: 18 };
  const start = Math.floor(Math.min(...spans.map((s) => s.start)) / 60);
  let end = Math.ceil(Math.max(...spans.map((s) => s.end)) / 60);
  if (end - start < 4) end = Math.min(DAY_MINUTES / 60, start + 4);
  return { start: Math.min(start, end - 4), end };
}

/** Monday to Friday always; Saturday and Sunday only when they have events (part-time programmes teach on Saturdays). */
export function visibleDays(days: AgendaDay[]): AgendaDay[] {
  return days.filter((day, index) => index < 5 || day.items.length > 0);
}

// ---- month view -------------------------------------------------------------------------------

export type MonthDay = { date: string; inMonth: boolean; isToday: boolean; items: AgendaItem[] };
export type MonthWeek = { monday: string; week: number; days: MonthDay[] };

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const isMonth = (value: string) => MONTH.test(value);

/** "YYYY-MM" moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [, y, m] = MONTH.exec(month) ?? [];
  const index = Number(y) * 12 + (Number(m) - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** First visible day (a Monday) and the day after the last visible day (exclusive) of the month grid. */
export function monthBounds(month: string): { from: string; to: string } {
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  return { from: mondayOf(`${month}-01`), to: addDays(mondayOf(last), 7) };
}

/** Weeks (rows) of the month grid, including the leading and trailing days of the neighbouring months. */
export function buildMonth(month: string, byDate: Map<string, AgendaItem[]>, today: string, semesterStart: string): MonthWeek[] {
  const { from, to } = monthBounds(month);
  const weeks: MonthWeek[] = [];
  for (let monday = from; monday < to; monday = addDays(monday, 7)) {
    weeks.push({
      monday,
      week: weekNumber(semesterStart, zurichInstant(monday, "12:00")),
      days: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        return { date, inMonth: date.startsWith(month), isToday: date === today, items: byDate.get(date) ?? [] };
      }),
    });
  }
  return weeks;
}

/** "Oktober 2026" for a "YYYY-MM" string. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("de-CH", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 15)));
}
