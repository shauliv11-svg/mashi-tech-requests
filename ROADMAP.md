# Roadmap - Mashi Tech Requests

Last updated: 2026-09-24

## Active Roadmap - Reliability And Access Control

This section supersedes the historical roadmap below. It is based on the September code review and the subsequent email and assignment review. Findings were verified in source code, not by inspecting production database policies or sending live emails. Planning this work does not authorize a production migration or deployment.

Status: all phases below are planned unless explicitly marked otherwise. Implement and verify locally or in an isolated test environment before a reviewed production rollout. Do not reset school data or run the demo-seeding schema against production.

### Phase 0 - Manual Handler Assignment

Status: implemented locally; not pushed or verified against the live database.

- [x] Add an admin-only assignment selector inside request details, including removal of assignment.
- [x] Offer active handlers and admins; save only assignment and update timestamp.
- [x] Preserve an existing assignment when changing status to in-progress.
- [x] Pass TypeScript validation and four assignment regression checks.
- [ ] Verify assignment, reassignment, removal, persistence after reload, error feedback, and desktop/mobile usability.
- [ ] Verify handlers do not receive the admin assignment control. Database enforcement belongs to Phase 1.
- [ ] Deploy after verification and explicit release instruction.

### Phase 1 - Authentication And Permissions (Critical)

Goal: enforce access at the database/server, including direct requests that bypass the UI.

Increment 1 (local implementation, 2026-09-24): authenticate before profile lookup and school data loading; clear data on session changes; ignore stale load responses; replace database-load demo fallback with retry; keep password reset without a pre-login profile read. Public sign-up UI was removed: existing accounts use password reset and new accounts are created by admins. No SQL/policy changes or deployment are included in this increment. Database enforcement, field filtering, and Auth-ID linking remain pending.

Verification: eight mocked browser scenarios passed (anonymous/invalid login, valid login and reload/logout, unapproved account, failed load/retry, delayed response after logout, password-reset request, recovery/password update, mobile layout). The mobile login screenshot was visually inspected. Tests intercept all Supabase traffic and send no real emails.

Proposed role matrix, to finalize before implementation:

| Capability | Staff | Handler | Admin |
| --- | --- | --- | --- |
| Read requests | Own and assigned classes | All | All |
| Submit requests | Assigned classes | All students/classes | All students/classes |
| Treat and close requests | No | Yes | Yes |
| Internal treatment notes and device credentials | No | Yes | Yes |
| School equipment loans, returns, maintenance | No | Yes, including on behalf of others | Yes |
| Manage equipment inventory | No | No | Yes |
| Manage students and users | No | No | Yes |
| Assign handlers manually | No | No | Yes |
| Correct closure history and export reports | No | No | Yes |

- [x] Probe the configured database read-only: anonymous HEAD requests expose counts for users, students, requests, and school equipment. Evidence and limits are recorded in `ACCESS_REVIEW.md`.
- [x] Inspect owner-supplied policies/grants and Auth mapping (2026-09-24): eight permissive tables; closures have RLS with no policies; all 22 active profiles match confirmed Auth accounts, including five admins; no Auth-ID column yet.
- [ ] Independently confirm the deployed Vercel database matches the tested target.
- [ ] Link app profiles to stable Auth user IDs, with verified mapping of existing accounts.
- [x] Implement locally: authenticate before reading profiles/data, remove pre-login profile lookup, and reload data after session changes.
- [ ] Verify Increment 1 with real authorized test accounts before release; mocked browser tests do not verify production Auth/SMTP settings.
- [ ] Replace permissive policies and protect every table, including request closures. Include both visibility and allowed state transitions.
- [ ] Restore authorized closure inserts/reads as part of the restrictive policy migration; the currently installed empty policy set blocks normal client access. Revoke unnecessary TRUNCATE and anonymous grants as well.
- [ ] Keep role, active status, requester/author identity, and manual assignment under server/database enforcement.
- [ ] Separate internal notes and Apple credentials from staff-readable data; hiding fields in the UI is insufficient.
- [ ] Block disabled accounts even with an existing session, clear cached data on logout, and prevent self-promotion.
- [ ] Adapt password creation/reset and health checks to restricted access.
- [ ] Preserve an active administrator and validate user identity from stored records during admin operations.

