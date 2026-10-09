import Link from "next/link";
import { ProgressBar } from "@/components/exercise-meta";
import { ModuleChip } from "@/components/module-chip";
import { buttonClass } from "@/components/ui";
import type { Module } from "@/lib/db/types";
import { firstOpen } from "@/lib/exercises/groups";
import { summarize } from "@/lib/exercises/stats";
import type { ExerciseListRow } from "@/lib/exercises/types";
import { assignTones } from "@/lib/module-tone";

export type HubExercise = Pick<ExerciseListRow, "exercise_attempts"> & { id: string };
export type HubModule = Pick<Module, "id" | "code" | "name" | "kind">;

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
  const tones = assignTones(modules);
  const hasWork = (m: HubModule) => (m.kind === "language" ? (vocab.get(m.id)?.due ?? 0) > 0 : Boolean(firstOpen(exercises.get(m.id) ?? [])));
  // one primary button per view: the first module that has something to do
  const primaryId = modules.find(hasWork)?.id;

  return (
    <ul className="space-y-4">
      {modules.map((m) => {
        const rows = exercises.get(m.id) ?? [];
        const summary = summarize(rows);
        const next = firstOpen(rows);
        const words = vocab.get(m.id);
        const variant = m.id === primaryId ? "primary" : "secondary";
        return (
          <li key={m.id} className="rounded-card border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="heading min-w-0">{m.name}</h2>
              <ModuleChip code={m.code} tone={tones.get(m.id)} />
            </div>

            {m.kind === "language" ? (
              <div className="mt-4 space-y-4">
                <p className="text-muted">
                  {words && words.total > 0 ? (
                    <>
                      <span className="num font-semibold text-foreground">{words.due}</span> von <span className="num">{words.total}</span> Wörtern zu üben
                    </>
                  ) : (
                    "Noch keine Wörter."
                  )}
                </p>
                <Link href={`/m/${m.id}`} className={buttonClass(variant, "w-full")}>
                  Vokabeln üben
                </Link>
              </div>
            ) : summary.total === 0 ? (
              <p className="mt-4 text-muted">Noch nichts zu üben. Neue Aufgaben kommen aus deinen Unterlagen.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <p>
                    <span className="num font-semibold">{summary.correct}</span> von <span className="num font-semibold">{summary.total}</span>{" "}
                    <span className="text-muted">sitzen</span>
                  </p>
                  <ProgressBar summary={summary} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {next ? (
                    <Link href={`/m/${m.id}/ex/${next.id}`} className={buttonClass(variant)}>
                      Weiter üben
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-12 items-center justify-center font-bold text-success">Alles gelöst</span>
                  )}
                  <Link href={`/m/${m.id}?tab=uebungen`} className={buttonClass("secondary")}>
                    Alle Aufgaben
                  </Link>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
