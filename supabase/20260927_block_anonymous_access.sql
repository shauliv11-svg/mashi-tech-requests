-- DRAFT: validate in an isolated Supabase project before production rollout.
-- Passed 14 in-memory PostgreSQL scenarios; Supabase integration remains pending.
-- Deploy authenticated loading AND the service-role health endpoint first.
-- This closes anonymous table access only; it is NOT full role authorization.
-- Existing authenticated policies (including absent closure policies) are kept.
-- No school rows, Auth users, sequences, or existing policies are removed.
begin;

do $$
declare
  table_name text;
  table_oid regclass;
begin
  foreach table_name in array array[
    'app_users', 'students', 'tech_requests', 'request_treatment_updates',
    'request_closures', 'school_devices', 'school_device_loans',
    'school_device_maintenance', 'school_device_availability_blocks'
  ] loop
    table_oid := to_regclass(format('public.%I', table_name));
    if table_oid is null then
      raise exception 'Missing required table: %; no changes applied', table_name;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    -- A restrictive false policy is ANDed with permissive policies. This also
    -- denies anonymous rows if table/column grants are accidentally restored.
    execute format('drop policy if exists mashi_deny_anonymous on public.%I', table_name);
    execute format(
      'create policy mashi_deny_anonymous on public.%I as restrictive for all to anon using (false) with check (false)',
      table_name
    );

    execute format('revoke all privileges on table public.%I from public, anon', table_name);
    execute format('revoke truncate on table public.%I from authenticated', table_name);

    -- Fail closed if unexpected inherited grants prevent the revocation.
    if has_table_privilege('anon', table_oid, 'SELECT')
      or has_table_privilege('anon', table_oid, 'INSERT')
      or has_table_privilege('anon', table_oid, 'UPDATE')
      or has_table_privilege('anon', table_oid, 'DELETE')
      or has_table_privilege('anon', table_oid, 'TRUNCATE')
      or has_table_privilege('authenticated', table_oid, 'TRUNCATE') then
      raise exception 'Unexpected inherited privileges on %; no changes applied', table_name;
    end if;

    -- Do not silently break existing authenticated grants through PUBLIC.
    if not (
      has_table_privilege('authenticated', table_oid, 'SELECT')
      and has_table_privilege('authenticated', table_oid, 'INSERT')
      and has_table_privilege('authenticated', table_oid, 'UPDATE')
      and has_table_privilege('authenticated', table_oid, 'DELETE')
      and has_table_privilege('service_role', table_oid, 'SELECT')
    ) then
      raise exception 'Unexpected authenticated/service grants on %; no changes applied', table_name;
    end if;
  end loop;
end;
$$;

commit;
