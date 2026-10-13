import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Module, Semester } from "../db/types";

export type TaskModuleOption = Pick<Module, "id" | "code" | "name">;

/** Modules of the current semester as options for the "Fach" select; empty when no semester exists yet. */
export async function taskModuleOptions(supabase: SupabaseClient): Promise<TaskModuleOption[]> {
  const { data: semester } = await supabase.from("semesters").select("id").order("start_date", { ascending: false }).limit(1).maybeSingle<Pick<Semester, "id">>();
  if (!semester) return [];
  const { data } = await supabase.from("modules").select("id, code, name").eq("semester_id", semester.id).order("sort_order").returns<TaskModuleOption[]>();
  return data ?? [];
}
