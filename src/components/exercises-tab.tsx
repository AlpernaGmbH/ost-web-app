import Link from "next/link";
import type { ReactNode } from "react";
import { AiGenerateForm, AiRunPoller } from "@/components/ai-generate";
import { AiRunList, type RunRow } from "@/components/ai-runs";
import { ExerciseImportForm } from "@/components/exercise-forms";
import { metaLine, ProgressBar, ResultBadge } from "@/components/exercise-meta";
import { Card, buttonClass } from "@/components/ui";
import { aiConfigured } from "@/lib/ai/config";
import { isPdf } from "@/lib/ai/runs";
import { describeDbError } from "@/lib/db/errors";
import type { DocumentRow } from "@/lib/db/types";
import { firstOpen, groupExercises, parseGroupBy, shortenSources, type GroupBy } from "@/lib/exercises/groups";
import { filterExercises, latestResult, summarize, type Filter } from "@/lib/exercises/stats";
import { AIDS, type ExerciseListRow } from "@/lib/exercises/types";
import { formatSize } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Link to the exercise tab with the given filter and grouping (defaults are left out of the URL). */
function tabHref(moduleId: string, filter: Filter, group: GroupBy): string {
  const query = new URLSearchParams({ tab: "uebungen" });
  if (group === "topic") query.set("group", "topic");
  if (filter.topic) query.set("topic", filter.topic);
  if (filter.aid) query.set("aid", filter.aid);
  if (filter.show === "open") query.set("show", "open");
  return `/m/${moduleId}?${query.toString()}`;
}

const pill = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-sm ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;

export async function ExercisesTab({ moduleId, moduleCode, filter, searchParams }: { moduleId: string; moduleCode: string; filter: Filter; searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const [exercisesRes, documentsRes, runsRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, status, title, topic, kind, aids, aids_confirmed, minutes, difficulty, points, source_label, source_ref, exercise_attempts(result, seconds, created_at)")
      .eq("module_id", moduleId)
      .order("position")
      .order("created_at")
      .limit(2000)
      .returns<ExerciseListRow[]>(),
    supabase
      .from("documents")
      .select("id, filename, mime, size_bytes")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Pick<DocumentRow, "id" | "filename" | "mime" | "size_bytes">[]>(),
    supabase
      .from("ai_runs")
      .select("id, status, documents, hint, cost_usd, exercises_created, summary, error, created_at, finished_at")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<RunRow[]>(),
  ]);
  if (exercisesRes.error) {
    return (
      <Card>
        <p className="text-sm">{describeDbError(exercisesRes.error)}</p>
      </Card>
    );
  }
  const rows = exercisesRes.data ?? [];
  const active = rows.filter((row) => row.status === "active");
  const runs = runsRes.data ?? [];
  const queued = runs.filter((run) => run.status === "queued" || run.status === "processing").length;
  const generate = (
    <details className="rounded-card border border-border bg-card" open={queued > 0}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-bold text-primary-ink">+ Aus Unterlagen erzeugen (KI)</summary>
      <div className="space-y-4 border-t border-border p-4">
        <AiRunPoller moduleId={moduleId} queued={queued} />
        {runsRes.error ? <p className="text-sm">{describeDbError(runsRes.error)}</p> : null}
        <AiGenerateForm
          moduleId={moduleId}
          documents={(documentsRes.data ?? []).map((d) => ({ id: d.id, filename: d.filename, size: formatSize(d.size_bytes), pdf: isPdf(d) }))}
          enabled={aiConfigured()}
          disabledReason="KI-Erzeugung ist nicht eingerichtet: In Vercel die Variable ANTHROPIC_API_KEY setzen (siehe README), dann neu deployen."
        />
        <AiRunList runs={runs} />
      </div>
    </details>
  );
  return <ExerciseList moduleId={moduleId} moduleCode={moduleCode} filter={filter} group={parseGroupBy(searchParams)} all={active} draftCount={rows.length - active.length} generate={generate} />;
}