Acceptance: an anonymous visitor sees no school data; staff cannot read another class, internal notes, or equipment data; direct unauthorized writes fail; handlers cannot administer accounts or edit closure history; admins retain expected workflows. Test login, reset, role change, and disabled sessions with isolated accounts. Back up and prepare a migration recovery procedure before rollout.

### Phase 2 - Reliable School Equipment State (High)

- [ ] Make checkout, return, and their device/maintenance updates atomic server/database operations.
- [ ] Enforce at most one open loan per device, including concurrent checkout attempts.
- [ ] Validate active device, borrower eligibility, and recurring availability blocks at checkout time using the school timezone.
- [ ] Preserve a current loan when resolving an older maintenance issue; closing an issue must not automatically mark a borrowed device available.
- [ ] Account for other unresolved blocking issues before restoring availability.
- [ ] Keep return notes and maintenance tickets consistent; never report full success when ticket creation fails.
- [ ] Check loan and maintenance history when deleting users; deactivate where needed without partially deleting the Auth account.

Acceptance: two simultaneous checkouts produce one loan; a failed multi-step operation leaves no partial state; a return with a note creates the corresponding maintenance item; closing an old issue cannot release a currently borrowed device; user deletion preserves loan history and a consistent login/profile state.

### Phase 3 - Request Closure And History Integrity (High)

- [ ] Save request closure and its journal entry in one transaction, with server-generated time and verified actor.
- [ ] Prevent duplicate closure attempts for the same open-to-closed transition while allowing a new event after a legitimate reopening.
- [ ] Avoid overwriting unrelated edits from stale request data; add conflict detection to shared updates.
- [ ] Record who corrected a historical closure, when, and the previous values.
- [ ] Check student history in the database before deletion/deactivation, including concurrent request creation.
- [ ] Decide the retention rule for deleting requests with closure history; current cascading deletion removes journal entries and affects reports.

Acceptance: concurrent closure attempts produce one event; interrupted operations leave request and journal consistent; reopening and reclosing creates a second legitimate event; student removal preserves historical links; admin corrections are traceable.

### Phase 4 - Reliable Closure Emails (High, After Phase 3)

Current findings: server-side sender verifies active handler/admin and uses the stored requester address. No persistent delivery status, duplicate protection, or retry exists. Local SMTP configuration is absent; production delivery has not been verified.

- [ ] Save a pending email job with the closure transaction when sending is requested; snapshot recipient and message for that closure event.
- [ ] Process jobs on the server independently of the browser, with bounded retries and coordination between workers.
- [ ] Track pending, accepted by mail server, failed, and not requested states, timestamps, attempts, and safe error details.
- [ ] Add permission-checked retry and duplicate protection per closure event. Handle ambiguous SMTP outcomes without promising exactly-once delivery.
- [ ] Show email status in request details; keep a closed request closed when sending fails.
- [ ] Handle browser/network failures without leaving the close dialog stuck on saving.
- [ ] Verify production configuration without exposing secrets; send a test only to an explicitly approved recipient.

Acceptance: closing the browser does not lose a queued email; failures are visible and retryable; repeat clicks do not queue duplicate jobs; no internal notes are sent; mail-server acceptance is not labelled confirmed inbox delivery. Auth/password-reset emails are a separate Supabase flow and need their own smoke test.

### Phase 5 - Fresh Data And Complete Reports (Medium)

- [ ] Add pagination/server queries so lists, history, and exports do not silently stop at a response row limit.
- [ ] Refresh shared state through subscriptions or controlled refetching, including after reconnect and window focus.
- [ ] Generate admin reports from the full authorized dataset rather than the currently loaded screen state.
- [ ] Remove production fallback to demo or in-memory-only writes when database loading fails; provide explicit retry/error states.

Acceptance: verify a dataset larger than one response page; report counts match the database for all-time and date-filtered exports; changes appear in a second session without a manual page reload; connection failures never look like persisted success.

### Phase 6 - Forms And Consistent Confirmations (Medium)

