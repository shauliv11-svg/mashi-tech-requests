# Roadmap - Mashi Tech Requests

Last updated: 2026-07-22

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
