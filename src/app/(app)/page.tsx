import { Settings } from "lucide-react";
import Link from "next/link";
import { AgendaView } from "@/components/agenda";
import { BootstrapForm } from "@/components/forms";
import { ModuleChip } from "@/components/module-chip";
import { QuickAddForm } from "@/components/task-forms";
import { TaskRows, type TaskModule } from "@/components/task-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass, Card, PageTitle } from "@/components/ui";
import { groupWeek, type AgendaLecture } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { Module, Semester } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { assignTones } from "@/lib/module-tone";
import { createClient } from "@/lib/supabase/server";
import { upcomingTasks } from "@/lib/tasks/tasks";
import type { TaskListRow } from "@/lib/tasks/types";
import { isDue } from "@/lib/vocab/srs";
import { addDays, mondayOf, weekNumber, zurichDate, zurichInstant } from "@/lib/week";

const TASKS_SHOWN = 5;

/** Dashboard: today's lectures, what is due, what to practise, and the way into every subject. */
export default async function HomePage() {
  await requireUser();
  const supabase = await createClient();
  const now = new Date();
  const today = zurichDate(now);

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

  const [modulesRes, inboxRes, todayRes, nextRes, tasksRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, code, name, kind")
      .eq("semester_id", semester.id)
      .order("sort_order")
      .returns<Pick<Module, "id" | "code" | "name" | "kind">[]>(),
    supabase.from("lectures").select("id", { count: "exact", head: true }).eq("semester_id", semester.id).is("module_id", null).eq("status", "scheduled"),
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
    supabase
      .from("tasks")
      .select("id, module_id, title, kind, priority, status, due_date, done_at, created_at")
      .neq("status", "done")
      .lte("due_date", addDays(today, 6))
      .order("due_date")
      .limit(200)
      .returns<TaskListRow[]>(),
  ]);

  const modules = modulesRes.data ?? [];
  const tones = assignTones(modules);
  const agendaModules = new Map(modules.map((m) => [m.id, { code: m.code, tone: tones.get(m.id) ?? 0, admin: m.kind === "admin" }]));
  const taskModules = new Map<string, TaskModule>(modules.map((m) => [m.id, { code: m.code, tone: tones.get(m.id) ?? 0 }]));

  // language modules: how many words are due
  const languageModules = modules.filter((m) => m.kind === "language");
  const vocabDue = new Map<string, number>();
  if (languageModules.length > 0) {
    // an error (e.g. vocabulary migration not applied yet) just hides the numbers
    const { data: vocab } = await supabase
      .from("cards")
      .select("module_id, due_at")
      .in(
        "module_id",
        languageModules.map((m) => m.id),
      )
      .eq("kind", "vocab")
      .eq("status", "active")
      .limit(10000);
    for (const c of vocab ?? []) if (isDue({ due_at: c.due_at }, now)) vocabDue.set(c.module_id, (vocabDue.get(c.module_id) ?? 0) + 1);
  }

  const todayDay = groupWeek(mondayOf(today), todayRes.data ?? [], now).filter((d) => d.isToday);
  const nextEvent = nextRes.data?.[0];
  const hasLeftToday = (todayRes.data ?? []).some((l) => l.status === "scheduled" && Date.parse(l.ends_at ?? l.starts_at) > now.getTime());
  const week = weekNumber(semester.start_date, now);
  const inboxCount = inboxRes.count ?? 0;
  const dueTasks = upcomingTasks(tasksRes.data ?? [], today, TASKS_SHOWN);
  const moreTasks = Math.max(0, (tasksRes.data?.length ?? 0) - dueTasks.length);

  return (
    <>
      <PageTitle
        action={
          <span className="flex shrink-0 items-center gap-2">
            <ThemeToggle variant="icon" />
            <Link href="/settings" aria-label="Einstellungen" className={buttonClass("secondary", "size-12 px-0 md:hidden")}>
              <Settings aria-hidden className="size-6" strokeWidth={2} />
            </Link>
          </span>
        }
        title="Dashboard"
        subtitle={week >= 1 ? `${semester.name} · Woche ${String(week).padStart(2, "0")}` : `${semester.name} · beginnt am ${semester.start_date}`}
      />

      <div className="space-y-8">
        <section aria-labelledby="today-h" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="today-h" className="display-md">
              Heute
            </h2>
            <Link href="/stundenplan" className="font-bold text-primary-ink">
              Stundenplan →
            </Link>
          </div>
          <AgendaView days={todayDay} modules={agendaModules} />
          {!hasLeftToday && nextEvent ? (
            <p className="text-muted">
              Nächster Termin: {formatDateTime(nextEvent.starts_at)} · {nextEvent.title}
            </p>
          ) : null}
          {inboxCount > 0 ? (
            <Link href="/settings#inbox" className="block rounded-field bg-primary-soft p-4 text-on-primary-soft">
              {inboxCount} importierte {inboxCount === 1 ? "Termin ist" : "Termine sind"} keinem Modul zugeordnet →
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="tasks-h" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="tasks-h" className="display-md">
              Aufgaben
            </h2>
            <Link href="/aufgaben" className="font-bold text-primary-ink">
              Alle Aufgaben →
            </Link>
          </div>
          {tasksRes.error ? (
            <Card>
              <p className="text-sm">{describeDbError(tasksRes.error)}</p>
            </Card>
          ) : (
            <>
              <TaskRows tasks={dueTasks} modules={taskModules} today={today} emptyText="Diese Woche ist nichts fällig." />
              {moreTasks > 0 ? (
                <p className="text-sm text-muted">
                  <Link href="/aufgaben" className="font-bold text-primary-ink">
                    {moreTasks === 1 ? "1 weitere Aufgabe" : `${moreTasks} weitere Aufgaben`} diese Woche →
                  </Link>
                </p>
              ) : null}
              <QuickAddForm />
            </>
          )}
        </section>

        <section aria-labelledby="practice-h" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="practice-h" className="display-md">
              Üben
            </h2>
            <Link href="/ueben" className="font-bold text-primary-ink">
              Üben →
            </Link>
          </div>
          <Card className="space-y-2">
            {languageModules.map((m) => {
              const due = vocabDue.get(m.id) ?? 0;
              return (
                <p key={m.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="num font-semibold">{due}</span> {due === 1 ? "Wort" : "Wörter"} fällig · {m.name}
                  </span>
                  <Link href={`/m/${m.id}`} className="shrink-0 font-bold text-primary-ink">
                    Lernen →
                  </Link>
                </p>
              );
            })}
            <p className="text-sm text-muted">Übungen pro Fach mit Fortschritt: unter Üben.</p>
          </Card>
        </section>

        <section aria-labelledby="subjects-h" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="subjects-h" className="display-md">
              Fächer
            </h2>
            <Link href="/faecher" className="font-bold text-primary-ink">
              Alle Fächer →
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {modules.map((m) => (
              <li key={m.id}>
                <Link href={`/m/${m.id}`} className="flex min-h-12 items-center gap-3 rounded-pill border border-border bg-card px-4 pr-5 transition-colors hover:bg-sunken">
                  <ModuleChip code={m.code} tone={tones.get(m.id)} />
                  <span className="font-semibold">{m.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
