import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTask } from "@/app/actions/tasks";
import { ConfirmButton } from "@/components/confirm-button";
import { TaskForm } from "@/components/task-forms";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { taskModuleOptions } from "@/lib/tasks/modules";
import type { TaskRow } from "@/lib/tasks/types";

export const metadata: Metadata = { title: "Aufgabe" };

export default async function TaskPage({ params }: PageProps<"/aufgaben/[taskId]">) {
  await requireUser();
  const taskId = parseUuidOrNotFound((await params).taskId);
  const supabase = await createClient();
  const [{ data: task }, modules] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, module_id, title, notes_md, kind, priority, status, due_date, done_at, created_at, updated_at")
      .eq("id", taskId)
      .maybeSingle<TaskRow>(),
    taskModuleOptions(supabase),
  ]);
  if (!task) notFound();

  return (
    <>
      <Link href="/aufgaben" className="mb-3 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← Aufgaben
      </Link>
      <PageTitle
        title={task.title}
        size="md"
        subtitle={`Angelegt ${formatDateTime(task.created_at)}${task.done_at ? ` · erledigt ${formatDateTime(task.done_at)}` : ""}`}
      />
      <Card>
        <TaskForm task={task} modules={modules} />
      </Card>
      <form action={deleteTask} className="mt-6">
        <input type="hidden" name="taskId" value={task.id} />
        <ConfirmButton type="submit" variant="danger" confirmText={`«${task.title}» wirklich löschen?`}>
          Aufgabe löschen
        </ConfirmButton>
      </form>
    </>
  );
}
