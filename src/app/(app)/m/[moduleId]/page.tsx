import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";
import { ConfirmButton } from "@/components/confirm-button";
import { DeckForm, ImportUnitsForm, LectureForm } from "@/components/forms";
import { StudyForm } from "@/components/study-form";
import { Card, PageTitle } from "@/components/ui";
import { UploadButton } from "@/components/upload-button";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { DocumentRow, Lecture, Module, Semester } from "@/lib/db/types";
import { formatDay, formatSize, formatTime } from "@/lib/format";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { canUseChoice } from "@/lib/vocab/queue";
import { isDue } from "@/lib/vocab/srs";
import { formatWeek, shortDate, weekNumber, weekRange, zurichDate } from "@/lib/week";

type LectureRow = Pick<Lecture, "id" | "title" | "starts_at" | "ends_at" | "location" | "status">;

export default async function ModulePage({ params, searchParams }: PageProps<"/m/[moduleId]">) {
  const user = await requireUser();
  const moduleId = parseUuidOrNotFound((await params).moduleId);
  const requestedTab = (await searchParams).tab;

  const supabase = await createClient();
  const { data: module } = await supabase
    .from("modules")
    .select("id, code, name, ects, kind, color, semester_id")
    .eq("id", moduleId)
    .maybeSingle<Pick<Module, "id" | "code" | "name" | "ects" | "kind" | "color" | "semester_id">>();
  if (!module) notFound();

  const { data: semester } = await supabase
    .from("semesters")
    .select("start_date")
    .eq("id", module.semester_id)
    .single<Pick<Semester, "start_date">>();
  if (!semester) notFound();

  const now = new Date();
  const currentWeek = weekNumber(semester.start_date, now);

  // language modules get a vocabulary tab and open on it
  const isLanguage = module.kind === "language";
  const tabs = [
    ...(isLanguage ? [{ id: "vokabeln", label: "Vokabeln", href: `/m/${module.id}` }] : []),
    { id: "vorlesungen", label: "Vorlesungen", href: isLanguage ? `/m/${module.id}?tab=vorlesungen` : `/m/${module.id}` },
    { id: "dokumente", label: "Dokumente", href: `/m/${module.id}?tab=dokumente` },
  ];
  const defaultTab = isLanguage ? "vokabeln" : "vorlesungen";
  const tab = tabs.some((t) => t.id === requestedTab) ? (requestedTab as string) : defaultTab;

  return (
    <>
      <Link href="/" className="mb-3 inline-block text-sm text-muted">
        ← Module
      </Link>
      <PageTitle title={module.name} subtitle={`${module.code}${module.ects > 0 ? ` · ${module.ects} ECTS` : ""}`} />

      <div role="tablist" className={`mb-5 grid ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"} rounded-lg border border-border bg-card p-1 text-sm`}>
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            role="tab"
            aria-selected={tab === t.id}
            className={`flex min-h-10 items-center justify-center rounded-md ${tab === t.id ? "bg-primary text-primary-foreground" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "vokabeln" ? (
        <VocabTab moduleId={module.id} />
      ) : tab === "vorlesungen" ? (
        <Lectures moduleId={module.id} startDate={semester.start_date} currentWeek={currentWeek} today={zurichDate(now)} />
      ) : (
        <Documents moduleId={module.id} userId={user.id} />
      )}
    </>
  );
}

async function Lectures({
  moduleId,
  startDate,
  currentWeek,
  today,
}: {
  moduleId: string;
  startDate: string;
  currentWeek: number;
  today: string;
}) {
  const supabase = await createClient();
  const [lecturesRes, notesRes] = await Promise.all([
    supabase
      .from("lectures")
      .select("id, title, starts_at, ends_at, location, status")
      .eq("module_id", moduleId)
      .order("starts_at")
      .returns<LectureRow[]>(),
    supabase.from("notes").select("lecture_id, lectures!inner(module_id)").eq("lectures.module_id", moduleId).neq("content_md", ""),
  ]);

  const withNote = new Set((notesRes.data ?? []).map((n) => n.lecture_id as string));
  const byWeek = new Map<number, LectureRow[]>();
  for (const l of lecturesRes.data ?? []) {
    const week = weekNumber(startDate, new Date(l.starts_at));
    byWeek.set(week, [...(byWeek.get(week) ?? []), l]);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {weeks.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Noch keine Vorlesungen. Der Stundenplan-Import (Einstellungen) legt sie an, oder unten manuell hinzufügen.
          </p>
        </Card>
      ) : null}

      {weeks.map((week) => {
        const range = weekRange(startDate, week);
        return (
          <details key={week} open={week >= currentWeek} className="group rounded-xl border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
              <span>
                {formatWeek(week)}{" "}
                <span className="font-normal text-muted">
                  {shortDate(range.monday)}–{shortDate(range.sunday)}
                </span>
              </span>
              {week === currentWeek ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">aktuell</span> : null}
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {byWeek.get(week)!.map((l) => (
                <li key={l.id}>
                  <Link href={`/m/${moduleId}/l/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-border/30">
                    <span className="w-24 shrink-0 text-sm">
                      <span className="block font-medium">{formatDay(l.starts_at)}</span>
                      <span className="text-muted">
                        {formatTime(l.starts_at)}
                        {l.ends_at ? `–${formatTime(l.ends_at)}` : ""}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${l.status === "cancelled" ? "text-muted line-through" : ""}`}>{l.title}</span>
                      {l.location ? <span className="block truncate text-xs text-muted">{l.location}</span> : null}
                    </span>
                    {l.status === "cancelled" ? (
                      <span className="shrink-0 text-xs text-danger">abgesagt</span>
                    ) : withNote.has(l.id) ? (
                      <span className="shrink-0 text-xs text-success">Notiz ✓</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}

      <details className="rounded-xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Vorlesung manuell anlegen</summary>
        <div className="border-t border-border p-4">
          <LectureForm moduleId={moduleId} today={today} />
        </div>
      </details>
    </div>
  );
}

async function Documents({ moduleId, userId }: { moduleId: string; userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, lecture_id, filename, size_bytes, created_at")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false })
    .returns<Pick<DocumentRow, "id" | "lecture_id" | "filename" | "size_bytes" | "created_at">[]>();
  const documents = data ?? [];

  return (
    <div className="space-y-4">
      <UploadButton moduleId={moduleId} userId={userId} />
      {documents.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Noch keine Dokumente. Folien, Skripte und Übungen lassen sich hier ablegen (max. 50 MB pro Datei).</p>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <a href={`/d/${d.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{d.filename}</span>
                <span className="text-xs text-muted">
                  {formatSize(d.size_bytes)} · {formatDay(d.created_at)}
                  {d.lecture_id ? " · an Vorlesung angehängt" : ""}
                </span>
              </a>
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={d.id} />
                <ConfirmButton
                  type="submit"
                  variant="danger"
                  className="min-h-9 px-3"
                  confirmText={`„${d.filename}" wirklich löschen?`}
                  aria-label={`${d.filename} löschen`}
                >
                  Löschen
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function VocabTab({ moduleId }: { moduleId: string }) {
  const supabase = await createClient();
  const [decksRes, cardsRes] = await Promise.all([
    supabase.from("decks").select("id, name").eq("module_id", moduleId).order("created_at"),
    supabase.from("cards").select("deck_id, back_md, due_at, status").eq("module_id", moduleId).eq("kind", "vocab").limit(10000),
  ]);

  const error = decksRes.error ?? cardsRes.error;
  if (error) {
    return (
      <Card>
        <p className="text-sm">{describeDbError(error)}</p>
      </Card>
    );
  }

  const now = new Date();
  const stats = new Map<string, { total: number; due: number }>();
  const active = (cardsRes.data ?? []).filter((c) => c.status === "active");
  for (const c of active) {
    if (!c.deck_id) continue;
    const entry = stats.get(c.deck_id) ?? { total: 0, due: 0 };
    entry.total++;
    if (isDue({ due_at: c.due_at }, now)) entry.due++;
    stats.set(c.deck_id, entry);
  }
  const decks = decksRes.data ?? [];
  const totalWords = active.length;
  const totalDue = active.filter((c) => isDue({ due_at: c.due_at }, now)).length;

  return (
    <div className="space-y-4">
      {decks.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Noch keine Wortliste. Importiere unten alle Units auf einmal oder lege eine leere Liste an.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => {
            const s = stats.get(deck.id) ?? { total: 0, due: 0 };
            return (
              <li key={deck.id}>
                <Link
                  href={`/m/${moduleId}/vocab/${deck.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-border/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{deck.name}</span>
                    <span className="text-sm text-muted">{s.total} Wörter</span>
                  </span>
                  {s.due > 0 ? (
                    <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">{s.due} fällig</span>
                  ) : (
                    <span className="shrink-0 text-sm text-muted">{s.total > 0 ? "alles erledigt" : "leer"}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalWords > 0 ? (
        <section aria-labelledby="all-words" className="space-y-3 pt-2">
          <h2 id="all-words" className="font-semibold">
            Alle Listen zusammen lernen
          </h2>
          <p className="text-sm text-muted">
            {totalWords} Wörter in {decks.length} Listen · {totalDue} fällig oder neu
          </p>
          <StudyForm
            action={`/m/${moduleId}/vocab/all/study`}
            choiceOk={canUseChoice(active.map((c) => ({ back_md: String(c.back_md) })))}
            defaultScope={totalDue > 0 ? "due" : "all"}
          />
        </section>
      ) : null}

      <details className="rounded-xl border border-border bg-card" open={decks.length === 0}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Mehrere Listen auf einmal importieren</summary>
        <div className="border-t border-border p-4">
          <ImportUnitsForm moduleId={moduleId} />
        </div>
      </details>

      <details className="rounded-xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Neue leere Wortliste</summary>
        <div className="border-t border-border p-4">
          <DeckForm moduleId={moduleId} />
        </div>
      </details>
    </div>
  );
}
