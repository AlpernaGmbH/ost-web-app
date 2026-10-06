"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import type { DocumentRow } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

const sha = z.string().regex(/^[0-9a-f]{64}$/);

export async function documentExists(moduleId: string, sha256: string): Promise<boolean> {
  await requireUser();
  const parsed = z.object({ moduleId: z.string().uuid(), sha256: sha }).safeParse({ moduleId, sha256 });
  if (!parsed.success) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("module_id", parsed.data.moduleId)
    .eq("sha256", parsed.data.sha256);
  return (count ?? 0) > 0;
}

const registerInput = z.object({
  moduleId: z.string().uuid(),
  lectureId: z.string().uuid().nullable(),
  storagePath: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  mime: z.string().max(200).nullable(),
  sizeBytes: z.number().int().min(0).max(52_428_800),
  sha256: sha,
});

/** Called after the browser uploaded the file straight to Storage (avoids Vercel's request body limit). */
export async function registerDocument(input: z.input<typeof registerInput>): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const parsed = registerInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ungültige Dateidaten" };
  const d = parsed.data;
  if (!d.storagePath.startsWith(`${user.id}/`)) return { ok: false, message: "Ungültiger Speicherpfad" };

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    module_id: d.moduleId,
    lecture_id: d.lectureId,
    storage_path: d.storagePath,
    filename: d.filename,
    mime: d.mime,
    size_bytes: d.sizeBytes,
    sha256: d.sha256,
  });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "Diese Datei ist in diesem Modul schon vorhanden." : error.message };
  }
  revalidatePath(`/m/${d.moduleId}`, "layout");
  return { ok: true };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, module_id, storage_path")
    .eq("id", id.data)
    .single<Pick<DocumentRow, "id" | "module_id" | "storage_path">>();
  if (!doc) return;

  // Row first: a leftover file is invisible and harmless, a row pointing at a missing file is a visible bug.
  const { error } = await supabase.from("documents").delete().eq("id", doc.id);
  if (error) return;
  await supabase.storage.from("documents").remove([doc.storage_path]);
  revalidatePath(`/m/${doc.module_id}`, "layout");
}
