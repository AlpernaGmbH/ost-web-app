import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseForm } from "@/components/exercise-forms";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { ExerciseRow } from "@/lib/exercises/types";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aufgabe bearbeiten" };

export default async function EditExercisePage({ params }: PageProps<"/m/[moduleId]/ex/[exerciseId]/edit">) {
  await requireUser();
  const { moduleId: rawModule, exerciseId: rawExercise } = await params;
  const moduleId = parseUuidOrNotFound(rawModule);
  const exerciseId = parseUuidOrNotFound(rawExercise);

  const supabase = await createClient();
  const [exerciseRes, topicsRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, module_id, external_id, position, title, topic, kind, task_md, solution_md, solution_source, aids, aids_confirmed, minutes, difficulty, points, source_label, source_ref")
      .eq("id", exerciseId)
      .eq("module_id", moduleId)
      .maybeSingle<ExerciseRow>(),
    supabase.from("exercises").select("topic").eq("module_id", moduleId).limit(2000),
  ]);
  const exercise = exerciseRes.data;
  if (!exercise) notFound();

  return (
    <>
      <Link href={`/m/${moduleId}/ex/${exerciseId}`} className="mb-4 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← Aufgabe
      </Link>
      <PageTitle title="Aufgabe bearbeiten" subtitle={exercise.external_id ? "Ein erneuter Import dieser Datei überschreibt deine Änderungen." : undefined} />
      <ExerciseForm moduleId={moduleId} exercise={exercise} topics={[...new Set((topicsRes.data ?? []).map((t) => String(t.topic)))]} />
    </>
  );
}
