import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";
import { ConfirmButton } from "@/components/confirm-button";
import { NoteEditor } from "@/components/note-editor";
import { UploadButton } from "@/components/upload-button";
import { requireUser } from "@/lib/auth";
import type { DocumentRow, Lecture, Module, Note, Semester } from "@/lib/db/types";
import { formatDay, formatSize, formatTime } from "@/lib/format";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { formatWeek, weekNumber } from "@/lib/week";

export default async function LecturePage({ params }: PageProps<"/m/[moduleId]/l/[lectureId]">) {
  const user = await requireUser();
  const { moduleId: rawModuleId, lectureId: rawLectureId } = await params;
  const moduleId = parseUuidOrNotFound(rawModuleId);
  const lectureId = parseUuidOrNotFound(rawLectureId);

  const supabase = await createClient();
  const { data: lecture } = await supabase
    .from("lectures")
    .select("id, title, starts_at, ends_at, location, status, module_id, semester_id")
    .eq("id", lectureId)
    .eq("module_id", moduleId)
    .maybeSingle<Pick<Lecture, "id" | "title" | "starts_at" | "ends_at" | "location" | "status" | "module_id" | "semester_id">>();
  if (!lecture) notFound();

  const [moduleRes, semesterRes, noteRes, docsRes] = await Promise.all([
    supabase.from("modules").select("id, code, name").eq("id", moduleId).single<Pick<Module, "id" | "code" | "name">>(),
    supabase.from("semesters").select("start_date").eq("id", lecture.semester_id).single<Pick<Semester, "start_date">>(),
    supabase.from("notes").select("content_md, updated_at").eq("lecture_id", lectureId).maybeSingle<Pick<Note, "content_md" | "updated_at">>(),
    supabase
      .from("documents")
      .select("id, filename, size_bytes")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: false })
      .returns<Pick<DocumentRow, "id" | "filename" | "size_bytes">[]>(),
  ]);
  if (!moduleRes.data || !semesterRes.data) notFound();

  const week = weekNumber(semesterRes.data.start_date, new Date(lecture.starts_at));
  const documents = docsRes.data ?? [];

  return (
    <>
      <Link href={`/m/${moduleId}`} className="mb-4 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← {moduleRes.data.name}
      </Link>
      <header className="mb-5">
        <h1 className="display-md break-words">{lecture.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatWeek(week)} · {formatDay(lecture.starts_at)} {formatTime(lecture.starts_at)}
          {lecture.ends_at ? `–${formatTime(lecture.ends_at)}` : ""}
          {lecture.location ? ` · ${lecture.location}` : ""}
          {lecture.status === "cancelled" ? " · abgesagt" : ""}
        </p>
      </header>

      <NoteEditor lectureId={lectureId} initialContent={noteRes.data?.content_md ?? ""} initialUpdatedAt={noteRes.data?.updated_at ?? null} />

      <section className="mt-8 space-y-3" aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="font-semibold">
          Dokumente zu dieser Vorlesung
        </h2>
        {documents.length > 0 ? (
          <ul className="divide-y divide-border rounded-card border border-border bg-card">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <a href={`/d/${d.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.filename}</span>
                  <span className="text-sm text-muted">{formatSize(d.size_bytes)}</span>
                </a>
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <ConfirmButton
                    type="submit"
                    variant="danger"
                    className="min-h-9 px-3"
                    confirmText={`„${d.filename}" wirklich löschen?`}
                    aria-label={`${d.filename} löschen`}
                  >
                    Löschen
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <UploadButton moduleId={moduleId} lectureId={lectureId} userId={user.id} label="Datei zur Vorlesung hochladen" />
      </section>
    </>
  );
}
