-- RLS / constraint tests for migration 001. Runs with ON_ERROR_STOP; any failed assert aborts.
-- Users: A and B. Rows written as A must be invisible and untouchable for B.

\set A '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set B '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

insert into auth.users (id, email) values (:A, 'a@test'), (:B, 'b@test');

-- helper to act as a given user (RLS applies because role = authenticated)
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  execute 'set role authenticated';
end;
$$;

-- ------------------------------------------------------------------ user A writes
select pg_temp.act_as(:A);

insert into public.semesters (id, name, start_date)
values ('11111111-0000-0000-0000-000000000001', 'HS26', '2026-09-14');
insert into public.modules (id, semester_id, code, name)
values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'WMS', 'Wirtschaftsmathematik');
insert into public.lectures (id, semester_id, module_id, title, starts_at, ical_uid, source)
values ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001', 'WMS 1', '2026-09-15 08:15+02', 'uid-1', 'ical');
insert into public.notes (lecture_id, content_md) values ('33333333-0000-0000-0000-000000000001', '# Hallo $x^2$');
insert into public.documents (module_id, storage_path, filename, size_bytes, sha256)
values ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/x.pdf', 'x.pdf', 10, 'abc');
insert into storage.objects (bucket_id, name) values ('documents', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/x.pdf');

insert into public.decks (id, module_id, name)
values ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Unit 1');
insert into public.cards (id, module_id, deck_id, front_md, back_md, data)
values ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
        '44444444-0000-0000-0000-000000000001', 'to run', 'rennen; laufen', '{"example": "I run daily."}');
insert into public.card_reviews (card_id, rating, mode, interval_before, interval_after, ease_before, ease_after)
values ('55555555-0000-0000-0000-000000000001', 2, 'write', 0, 1, 2.5, 2.5);

do $$
begin
  assert (select count(*) from public.semesters) = 1, 'A sees own semester';
  assert (select user_id from public.modules limit 1) = auth.uid(), 'user_id defaults to auth.uid()';
end;
$$;

-- idempotent upsert on (user_id, ical_uid): the iCal sync relies on this
insert into public.lectures (user_id, semester_id, module_id, title, starts_at, ical_uid, source)
values (auth.uid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
        'WMS 1 (verschoben)', '2026-09-15 10:15+02', 'uid-1', 'ical')
on conflict (user_id, ical_uid) do update set title = excluded.title, starts_at = excluded.starts_at;
do $$
begin
  assert (select count(*) from public.lectures) = 1, 'upsert twice keeps one lecture';
  assert (select title from public.lectures) = 'WMS 1 (verschoben)', 'upsert updated the row';
end;
$$;

-- manual lectures (ical_uid null) never collide with each other
insert into public.lectures (semester_id, title, starts_at)
values ('11111111-0000-0000-0000-000000000001', 'manuell 1', now()),
       ('11111111-0000-0000-0000-000000000001', 'manuell 2', now());
do $$
begin
  assert (select count(*) from public.lectures) = 3, 'manual lectures can coexist';
end;
$$;

-- migration 003: administration module kind is accepted, other kinds still are not
do $$
begin
  insert into public.modules (semester_id, code, name, kind, ects)
  values ('11111111-0000-0000-0000-000000000001', 'ADM', 'Administration', 'admin', 0);
  begin
    insert into public.modules (semester_id, code, name, kind) values ('11111111-0000-0000-0000-000000000001', 'BAD', 'Bad', 'unknown');
    raise exception 'expected unknown module kind to fail';
  exception when check_violation then null;
  end;
  -- only one module per code and semester
  begin
    insert into public.modules (semester_id, code, name, kind) values ('11111111-0000-0000-0000-000000000001', 'ADM', 'Zweite', 'admin');
    raise exception 'expected duplicate code to fail';
  exception when unique_violation then null;
  end;
end;
$$;

-- W01 must start on a Monday
do $$
begin
  begin
    insert into public.semesters (name, start_date) values ('Dienstag', '2026-09-15');
    raise exception 'expected monday check to fail';
  exception when check_violation then null;
  end;
end;
$$;

-- same file twice in one module is rejected
do $$
begin
  begin
    insert into public.documents (module_id, storage_path, filename, size_bytes, sha256)
    values ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/y.pdf', 'y.pdf', 10, 'abc');
    raise exception 'expected duplicate sha256 to fail';
  exception when unique_violation then null;
  end;
