import Link from "next/link";
import { ProgressBar } from "@/components/exercise-meta";
import { buttonClass } from "@/components/ui";
import type { Module } from "@/lib/db/types";
import { firstOpen } from "@/lib/exercises/groups";
import { summarize } from "@/lib/exercises/stats";
import type { ExerciseListRow } from "@/lib/exercises/types";

export type HubExercise = Pick<ExerciseListRow, "exercise_attempts"> & { id: string };
export type HubModule = Pick<Module, "id" | "code" | "name" | "kind" | "color">;

/** One tile per module: progress and a way straight into the next open exercise (pure rendering, no data access). */
export function PracticeHub({
  modules,
  exercises,
  vocab,
}: {
  modules: HubModule[];
  exercises: Map<string, HubExercise[]>;
  vocab: Map<string, { total: number; due: number }>;
}) {
  return (
    <ul className="space-y-3">
      {modules.map((m) => {
        const rows = exercises.get(m.id) ?? [];
        const summary = summarize(rows);
        const next = firstOpen(rows);
        const words = vocab.get(m.id);
        return (
          <li key={m.id} className="flex overflow-hidden rounded-xl border border-border bg-card">
            <span aria-hidden className="w-1.5 shrink-0" style={{ backgroundColor: m.color }} />
            <div className="min-w-0 flex-1 space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="truncate font-semibold">{m.name}</h2>
                <span className="shrink-0 text-xs text-muted">{m.code}</span>
              </div>

              {m.kind === "language" ? (
                <>
                  <p className="text-sm text-muted">{words && words.total > 0 ? `${words.due} von ${words.total} Wörtern zu üben` : "Noch keine Wörter."}</p>
                  <Link href={`/m/${m.id}`} className={buttonClass("primary", "w-full")}>
                    Vokabeln üben →
                  </Link>
                </>
              ) : summary.total === 0 ? (
                <p className="text-sm text-muted">Noch keine Übungen.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm">
                      <span className="font-medium">
                        {summary.correct} von {summary.total}
                      </span>{" "}
                      <span className="text-muted">gelöst</span>
                    </p>
                    <ProgressBar summary={summary} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {next ? (
                      <Link href={`/m/${m.id}/ex/${next.id}`} className={buttonClass("primary")}>
                        Weiter üben
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-lg text-sm text-success">Alles gelöst</span>
                    )}
                    <Link href={`/m/${m.id}?tab=uebungen`} className={buttonClass("secondary")}>
                      Alle Aufgaben
                    </Link>
                  </div>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
