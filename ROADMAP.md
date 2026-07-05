# Roadmap - Mashi Tech Requests

## Completed

- Status summary cards filter the request list by status.
- Request details open below the list in a wider panel.
- Request search covers request number, student, class, request type, submitter, content, attempted solution, and internal notes.
- Request management has structured filters for request number, subject, class, request type, submitter, and status.
- Staff request view separates requests the staff member opened from requests in their assigned classes.
- Staff request view includes a readable request preview without admin-only fields.
- New request submission uses a calmer step-by-step staff flow with a summary before sending.
- Request cards open their details inline under the selected card.
- Requests show assigned handler after a handler moves them to in-progress.
- Admin user management supports initial password setup and deleting/deactivating staff users.
- Student admin has search and request counts per student.
- Student admin has a per-student request history panel.
- Student admin has a student file view with request status totals, device details, responsibility contacts, and full request history.
- Student device responsibility is split into responsibility text, phone, and email fields.
- Branding uses the Mashi logo and logo-dot colors.
- Request cards have clearer hierarchy for treatment meetings, including subject, class, type, submitter, handler, and attempted solution preview.

## UX - Request Management

### In progress now
- Keep collecting team feedback from real request-management sessions.

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
- Next: exportable student maintenance reports if the team wants printable or shareable summaries.

## Notifications

- When a request is closed, send an email to the submitter with optional free text.
- Later: support templates for closing messages.
- [x] להוסיף יומן טיפול כרונולוגי לכל בקשה, עם עדכונים נפרדים שלא דורסים היסטוריה.
