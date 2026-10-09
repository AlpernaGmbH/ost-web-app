import Link from "next/link";
import type { AgendaDay } from "@/lib/agenda";
import { hourRange, layoutDay, visibleDays } from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { toneColors } from "@/lib/module-tone";
import { zurichMinutes } from "@/lib/week";
import type { AgendaModule } from "./agenda";

const HOUR_PX = 56;
const GUTTER = "2.25rem";

/** Week as a time grid (days as columns, hours as rows). Pure server rendering, no client JS. */
export function WeekGrid({ days, modules, now }: { days: AgendaDay[]; modules: Map<string, AgendaModule>; now: Date }) {
  const shown = visibleDays(days);
  const { start, end } = hourRange(shown);
  const columns = `${GUTTER} repeat(${shown.length}, minmax(0, 1fr))`;
  const nowMinutes = zurichMinutes(now);
  const hours = Array.from({ length: end - start }, (_, i) => start + i);
  const lines = `repeating-linear-gradient(to bottom, var(--hairline) 0, var(--hairline) 1px, transparent 1px, transparent ${HOUR_PX}px)`;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="grid border-b border-border" style={{ gridTemplateColumns: columns }}>
        <div />
        {shown.map((day) => {
          const [weekday, date] = day.label.split(" ");
          return (
            <div key={day.date} className="py-2 text-center text-[13px] text-muted">
              <div>{weekday}</div>
              <div className={`mx-auto flex size-6 items-center justify-center rounded-full text-sm tabular-nums ${day.isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"}`}>
                {date.slice(0, 2)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: columns, height: (end - start) * HOUR_PX }}>
        <div className="relative" aria-hidden>
          {hours.map((hour) => (
            <span key={hour} className="absolute right-1 text-[10px] tabular-nums text-muted" style={{ top: (hour - start) * HOUR_PX + 2 }}>
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {shown.map((day) => {
          const showNow = day.isToday && nowMinutes >= start * 60 && nowMinutes <= end * 60;
          return (
            <div
              key={day.date}
              role="group"
              aria-label={day.label}
              className={`relative border-l border-border ${day.isToday ? "bg-primary-soft/40" : ""}`}
              style={{ backgroundImage: lines }}
            >
              {layoutDay(day.items).map(({ item, start: from, end: to, col, cols }) => {
                const subject = item.module_id ? modules.get(item.module_id) : undefined;
                const { soft, ink } = toneColors(subject?.tone);
                const top = ((from - start * 60) / 60) * HOUR_PX;
                const height = ((to - from) / 60) * HOUR_PX - 1;
                const cancelled = item.status === "cancelled";
                const label = [
                  subject?.code,
                  `${formatTime(item.starts_at)}${item.ends_at ? `–${formatTime(item.ends_at)}` : ""}`,
                  item.title,
                  item.location,
                  cancelled ? "abgesagt" : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                const className = `absolute overflow-hidden rounded-tag border-l-[3px] ${cols > 1 ? "px-0.5 text-[9px]" : "px-1 text-[10px]"} py-0.5 leading-tight ${cancelled ? "line-through opacity-60" : item.past && !item.ongoing ? "opacity-60" : ""} ${item.ongoing ? "ring-2 ring-primary" : ""}`;
                const style = {
                  top,
                  height,
                  left: `calc(${(col / cols) * 100}% + 1px)`,
                  width: `calc(${100 / cols}% - 2px)`,
                  backgroundColor: soft,
                  borderLeftColor: ink,
                  color: ink,
                };
                // side-by-side blocks are only a few pixels wide on a phone: keep just the short label there
                const compact = cols > 1;
                const byTitle = !subject || subject.admin;
                const body = (
                  <>
                    <span className={`block font-semibold ${byTitle && !compact ? "line-clamp-3 break-words hyphens-auto" : "truncate"}`}>{byTitle ? item.title : subject.code}</span>
                    {compact ? null : <span className="block truncate tabular-nums">{formatTime(item.starts_at)}</span>}
                    {!compact && item.location && height >= 46 ? <span className="block truncate opacity-80">{item.location}</span> : null}
                  </>
                );
                return item.module_id ? (
                  <Link key={item.id} href={`/m/${item.module_id}/l/${item.id}`} aria-label={label} title={label} className={className} style={style}>
                    {body}
                  </Link>
                ) : (
                  <div key={item.id} aria-label={label} title={label} className={className} style={style}>
                    {body}
                  </div>
                );
              })}
              {showNow ? (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary" style={{ top: ((nowMinutes - start * 60) / 60) * HOUR_PX }}>
                  <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-primary" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
