-- Aufgaben: personal to-dos, deadlines and exam dates, optionally attached to a module.
-- Independent of the timetable (lectures come from iCal, tasks are typed by hand).
-- Idempotent: safe to run more than once.

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- subject the task belongs to; null = general. Deleting the module keeps the task.
  module_id   uuid references public.modules (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 200),
  notes_md    text check (notes_md is null or char_length(notes_md) between 1 and 5000),
  kind        text not null default 'task' check (kind in ('task', 'deadline', 'exam', 'study')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status      text not null default 'open' check (status in ('open', 'doing', 'done')),
  due_date    date,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- done_at is the moment the task was completed, and only then
  constraint tasks_done_at_matches_status check ((status = 'done') = (done_at is not null))
);
create index if not exists tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index if not exists tasks_module_idx on public.tasks (module_id);

-- done_at follows the status: set when a task is completed, cleared when it is reopened
create or replace function public.tasks_track_done()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    new.done_at = coalesce(new.done_at, now());
  else
    new.done_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_track_done on public.tasks;
create trigger tasks_track_done
  before insert or update on public.tasks
  for each row execute function public.tasks_track_done();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- own rows only; a task can only point at a module the user can see (the FK check alone bypasses RLS)
drop policy if exists "own rows" on public.tasks;
create policy "own rows" on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (module_id is null or exists (select 1 from public.modules m where m.id = module_id))
  );
