import Link from "next/link";
import { bootstrapSemester } from "@/app/actions/semester";
import { Button, Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { Lecture, Module, Semester } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { weekNumber } from "@/lib/week";

export default async function HomePage() {
  await requireUser();
  const supabase = await createClient();
  const now = new Date();

  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, start_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "name" | "start_date">>();

  if (!semester) {
    return (
      <>
        <PageTitle title="Willkommen" subtitle="Noch kein Semester eingerichtet." />
        <Card className="space-y-3">
          <p className="text-sm">
            Legt das Semester HS26 (W01 = 14.09.2026) mit WMS, SYS, VHR und Englisch an. Namen, ECTS und
            Stundenplan-Zuordnung lassen sich danach in den Einstellungen ändern.
          </p>
          <form action={bootstrapSemester}>
            <Button type="submit">Semester HS26 einrichten</Button>
          </form>
        </Card>
      </>
    );
  }

  const [modulesRes, upcomingRes, inboxRes] = await Promise.all([
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
  ]);

  const modules = modulesRes.data ?? [];
  const nextByModule = new Map<string, Pick<Lecture, "id" | "title" | "starts_at">>();
  for (const l of upcomingRes.data ?? []) {
    if (l.module_id && !nextByModule.has(l.module_id)) nextByModule.set(l.module_id, l);
  }
  const week = weekNumber(semester.start_date, now);
  const inboxCount = inboxRes.count ?? 0;

  return (
    <>
      <PageTitle
        title="Module"
        subtitle={week >= 1 ? `${semester.name} · Woche ${String(week).padStart(2, "0")}` : `${semester.name} · beginnt am ${semester.start_date}`}
      />

      {inboxCount > 0 ? (
        <Link href="/settings#inbox" className="mb-4 block rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          {inboxCount} importierte {inboxCount === 1 ? "Termin ist" : "Termine sind"} keinem Modul zugeordnet →
        </Link>
      ) : null}

      <ul className="space-y-3">
        {modules.map((m) => {
          const next = nextByModule.get(m.id);
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
                    {next ? `Nächste Vorlesung: ${formatDateTime(next.starts_at)}` : "Keine kommende Vorlesung"}
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
