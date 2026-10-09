import type { Metadata } from "next";
import { PracticeHub, type HubExercise } from "@/components/practice-hub";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { Module, Semester } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { isDue } from "@/lib/vocab/srs";

export const metadata: Metadata = { title: "Üben" };

type Row = HubExercise & { module_id: string };

/** Practice hub: one tile per module with progress and a way straight into the next open exercise. */
export default async function PracticePage() {
  await requireUser();
  const supabase = await createClient();
  const now = new Date();

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, name")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "name">>();
  if (semesterError) return <Card>{describeDbError(semesterError)}</Card>;
  if (!semester) {
    return (
      <>
        <PageTitle title="Üben" />
        <Card>
          <p className="text-sm text-muted">Zuerst auf der Startseite das Semester einrichten.</p>
        </Card>
      </>
    );
  }

  const { data: allModules, error: modulesError } = await supabase
    .from("modules")
    .select("id, code, name, kind, color")
    .eq("semester_id", semester.id)
    .in("kind", ["course", "language"])
    .order("sort_order")
    .returns<Pick<Module, "id" | "code" | "name" | "kind" | "color">[]>();
  if (modulesError) return <Card>{describeDbError(modulesError)}</Card>;
  const modules = allModules ?? [];
  const courseIds = modules.filter((m) => m.kind === "course").map((m) => m.id);
  const languageIds = modules.filter((m) => m.kind === "language").map((m) => m.id);

  const byModule = new Map<string, Row[]>();
  let exerciseError: { code?: string; message?: string } | null = null;
  if (courseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, module_id, exercise_attempts(result, seconds, created_at)")
      .in("module_id", courseIds)
      .order("position")
      .order("created_at")
      .limit(5000)
      .returns<Row[]>();
    exerciseError = error;
    for (const row of data ?? []) byModule.set(row.module_id, [...(byModule.get(row.module_id) ?? []), row]);
  }

  const vocab = new Map<string, { total: number; due: number }>();
  if (languageIds.length > 0) {
    // an error (e.g. vocabulary migration not applied yet) just hides the numbers
    const { data } = await supabase.from("cards").select("module_id, due_at").in("module_id", languageIds).eq("kind", "vocab").eq("status", "active").limit(10000);
    for (const c of data ?? []) {
      const entry = vocab.get(c.module_id) ?? { total: 0, due: 0 };
      entry.total++;
      if (isDue({ due_at: c.due_at }, now)) entry.due++;
      vocab.set(c.module_id, entry);
    }
  }

  return (
    <>
      <PageTitle title="Üben" subtitle={`${semester.name}: wähle ein Modul`} />
      {exerciseError ? (
        <Card className="mb-4">
          <p className="text-sm">{describeDbError(exerciseError)}</p>
        </Card>
      ) : null}
      <PracticeHub modules={modules} exercises={byModule} vocab={vocab} />
    </>
  );
}
