-- Migration 006 (AI runs + exercise drafts): idempotent, RLS isolation, constraints, cascades.
-- Runs after all migrations (run.sh) from the repository root.
\i supabase/migrations/006_ai_runs.sql
\i supabase/migrations/006_ai_runs.sql

\set A '''ffffffff-ffff-ffff-ffff-ffffffffffff'''
\set B '''99999999-9999-9999-9999-999999999999'''
insert into auth.users (id, email) values (:A, 'f@test'), (:B, 'g@test');

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  execute 'set role authenticated';
end;
$$;

select pg_temp.act_as(:A);
insert into public.semesters (id, name, start_date) values ('f1111111-0000-0000-0000-000000000001', 'HS26', '2026-09-14');
insert into public.modules (id, semester_id, code, name) values ('f2222222-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001', 'WMS', 'WMS');
insert into public.ai_runs (id, module_id, documents, model, cost_usd)
values ('f4444444-0000-0000-0000-000000000001', 'f2222222-0000-0000-0000-000000000001', '[{"id": "f3333333-0000-0000-0000-000000000009", "filename": "u1.pdf"}]', 'claude-test', 0.5);
insert into public.exercises (id, module_id, external_id, title, topic, task_md, solution_md, solution_source, status, ai_run_id)
values ('f3333333-0000-0000-0000-000000000001', 'f2222222-0000-0000-0000-000000000001', 'ai-f4444444-001', 'Entwurf', 'Thema', 'Aufgabe', 'Lösung', 'derived', 'draft', 'f4444444-0000-0000-0000-000000000001');
insert into public.exercises (id, module_id, title, topic, task_md)
values ('f3333333-0000-0000-0000-000000000002', 'f2222222-0000-0000-0000-000000000001', 'Von Hand', 'Thema', 'Aufgabe');

do $$
begin
  assert (select user_id from public.ai_runs limit 1) = auth.uid(), 'ai_runs.user_id defaults to auth.uid()';
  assert (select status from public.ai_runs limit 1) = 'queued', 'a new run is queued';
  assert (select status from public.exercises where id = 'f3333333-0000-0000-0000-000000000002') = 'active', 'exercises are active unless marked as drafts';
  assert (select count(*) from public.exercises where status = 'draft') = 1, 'the generated exercise is a draft';

  -- unknown statuses are rejected
  begin
    update public.exercises set status = 'pending' where id = 'f3333333-0000-0000-0000-000000000001';
    raise exception 'status check missing';
  exception when check_violation then null;
  end;
  begin
    insert into public.ai_runs (module_id, model, status) values ('f2222222-0000-0000-0000-000000000001', 'm', 'running');
    raise exception 'ai_runs status check missing';
  exception when check_violation then null;
  end;
  begin
    insert into public.ai_runs (module_id, model, cost_usd) values ('f2222222-0000-0000-0000-000000000001', 'm', -1);
    raise exception 'cost check missing';
  exception when check_violation then null;
  end;

  -- accepting a draft is a plain status update
  update public.exercises set status = 'active' where id = 'f3333333-0000-0000-0000-000000000001';
  assert (select count(*) from public.exercises where status = 'draft') = 0, 'draft accepted';
  update public.exercises set status = 'draft' where id = 'f3333333-0000-0000-0000-000000000001';
end;
$$;

-- user B sees nothing of A and cannot write into A's module
select pg_temp.act_as(:B);
do $$
begin
  assert (select count(*) from public.ai_runs) = 0, 'B must not see A runs';
  assert (select count(*) from public.exercises) = 0, 'B must not see A exercises';
  begin
    insert into public.ai_runs (module_id, model) values ('f2222222-0000-0000-0000-000000000001', 'm');
    raise exception 'B could create a run in A module';
  exception when foreign_key_violation or insufficient_privilege then null;
  end;
  update public.ai_runs set status = 'failed' where id = 'f4444444-0000-0000-0000-000000000001';
  update public.exercises set status = 'active' where id = 'f3333333-0000-0000-0000-000000000001';
end;
$$;

select pg_temp.act_as(:A);
do $$
begin
  assert (select status from public.ai_runs where id = 'f4444444-0000-0000-0000-000000000001') = 'queued', 'B update must not reach A run';
  assert (select status from public.exercises where id = 'f3333333-0000-0000-0000-000000000001') = 'draft', 'B update must not reach A draft';

  -- deleting a run keeps its exercises (the link is cleared); deleting the module removes both
  delete from public.ai_runs where id = 'f4444444-0000-0000-0000-000000000001';
  assert (select ai_run_id from public.exercises where id = 'f3333333-0000-0000-0000-000000000001') is null, 'ai_run_id cleared';
  assert (select count(*) from public.exercises) = 2, 'exercises survive run deletion';
  delete from public.modules where id = 'f2222222-0000-0000-0000-000000000001';
  assert (select count(*) from public.exercises) = 0, 'module delete cascades to exercises';
end;
$$;

reset role;
select 'ai tests passed' as result;
