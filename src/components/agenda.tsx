import { X } from "lucide-react";
import Link from "next/link";
import type { AgendaDay, AgendaItem } from "@/lib/agenda";
import { formatTime } from "@/lib/format";
import { ModuleChip } from "./module-chip";

/** `tone` is the module's brand tone (see module-tone.ts); `admin` marks the Administration module: its events are shown by title. */
export type AgendaModule = { code: string; tone: number; admin?: boolean };

const tag = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-bold leading-none";

function Entry({ item, module }: { item: AgendaItem; module: AgendaModule | undefined }) {
  const cancelled = item.status === "cancelled";
  const body = (
    <>
      <span className="num w-16 shrink-0 text-sm">
        <span className="block font-semibold">{formatTime(item.starts_at)}</span>
        {item.ends_at ? <span className="text-muted">{formatTime(item.ends_at)}</span> : null}
      </span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className={`line-clamp-2 break-words font-semibold ${cancelled ? "text-muted line-through" : ""}`}>{item.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {module ? <ModuleChip code={module.code} tone={module.tone} /> : <span>ohne Fach</span>}
          {item.location ? <span className="truncate">{item.location}</span> : null}
        </span>
      </span>
      {cancelled ? (
        <span className={`${tag} bg-danger-soft text-on-danger-soft`}>
          <X aria-hidden className="size-3.5" strokeWidth={3} />
          Abgesagt
        </span>
      ) : item.ongoing ? (
        <span className={`${tag} bg-primary-soft text-on-primary-soft`}>Läuft</span>
      ) : null}
    </>
  );
  const className = `flex items-start gap-3 px-4 py-4 ${item.past && !item.ongoing ? "opacity-60" : ""}`;
  return item.module_id ? (
    <Link href={`/m/${item.module_id}/l/${item.id}`} className={`${className} hover:bg-sunken`}>
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
    return <p className="rounded-card border border-border bg-card p-6 text-muted">Diese Woche stehen keine Termine im Stundenplan.</p>;
  }
  return (
    <div className="space-y-4">
      {visible.map((day) => (
        <section key={day.date} aria-label={day.label} className={`overflow-hidden rounded-card border bg-card ${day.isToday ? "border-primary" : "border-border"}`}>
          <h2 className="heading flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <span>{day.label}</span>
            {day.isToday ? <span className={`${tag} bg-primary text-primary-foreground`}>Heute</span> : null}
          </h2>
          {day.items.length === 0 ? (
            <p className="px-4 py-4 text-muted">Keine Termine.</p>
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
