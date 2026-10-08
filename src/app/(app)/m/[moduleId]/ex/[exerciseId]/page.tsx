import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseDetail, type Attempt } from "@/components/exercise-detail";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { ExerciseRow } from "@/lib/exercises/types";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aufgabe" };

export default async function ExercisePage({ params }: PageProps<"/m/[moduleId]/ex/[exerciseId]">) {
  await requireUser();
  const { moduleId: rawModule, exerciseId: rawExercise } = await params;
  const moduleId = parseUuidOrNotFound(rawModule);
  const exerciseId = parseUuidOrNotFound(rawExercise);

  const supabase = await createClient();
  const [exerciseRes, attemptsRes, orderRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, module_id, external_id, position, title, topic, kind, task_md, solution_md, solution_source, aids, aids_confirmed, minutes, difficulty, points, source_label, source_ref")
      .eq("id", exerciseId)
      .eq("module_id", moduleId)
      .maybeSingle<ExerciseRow>(),
    supabase.from("exercise_attempts").select("id, result, seconds, created_at").eq("exercise_id", exerciseId).order("created_at", { ascending: false }).limit(50).returns<Attempt[]>(),
    supabase.from("exercises").select("id").eq("module_id", moduleId).order("position").order("created_at").limit(2000),
  ]);
  const error = exerciseRes.error ?? attemptsRes.error ?? orderRes.error;
  if (error) return <Card>{describeDbError(error)}</Card>;
  const exercise = exerciseRes.data;
  if (!exercise) notFound();

  const order = (orderRes.data ?? []).map((row) => String(row.id));
  const index = order.indexOf(exercise.id);
  return (
    <ExerciseDetail
      moduleId={moduleId}
      exercise={exercise}
      attempts={attemptsRes.data ?? []}
      previousId={index > 0 ? order[index - 1] : null}
      nextId={index >= 0 && index < order.length - 1 ? order[index + 1] : null}
    />
  );
}
