# Access Review - 2026-09-24

## Verified Against The Configured Database

Used the locally configured Supabase URL and public anon key with session persistence disabled. Sent read-only HEAD queries requesting exact counts and selecting only `id`. No row contents were downloaded, no authenticated account was used, and no writes or notifications were attempted.

| Table | Rows visible without login |
| --- | ---: |
| app_users | 22 |
| students | 54 |
| tech_requests | 7 |
| request_treatment_updates | 0 |
| request_closures | 0 |
| school_devices | 3 |
| school_device_loans | 4 |
| school_device_maintenance | 1 |
| school_device_availability_blocks | 0 |

The positive counts confirm anonymous row visibility on the populated tables. A successful zero-row result does not distinguish an empty table from RLS-filtered rows. These checks do not establish write access, field-level access, or the precise installed policies. The configured database is the test target; the currently deployed Vercel environment was not independently inspected.

## Required Read-Only Metadata Check

Run `supabase/20260924_audit_access_read_only.sql` in the project's SQL editor. It returns one JSON value containing installed RLS policies, effective table grants, and aggregate readiness for mapping app profiles to Auth accounts. It returns no names, emails, credentials, or account IDs.

No management token, direct database connection, or service-role credential is available locally. The owner ran the diagnostic and supplied its JSON result, timestamped `2026-09-24T11:00:58.400285+00:00`. The installed policy catalog and aggregate Auth mapping are now verified from that result.

## Owner-Supplied Metadata Results

- All nine tables have RLS enabled. Eight have a permissive `ALL` policy for `public`, with both `USING (true)` and `WITH CHECK (true)`.
- Both `anon` and `authenticated` have SELECT, INSERT, UPDATE, DELETE, and TRUNCATE table privileges on all nine tables.
- The eight permissive tables therefore allow anonymous row reads and writes, subject to normal constraints. This was established from configuration, not by attempting a write.
- `request_closures` has RLS enabled and no policies. Ordinary anonymous/authenticated row access is denied despite table grants. A zero-row response from the earlier probe was not evidence that this table was empty. The direct client insert used when closing requests is expected to fail under these policies; the failure was not reproduced against a real request.
- TRUNCATE grants must also be revoked. RLS does not protect TRUNCATE; the presence of this grant is not proof that the HTTP API exposes a truncate operation.
- There are 22 profiles, all active. Every profile matches exactly one confirmed Auth account; there are no normalized-email duplicates or missing Auth matches. Five active admins have confirmed accounts.
- `app_users.auth_user_id` does not yet exist. These aggregate results support preparing a backfill; the migration must recheck them transactionally before applying it, because account data can change.

The supplied output does not independently verify the currently deployed Vercel database target, other exposed functions/views, or past access. It is not evidence of a past breach.

## Proposed Access Contract

- Deny school data access to anonymous and inactive users.
- Staff can read their own requests and requests for their assigned classes, and create requests for those classes. For staff with no assigned class, default to no student selection until an admin assigns classes. Confirm this product rule before enforcing it.
- Staff-readable request data excludes internal notes and treatment history. Student data exposed for selection excludes Apple credentials and unnecessary contact details.
- Handlers can manage requests and school equipment loans/maintenance, including on behalf of active staff. They cannot manage accounts, student records, or equipment inventory, manually assign handlers, correct closure records, or export closure reports.
- Admins have those management capabilities, with protection against disabling/deleting the last active admin.
- Identity, role, and active status come from the verified Auth account and stored profile. Clients cannot supply trusted author/requester identities or alter privileged fields directly.

## Implementation Dependencies

1. Inspect metadata and resolve missing/ambiguous Auth mappings before adding a unique Auth-ID profile link.
2. Change login to authenticate before looking up a profile. Current `findApprovedUserByEmail` runs before authentication and would fail after anonymous access is removed.
3. Load data only after authentication/profile validation, clear cached school data on session changes, cancel obsolete requests, and avoid production demo fallbacks.
4. Split private fields into protected data or restrict base-table reads and expose explicit authorized projections. RLS restricts rows, not individual columns.
5. Enforce role-specific operations and allowed field changes in database/server functions, including handler assignment. Row ownership alone is not sufficient for write authorization.
6. Review dependent health checks, password creation/reset, reports, and admin APIs. Service-role APIs must enforce authorization themselves.
7. Apply coordinated app and SQL changes to an isolated test environment and test all roles, including direct API attempts and disabled sessions, before a separately authorized production rollout.

## Scope Of This Step

The read-only exposure check and owner-supplied metadata inspection are complete. Database implementation and role-based verification remain pending. The handler-assignment fix and Increment 1 were pushed in commit 1df7e1a; deployment was not independently verified. No production setting or policy was changed by this work.

The coordinated fix must both remove the eight permissive policies and supply explicit closure policies. Do not fix the closure failure by adding another unrestricted policy, and do not revoke anonymous access before the application's pre-login reads have been removed. Production rollout requires the matched app/SQL changes and verified role tests.

## Increment 1 - Local Application Preparation

Implemented authenticated profile lookup before school data reads, empty initial state for configured databases, cancellation of obsolete load responses, clearing data on session changes, and retryable load failures instead of demo data. Password reset no longer queries profiles before authentication. Public self-registration was removed from the login screen; all 22 existing profiles already have confirmed Auth accounts, and admins create new accounts through the existing admin API.

This increment does not enforce database permissions, restrict fields per role, backfill Auth IDs, or fix closure policies. It was pushed in commit 1df7e1a; deployment is unverified. Browser regression tests in `tests/auth-flow.cjs` intercept all Supabase requests and never use real accounts or send mail. Verify an authorized account in the actual deployment environment as well.

All eight browser scenarios passed against the local dev server, including recovery links and stale responses after logout. Mobile layout was also inspected at 390 x 844. To repeat, start the dev server on port 3006, make `playwright` available in Node's module path, and run `node tests/auth-flow.cjs`. Set `AUTH_TEST_BROWSER_CHANNEL=chrome` to use an installed Chrome browser. `AUTH_TEST_URL` may point only to localhost or 127.0.0.1.

## Increment 2 - Anonymous Boundary Preparation (2026-09-27)

The local health endpoint now uses the server service key without an anonymous
fallback, returns no counts or row data, and sanitizes network failures. Six
mocked route tests and TypeScript validation passed.

`supabase/20260927_block_anonymous_access.sql` is a locally tested draft. It revokes
PUBLIC/anon table grants, adds restrictive anonymous-deny policies, and revokes
authenticated TRUNCATE. It keeps existing authenticated policies intact and
aborts transactionally on missing tables or unexpected effective grants.

All 14 PostgreSQL scenarios passed against in-memory PGlite using synthetic
fixtures that reproduce the audited grants and policies. They execute the real
migration and test anonymous CRUD/TRUNCATE denial, existing authenticated access,
service reads, unchanged rows/closure restrictions, repeat execution, table and
column grant defense, and rollback on missing tables or unexpected privileges.
Run `npm run test:access` to repeat them together with the six health tests.
Supabase Auth/PostgREST and the full deployed schema were not exercised; isolated
Supabase integration remains a release gate.

This is an intermediate reduction of exposure, not completion of Phase 1.
Authenticated users remain overprivileged; disabled/unapproved authenticated
accounts, role escalation, private fields, exposed views/functions, and closure
access still need database enforcement. No production SQL or deployment was
performed in this increment. See `supabase/ACCESS_ROLLOUT.md` before rollout.
