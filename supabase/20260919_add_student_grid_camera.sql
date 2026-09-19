alter table students
  add column if not exists notes text,
  add column if not exists grid_type text,
  add column if not exists camera_type text;

alter table students
  drop constraint if exists students_grid_type_check;

alter table students
  add constraint students_grid_type_check
  check (grid_type is null or grid_type in ('כן', 'לא', 'טאצ''ט'));

alter table students
  drop constraint if exists students_accessibility_date_check;

alter table students
  drop constraint if exists students_care_provider_check;

alter table students
  add constraint students_care_provider_check
  check (care_provider is null or care_provider in ('משרד הבריאות', 'משרד החינוך', 'מחוץ למשי', 'קופת חולים כללית'));