end;
$$;

-- deck names are unique per module; ratings are 0..3; cards need a non-empty front
do $$
begin
  begin
    insert into public.decks (module_id, name) values ('22222222-0000-0000-0000-000000000001', 'Unit 1');
    raise exception 'expected duplicate deck name to fail';
  exception when unique_violation then null;
  end;
  begin
    insert into public.card_reviews (card_id, rating, mode, interval_before, interval_after, ease_before, ease_after)
    values ('55555555-0000-0000-0000-000000000001', 7, 'write', 0, 1, 2.5, 2.5);
    raise exception 'expected invalid rating to fail';
  exception when check_violation then null;
  end;
  begin
    insert into public.cards (module_id, front_md, back_md) values ('22222222-0000-0000-0000-000000000001', '', 'x');
    raise exception 'expected empty front to fail';
  exception when check_violation then null;
  end;
end;
$$;

-- storage: A may not write into B's folder
do $$
begin
  begin
    insert into storage.objects (bucket_id, name) values ('documents', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/evil.pdf');
    raise exception 'expected storage RLS to block foreign folder';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ------------------------------------------------------------------ user B must see nothing
reset role;
select pg_temp.act_as(:B);

do $$
declare t text;
begin
  foreach t in array array['semesters', 'modules', 'lectures', 'notes', 'documents', 'decks', 'cards', 'card_reviews'] loop
    declare n int;
    begin
      execute format('select count(*) from public.%I', t) into n;
      assert n = 0, format('B must not see rows of %s (saw %s)', t, n);
    end;
  end loop;
  assert (select count(*) from storage.objects) = 0, 'B must not see A''s files';
end;
$$;

-- B cannot update or delete A's rows (0 rows affected, no error)
do $$
declare n int;
begin
  update public.modules set name = 'hacked'; get diagnostics n = row_count;
  assert n = 0, 'B must not update A''s modules';
  delete from public.lectures; get diagnostics n = row_count;
  assert n = 0, 'B must not delete A''s lectures';
  delete from storage.objects; get diagnostics n = row_count;
  assert n = 0, 'B must not delete A''s files';
  update public.cards set front_md = 'hacked'; get diagnostics n = row_count;
  assert n = 0, 'B must not update A''s cards';
  delete from public.card_reviews; get diagnostics n = row_count;
  assert n = 0, 'B must not delete A''s reviews';
end;
$$;

-- B cannot insert rows owned by A
do $$
begin
  begin
    insert into public.semesters (user_id, name, start_date)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fake', '2026-09-14');
    raise exception 'expected RLS with-check to block foreign user_id';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- anon (no login): Supabase grants table privileges to anon by default, but no policy targets
-- anon, so RLS must hide every row and block every write
reset role;
set role anon;
do $$
declare t text; n int;
begin
  foreach t in array array['semesters', 'modules', 'lectures', 'notes', 'documents', 'decks', 'cards', 'card_reviews'] loop
    execute format('select count(*) from public.%I', t) into n;
    assert n = 0, format('anon must not see rows of %s (saw %s)', t, n);
  end loop;
  begin
    insert into public.semesters (user_id, name, start_date)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon', '2026-09-14');
    raise exception 'expected anon insert to be blocked';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ------------------------------------------------------------------ cascades (as A)
select pg_temp.act_as(:A);
delete from public.modules where id = '22222222-0000-0000-0000-000000000001';
do $$
begin
  assert (select count(*) from public.documents) = 0, 'documents cascade with module';
  assert (select count(*) from public.decks) = 0, 'decks cascade with module';
  assert (select count(*) from public.cards) = 0, 'cards cascade with module';
  assert (select count(*) from public.card_reviews) = 0, 'reviews cascade with cards';
  assert (select count(*) from public.lectures where module_id is not null) = 0, 'lectures keep rows, module_id set null';
  assert (select count(*) from public.notes) = 1, 'notes survive module deletion (lecture still exists)';
end;
$$;
delete from public.lectures where id = '33333333-0000-0000-0000-000000000001';
do $$
begin
  assert (select count(*) from public.notes) = 0, 'notes cascade with lecture';
end;
$$;
reset role;

\echo 'RLS tests: OK'
