import Link from "next/link";
import type { MonthWeek } from "@/lib/calendar";
import { toneColors } from "@/lib/module-tone";
import { formatWeek } from "@/lib/week";

/** One dot in a day cell: the module's tone colors it; muted dots (cancelled lecture, done task) are faded and not counted. */
export type MonthMark = { id: string; tone: number | undefined; muted?: boolean };

/** Month overview: one row per week (with the semester week number), a dot per item; days link to `hrefFor(date)`. */
export function MonthGrid<T>({
  weeks,
  selected,
  mark,
  countLabel,
  hrefFor,
}: {
  weeks: MonthWeek<T>[];
  selected: string;
  mark: (item: T) => MonthMark;
  /** Screen-reader label for a day's count, e.g. "2 Termine". */
  countLabel: (count: number) => string;
  hrefFor: (date: string) => string;
}) {
  const columns = "2.25rem repeat(7, minmax(0, 1fr))";
  const MAX_DOTS = 4;
  const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return (
    <div className="rounded-card border border-border bg-card p-3">
      <div className="grid pb-1 text-center text-xs text-muted" style={{ gridTemplateColumns: columns }} aria-hidden>
        <span />
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week.monday} className="grid items-start" style={{ gridTemplateColumns: columns }}>
          <span className="pt-3 text-center text-[10px] tabular-nums text-muted">{week.week >= 1 ? formatWeek(week.week) : ""}</span>
          {week.days.map((day) => {
            const marks = day.items.map(mark);
            const count = marks.filter((m) => !m.muted).length;
            const isSelected = day.date === selected;
            return (
              <Link
                key={day.date}
                href={hrefFor(day.date)}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${day.date.slice(8)}.${day.date.slice(5, 7)}., ${countLabel(count)}`}
                className={`flex min-h-14 flex-col items-center gap-1 rounded-field py-1 text-sm ${day.inMonth ? "" : "text-muted/70"} ${isSelected ? "bg-primary-soft ring-2 ring-primary" : "hover:bg-sunken"}`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full tabular-nums ${day.isToday ? "bg-primary font-semibold text-primary-foreground" : ""}`}
                >
                  {Number(day.date.slice(8))}
                </span>
                <span aria-hidden className="flex flex-wrap items-center justify-center gap-0.5 px-0.5">
                  {marks.slice(0, MAX_DOTS).map((m) => (
                    <span key={m.id} className={`size-1.5 rounded-full ${m.muted ? "opacity-30" : ""}`} style={{ backgroundColor: toneColors(m.tone).ink }} />
                  ))}
                  {marks.length > MAX_DOTS ? <span className="text-[9px] leading-none text-muted">+</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
