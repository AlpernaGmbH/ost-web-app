-- Migration 003 against pre-existing data: backfill adds one ADM module per semester and re-running changes nothing.
-- Runs after all migrations (run.sh); the data below is created as the postgres role, like the SQL editor does.
insert into auth.users (id, email) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test');
insert into public.semesters (id, user_id, name, start_date) values
  ('99999999-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'HS26', '2026-09-14'),
  ('99999999-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'FS27', '2027-02-15');
insert into public.modules (user_id, semester_id, code, name, kind) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-0000-0000-0000-000000000001', 'WMS', 'WMS', 'course');
\i supabase/migrations/003_admin_module.sql
\i supabase/migrations/003_admin_module.sql
do $$
begin
  assert (select count(*) from public.modules where semester_id = '99999999-0000-0000-0000-000000000001' and code = 'ADM') = 1, 'one ADM in HS26';
  assert (select count(*) from public.modules where semester_id = '99999999-0000-0000-0000-000000000002' and code = 'ADM') = 1, 'one ADM in FS27';
  assert (select count(*) from public.modules where semester_id = '99999999-0000-0000-0000-000000000001') = 2, 'WMS kept, ADM added';
  assert (select kind from public.modules where code = 'ADM' and semester_id = '99999999-0000-0000-0000-000000000001') = 'admin', 'kind admin';
  assert (select user_id from public.modules where code = 'ADM' and semester_id = '99999999-0000-0000-0000-000000000001') = 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owned by the semester owner';
end;
$$;
\echo 'migration 003 backfill: OK'
