-- Vocabulary trainer: decks of cards with spaced repetition state and a review log.
-- `cards` is deliberately generic (kind basic | mc | vocab, free-form `data`) so the flashcard/MC
-- features planned for phase 2 reuse it without another schema change.

create table public.decks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id  uuid not null references public.modules (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, module_id, name)
);
create index decks_module_idx on public.decks (module_id);

create table public.cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id        uuid not null references public.modules (id) on delete cascade,
  deck_id          uuid references public.decks (id) on delete cascade,
  lecture_id       uuid references public.lectures (id) on delete set null,
  kind             text not null default 'vocab' check (kind in ('basic', 'mc', 'vocab')),
  status           text not null default 'active' check (status in ('draft', 'active', 'suspended')),
  -- vocab: front = English term, back = German meaning(s), separated by ; or /
  front_md         text not null check (char_length(front_md) between 1 and 500),
  back_md          text not null check (char_length(back_md) between 1 and 500),
  data             jsonb not null default '{}'::jsonb, -- vocab: {"example": "..."}
  -- spaced repetition (SM-2 style); due_at null = new card
  ease             real not null default 2.5 check (ease >= 1.3),
  interval_days    integer not null default 0 check (interval_days >= 0),
  reps             integer not null default 0 check (reps >= 0),
  lapses           integer not null default 0 check (lapses >= 0),
  due_at           timestamptz,
  last_reviewed_at timestamptz,
  created_at       timestamptz not null default now()
);
create index cards_deck_idx on public.cards (deck_id);
create index cards_due_idx on public.cards (module_id, status, due_at);

-- every answer is logged, so the scheduling algorithm can be changed later without losing history
create table public.card_reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id         uuid not null references public.cards (id) on delete cascade,
  rating          smallint not null check (rating between 0 and 3), -- 0 again, 1 hard, 2 good, 3 easy
  mode            text not null check (mode in ('cards', 'write', 'choice')),
  interval_before integer not null,
  interval_after  integer not null,
  ease_before     real not null,
  ease_after      real not null,
  reviewed_at     timestamptz not null default now()
);
create index card_reviews_card_idx on public.card_reviews (card_id, reviewed_at);

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.card_reviews enable row level security;

create policy "own rows" on public.decks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.card_reviews for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
