"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ lectureId: z.string().uuid(), content: z.string().max(200_000) });

/** Autosave target. No revalidation: the editor owns the content while it is open. */
export async function saveNote(lectureId: string, content: string): Promise<{ ok: boolean; savedAt?: string; message?: string }> {
  const user = await requireUser();
  const parsed = input.safeParse({ lectureId, content });
  if (!parsed.success) return { ok: false, message: "Notiz zu lang oder ungültig" };

  const supabase = await createClient();
  const savedAt = new Date().toISOString();
  const { error } = await supabase
    .from("notes")
    .upsert({ user_id: user.id, lecture_id: parsed.data.lectureId, content_md: parsed.data.content }, { onConflict: "lecture_id" });
  if (error) return { ok: false, message: error.message };
  return { ok: true, savedAt };
}
