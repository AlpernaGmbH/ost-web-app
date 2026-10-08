import Link from "next/link";
import { ExerciseImportForm } from "@/components/exercise-forms";
import { AidChips, metaLine, ResultBadge } from "@/components/exercise-meta";
import { Card, buttonClass } from "@/components/ui";
import { describeDbError } from "@/lib/db/errors";
import { filterExercises, latestResult, summarize, topicStats, type Filter } from "@/lib/exercises/stats";
import { AIDS, type ExerciseListRow } from "@/lib/exercises/types";
import { createClient } from "@/lib/supabase/server";

/** Link to the exercise tab with the given filter ("all topics / all aids / everything" leaves the parameter out). */
function tabHref(moduleId: string, filter: Filter): string {
  const query = new URLSearchParams({ tab: "uebungen" });
  if (filter.topic) query.set("topic", filter.topic);
  if (filter.aid) query.set("aid", filter.aid);
  if (filter.show === "open") query.set("show", "open");
  return `/m/${moduleId}?${query.toString()}`;
}

const pill = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-sm ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;

export async function ExercisesTab({ moduleId, moduleCode, filter }: { moduleId: string; moduleCode: string; filter: Filter }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, title, topic, kind, aids, aids_confirmed, minutes, difficulty, points, source_label, source_ref, exercise_attempts(result, seconds, created_at)")
    .eq("module_id", moduleId)
    .order("position")
    .order("created_at")
    .limit(2000)
    .returns<ExerciseListRow[]>();
  if (error) {
    return (
      <Card>
        <p className="text-sm">{describeDbError(error)}</p>
      </Card>
    );
  }

  return <ExerciseList moduleId={moduleId} moduleCode={moduleCode} filter={filter} all={data ?? []} />;
}

/** The list with progress, filters and the import form (pure rendering, no data access). */
export function ExerciseList({ moduleId, moduleCode, filter, all }: { moduleId: string; moduleCode: string; filter: Filter; all: ExerciseListRow[] }) {
  const shown = filterExercises(all, filter);
  const summary = summarize(all);
  const topics = topicStats(all);
  const filtered = filter.topic !== null || filter.aid !== null || filter.show === "open";
  const nextOpen = shown.find((row) => latestResult(row) !== "correct");

  return (
    <div className="space-y-4">
      {all.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Noch keine Übungen. Importiere unten eine Übungsdatei oder lege eine Aufgabe von Hand an.</p>
        </Card>
      ) : (
        <>
          <Card>
            <p className="font-semibold">
              {summary.correct} von {summary.total} gelöst
            </p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${summary.correct} richtig, ${summary.partial} teilweise, ${summary.wrong} falsch, ${summary.untried} neu`}>
              <span className="bg-success" style={{ width: `${(summary.correct / summary.total) * 100}%` }} />
              <span className="bg-primary/50" style={{ width: `${(summary.partial / summary.total) * 100}%` }} />
              <span className="bg-danger" style={{ width: `${(summary.wrong / summary.total) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {summary.correct} richtig · {summary.partial} teilweise · {summary.wrong} falsch · {summary.untried} neu
            </p>
          </Card>

          <section aria-label="Filter" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link href={tabHref(moduleId, { ...filter, topic: null })} className={pill(filter.topic === null)}>
                Alle Themen
              </Link>
              {topics.map((t) => (
                <Link key={t.topic} href={tabHref(moduleId, { ...filter, topic: t.topic })} className={pill(filter.topic === t.topic)}>
                  {t.topic} <span className="ml-1 opacity-70">{t.correct}/{t.total}</span>
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={tabHref(moduleId, { ...filter, aid: null })} className={pill(filter.aid === null)}>
                Alle Hilfsmittel
              </Link>
              {AIDS.map((aid) => (
                <Link key={aid.id} href={tabHref(moduleId, { ...filter, aid: filter.aid === aid.id ? null : aid.id })} className={pill(filter.aid === aid.id)}>
                  {aid.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={tabHref(moduleId, { ...filter, show: filter.show === "open" ? "all" : "open" })} className={pill(filter.show === "open")} aria-current={filter.show === "open" ? "true" : undefined}>
                Nur offene
              </Link>
              {filtered ? (
                <Link href={tabHref(moduleId, { topic: null, aid: null, show: "all" })} className="inline-flex min-h-9 items-center px-2 text-sm text-primary">
                  Filter zurücksetzen
                </Link>
              ) : null}
            </div>
          </section>

          {nextOpen ? (
            <Link href={`/m/${moduleId}/ex/${nextOpen.id}`} className={buttonClass("primary", "w-full")}>
              Nächste offene Aufgabe →
            </Link>
          ) : null}

          {shown.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Keine Aufgaben mit diesem Filter.</p>
            </Card>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {shown.map((row) => (
                <li key={row.id}>
                  <Link href={`/m/${moduleId}/ex/${row.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-border/30">
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="line-clamp-2 break-words font-medium">{row.title}</span>
                      <span className="block text-xs text-muted">
                        {row.topic} · {metaLine(row)}
                      </span>
                      <AidChips aids={row.aids} confirmed={row.aids_confirmed} empty="" />
                    </span>
                    <ResultBadge result={latestResult(row)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link href={`/m/${moduleId}/ex/new`} className={buttonClass("secondary", "w-full")}>
        + Aufgabe von Hand anlegen
      </Link>

      <details className="rounded-xl border border-border bg-card" open={all.length === 0}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Übungsdatei importieren</summary>
        <div className="border-t border-border p-4">
          <ExerciseImportForm moduleId={moduleId} moduleCode={moduleCode} />
        </div>
      </details>
    </div>
  );
}
