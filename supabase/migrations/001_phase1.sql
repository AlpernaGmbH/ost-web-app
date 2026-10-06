-- Phase 1: base schema (semesters, modules, lectures, notes, documents) + private storage bucket.
-- Every table carries user_id (default auth.uid()) and is protected by RLS so more users can be
-- added later without a schema change.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- semesters
-- ---------------------------------------------------------------------------
create table public.semesters (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  start_date     date not null,
  ical_url       text,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  -- W01 starts on a Monday; the week counter in the app relies on it.
  constraint semesters_start_is_monday check (extract(isodow from start_date) = 1)
);

-- ---------------------------------------------------------------------------
-- modules (language courses such as Englisch are modules with kind = 'language')
-- ---------------------------------------------------------------------------
create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  code        text not null,
  name        text not null,
  ects        integer not null default 6 check (ects >= 0),
  kind        text not null default 'course' check (kind in ('course', 'language')),
  color       text not null default '#4f46e5',
  -- comma separated keywords, matched case-insensitively against the iCal SUMMARY
  ical_match  text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, semester_id, code)
);
create index modules_semester_idx on public.modules (semester_id);

-- ---------------------------------------------------------------------------
-- lectures (module_id null = inbox: imported event that matched no module)
-- ---------------------------------------------------------------------------
create table public.lectures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  module_id   uuid references public.modules (id) on delete set null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  -- iCal UID (recurring instances: "<uid>#<original start>"); null for manual lectures.
  -- A plain unique constraint (NULLs are distinct) so PostgREST can upsert on it.
  ical_uid    text,
  source      text not null default 'manual' check (source in ('ical', 'manual')),
  status      text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique (user_id, ical_uid)
);
create index lectures_module_starts_idx on public.lectures (module_id, starts_at);
create index lectures_semester_starts_idx on public.lectures (semester_id, starts_at);

-- ---------------------------------------------------------------------------
-- notes (one markdown note per lecture)
-- ---------------------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lecture_id uuid not null unique references public.lectures (id) on delete cascade,
  content_md text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents (file lives in storage bucket "documents" under "<user_id>/...")
-- ---------------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id    uuid not null references public.modules (id) on delete cascade,
  lecture_id   uuid references public.lectures (id) on delete set null,
  storage_path text not null unique,
  filename     text not null,
  mime         text,
  size_bytes   bigint not null check (size_bytes >= 0),
  sha256       text not null,
  created_at   timestamptz not null default now(),
  -- the same file is registered once per module
  unique (user_id, module_id, sha256)
);
create index documents_module_idx on public.documents (module_id);
create index documents_lecture_idx on public.documents (lecture_id);

-- ---------------------------------------------------------------------------
-- row level security: a row is visible/writable only for its owner
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['semesters', 'modules', 'lectures', 'notes', 'documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- storage: private bucket, objects must live under "<auth.uid()>/"
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800) -- 50 MB (Supabase free plan limit)
on conflict (id) do nothing;

create policy "documents: read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
