import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { AgendaView, type AgendaModule } from "@/components/agenda";
import { MonthGrid } from "@/components/month-grid";
import { Card, PageTitle } from "@/components/ui";
import { WeekGrid } from "@/components/week-grid";
import { requireUser } from "@/lib/auth";
import { groupByDate, groupWeek, weekBounds, type AgendaLecture } from "@/lib/agenda";
import { buildMonth, isMonth, monthBounds, monthLabel, shiftMonth } from "@/lib/calendar";
import { describeDbError } from "@/lib/db/errors";
import type { Module, Semester } from "@/lib/db/types";
import { formatDay } from "@/lib/format";
import { assignTones } from "@/lib/module-tone";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatWeek, mondayOf, shortDate, weekNumber, zurichDate, zurichInstant } from "@/lib/week";

export const metadata: Metadata = { title: "Stundenplan" };

const VIEWS = [
  { id: "list", label: "Liste" },
  { id: "week", label: "Woche" },
  { id: "month", label: "Monat" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00Z`)));
const viewParam = z.enum(["list", "week", "month"]);

/** Link into the timetable; keeps only the parameters the target view understands. */
function href(view: View, params: { date?: string; month?: string; day?: string } = {}): string {
  const query = new URLSearchParams();
  if (view !== "list") query.set("view", view);
  if (view === "month") {
    if (params.month) query.set("m", params.month);
    if (params.day) query.set("d", params.day);
  } else if (params.date) {
    query.set("w", params.date);
  }
  const qs = query.toString();
  return qs ? `/stundenplan?${qs}` : "/stundenplan";
}

const navLink = "inline-flex min-h-12 items-center rounded-pill border-2 border-control bg-card px-5 font-bold text-primary-ink hover:bg-primary-soft hover:text-on-primary-soft";

export default async function TimetablePage({ searchParams }: PageProps<"/stundenplan">) {
  await requireUser();
  const now = new Date();
  const today = zurichDate(now);
  const currentMonday = mondayOf(today);
  const params = await searchParams;
  const view: View = viewParam.catch("list").parse(params.view);
  const requestedWeek = dateParam.safeParse(params.w);
  const monday = requestedWeek.success ? mondayOf(requestedWeek.data) : currentMonday;
  const month = typeof params.m === "string" && isMonth(params.m) ? params.m : today.slice(0, 7);
  const requestedDay = dateParam.safeParse(params.d);

  // the day a switch to another view should keep in sight
  const pickedDay = requestedDay.success && requestedDay.data.startsWith(month) ? requestedDay.data : today.startsWith(month) ? today : `${month}-01`;
  const anchor = view === "month" ? pickedDay : monday === currentMonday ? today : addDays(monday, 3);

  const supabase = await createClient();
  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, start_date, ical_url")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "start_date" | "ical_url">>();
  if (semesterError) return <Card>{describeDbError(semesterError)}</Card>;
  if (!semester) {
    return (
      <>
        <PageTitle title="Stundenplan" />
        <Card>
          <p className="text-sm text-muted">Zuerst auf der Startseite das Semester einrichten.</p>
        </Card>
      </>
    );
  }

  const range =
    view === "month"
      ? { from: zurichInstant(monthBounds(month).from, "00:00"), to: zurichInstant(monthBounds(month).to, "00:00") }
      : weekBounds(monday);
  const [lecturesRes, modulesRes] = await Promise.all([
    supabase
      .from("lectures")
      .select("id, module_id, title, starts_at, ends_at, location, status")
      .eq("semester_id", semester.id)
      .gte("starts_at", range.from.toISOString())
      .lt("starts_at", range.to.toISOString())
      .order("starts_at")
      .returns<AgendaLecture[]>(),
    supabase.from("modules").select("id, code, kind").eq("semester_id", semester.id).order("sort_order").returns<Pick<Module, "id" | "code" | "kind">[]>(),
  ]);
  const error = lecturesRes.error ?? modulesRes.error;
  if (error) return <Card>{describeDbError(error)}</Card>;

  const tones = assignTones(modulesRes.data ?? []);
  const modules = new Map<string, AgendaModule>((modulesRes.data ?? []).map((m) => [m.id, { code: m.code, tone: tones.get(m.id) ?? 0, admin: m.kind === "admin" }]));
  const lectures = lecturesRes.data ?? [];

  const week = weekNumber(semester.start_date, zurichInstant(monday, "12:00"));
  const subtitle =
    view === "month"
      ? monthLabel(month)
      : `${week >= 1 ? formatWeek(week) : "Vor Semesterbeginn"} · ${shortDate(monday)}–${shortDate(addDays(monday, 6))}`;

  return (
    <>
      <PageTitle title="Stundenplan" subtitle={subtitle} />

      <nav aria-label="Ansicht" className="mb-3 grid grid-cols-3 gap-1 rounded-pill border border-border bg-card p-1 text-sm">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={v.id === "month" ? href("month", { month: anchor.slice(0, 7), day: anchor }) : href(v.id, { date: anchor })}
            aria-current={v.id === view ? "page" : undefined}
            className={`inline-flex min-h-10 items-center justify-center rounded-pill font-bold ${v.id === view ? "bg-primary text-primary-foreground" : "hover:bg-sunken"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {view === "month" ? (
        <nav aria-label="Monat wechseln" className="mb-4 flex items-center justify-between gap-2 text-sm">
          <Link href={href("month", { month: shiftMonth(month, -1) })} className={navLink}>
            ← Vormonat
          </Link>
          {month !== today.slice(0, 7) ? (
            <Link href={href("month", { month: today.slice(0, 7), day: today })} className="inline-flex min-h-12 items-center rounded-pill px-4 font-bold text-primary-ink hover:bg-primary-soft">
              Dieser Monat
            </Link>
          ) : null}
          <Link href={href("month", { month: shiftMonth(month, 1) })} className={navLink}>
            Nächster →
          </Link>
        </nav>
      ) : (
        <nav aria-label="Woche wechseln" className="mb-4 flex items-center justify-between gap-2 text-sm">
          <Link href={href(view, { date: addDays(monday, -7) })} className={navLink}>
            ← Vorwoche
          </Link>
          {monday !== currentMonday ? (
            <Link href={href(view)} className="inline-flex min-h-12 items-center rounded-pill px-4 font-bold text-primary-ink hover:bg-primary-soft">
              Diese Woche
            </Link>
          ) : null}
          <Link href={href(view, { date: addDays(monday, 7) })} className={navLink}>
            Nächste →
          </Link>
        </nav>
      )}

      {!semester.ical_url ? (
        <Link href="/settings" className="mb-4 block rounded-field bg-primary-soft p-4 text-on-primary-soft">
          Noch kein Stundenplan verbunden: iCal-Link in den Einstellungen eintragen →
        </Link>
      ) : null}

      {view === "list" ? <AgendaView days={groupWeek(monday, lectures, now)} modules={modules} /> : null}
      {view === "week" ? <WeekGrid days={groupWeek(monday, lectures, now)} modules={modules} now={now} /> : null}
      {view === "month" ? (
        <MonthView month={month} selected={pickedDay} lectures={lectures} modules={modules} semesterStart={semester.start_date} now={now} />
      ) : null}
    </>
  );
}

/** Month grid with the events of the picked day listed underneath. */
function MonthView({
  month,
  selected,
  lectures,
  modules,
  semesterStart,
  now,
}: {
  month: string;
  selected: string;
  lectures: AgendaLecture[];
  modules: Map<string, AgendaModule>;
  semesterStart: string;
  now: Date;
}) {
  const today = zurichDate(now);
  const byDate = groupByDate(lectures, now);
  const weeks = buildMonth(month, byDate, today, semesterStart);
  const day = {
    date: selected,
    label: formatDay(zurichInstant(selected, "12:00").toISOString()),
    isToday: selected === today,
    items: byDate.get(selected) ?? [],
  };
  return (
    <div className="space-y-4">
      <MonthGrid weeks={weeks} selected={selected} modules={modules} hrefFor={(date) => href("month", { month: date.slice(0, 7), day: date })} />
      <AgendaView days={[day]} modules={modules} showEmptyDays />
    </div>
  );
}
