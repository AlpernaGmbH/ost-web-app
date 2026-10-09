-- Adds "script" (Skript / Zusammenfassung) to the allowed aids of an exercise. Idempotent.
alter table public.exercises drop constraint if exists exercises_aids_check;
alter table public.exercises
  add constraint exercises_aids_check
  check (aids <@ array['calculator', 'paper', 'formula_sheet', 'tables', 'computer', 'script']::text[]);
