alter table students
  add column if not exists device_responsibility_phone text,
  add column if not exists device_responsibility_email text;
