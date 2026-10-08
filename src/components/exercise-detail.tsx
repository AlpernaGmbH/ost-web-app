import Link from "next/link";
import { deleteExercise } from "@/app/actions/exercises";
import { ConfirmButton } from "@/components/confirm-button";
import { AidChips, metaLine, ResultBadge } from "@/components/exercise-meta";
import { ExerciseRunner } from "@/components/exercise-runner";
import { Markdown } from "@/components/markdown";
import { Card, buttonClass } from "@/components/ui";
import { formatDuration } from "@/lib/exercises/stats";
import { labelOf, SOLUTION_SOURCES, type ExerciseRow, type Result } from "@/lib/exercises/types";
import { formatDateTime } from "@/lib/format";

export type Attempt = { id: string; result: Result; seconds: number | null; created_at: string };

/** One exercise: task, aids and source, timer + solution + self-assessment, history, neighbours (pure rendering). */
export function ExerciseDetail({
  moduleId,
  exercise,
  attempts,
  previousId,
  nextId,
}: {
  moduleId: string;
  exercise: ExerciseRow;
  attempts: Attempt[];
  previousId: string | null;
  nextId: string | null;
}) {
  const source = [exercise.source_label, exercise.source_ref].filter(Boolean).join(" · ");
  return (
    <>
      <Link href={`/m/${moduleId}?tab=uebungen`} className="mb-3 inline-block text-sm text-muted">
        ← Übungen
      </Link>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight break-words">{exercise.title}</h1>
        <p className="mt-1 text-sm text-muted">{exercise.topic}</p>
      </header>

      <Card className="mb-4 space-y-2">
        <p className="text-sm">{metaLine(exercise)}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Hilfsmittel:</span>
          <AidChips aids={exercise.aids} confirmed={exercise.aids_confirmed} />
        </p>
        {source ? (
          <p className="text-sm">
            <span className="text-muted">Quelle:</span> {source}
          </p>
        ) : null}
      </Card>

      <section aria-label="Aufgabe" className="mb-4 rounded-xl border border-border bg-card p-4">
        <Markdown>{exercise.task_md}</Markdown>
      </section>

      <ExerciseRunner key={attempts.length} exerciseId={exercise.id} estimatedMinutes={exercise.minutes}>
        {exercise.solution_md ? (
          <details className="rounded-xl border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">Lösung zeigen</summary>
            <div className="space-y-3 border-t border-border p-4">
              <p className="text-xs text-muted">{labelOf(SOLUTION_SOURCES, exercise.solution_source)}</p>
              <Markdown>{exercise.solution_md}</Markdown>
            </div>
          </details>
        ) : (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">Zu dieser Aufgabe gibt es keine Lösung. Vergleiche mit Skript oder Dozent und bewerte dich selbst.</p>
        )}
      </ExerciseRunner>

      {attempts.length > 0 ? (
        <section aria-labelledby="attempts" className="mt-6">
          <h2 id="attempts" className="mb-2 font-semibold">
            Bisherige Versuche
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="text-muted">{formatDateTime(attempt.created_at)}</span>
                <span className="flex items-center gap-3">
                  {attempt.seconds ? <span className="tabular-nums text-muted">{formatDuration(attempt.seconds)}</span> : null}
                  <ResultBadge result={attempt.result} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Aufgaben" className="mt-6 grid grid-cols-2 gap-2">
        {previousId ? (
          <Link href={`/m/${moduleId}/ex/${previousId}`} className={buttonClass("secondary")}>
            ← Vorherige
          </Link>
        ) : (
          <span />
        )}
        {nextId ? (
          <Link href={`/m/${moduleId}/ex/${nextId}`} className={buttonClass("secondary")}>
            Nächste →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Link href={`/m/${moduleId}/ex/${exercise.id}/edit`} className={buttonClass("ghost")}>
          Bearbeiten
        </Link>
        <form action={deleteExercise}>
          <input type="hidden" name="moduleId" value={moduleId} />
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <ConfirmButton type="submit" variant="danger" confirmText={`„${exercise.title}“ mit allen Versuchen wirklich löschen?`}>
            Löschen
          </ConfirmButton>
        </form>
      </div>
    </>
  );
}
