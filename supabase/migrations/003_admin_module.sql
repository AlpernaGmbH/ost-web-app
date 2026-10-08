-- Administration module: collects every timetable event that matches no subject.
-- Idempotent: safe to run more than once.

alter table public.modules drop constraint if exists modules_kind_check;
alter table public.modules
  add constraint modules_kind_check check (kind in ('course', 'language', 'admin'));

-- one "Administration" module per existing semester (new accounts get it when the semester is set up)
insert into public.modules (user_id, semester_id, code, name, ects, kind, color, ical_match, sort_order)
select s.user_id, s.id, 'ADM', 'Administration', 0, 'admin', '#64748b', null, 99
from public.semesters s
where not exists (select 1 from public.modules m where m.semester_id = s.id and m.code = 'ADM');
