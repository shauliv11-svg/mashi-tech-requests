# Roadmap - Mashi Tech Requests

## Completed

- Status summary cards filter the request list by status.
- Request details open below the list in a wider panel.
- Request search covers request number, student, class, request type, submitter, content, attempted solution, and internal notes.
- Request management has structured filters for request number, subject, class, request type, submitter, and status.
- Staff request view separates requests the staff member opened from requests in their assigned classes.
- Staff request view includes a readable request preview without admin-only fields.
- Admin user management supports initial password setup and deleting/deactivating staff users.
- Student admin has search and request counts per student.
- Student admin has a per-student request history panel.
- Student device responsibility is split into responsibility text, phone, and email fields.
- Branding uses the Mashi logo and logo-dot colors.

## UX - Request Management

### In progress now
- Improve the request card content hierarchy for faster scanning during treatment meetings.
- Refine the request submission form into a calmer staff-first flow.

### Next
- Add saved filter presets or quick views if the team repeatedly uses the same filters.
- Add clearer empty states and follow-up prompts for staff-only request submission.

## Roles And Permissions

- Staff users can open requests and view their own requests plus requests for their assigned classes.
- Handlers can manage and close requests, but cannot manage users or students.
- Admins can manage requests, users, students, classes, and device/accessibility fields.

## Branding

- Keep the UI based on the Mashi logo.
- Avoid using the dark central blue as the dominant app color.
- Use light blue as the base color and the logo dots as action/status accents.

## Student And Device Data

- Completed: split `גורם אחריות מכשיר` into structured fields for responsibility text, phone, and email.
- Run `supabase/20260704_add_device_responsibility_contacts.sql` in Supabase so the new contact fields persist in production.
- Next: richer student search/history views if the team wants student-level maintenance reports.

## Notifications

- When a request is closed, send an email to the submitter with optional free text.
- Later: support templates for closing messages.
