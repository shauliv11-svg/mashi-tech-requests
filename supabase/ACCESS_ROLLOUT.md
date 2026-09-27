# Increment 2: Anonymous Access Boundary

Status: local PostgreSQL verification passed, Supabase integration pending.
The actual SQL passed 14 scenarios in an isolated in-memory PostgreSQL engine
with synthetic tables and the audited grants/policies. No school database was
contacted. Do not run it in production until the following gates pass.

## Scope

- Nine audited public tables: block anonymous row access, even if a permissive
  policy still exists, using a restrictive policy plus grant revocation.
- Remove PUBLIC/anon table privileges and authenticated TRUNCATE privileges.
- Preserve all records and current authenticated CRUD grants/policies. Abort
  the entire transaction if a required table/grant is missing or an inherited
  unsafe table grant remains. Running the script twice should be safe.
- Adapt `/api/health` to a server-only key, with no public-key fallback.

Not addressed: authorization between authenticated accounts, inactive accounts,
private fields, identity linking, views/RPCs, concurrent operations, or closure
policies. In particular, `request_closures` remains inaccessible if it still has
no permissive policies. Do not present this migration as full security hardening.

## Verification Before Release

1. Confirm the production Vercel project and Supabase target without disclosing
   keys. Confirm a server-only `SUPABASE_SERVICE_ROLE_KEY` is configured.
2. Verify the already-pushed authenticated-loading change with approved real
   accounts: login, refresh, password recovery, and logout. Do not send test mail
   to another person's address.
3. Create an isolated Supabase project with the same schema/policies and synthetic
   accounts/data only. Save its baseline grants/policies using the read-only audit.
4. Apply `20260927_block_anonymous_access.sql` there, then apply it a second time.
   Repeat with one required table absent; confirm the transaction rolls back all
   earlier changes. Do not intentionally remove tables in production.
5. With the public anon key and no session, confirm SELECT/INSERT/UPDATE/DELETE
   requests fail on all nine tables. Use synthetic rows for write attempts.
   Confirm both browser roles have no effective TRUNCATE privilege.
6. Check the restrictive policy in isolation: within a rolled-back test-only SQL
   transaction, temporarily grant anon SELECT and SET LOCAL ROLE anon; confirm
   seeded school rows remain invisible. Never restore anon grants in production.
7. Confirm staff, handler, and admin login/loading still work in the isolated
   app. Compare authorized workflows with the baseline; test new user creation,
   user editing, assignment, requests, and loans. This is regression testing,
   not proof of the future role restrictions. Record the existing closure-policy
   failure separately; do not resolve it by adding an unrestricted policy.
8. Deploy the health-route change only after an explicit release instruction.
   Confirm `/api/health` returns 200 with the server key. Test missing-key and
   network-error behavior locally, never by removing production secrets.
9. Take a database backup and export current grants/policies, then obtain
   explicit approval before applying the SQL to the verified production target.
   Re-run the read-only audit and verify anonymous denial and approved logins.

## Failure And Recovery

The migration uses a single transaction: any error before COMMIT rolls back its
changes. Stop on errors; do not paste fragments or grant broad access to fix them.
If the app fails after a successful COMMIT, retain the anonymous boundary and
diagnose configuration/authenticated permissions. A health-only failure should
be resolved through server configuration, not by reopening school data.
Any policy/grant restoration must be reviewed against the saved baseline and
separately approved; a blanket rollback to public access is not provided.

## Local Checks

Run `npm run test:access` for 14 PostgreSQL scenarios plus six isolated health
route checks. The PostgreSQL tests execute the migration itself with
[`@electric-sql/pglite`](https://pglite.dev/docs/), a development-only dependency.
They create no persistent database and use no environment secrets or network.

Covered: baseline anonymous exposure, all nine tables' anonymous CRUD denial,
TRUNCATE denial for both browser roles, unchanged authenticated CRUD, unchanged
closure restrictions, service-role reads, record preservation, repeat execution,
restrictive-policy protection after table/column grants, atomic rollback when a
table is missing, inherited privilege rejection, and unexpected grant rejection.

Limitations: fixtures model the audited permission structure, not the complete
school schema. These tests do not exercise Supabase Auth, PostgREST, deployed
role membership, exposed views/functions, or end-to-end app workflows. Passing
them does not replace isolated Supabase and approved-account verification.

`npx tsc --noEmit --incremental false` checks TypeScript without changing the
running Next.js build cache.
