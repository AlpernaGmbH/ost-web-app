import type { Metadata } from "next";
import Link from "next/link";
import { ModuleChip } from "@/components/module-chip";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { Lecture, Module, Semester } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { assignTones } from "@/lib/module-tone";
import { createClient } from "@/lib/supabase/server";
import { isDue } from "@/lib/vocab/srs";
import { weekNumber } from "@/lib/week";

export const metadata: Metadata = { title: "Fächer" };

/** One card per module of the semester: next lecture (or words due), open tasks. */
export default async function SubjectsPage() {
  await requireUser();
  const supabase = await createClient();
  const now = new Date();

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, name, start_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "name" | "start_date">>();
  if (semesterError) return <Card>{describeDbError(semesterError)}</Card>;
  if (!semester) {
    return (
      <>
        <PageTitle title="Fächer" />
        <Card>
          <p className="text-sm text-muted">
            Noch kein Semester:{" "}
            <Link href="/" className="font-bold text-primary-ink">
              auf dem Dashboard einrichten
            </Link>
            .
          </p>
        </Card>
      </>
    );
  }

  const [modulesRes, upcomingRes, tasksRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, code, name, ects, kind")
      .eq("semester_id", semester.id)
      .order("sort_order")
      .returns<Pick<Module, "id" | "code" | "name" | "ects" | "kind">[]>(),
    supabase
      .from("lectures")
      .select("id, module_id, title, starts_at")
      .eq("semester_id", semester.id)
      .eq("status", "scheduled")
      .not("module_id", "is", null)
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(200)
      .returns<Pick<Lecture, "id" | "module_id" | "title" | "starts_at">[]>(),
    // an error here (migration 007 not applied yet) only hides the task counts
    supabase.from("tasks").select("module_id").neq("status", "done").not("module_id", "is", null).limit(2000),
  ]);

  const modules = modulesRes.data ?? [];
  const nextByModule = new Map<string, Pick<Lecture, "id" | "title" | "starts_at">>();
  for (const l of upcomingRes.data ?? []) {
    if (l.module_id && !nextByModule.has(l.module_id)) nextByModule.set(l.module_id, l);
  }
  const openTasks = new Map<string, number>();
  for (const t of tasksRes.data ?? []) openTasks.set(t.module_id as string, (openTasks.get(t.module_id as string) ?? 0) + 1);

  // language modules show how many words are due instead of the next lecture
  const languageIds = modules.filter((m) => m.kind === "language").map((m) => m.id);
  const vocabStats = new Map<string, { total: number; due: number }>();
  if (languageIds.length > 0) {
    const { data: vocab } = await supabase.from("cards").select("module_id, due_at").in("module_id", languageIds).eq("kind", "vocab").eq("status", "active").limit(10000);
    for (const c of vocab ?? []) {
      const entry = vocabStats.get(c.module_id) ?? { total: 0, due: 0 };
      entry.total++;
      if (isDue({ due_at: c.due_at }, now)) entry.due++;
      vocabStats.set(c.module_id, entry);
    }
  }
  const tones = assignTones(modules);
  const week = weekNumber(semester.start_date, now);

  return (
    <>
      <PageTitle title="Fächer" subtitle={week >= 1 ? `${semester.name} · Woche ${String(week).padStart(2, "0")}` : `${semester.name} · beginnt am ${semester.start_date}`} />
      <ul className="space-y-4">
        {modules.map((m) => {
          const next = nextByModule.get(m.id);
          const vocab = vocabStats.get(m.id);
          const open = openTasks.get(m.id) ?? 0;
          return (
            <li key={m.id}>
              <Link href={`/m/${m.id}`} className="block rounded-card border border-border bg-card p-6 transition-colors duration-150 hover:bg-sunken">
                <span className="flex items-start justify-between gap-3">
                  <span className="heading min-w-0">{m.name}</span>
                  <ModuleChip code={m.code} tone={tones.get(m.id)} />
                </span>
                <span className="mt-2 block text-muted">
                  {m.ects > 0 ? `${m.ects} ECTS · ` : ""}
                  {vocab && vocab.total > 0
                    ? `${vocab.due} von ${vocab.total} Wörtern zu üben`
                    : next
                      ? `${m.kind === "admin" ? "Nächster Termin" : "Nächste Vorlesung"}: ${formatDateTime(next.starts_at)}`
                      : m.kind === "admin"
                        ? "Kein kommender Termin"
                        : "Keine kommende Vorlesung"}
                  {open > 0 ? ` · ${open === 1 ? "1 offene Aufgabe" : `${open} offene Aufgaben`}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
