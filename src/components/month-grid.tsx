import Link from "next/link";
import type { MonthWeek } from "@/lib/calendar";
import { formatWeek } from "@/lib/week";
import type { AgendaModule } from "./agenda";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_DOTS = 4;

/** Month overview: one row per week (with the semester week number), a dot per event; days link to `hrefFor(date)`. */
export function MonthGrid({
  weeks,
  selected,
  modules,
  hrefFor,
}: {
  weeks: MonthWeek[];
  selected: string;
  modules: Map<string, AgendaModule>;
  hrefFor: (date: string) => string;
}) {
  const columns = "2.25rem repeat(7, minmax(0, 1fr))";
  return (
    <div className="rounded-xl border border-border bg-card p-2">
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
            const count = day.items.filter((i) => i.status === "scheduled").length;
            const isSelected = day.date === selected;
            return (
              <Link
                key={day.date}
                href={hrefFor(day.date)}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${day.date.slice(8)}.${day.date.slice(5, 7)}., ${count === 0 ? "keine Termine" : count === 1 ? "1 Termin" : `${count} Termine`}`}
                className={`flex min-h-14 flex-col items-center gap-1 rounded-lg py-1 text-sm ${day.inMonth ? "" : "text-muted/60"} ${isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-border/40"}`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full tabular-nums ${day.isToday ? "bg-primary font-semibold text-primary-foreground" : ""}`}
                >
                  {Number(day.date.slice(8))}
                </span>
                <span aria-hidden className="flex flex-wrap items-center justify-center gap-0.5 px-0.5">
                  {day.items.slice(0, MAX_DOTS).map((item) => (
                    <span
                      key={item.id}
                      className={`size-1.5 rounded-full ${item.status === "cancelled" ? "opacity-30" : ""}`}
                      style={{ backgroundColor: (item.module_id && modules.get(item.module_id)?.color) || "#64748b" }}
                    />
                  ))}
                  {day.items.length > MAX_DOTS ? <span className="text-[9px] leading-none text-muted">+</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
