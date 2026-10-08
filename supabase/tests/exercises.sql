-- Migration 004 (exercise bank): idempotent, RLS isolation, constraints, cascades.
-- Runs after all migrations (run.sh) from the repository root.
\i supabase/migrations/004_exercises.sql
\i supabase/migrations/004_exercises.sql

\set A '''dddddddd-dddd-dddd-dddd-dddddddddddd'''
\set B '''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'''
insert into auth.users (id, email) values (:A, 'd@test'), (:B, 'e@test');

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  execute 'set role authenticated';
end;
$$;

select pg_temp.act_as(:A);
insert into public.semesters (id, name, start_date) values ('d1111111-0000-0000-0000-000000000001', 'HS26', '2026-09-14');
insert into public.modules (id, semester_id, code, name) values ('d2222222-0000-0000-0000-000000000001', 'd1111111-0000-0000-0000-000000000001', 'WMS', 'WMS');
insert into public.exercises (id, module_id, external_id, title, topic, task_md, solution_md, solution_source, aids, minutes, difficulty, points, source_label, source_ref)
values ('d3333333-0000-0000-0000-000000000001', 'd2222222-0000-0000-0000-000000000001', 'wms-stat-3-2', 'Mittelwert', 'Deskriptive Statistik',
        'Berechne $\bar{x}$.', '$\bar{x} = 4$', 'derived', array['calculator', 'paper'], 10, 2, 4.5, 'Skript Statistik', 'Kap. 3, Aufgabe 2');
insert into public.exercise_attempts (exercise_id, result, seconds) values ('d3333333-0000-0000-0000-000000000001', 'partial', 540);

do $$
begin
  assert (select user_id from public.exercises limit 1) = auth.uid(), 'user_id defaults to auth.uid()';
  assert (select count(*) from public.exercise_attempts) = 1, 'A sees the attempt';
  assert (select aids_confirmed from public.exercises limit 1) = false, 'aids are derived unless stated';

  -- empty aids and exercises without solution are fine
  insert into public.exercises (module_id, title, topic, task_md) values ('d2222222-0000-0000-0000-000000000001', 'Ohne Lösung', 'Test', 'Aufgabe');

  -- aids outside the known list are rejected
  begin
    insert into public.exercises (module_id, title, topic, task_md, aids) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', array['abacus']);
    raise exception 'expected unknown aid to fail';
  exception when check_violation then null; end;
  -- a solution needs its origin and vice versa
  begin
    insert into public.exercises (module_id, title, topic, task_md, solution_md) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 'sol');
    raise exception 'expected solution without source to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercises (module_id, title, topic, task_md, solution_source) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 'source');
    raise exception 'expected source without solution to fail';
  exception when check_violation then null; end;
  -- value ranges
  begin
    insert into public.exercises (module_id, title, topic, task_md, difficulty) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 4);
    raise exception 'expected difficulty 4 to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercises (module_id, title, topic, task_md, minutes) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 0);
    raise exception 'expected 0 minutes to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercises (module_id, title, topic, task_md, kind) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 'essay');
    raise exception 'expected unknown kind to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercises (module_id, title, topic, task_md, external_id) values ('d2222222-0000-0000-0000-000000000001', 'X', 'T', 'a', 'Bad ID');
    raise exception 'expected malformed external_id to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercise_attempts (exercise_id, result) values ('d3333333-0000-0000-0000-000000000001', 'great');
    raise exception 'expected unknown result to fail';
  exception when check_violation then null; end;
  begin
    insert into public.exercise_attempts (exercise_id, result, seconds) values ('d3333333-0000-0000-0000-000000000001', 'correct', -5);
    raise exception 'expected negative seconds to fail';
  exception when check_violation then null; end;
end;
$$;

-- imports upsert on (user_id, external_id): same id twice keeps one row and updates it; manual rows (null id) coexist
insert into public.exercises (user_id, module_id, external_id, title, topic, task_md)
values (auth.uid(), 'd2222222-0000-0000-0000-000000000001', 'wms-stat-3-2', 'Mittelwert (neu)', 'Deskriptive Statistik', 'Berechne den Mittelwert.')
on conflict (user_id, external_id) do update set title = excluded.title, task_md = excluded.task_md;
do $$
begin
  assert (select count(*) from public.exercises where external_id = 'wms-stat-3-2') = 1, 'upsert keeps one row';
  assert (select title from public.exercises where external_id = 'wms-stat-3-2') = 'Mittelwert (neu)', 'upsert updated the row';
  assert (select count(*) from public.exercise_attempts) = 1, 'attempts survive a re-import';
  assert (select updated_at > created_at from public.exercises where external_id = 'wms-stat-3-2'), 'updated_at moves on update';
end;
$$;

-- B sees and changes nothing
reset role;
select pg_temp.act_as(:B);
do $$
declare n int;
begin
  assert (select count(*) from public.exercises) = 0, 'B must not see exercises';
  assert (select count(*) from public.exercise_attempts) = 0, 'B must not see attempts';
  update public.exercises set title = 'hacked'; get diagnostics n = row_count;
  assert n = 0, 'B must not update A''s exercises';
  delete from public.exercise_attempts; get diagnostics n = row_count;
  assert n = 0, 'B must not delete A''s attempts';
  begin
    insert into public.exercises (user_id, module_id, title, topic, task_md)
    values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd2222222-0000-0000-0000-000000000001', 'fake', 'T', 'a');
    raise exception 'expected RLS with-check to block foreign user_id';
  exception when insufficient_privilege then null; end;
end;
$$;

reset role;
set role anon;
do $$
begin
  assert (select count(*) from public.exercises) = 0, 'anon must not see exercises';
  assert (select count(*) from public.exercise_attempts) = 0, 'anon must not see attempts';
end;
$$;
reset role;

-- cascades: deleting an exercise removes its attempts, deleting the module removes its exercises
select pg_temp.act_as(:A);
delete from public.exercises where id = 'd3333333-0000-0000-0000-000000000001';
do $$
begin
  assert (select count(*) from public.exercise_attempts) = 0, 'attempts cascade with the exercise';
end;
$$;
delete from public.modules where id = 'd2222222-0000-0000-0000-000000000001';
do $$
begin
  assert (select count(*) from public.exercises) = 0, 'exercises cascade with the module';
end;
$$;
reset role;
\echo 'migration 004 exercises: OK'
