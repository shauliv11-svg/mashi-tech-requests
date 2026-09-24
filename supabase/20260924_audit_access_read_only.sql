-- Read-only diagnostic. Run in the Supabase SQL editor as the project owner.
-- Returns one JSON result without names, emails, passwords, or auth tokens.
-- No policies, accounts, grants, or school records are changed.
with target_tables as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
    c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname in (
      'app_users', 'students', 'tech_requests', 'request_treatment_updates',
      'request_closures', 'school_devices', 'school_device_loans',
      'school_device_maintenance', 'school_device_availability_blocks'
    )
), profile_matches as (
  select p.id, p.active, p.role,
    count(a.id) as auth_matches,
    count(a.id) filter (where a.email_confirmed_at is not null) as confirmed_matches
  from public.app_users p
  left join auth.users a on lower(btrim(a.email)) = lower(btrim(p.email))
  group by p.id, p.active, p.role
), duplicate_profile_emails as (
  select lower(btrim(email))
  from public.app_users
  group by lower(btrim(email))
  having count(*) > 1
)
select jsonb_build_object(
  'checked_at', now(),
  'tables', (
    select jsonb_agg(jsonb_build_object(
      'name', t.table_name,
      'rls_enabled', t.rls_enabled,
      'rls_forced', t.rls_forced,
      'grants', (
        select jsonb_agg(jsonb_build_object(
          'role', role_name,
          'select', has_table_privilege(role_name, t.oid, 'SELECT'),
          'insert', has_table_privilege(role_name, t.oid, 'INSERT'),
          'update', has_table_privilege(role_name, t.oid, 'UPDATE'),
          'delete', has_table_privilege(role_name, t.oid, 'DELETE'),
          'truncate', has_table_privilege(role_name, t.oid, 'TRUNCATE')
        ))
        from unnest(array['anon', 'authenticated']) as roles(role_name)
      ),
      'policies', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', p.policyname, 'roles', p.roles, 'command', p.cmd,
          'permissive', p.permissive, 'using', p.qual, 'with_check', p.with_check
        ) order by p.policyname)
        from pg_policies p
        where p.schemaname = t.schema_name and p.tablename = t.table_name
      ), '[]'::jsonb)
    ) order by t.table_name)
    from target_tables t
  ),
  'profile_link_readiness', (
    select jsonb_build_object(
      'total_profiles', count(*),
      'active_profiles', count(*) filter (where active),
      'active_without_auth', count(*) filter (where active and auth_matches = 0),
      'active_with_multiple_auth_matches', count(*) filter (where active and auth_matches > 1),
      'active_with_unconfirmed_auth', count(*) filter (where active and auth_matches = 1 and confirmed_matches = 0),
      'active_admins_with_confirmed_auth', count(*) filter (where active and role = 'admin' and auth_matches = 1 and confirmed_matches = 1),
      'duplicate_normalized_profile_emails', (select count(*) from duplicate_profile_emails),
      'auth_user_id_column_exists', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'app_users' and column_name = 'auth_user_id'
      )
    ) from profile_matches
  )
) as access_audit;