- [ ] Keep student, equipment, checkout, and return forms open with entered values when saving fails.
- [ ] Close forms only after confirmed success; prevent duplicate submissions and restore controls after errors.
- [ ] Replace remaining browser confirmations for request/user deletion with in-app dialogs.
- [ ] Verify modal stacking, keyboard access, scrolling, and save-button reachability on small screens.

Acceptance: failed saves retain input and explain recovery; double clicks do not duplicate operations; all confirmation dialogs are in-app; primary actions remain reachable on mobile with the keyboard open.

## Delivery Order And Release Gate

Finish Phase 0 verification, then Phase 1, Phases 2-3, Phase 4, and Phases 5-6. The assignment fix can ship independently after its checks; it does not complete database authorization.

For each phase: mark implementation and verification separately, run focused regression checks, document required SQL/configuration, and obtain a release instruction before production changes. Use isolated test data for concurrency and failure tests. Do not send real notifications or delete school records as part of QA.

The next substantial task is Phase 1: inspect deployed policies and finalize class-level visibility, then implement the authentication/loading changes and access policies together.

## Historical Roadmap (2026-07-22)

The content below is retained as project history, not current priorities or verification of the live deployment. In particular, the old decision to defer permission hardening is superseded by Phase 1 above. The portal, school equipment, structured closures, Excel reports, and extended student fields were added after this historical snapshot.

<details>
<summary>July implementation notes and backlog</summary>

## Current Production State

The app is deployed on Vercel and uses Supabase for data and authentication.

Production URL:
https://mashi-tech-requests.vercel.app/

Recent production commits:
- `64257a5` - redesigned student directory and import template.
- `72b028f` - improved student repair history search.
- `4b3d167` - added close button for open request details.
- `e14a260` - added chronological treatment log per request.
- `d77f382` / `297145c` - mobile navigation updates.

## Completed

### Login And Users

- Supabase Auth with email/password login is active.
- Users are matched to internal `app_users` records by email.
- Roles exist: staff, handler, admin.
- Admin can create users with an initial password.
- Admin can delete/deactivate users while preserving request history.
- Staff can be assigned to more than one class.

### Roles And Permissions

- Staff users can open requests.
- Staff users can view their own requests and requests for their assigned classes.
- Handlers can manage and close requests, without managing users/students.
- Admins can manage requests, users, students, device/accessibility data, and deletion flows.

### Request Submission

- Staff request flow is step-by-step and simpler than the admin screens.
- Student selection is from a dropdown.
- Class is derived automatically from the selected student.
- Class/group requests are still possible.
- Urgency field was removed.

### Request Management

- Request dashboard has status cards.
- Clicking status cards filters the list.
- Status label `ממתין למידע` was replaced with `נשלח לתיקון`.
- Request cards open details inline under the selected card.
- Open request details can be closed/collapsed.
- Cards start closed by default.
- Admin can delete requests.
- Moving a request to `בטיפול` assigns the current handler as `מטפל`.
- Request details show requester, handler, student/device details, attempted solution, internal note, closing message, and status controls.

### Treatment Log

- Each request can have a chronological treatment log.
- Updates are stored as separate rows and do not overwrite previous updates.
- Each log update includes author and timestamp.
- The latest log update also updates the internal note summary.
- SQL migration exists: `supabase/20260705_add_request_treatment_updates.sql`.

### Notifications

- Closing a request can send an email to the submitter.
- Email uses server-side SMTP through Gmail/Google Workspace app password.
- Closing modal supports free text message to the requester.
- Email may land in spam until sender reputation/domain trust improves.

### Student And Device Data

- Student records include:
  - name
  - class
  - device type
  - care provider
  - accessibility date
  - device responsibility
  - responsibility phone
  - responsibility email
  - accessories
  - Apple ID/password for iPad/iPad Pro records
- Device responsibility was split into text, phone, and email.
- Student search supports name, class, device, care provider, responsibility fields, request count, and repair count.
- Student repair count is based on requests of type `תקלה בציוד`.
- Student cards replaced the old student table.
- Clicking a student card opens a student-file modal.
- Student-file modal shows device/accessibility details, responsibility details, request stats, and full request history.
- Add/edit student is now a modal.
- Import students from table is now a modal.
- Import modal includes a downloadable CSV template for Excel/Google Sheets.
- Import supports upload of CSV/TSV/TXT and manual paste.

