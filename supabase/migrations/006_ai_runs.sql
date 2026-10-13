-- Stufe 2: exercises generated from uploaded documents by Claude (Message Batches API).
-- One ai_run per generation job; the exercises it produces are drafts until the user accepts them. Idempotent.

create table if not exists public.ai_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id         uuid not null references public.modules (id) on delete cascade,
  status            text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  -- snapshot of the documents the run reads: [{ "id": "<uuid>", "filename": "x.pdf" }]
  documents         jsonb not null default '[]'::jsonb,
  hint              text check (hint is null or char_length(hint) <= 500),
  model             text not null,
  provider_batch_id text,
  -- files uploaded to the provider for this run; deleted once the run is finished
  provider_file_ids text[] not null default '{}',
  input_tokens      integer,
  output_tokens     integer,
  -- USD: the budget reservation while the run is queued, the actual cost once it is finished
  cost_usd          numeric(10, 4) not null default 0 check (cost_usd >= 0),
  exercises_created integer not null default 0,
  -- what the model reports about the run (found, skipped and why); `error` says why a run failed
  summary           text,
  error             text,
  created_at        timestamptz not null default now(),
  -- set while a sync processes the batch result; a stale claim (crashed function) is taken over after a timeout
  claimed_at        timestamptz,
  finished_at       timestamptz
);
create index if not exists ai_runs_module_idx on public.ai_runs (module_id, created_at desc);
create index if not exists ai_runs_user_created_idx on public.ai_runs (user_id, created_at desc);

-- generated exercises start as drafts; everything else (hand-made, imported) is active
alter table public.exercises add column if not exists status text not null default 'active';
alter table public.exercises drop constraint if exists exercises_status_check;
alter table public.exercises add constraint exercises_status_check check (status in ('draft', 'active'));
alter table public.exercises add column if not exists ai_run_id uuid references public.ai_runs (id) on delete set null;
create index if not exists exercises_status_idx on public.exercises (module_id, status);

alter table public.ai_runs enable row level security;
drop policy if exists "own rows" on public.ai_runs;
-- a run may only point at a module its owner can see (the foreign key alone would not check that)
create policy "own rows" on public.ai_runs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.modules m where m.id = module_id));