/** Progress, grouping, collapsible filters and the exercises as collapsible groups (pure rendering, no data access). */
export function ExerciseList({
  moduleId,
  moduleCode,
  filter,
  group,
  all,
  draftCount = 0,
  generate,
}: {
  moduleId: string;
  moduleCode: string;
  filter: Filter;
  group: GroupBy;
  /** Active exercises only; drafts are counted separately. */
  all: ExerciseListRow[];
  draftCount?: number;
  /** The "generate from documents" section, rendered above the manual entry points. */
  generate?: ReactNode;
}) {
  const shown = filterExercises(all, filter);
  const summary = summarize(all);
  const groups = groupExercises(shown, group);
  const names = shortenSources(all.map((r) => r.source_label));
  const nextOpen = firstOpen(shown);
  const activeFilters = (filter.aid ? 1 : 0) + (filter.show === "open" ? 1 : 0) + (filter.topic ? 1 : 0);
  // few groups: show everything; many groups: open only the first one that still has work to do
  const firstWithWork = groups.find((g) => g.summary.correct < g.summary.total)?.key;

  return (
    <div className="space-y-4">
      {draftCount > 0 ? (
        <Link href={`/m/${moduleId}/ex/drafts`} className="flex items-center justify-between gap-3 rounded-card border-2 border-primary bg-primary-soft p-4 text-on-primary-soft">
          <span className="min-w-0">
            <span className="block font-bold">
              {draftCount} {draftCount === 1 ? "Entwurf" : "Entwürfe"} prüfen
            </span>
            <span className="text-sm">Aus deinen Unterlagen erzeugt, noch nicht übernommen.</span>
          </span>
          <span aria-hidden className="shrink-0 text-xl">
            →
          </span>
        </Link>
      ) : null}
      {all.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Noch keine Übungen für dieses Modul. Lade PDFs im Tab «Dokumente» hoch und lass unten Entwürfe erzeugen, oder lege eine Aufgabe von Hand an.</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="heading">
                {summary.correct} von {summary.total} sitzen
              </p>
              <p className="small tabular-nums text-muted">
                {summary.partial} teilweise · {summary.wrong} nicht ganz · {summary.untried} neu
              </p>
            </div>
            <ProgressBar summary={summary} />
            {nextOpen ? (
              <Link href={`/m/${moduleId}/ex/${nextOpen.id}`} className={buttonClass("primary", "w-full")}>
                Weiter üben
              </Link>
            ) : (
              <p className="font-bold text-success">Alles gelöst in dieser Auswahl.</p>
            )}
          </Card>

          <div className="space-y-2">
            <nav aria-label="Gruppieren" className="grid grid-cols-2 gap-1 rounded-pill border border-border bg-card p-1 text-sm">
              {(
                [
                  ["source", "Nach Test / Blatt"],
                  ["topic", "Nach Thema"],
                ] as const
              ).map(([id, label]) => (
                <Link
                  key={id}
                  href={tabHref(moduleId, filter, id)}
                  aria-current={group === id ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center justify-center rounded-pill font-bold ${group === id ? "bg-primary text-primary-foreground" : "hover:bg-sunken"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <details className="rounded-card border border-border bg-card" open={activeFilters > 0}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4">
                <span className="font-bold">Filter</span>
                <span className="text-sm text-muted">{activeFilters > 0 ? `${activeFilters} aktiv` : "Hilfsmittel, nur offene"}</span>
              </summary>
              <div className="space-y-3 border-t border-border p-4">
                <div>
                  <p className="mb-2 text-sm text-muted">Erlaubte Hilfsmittel</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={tabHref(moduleId, { ...filter, aid: null }, group)} className={pill(filter.aid === null)}>
                      Alle
                    </Link>
                    {AIDS.map((aid) => (
                      <Link key={aid.id} href={tabHref(moduleId, { ...filter, aid: filter.aid === aid.id ? null : aid.id }, group)} className={pill(filter.aid === aid.id)}>
                        {aid.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={tabHref(moduleId, { ...filter, show: filter.show === "open" ? "all" : "open" }, group)} className={pill(filter.show === "open")} aria-current={filter.show === "open" ? "true" : undefined}>
                    Nur offene
                  </Link>
                  {filter.topic ? (
                    <Link href={tabHref(moduleId, { ...filter, topic: null }, group)} className={pill(true)}>
                      Thema: {filter.topic} ×
                    </Link>
                  ) : null}
                  {activeFilters > 0 ? (
                    <Link href={tabHref(moduleId, { topic: null, aid: null, show: "all" }, group)} className="inline-flex min-h-9 items-center px-2 text-sm text-primary-ink">
                      Filter zurücksetzen
                    </Link>
                  ) : null}
                </div>
              </div>
            </details>
          </div>

          {shown.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Keine Aufgaben mit diesem Filter.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <details key={g.key} open={groups.length <= 3 || g.key === firstWithWork} className="overflow-hidden rounded-card border border-border bg-card">
                  <summary className="cursor-pointer list-none px-4 py-4">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="heading">{g.title}</span>
                      <span className="num shrink-0 text-sm text-muted">
                        {g.summary.correct}/{g.summary.total}
                      </span>
                    </span>
                    <ProgressBar summary={g.summary} className="mt-2" />
                  </summary>
                  <ul className="divide-y divide-border border-t border-border">
                    {g.rows.map((row) => {
                      const ref = [group === "topic" ? names.get(row.source_label) : null, row.source_ref].filter(Boolean).join(" · ");
                      return (
                        <li key={row.id}>
                          <Link href={`/m/${moduleId}/ex/${row.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-sunken">
                            <span className="min-w-0 flex-1">
                              {ref ? <span className="block text-sm text-muted">{ref}</span> : null}
                              <span className="line-clamp-2 break-words font-semibold">{row.title}</span>
                              <span className="block text-sm text-muted">{metaLine(row)}</span>
                            </span>
                            <ResultBadge result={latestResult(row)} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {generate}

      <Link href={`/m/${moduleId}/ex/new`} className={buttonClass("secondary", "w-full")}>
        + Aufgabe von Hand anlegen
      </Link>

      <details className="rounded-card border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-bold text-primary-ink">+ Übungsdatei importieren (selten nötig)</summary>
        <div className="border-t border-border p-4">
          <ExerciseImportForm moduleId={moduleId} moduleCode={moduleCode} />
        </div>
      </details>
    </div>
  );
}
