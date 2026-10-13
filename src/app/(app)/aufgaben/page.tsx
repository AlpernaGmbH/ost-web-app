import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { MonthGrid } from "@/components/month-grid";
import { QuickAddForm } from "@/components/task-forms";
import { TaskBoard, TaskRows, type TaskModule } from "@/components/task-list";
import { buttonClass, Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { buildMonth, isMonth, monthLabel, shiftMonth } from "@/lib/calendar";
import { describeDbError } from "@/lib/db/errors";
import type { Module, Semester } from "@/lib/db/types";
import { assignTones } from "@/lib/module-tone";
import { createClient } from "@/lib/supabase/server";
import { boardColumns, byDueDate, formatDue, sortTasks, summarizeTasks, visibleTasks } from "@/lib/tasks/tasks";
import type { TaskListRow } from "@/lib/tasks/types";
import { zurichDate } from "@/lib/week";

export const metadata: Metadata = { title: "Aufgaben" };

const VIEWS = [
  { id: "list", label: "Liste" },
  { id: "board", label: "Board" },
  { id: "calendar", label: "Kalender" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const viewParam = z.enum(["list", "board", "calendar"]);
const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00Z`)));

/** Link into the task pages; keeps only the parameters the target view understands. */
function href(view: View, params: { done?: boolean; module?: string | null; month?: string; day?: string } = {}): string {
  const query = new URLSearchParams();
  if (view !== "list") query.set("view", view);
  if (params.done) query.set("done", "1");
  if (params.module) query.set("f", params.module);
  if (view === "calendar") {
    if (params.month) query.set("m", params.month);
    if (params.day) query.set("d", params.day);
  }
  const qs = query.toString();
  return qs ? `/aufgaben?${qs}` : "/aufgaben";
}

const navLink = "inline-flex min-h-12 items-center rounded-pill border-2 border-control bg-card px-5 font-bold text-primary-ink hover:bg-primary-soft hover:text-on-primary-soft";

export default async function TasksPage({ searchParams }: PageProps<"/aufgaben">) {
  await requireUser();
  const now = new Date();
  const today = zurichDate(now);
  const params = await searchParams;
  const view: View = viewParam.catch("list").parse(params.view);
  const showDone = params.done === "1";
  const requestedModule = z.string().uuid().safeParse(params.f);
  const month = typeof params.m === "string" && isMonth(params.m) ? params.m : today.slice(0, 7);
  const requestedDay = dateParam.safeParse(params.d);
  const pickedDay = requestedDay.success && requestedDay.data.startsWith(month) ? requestedDay.data : today.startsWith(month) ? today : `${month}-01`;

  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, start_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "start_date">>();
  const [tasksRes, modulesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, module_id, title, kind, priority, status, due_date, done_at, created_at")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(2000)
      .returns<TaskListRow[]>(),
    semester
      ? supabase.from("modules").select("id, code, name, kind").eq("semester_id", semester.id).order("sort_order").returns<Pick<Module, "id" | "code" | "name" | "kind">[]>()
      : Promise.resolve({ data: [] as Pick<Module, "id" | "code" | "name" | "kind">[], error: null }),
  ]);
  if (tasksRes.error) {
    return (
      <>
        <PageTitle title="Aufgaben" />
        <Card>
          <p className="text-sm">{describeDbError(tasksRes.error)}</p>
        </Card>
      </>
    );
  }
  const moduleList = modulesRes.data ?? [];
  const tones = assignTones(moduleList);
  const modules = new Map<string, TaskModule>(moduleList.map((m) => [m.id, { code: m.code, tone: tones.get(m.id) ?? 0 }]));
  // subject filter: only a module of this semester counts, anything else means "all"
  const filterModule = requestedModule.success && modules.has(requestedModule.data) ? requestedModule.data : null;
  const tasks = filterModule ? (tasksRes.data ?? []).filter((t) => t.module_id === filterModule) : (tasksRes.data ?? []);
  const summary = summarizeTasks(tasks, today);
  const link = (target: View, extra: { done?: boolean; module?: string | null; month?: string; day?: string } = {}) =>
    href(target, { done: showDone, module: filterModule, month, day: pickedDay, ...extra });
  const subtitle = [
    `${summary.open} offen`,
    summary.overdue > 0 ? `${summary.overdue} überfällig` : null,
    summary.today > 0 ? `${summary.today} heute` : null,
    `${summary.done} erledigt`,
  ]
    .filter(Boolean)
    .join(" · ");
  const newQuery = new URLSearchParams();
  if (view === "calendar") newQuery.set("d", pickedDay);
  if (filterModule) newQuery.set("m", filterModule);
  const newHref = newQuery.size > 0 ? `/aufgaben/neu?${newQuery}` : "/aufgaben/neu";

  return (
    <>
      <PageTitle
        title="Aufgaben"
        subtitle={subtitle}
        action={
          <Link href={newHref} className={buttonClass("primary", "shrink-0")}>
            <Plus aria-hidden className="size-5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Neue Aufgabe</span>
            <span className="sr-only sm:hidden">Neue Aufgabe</span>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav aria-label="Ansicht" className="grid flex-1 grid-cols-3 gap-1 rounded-pill border border-border bg-card p-1 text-sm sm:max-w-xs">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={link(v.id)}
              aria-current={v.id === view ? "page" : undefined}
              className={`inline-flex min-h-10 items-center justify-center rounded-pill font-bold ${v.id === view ? "bg-primary text-primary-foreground" : "hover:bg-sunken"}`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        <Link
          href={link(view, { done: !showDone })}
          aria-pressed={showDone}
          className={`inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-bold ${showDone ? "bg-primary-soft text-on-primary-soft" : "text-primary-ink hover:bg-sunken"}`}
        >
          {showDone ? "Erledigte ausblenden" : "Erledigte anzeigen"}
        </Link>
      </div>

      {moduleList.length > 0 ? (
        <nav aria-label="Nach Fach filtern" className="mb-4 flex flex-wrap gap-2">
          <Link href={link(view, { module: null })} aria-current={filterModule ? undefined : "true"} className={filterChip(!filterModule)}>
            Alle Fächer
          </Link>
          {moduleList.map((m) => (
            <Link key={m.id} href={link(view, { module: m.id })} aria-current={filterModule === m.id ? "true" : undefined} title={m.name} className={filterChip(filterModule === m.id)}>
              {m.code}
            </Link>
          ))}
        </nav>
      ) : null}

      {view === "list" ? (
        <div className="space-y-4">
          <TaskRows
            tasks={sortTasks(visibleTasks(tasks, showDone))}
            modules={modules}
            today={today}
            emptyText={tasks.length === 0 ? (filterModule ? "Keine Aufgaben für dieses Fach. Unten eine eintragen." : "Noch keine Aufgaben. Unten die erste eintragen.") : "Alles erledigt."}
          />
          <QuickAddForm moduleId={filterModule} />
        </div>
      ) : null}

      {view === "board" ? (
        <div className="space-y-4">
          <TaskBoard columns={boardColumns(tasks, today, showDone)} modules={modules} today={today} />
          <QuickAddForm moduleId={filterModule} />
        </div>
      ) : null}

      {view === "calendar" ? (
        <CalendarView
          tasks={tasks}
          modules={modules}
          month={month}
          selected={pickedDay}
          today={today}
          showDone={showDone}
          filterModule={filterModule}
          semesterStart={semester?.start_date ?? null}
        />
      ) : null}
    </>
  );
}

const filterChip = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-pill border px-3 text-sm font-bold ${active ? "border-primary bg-primary-soft text-on-primary-soft" : "border-border bg-card text-foreground hover:bg-sunken"}`;

/** Month grid with a dot per due task; the picked day's tasks and a quick entry for that day underneath. */
function CalendarView({
  tasks,
  modules,
  month,
  selected,
  today,
  showDone,
  filterModule,
  semesterStart,
}: {
  tasks: TaskListRow[];
  modules: Map<string, TaskModule>;
  month: string;
  selected: string;
  today: string;
  showDone: boolean;
  filterModule: string | null;
  semesterStart: string | null;
}) {
  const dated = byDueDate(visibleTasks(tasks, showDone));
  const weeks = buildMonth(month, dated, today, semesterStart);
  const dayTasks = dated.get(selected) ?? [];
  const undated = tasks.filter((t) => t.status !== "done" && !t.due_date).length;
  const dayLabel = formatDue(selected, today);
  const to = (params: { month?: string; day?: string }) => href("calendar", { done: showDone, module: filterModule, ...params });
  return (
    <div className="space-y-4">
      <nav aria-label="Monat wechseln" className="flex items-center justify-between gap-2 text-sm">
        <Link href={to({ month: shiftMonth(month, -1) })} className={navLink}>
          ← Vormonat
        </Link>
        <span className="font-bold">{monthLabel(month)}</span>
        <Link href={to({ month: shiftMonth(month, 1) })} className={navLink}>
          Nächster →
        </Link>
      </nav>
      {month !== today.slice(0, 7) ? (
        <Link href={to({ month: today.slice(0, 7), day: today })} className="inline-flex min-h-10 items-center font-bold text-primary-ink">
          Zu heute
        </Link>
      ) : null}
      <MonthGrid
        weeks={weeks}
        selected={selected}
        mark={(task) => ({ id: task.id, tone: task.module_id ? modules.get(task.module_id)?.tone : undefined, muted: task.status === "done" })}
        countLabel={(count) => (count === 0 ? "keine Aufgaben" : count === 1 ? "1 Aufgabe" : `${count} Aufgaben`)}
        hrefFor={(date) => to({ month: date.slice(0, 7), day: date })}
      />
      <section aria-labelledby="day-h" className="space-y-3">
        <h2 id="day-h" className="heading">
          {dayLabel}
        </h2>
        <TaskRows tasks={dayTasks} modules={modules} today={today} emptyText="Keine Aufgaben an diesem Tag." />
        <QuickAddForm due={selected} moduleId={filterModule} placeholder={`Aufgabe für ${dayLabel} hinzufügen …`} />
      </section>
      {undated > 0 ? (
        <p className="text-sm text-muted">
          {undated === 1 ? "1 offene Aufgabe hat" : `${undated} offene Aufgaben haben`} kein Datum:{" "}
          <Link href={href("list", { done: showDone, module: filterModule })} className="font-bold text-primary-ink">
            in der Liste
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
