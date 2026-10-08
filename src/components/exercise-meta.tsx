import { formatMinutes } from "@/lib/exercises/stats";
import { AIDS, DIFFICULTIES, KINDS, labelOf, RESULTS, type Aid, type Result } from "@/lib/exercises/types";

const chip = "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs";

export function AidChips({ aids, confirmed, empty }: { aids: Aid[]; confirmed: boolean; empty?: string }) {
  if (aids.length === 0) return <span className="text-xs text-muted">{empty ?? (confirmed ? "keine Hilfsmittel" : "keine Hilfsmittel angegeben")}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {aids.map((aid) => (
        <span key={aid} className={chip}>
          {labelOf(AIDS, aid)}
        </span>
      ))}
      {confirmed ? null : <span className="text-xs text-muted">(abgeleitet)</span>}
    </span>
  );
}

const RESULT_BADGE: Record<Result, string> = {
  correct: "bg-success/15 text-success",
  partial: "bg-border text-foreground",
  wrong: "bg-danger/15 text-danger",
};

export function ResultBadge({ result }: { result: Result | null }) {
  if (result === null) return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">neu</span>;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_BADGE[result]}`}>{labelOf(RESULTS, result).toLowerCase()}</span>;
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
