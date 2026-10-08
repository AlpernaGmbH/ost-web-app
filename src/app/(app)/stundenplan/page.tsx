import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { AgendaView, type AgendaModule } from "@/components/agenda";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { groupWeek, weekBounds, type AgendaLecture } from "@/lib/agenda";
import { describeDbError } from "@/lib/db/errors";
import type { Module, Semester } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatWeek, mondayOf, shortDate, weekNumber, zurichDate, zurichInstant } from "@/lib/week";

export const metadata: Metadata = { title: "Stundenplan" };

const weekParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00Z`)));

export default async function TimetablePage({ searchParams }: PageProps<"/stundenplan">) {
  await requireUser();
  const now = new Date();
  const currentMonday = mondayOf(zurichDate(now));
  const requested = weekParam.safeParse((await searchParams).w);
  const monday = requested.success ? mondayOf(requested.data) : currentMonday;

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

  const { from, to } = weekBounds(monday);
  const [lecturesRes, modulesRes] = await Promise.all([
    supabase
      .from("lectures")
      .select("id, module_id, title, starts_at, ends_at, location, status")
      .eq("semester_id", semester.id)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at")
      .returns<AgendaLecture[]>(),
    supabase.from("modules").select("id, code, color").eq("semester_id", semester.id).returns<Pick<Module, "id" | "code" | "color">[]>(),
  ]);
  const error = lecturesRes.error ?? modulesRes.error;
  if (error) return <Card>{describeDbError(error)}</Card>;

  const modules = new Map<string, AgendaModule>((modulesRes.data ?? []).map((m) => [m.id, { code: m.code, color: m.color }]));
  const days = groupWeek(monday, lecturesRes.data ?? [], now);
  const week = weekNumber(semester.start_date, zurichInstant(monday, "12:00"));
  const range = `${shortDate(monday)}–${shortDate(addDays(monday, 6))}`;

  return (
    <>
      <PageTitle title="Stundenplan" subtitle={`${week >= 1 ? formatWeek(week) : "Vor Semesterbeginn"} · ${range}`} />

      <nav aria-label="Woche wechseln" className="mb-4 flex items-center justify-between gap-2 text-sm">
        <Link href={`/stundenplan?w=${addDays(monday, -7)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4">
          ← Vorwoche
        </Link>
        {monday !== currentMonday ? (
          <Link href="/stundenplan" className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary">
            Diese Woche
          </Link>
        ) : null}
        <Link href={`/stundenplan?w=${addDays(monday, 7)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4">
          Nächste →
        </Link>
      </nav>

      {!semester.ical_url ? (
        <Link href="/settings" className="mb-4 block rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Noch kein Stundenplan verbunden: iCal-Link in den Einstellungen eintragen →
        </Link>
      ) : null}

      <AgendaView days={days} modules={modules} />
    </>
  );
}
