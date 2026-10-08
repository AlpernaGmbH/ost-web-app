import Link from "next/link";
import type { AgendaDay, AgendaItem } from "@/lib/agenda";
import { formatTime } from "@/lib/format";

/** `admin` marks the Administration module: its events are shown by title, since "ADM" says nothing. */
export type AgendaModule = { code: string; color: string; admin?: boolean };

function Entry({ item, module }: { item: AgendaItem; module: AgendaModule | undefined }) {
  const cancelled = item.status === "cancelled";
  const body = (
    <>
      <span className="w-14 shrink-0 text-sm tabular-nums">
        <span className="block font-medium">{formatTime(item.starts_at)}</span>
        {item.ends_at ? <span className="text-muted">{formatTime(item.ends_at)}</span> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-2 break-words ${cancelled ? "text-muted line-through" : ""}`}>{item.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted">
          {module ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: module.color }} />
              {module.code}
            </span>
          ) : (
            <span>ohne Fach</span>
          )}
          {item.location ? <span className="truncate">· {item.location}</span> : null}
        </span>
      </span>
      {cancelled ? (
        <span className="shrink-0 text-xs text-danger">abgesagt</span>
      ) : item.ongoing ? (
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">läuft</span>
      ) : null}
    </>
  );
  const className = `flex items-center gap-3 px-4 py-3 ${item.past && !item.ongoing ? "opacity-60" : ""}`;
  return item.module_id ? (
    <Link href={`/m/${item.module_id}/l/${item.id}`} className={`${className} hover:bg-border/30`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Agenda list: days with events (and today, even when empty); `showEmptyDays` keeps every given day, e.g. a picked day of the month view. */
export function AgendaView({ days, modules, showEmptyDays = false }: { days: AgendaDay[]; modules: Map<string, AgendaModule>; showEmptyDays?: boolean }) {
  const visible = showEmptyDays ? days : days.filter((d) => d.items.length > 0 || d.isToday);
  if (visible.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">In dieser Woche stehen keine Termine im Stundenplan.</p>;
  }
  return (
    <div className="space-y-4">
      {visible.map((day) => (
        <section key={day.date} aria-label={day.label} className={`overflow-hidden rounded-xl border bg-card ${day.isToday ? "border-primary" : "border-border"}`}>
          <h2 className="flex items-center justify-between border-b border-border px-4 py-2 text-sm font-semibold">
            <span>{day.label}</span>
            {day.isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Heute</span> : null}
          </h2>
          {day.items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Keine Termine.</p>
          ) : (
            <ul className="divide-y divide-border">
              {day.items.map((item) => (
                <li key={item.id}>
                  <Entry item={item} module={item.module_id ? modules.get(item.module_id) : undefined} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