### Mobile And UI

- Mobile bottom navigation exists.
- Mobile nav labels were clarified and icons added.
- Request cards and details are usable on mobile.
- Branding uses the Mashi logo.
- Color system uses light blue as the base and the logo dots as accents.
- The dark logo blue should not become the dominant app color.

## Database / Setup Notes

- Daily Vercel Cron health check calls `/api/health` to verify Supabase responds.

Run in Supabase if not already done:

- `supabase/20260704_add_device_responsibility_contacts.sql`
- `supabase/20260705_add_request_treatment_updates.sql`

Vercel environment variables currently expected:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Gmail/SMTP variables for request-closed emails, as documented in `README.md`.

## Next Priority - Users Page Redesign

Goal: make user management feel consistent with the redesigned student page while keeping the table where it is useful.

Planned changes:

- Keep users as a table, because role/class comparison works well in rows.
- Redesign the table visually so it feels less plain.
- Move `הוספת משתמשת` into a modal/popup.
- Modal fields:
  - full name
  - email
  - role
  - assigned classes, comma-separated or improved multi-class control
  - initial password
- Add clearer visual role badges:
  - staff
  - handler
  - admin
- Add better action buttons for edit/delete/deactivate.
- Consider adding search/filter by name, email, role, class, active/inactive.
- Preserve existing admin-only logic and Supabase Auth user creation.

## Near-Term Product Backlog

### Request Management

- Add structured filters inside request management again, but in a cleaner way than the removed broad search.
- Consider filters by request number, student/class, submitter, request type, handler, status.
- Add saved quick filters if the team repeatedly uses the same views.
- Improve empty states and follow-up prompts.
- Consider opening request details in a side/bottom drawer for dense desktop workflows.

### Student Directory

- Check the new student cards on real data.
- Validate CSV template with a real school spreadsheet.
- Consider supporting `.xlsx` upload later if CSV is not enough.
- Consider adding export of current student directory.
- Consider printable/shareable student maintenance report.

### Treatment Log

- Verify treatment updates persist in production after SQL migration is run.
- Consider adding edit/delete treatment updates for admins only.
- Consider showing the latest treatment update directly on request cards.
- Consider adding treatment log to student history view.

### Notifications

- Add optional email when request moves to `בטיפול`.
- Add optional email when request moves to `נשלח לתיקון`.
- Add reusable closing message templates.
- Consider a sender/domain setup later to reduce spam placement.

### Permissions And Security

- Current UI follows the intended role split.
- Supabase policies are still MVP-permissive.
- User said strengthening Supabase policies is not needed right now.
- Before broader real-world deployment, replace permissive RLS with role-based policies.

### UX Polish

- Continue aligning pages with Mashi logo and dot colors.
- Keep operational screens dense but calm.
- Avoid marketing-style landing sections.
- Keep cards 8-18px radius depending on current design, no nested card clutter.
- Ensure mobile text does not overflow buttons/cards.

## Tuesday Handoff Notes

Best next coding task:

1. Redesign `UsersAdmin`.
2. Move add-user form into a modal.
3. Keep user table but improve layout, badges, and actions.
4. Run `npm run build`.
5. Preview locally at `http://localhost:3000`.
6. Push to GitHub/Vercel after approval.

Useful files:

- `app/page.tsx` - all main UI components, including `UsersAdmin` and `StudentsAdmin`.
- `app/globals.css` - shared styling, modal styling, student cards, mobile nav.
- `app/api/admin/users/route.ts` - admin user creation/deactivation through Supabase Auth.
- `supabase/schema.sql` - base schema.
- `README.md` - deployment/auth/email setup notes.

Open questions for Tuesday:

- Should user classes remain comma-separated text, or become checkboxes/multi-select from existing student classes?
- Should inactive users stay visible by default or move behind a filter?
- Should handlers have assigned classes too, or only staff?
- Should a newly created user be forced to change password later, or is admin-defined initial password enough for now?

</details>
