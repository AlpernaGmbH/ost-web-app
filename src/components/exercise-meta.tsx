import { Check, Minus, X } from "lucide-react";
import { formatMinutes, type Summary } from "@/lib/exercises/stats";
import { AIDS, DIFFICULTIES, KINDS, labelOf, RESULTS, type Aid, type Result } from "@/lib/exercises/types";

const chip = "inline-flex h-7 items-center rounded-pill bg-sunken px-3 text-[13px] font-bold leading-none text-foreground";

export function AidChips({ aids, confirmed, empty }: { aids: Aid[]; confirmed: boolean; empty?: string }) {
  if (aids.length === 0) return <span className="text-sm text-muted">{empty ?? (confirmed ? "keine Hilfsmittel" : "keine Hilfsmittel angegeben")}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {aids.map((aid) => (
        <span key={aid} className={chip}>
          {labelOf(AIDS, aid)}
        </span>
      ))}
      {confirmed ? null : <span className="text-sm text-muted">(abgeleitet)</span>}
    </span>
  );
}

const badge = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-bold leading-none";

/** Status of an exercise: always icon and word. "Nicht ganz" instead of "falsch": progress, not judgement. */
export function ResultBadge({ result }: { result: Result | null }) {
  if (result === null) return <span className={`${badge} bg-primary-soft text-on-primary-soft`}>Neu</span>;
  const label = labelOf(RESULTS, result);
  if (result === "correct") {
    return (
      <span className={`${badge} bg-success-soft text-on-success-soft`}>
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
        {label}
      </span>
    );
  }
  if (result === "partial") {
    return (
      <span className={`${badge} bg-accent-soft text-accent-ink`}>
        <Minus aria-hidden className="size-3.5" strokeWidth={3} />
        {label}
      </span>
    );
  }
  return (
    <span className={`${badge} bg-danger-soft text-on-danger-soft`}>
      <X aria-hidden className="size-3.5" strokeWidth={3} />
      {label}
    </span>
  );
}

type MetaRow = { kind: string; minutes: number | null; difficulty: number | null; points: number | null };

/** "Rechenaufgabe · ca. 12 Min. · mittel · 4.5 Punkte" */
export function metaLine(row: MetaRow): string {
  return [
    labelOf(KINDS, row.kind),
    row.minutes ? formatMinutes(row.minutes) : null,
    row.difficulty ? labelOf(DIFFICULTIES, row.difficulty) : null,
    row.points !== null ? `${String(row.points).replace(".", ",")} ${row.points === 1 ? "Punkt" : "Punkte"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Progress: what already sits (petrol; green once everything is solved) and what is partly there (amber).
 * Exercises that were "not quite" simply stay unfilled; the numbers next to the bar say how many.
 */
export function ProgressBar({ summary, className = "" }: { summary: Summary; className?: string }) {
  const pct = (n: number) => (summary.total === 0 ? 0 : (n / summary.total) * 100);
  const done = summary.total > 0 && summary.correct === summary.total;
  return (
    <div
      className={`flex h-3 overflow-hidden rounded-pill bg-sunken ring-1 ring-inset ring-border ${className}`}
      role="img"
      aria-label={`${summary.correct} richtig, ${summary.partial} teilweise, ${summary.wrong} nicht ganz, ${summary.untried} neu`}
    >
      <span className={`transition-[width] duration-200 ease-out ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${pct(summary.correct)}%` }} />
      <span className="bg-accent transition-[width] duration-200 ease-out" style={{ width: `${pct(summary.partial)}%` }} />
    </div>
  );
}
