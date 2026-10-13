import Link from "next/link";
import { acceptDrafts, discardDrafts } from "@/app/actions/ai";
import { ConfirmButton } from "@/components/confirm-button";
import { metaLine } from "@/components/exercise-meta";
import { Button, Card } from "@/components/ui";
import type { ExerciseListRow } from "@/lib/exercises/types";

export type DraftRow = Pick<ExerciseListRow, "id" | "title" | "topic" | "kind" | "minutes" | "difficulty" | "points" | "source_label" | "source_ref"> & { ai_run_id: string | null };

function Hidden({ moduleId, back, exerciseId, runId }: { moduleId: string; back: string; exerciseId?: string; runId?: string }) {
  return (
    <>
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="back" value={back} />
      {exerciseId ? <input type="hidden" name="exerciseId" value={exerciseId} /> : null}
      {runId ? <input type="hidden" name="runId" value={runId} /> : null}
    </>
  );
}

/** Accept or discard one draft; used on the review list and on the exercise page. */
export function DraftActions({ moduleId, exerciseId, back, size = "sm" }: { moduleId: string; exerciseId: string; back: string; size?: "sm" | "md" }) {
  return (
    <span className="flex shrink-0 gap-2">
      <form action={acceptDrafts}>
        <Hidden moduleId={moduleId} back={back} exerciseId={exerciseId} />
        <Button type="submit" variant="secondary" size={size}>
          Übernehmen
        </Button>
      </form>
      <form action={discardDrafts}>
        <Hidden moduleId={moduleId} back={back} exerciseId={exerciseId} />
        <ConfirmButton type="submit" variant="danger" size={size} confirmText="Diesen Entwurf wirklich verwerfen?">
          Verwerfen
        </ConfirmButton>
      </form>
    </span>
  );
}

/** Drafts grouped by run, each group with "accept all" and "discard all" (pure rendering). */
export function DraftReview({ moduleId, drafts }: { moduleId: string; drafts: DraftRow[] }) {
  const back = `/m/${moduleId}/ex/drafts`;
  const groups = new Map<string, DraftRow[]>();
  for (const draft of drafts) {
    const key = draft.ai_run_id ?? "";
    groups.set(key, [...(groups.get(key) ?? []), draft]);
  }
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="heading">
          {drafts.length} {drafts.length === 1 ? "Entwurf" : "Entwürfe"} warten
        </p>
        <p className="text-sm text-muted">
          Entwürfe stammen aus deinen Unterlagen, gelesen von der KI. Lies Aufgabe und Lösung einmal durch (Tippen öffnet sie), dann übernimm sie. Übernommene Aufgaben
          erscheinen in der Liste und beim Üben. Zahlen in Lösungen mit «derived» hat die KI selbst gerechnet.
        </p>
        <form action={acceptDrafts}>
          <Hidden moduleId={moduleId} back={`/m/${moduleId}?tab=uebungen`} />
          <Button type="submit" className="w-full">
            Alle {drafts.length} übernehmen
          </Button>
        </form>
      </Card>

      {[...groups.entries()].map(([runId, rows]) => (
        <details key={runId || "none"} open className="overflow-hidden rounded-card border border-border bg-card">
          <summary className="cursor-pointer list-none px-4 py-4">
            <span className="flex items-baseline justify-between gap-3">
              <span className="heading line-clamp-2 break-words">{rows[0].source_label?.replace(/^KI-Entwurf · /, "") ?? "Entwürfe"}</span>
              <span className="num shrink-0 text-sm text-muted">{rows.length}</span>
            </span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {rows.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-3">
                <Link href={`/m/${moduleId}/ex/${row.id}`} className="block hover:underline">
                  {row.source_ref ? <span className="block text-sm text-muted">{row.source_ref}</span> : null}
                  <span className="line-clamp-2 break-words font-semibold">{row.title}</span>
                  <span className="block text-sm text-muted">
                    {row.topic} · {metaLine(row)}
                  </span>
                </Link>
                <DraftActions moduleId={moduleId} exerciseId={row.id} back={back} />
              </li>
            ))}
          </ul>
          {runId ? (
            <div className="flex gap-2 border-t border-border p-4">
              <form action={acceptDrafts} className="flex-1">
                <Hidden moduleId={moduleId} back={back} runId={runId} />
                <Button type="submit" variant="secondary" className="w-full">
                  Gruppe übernehmen
                </Button>
              </form>
              <form action={discardDrafts} className="flex-1">
                <Hidden moduleId={moduleId} back={back} runId={runId} />
                <ConfirmButton type="submit" variant="danger" className="w-full" confirmText={`Alle ${rows.length} Entwürfe dieser Gruppe verwerfen?`}>
                  Gruppe verwerfen
                </ConfirmButton>
              </form>
            </div>
          ) : null}
        </details>
      ))}
    </div>
  );
}
