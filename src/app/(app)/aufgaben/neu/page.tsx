import type { Metadata } from "next";
import Link from "next/link";
import { TaskForm } from "@/components/task-forms";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { taskModuleOptions } from "@/lib/tasks/modules";

export const metadata: Metadata = { title: "Neue Aufgabe" };

export default async function NewTaskPage({ searchParams }: PageProps<"/aufgaben/neu">) {
  await requireUser();
  const params = await searchParams;
  const due = typeof params.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : null;
  const moduleId = typeof params.m === "string" && /^[0-9a-f-]{36}$/.test(params.m) ? params.m : null;
  const supabase = await createClient();
  const modules = await taskModuleOptions(supabase);
  const back = moduleId ? `/m/${moduleId}` : due ? `/aufgaben?view=calendar&m=${due.slice(0, 7)}&d=${due}` : undefined;

  return (
    <>
      <Link href={back ?? "/aufgaben"} className="mb-3 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← {moduleId ? "Zum Fach" : "Aufgaben"}
      </Link>
      <PageTitle title="Neue Aufgabe" size="md" />
      <Card>
        <TaskForm modules={modules} defaults={{ due, moduleId }} back={back} />
      </Card>
    </>
  );
}
