-- Migration 007 (tasks): idempotent, defaults, done_at trigger, constraints, RLS isolation, module link.
-- Runs after all migrations (run.sh) from the repository root.
\i supabase/migrations/007_tasks.sql
\i supabase/migrations/007_tasks.sql

\set A '''a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7'''
\set B '''b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8'''
insert into auth.users (id, email) values (:A, 'h@test'), (:B, 'i@test');

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  execute 'set role authenticated';
end;
$$;

select pg_temp.act_as(:A);
insert into public.semesters (id, name, start_date) values ('a7111111-0000-0000-0000-000000000001', 'HS26', '2026-09-14');
insert into public.modules (id, semester_id, code, name) values ('a7222222-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000001', 'WMS', 'WMS');
insert into public.tasks (id, title) values ('a7333333-0000-0000-0000-000000000001', 'Skript lesen');
insert into public.tasks (id, module_id, title, kind, priority, due_date, notes_md)
values ('a7333333-0000-0000-0000-000000000002', 'a7222222-0000-0000-0000-000000000001', 'Übung 3 abgeben', 'deadline', 'high', '2026-10-20', 'bis 23:59 auf Moodle');
insert into public.tasks (id, title, status) values ('a7333333-0000-0000-0000-000000000003', 'Schon erledigt', 'done');

do $$
declare t public.tasks;
begin
  select * into t from public.tasks where id = 'a7333333-0000-0000-0000-000000000001';
  assert t.user_id = auth.uid(), 'user_id defaults to auth.uid()';
  assert t.status = 'open' and t.priority = 'normal' and t.kind = 'task', 'defaults: open, normal, task';
  assert t.module_id is null and t.due_date is null and t.done_at is null, 'optional fields stay empty';

  -- a task inserted as done gets its completion time from the trigger
  assert (select done_at from public.tasks where id = 'a7333333-0000-0000-0000-000000000003') is not null, 'done_at set on insert';

  -- completing and reopening keeps done_at in step with the status
  update public.tasks set status = 'done' where id = 'a7333333-0000-0000-0000-000000000001';
  assert (select done_at from public.tasks where id = 'a7333333-0000-0000-0000-000000000001') is not null, 'done_at set on completion';
  update public.tasks set status = 'doing' where id = 'a7333333-0000-0000-0000-000000000001';
  assert (select done_at from public.tasks where id = 'a7333333-0000-0000-0000-000000000001') is null, 'done_at cleared when reopened';
  assert (select updated_at > created_at from public.tasks where id = 'a7333333-0000-0000-0000-000000000001'), 'updated_at moves on update';

  -- value checks
  begin
    insert into public.tasks (title, kind) values ('X', 'meeting');
    raise exception 'expected unknown kind to fail';
  exception when check_violation then null; end;
  begin
    insert into public.tasks (title, priority) values ('X', 'urgent');
    raise exception 'expected unknown priority to fail';
  exception when check_violation then null; end;
  begin
    insert into public.tasks (title, status) values ('X', 'blocked');
    raise exception 'expected unknown status to fail';
  exception when check_violation then null; end;
  begin
    insert into public.tasks (title) values ('');
    raise exception 'expected empty title to fail';
  exception when check_violation then null; end;
  begin
    insert into public.tasks (title) values (repeat('x', 201));
    raise exception 'expected overlong title to fail';
  exception when check_violation then null; end;
  begin
    insert into public.tasks (title, notes_md) values ('X', '');
    raise exception 'expected empty notes to fail';
  exception when check_violation then null; end;
end;
$$;

-- B sees nothing of A, changes nothing, and cannot attach a task to A's module
reset role;
select pg_temp.act_as(:B);
do $$
declare n int;
begin
  assert (select count(*) from public.tasks) = 0, 'B must not see A tasks';
  update public.tasks set title = 'hacked'; get diagnostics n = row_count;
  assert n = 0, 'B must not update A tasks';
  delete from public.tasks; get diagnostics n = row_count;
  assert n = 0, 'B must not delete A tasks';
  begin
    insert into public.tasks (user_id, title) values ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', 'fake');
    raise exception 'expected RLS with-check to block foreign user_id';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.tasks (module_id, title) values ('a7222222-0000-0000-0000-000000000001', 'in A module');
    raise exception 'expected RLS with-check to block a foreign module';
  exception when insufficient_privilege then null; end;
  -- B's own task without a module is fine
  insert into public.tasks (title) values ('Eigene Aufgabe');
  assert (select count(*) from public.tasks) = 1, 'B sees only the own task';
end;
$$;

reset role;
set role anon;
do $$
begin
  assert (select count(*) from public.tasks) = 0, 'anon must not see tasks';
end;
$$;
reset role;

-- deleting the module keeps the task but clears the link
select pg_temp.act_as(:A);
delete from public.modules where id = 'a7222222-0000-0000-0000-000000000001';
do $$
begin
  assert (select count(*) from public.tasks) = 3, 'tasks survive the module';
  assert (select module_id from public.tasks where id = 'a7333333-0000-0000-0000-000000000002') is null, 'module link cleared';
end;
$$;
reset role;
\echo 'migration 007 tasks: OK'
