import Link from "next/link";
import { AgendaView } from "@/components/agenda";
import { BootstrapForm } from "@/components/forms";
import { Card, PageTitle } from "@/components/ui";
import { groupWeek, type AgendaLecture } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { Lecture, Module, Semester } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { isDue } from "@/lib/vocab/srs";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf, weekNumber, zurichDate, zurichInstant } from "@/lib/week";

export default async function HomePage() {
  await requireUser();
  const supabase = await createClient();
  const now = new Date();

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, name, start_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "name" | "start_date">>();

  if (semesterError) {
    return (
      <>
        <PageTitle title="Datenbank nicht bereit" />
        <Card className="space-y-2">
          <p className="text-sm">{describeDbError(semesterError)}</p>
        </Card>
      </>
    );
  }

  if (!semester) {
    return (
      <>
        <PageTitle title="Willkommen" subtitle="Noch kein Semester eingerichtet." />
        <Card className="space-y-3">
          <p className="text-sm">
            Legt das Semester HS26 (W01 = 14.09.2026) mit WMS, SYS, VHR und Englisch an. Namen, ECTS und
            Stundenplan-Zuordnung lassen sich danach in den Einstellungen ändern.
          </p>
          <BootstrapForm />
        </Card>
      </>
    );
  }

  const today = zurichDate(now);
  const [modulesRes, upcomingRes, inboxRes, todayRes, nextRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, code, name, ects, kind, color")
      .eq("semester_id", semester.id)
      .order("sort_order")
      .returns<Pick<Module, "id" | "code" | "name" | "ects" | "kind" | "color">[]>(),
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
    supabase
      .from("lectures")
      .select("id", { count: "exact", head: true })
      .eq("semester_id", semester.id)
      .is("module_id", null)
      .eq("status", "scheduled"),
    supabase
      .from("lectures")
      .select("id, module_id, title, starts_at, ends_at, location, status")
      .eq("semester_id", semester.id)
      .gte("starts_at", zurichInstant(today, "00:00").toISOString())
      .lt("starts_at", zurichInstant(addDays(today, 1), "00:00").toISOString())
      .order("starts_at")
      .returns<AgendaLecture[]>(),
    supabase
      .from("lectures")
      .select("id, title, starts_at")
      .eq("semester_id", semester.id)
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(1)
      .returns<{ id: string; title: string; starts_at: string }[]>(),
  ]);

  const modules = modulesRes.data ?? [];
  const nextByModule = new Map<string, Pick<Lecture, "id" | "title" | "starts_at">>();
  for (const l of upcomingRes.data ?? []) {
    if (l.module_id && !nextByModule.has(l.module_id)) nextByModule.set(l.module_id, l);
  }
  // language modules show how many words are due instead of the next lecture
  const languageIds = modules.filter((m) => m.kind === "language").map((m) => m.id);
  const vocabStats = new Map<string, { total: number; due: number }>();
  if (languageIds.length > 0) {
    // an error (e.g. vocabulary migration not applied yet) just hides the numbers
    const { data: vocab } = await supabase
      .from("cards")
      .select("module_id, due_at")
      .in("module_id", languageIds)
      .eq("kind", "vocab")
      .eq("status", "active")
      .limit(10000);
    for (const c of vocab ?? []) {
      const entry = vocabStats.get(c.module_id) ?? { total: 0, due: 0 };
      entry.total++;
      if (isDue({ due_at: c.due_at }, now)) entry.due++;
      vocabStats.set(c.module_id, entry);
    }
  }
  const todayDay = groupWeek(mondayOf(today), todayRes.data ?? [], now).filter((d) => d.isToday);
  const agendaModules = new Map(modules.map((m) => [m.id, { code: m.code, color: m.color }]));
  const nextEvent = nextRes.data?.[0];
  const hasLeftToday = (todayRes.data ?? []).some((l) => l.status === "scheduled" && Date.parse(l.ends_at ?? l.starts_at) > now.getTime());
  const week = weekNumber(semester.start_date, now);
  const inboxCount = inboxRes.count ?? 0;

  return (
    <>
      <PageTitle
        title="Module"
        subtitle={week >= 1 ? `${semester.name} · Woche ${String(week).padStart(2, "0")}` : `${semester.name} · beginnt am ${semester.start_date}`}
      />

      <section aria-labelledby="today-h" className="mb-5 space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 id="today-h" className="font-semibold">
            Heute
          </h2>
          <Link href="/stundenplan" className="text-sm text-primary">
            Stundenplan →
          </Link>
        </div>
        <AgendaView days={todayDay} modules={agendaModules} />
        {!hasLeftToday && nextEvent ? (
          <p className="text-sm text-muted">
            Nächster Termin: {formatDateTime(nextEvent.starts_at)} · {nextEvent.title}
          </p>
        ) : null}
      </section>

      {inboxCount > 0 ? (
        <Link href="/settings#inbox" className="mb-4 block rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          {inboxCount} importierte {inboxCount === 1 ? "Termin ist" : "Termine sind"} keinem Modul zugeordnet →
        </Link>
      ) : null}

      <ul className="space-y-3">
        {modules.map((m) => {
          const next = nextByModule.get(m.id);
          const vocab = vocabStats.get(m.id);
          return (
            <li key={m.id}>
              <Link
                href={`/m/${m.id}`}
                className="flex overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-border/30"
              >
                <span aria-hidden className="w-1.5 shrink-0" style={{ backgroundColor: m.color }} />
                <span className="min-w-0 flex-1 p-4">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{m.name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {m.code}
                      {m.ects > 0 ? ` · ${m.ects} ECTS` : ""}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {vocab && vocab.total > 0
                      ? `${vocab.due} von ${vocab.total} Wörtern zu üben`
                      : next
                        ? `${m.kind === "admin" ? "Nächster Termin" : "Nächste Vorlesung"}: ${formatDateTime(next.starts_at)}`
                        : m.kind === "admin"
                          ? "Kein kommender Termin"
                          : "Keine kommende Vorlesung"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
