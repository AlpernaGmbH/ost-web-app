// Row types for the Phase 1 tables (mirrors supabase/migrations/001_phase1.sql).
// Replace with `supabase gen types` output once the Supabase CLI is part of the workflow.

export type Semester = {
  id: string;
  user_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD, always a Monday
  ical_url: string | null;
  last_synced_at: string | null;
};

export type Module = {
  id: string;
  user_id: string;
  semester_id: string;
  code: string;
  name: string;
  ects: number;
  kind: "course" | "language" | "admin";
  color: string;
  ical_match: string | null;
  sort_order: number;
};

export type Lecture = {
  id: string;
  user_id: string;
  semester_id: string;
  module_id: string | null;
  title: string;
  starts_at: string; // timestamptz as ISO string
  ends_at: string | null;
  location: string | null;
  ical_uid: string | null;
  source: "ical" | "manual";
  status: "scheduled" | "cancelled";
};

export type Note = {
  id: string;
  lecture_id: string;
  content_md: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  module_id: string;
  lecture_id: string | null;
  storage_path: string;
  filename: string;
  mime: string | null;
  size_bytes: number;
  sha256: string;
  created_at: string;
};

// mirrors supabase/migrations/006_ai_runs.sql
export type AiRunStatus = "queued" | "processing" | "done" | "failed";
export type AiRun = {
  id: string;
  module_id: string;
  status: AiRunStatus;
  documents: { id: string; filename: string }[];
  hint: string | null;
  model: string;
  provider_batch_id: string | null;
  provider_file_ids: string[];
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | string; // numeric comes back as a string
  exercises_created: number;
  summary: string | null;
  error: string | null;
  created_at: string;
  claimed_at: string | null;
  finished_at: string | null;
};
