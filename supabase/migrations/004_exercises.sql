-- Phase B: exercise bank (Übungsbank). Exercises belong to a module; every attempt is a self-assessed
-- result (no automatic grading). Idempotent: safe to run more than once.

create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id       uuid not null references public.modules (id) on delete cascade,
  -- stable id of an imported exercise (e.g. "wms-stat-3-2"): re-importing a file updates instead of duplicating.
  -- null for exercises created by hand.
  external_id     text check (external_id ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  position        integer not null default 0,
  title           text not null check (char_length(title) between 1 and 200),
  topic           text not null check (char_length(topic) between 1 and 120),
  kind            text not null default 'calculation' check (kind in ('calculation', 'multiple_choice', 'open')),
  task_md         text not null check (char_length(task_md) between 1 and 10000),
  solution_md     text check (solution_md is null or char_length(solution_md) between 1 and 10000),
  -- source = model solution from the book/Moodle, derived = worked out and recomputed by Claude, manual = own solution
  solution_source text check (solution_source in ('source', 'derived', 'manual')),
  -- allowed aids; empty = none. aids_confirmed = the source states them (otherwise they are derived from the task)
  aids            text[] not null default '{}' check (aids <@ array['calculator', 'paper', 'formula_sheet', 'tables', 'computer']::text[]),
  aids_confirmed  boolean not null default false,
  minutes         smallint check (minutes between 1 and 240),
  difficulty      smallint check (difficulty between 1 and 3),
  points          numeric(5, 1) check (points >= 0 and points <= 100),
  source_label    text check (source_label is null or char_length(source_label) between 1 and 160),
  source_ref      text check (source_ref is null or char_length(source_ref) between 1 and 120),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, external_id),
  -- a solution always says where it comes from
  constraint exercises_solution_has_source check ((solution_md is null) = (solution_source is null))
);
create index if not exists exercises_module_idx on public.exercises (module_id, position);

create table if not exists public.exercise_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  result      text not null check (result in ('wrong', 'partial', 'correct')),
  seconds     integer check (seconds is null or seconds between 0 and 86400),
  created_at  timestamptz not null default now()
);
create index if not exists exercise_attempts_exercise_idx on public.exercise_attempts (exercise_id, created_at desc);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.exercise_attempts enable row level security;

drop policy if exists "own rows" on public.exercises;
create policy "own rows" on public.exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.exercise_attempts;
create policy "own rows" on public.exercise_attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
