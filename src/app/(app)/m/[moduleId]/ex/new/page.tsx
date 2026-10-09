import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseForm } from "@/components/exercise-forms";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neue Aufgabe" };

export default async function NewExercisePage({ params }: PageProps<"/m/[moduleId]/ex/new">) {
  await requireUser();
  const moduleId = parseUuidOrNotFound((await params).moduleId);
  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id, name").eq("id", moduleId).maybeSingle<{ id: string; name: string }>();
  if (!module) notFound();
  const { data: topics } = await supabase.from("exercises").select("topic").eq("module_id", moduleId).limit(2000);

  return (
    <>
      <Link href={`/m/${moduleId}?tab=uebungen`} className="mb-4 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← Übungen {module.name}
      </Link>
      <PageTitle title="Neue Aufgabe" />
      <ExerciseForm moduleId={moduleId} topics={[...new Set((topics ?? []).map((t) => String(t.topic)))]} />
    </>
  );
}
