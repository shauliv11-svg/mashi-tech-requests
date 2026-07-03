# Roadmap - Mashi Tech Requests

## UX - Request Management

### In progress now
- Clicking the main status cards (`חדשות`, `בטיפול`, `ממתינות למידע`, `נסגרו`) filters the request list by that status.
- Request details should open below the request list, not in a narrow side panel, so full request content is visible without horizontal scrolling.
- Request detail must show the full request, including `מה כבר נוסה`, internal notes, closing message, and device/accessibility details for handlers/admins.

### Next
- Add advanced filtering for requests by request number, student, class, request type, submitter, and status.
- Consider replacing table-style request browsing entirely with cards plus structured filters.
- Add clearer separation between staff-only request submission and handler/admin management.

## Roles And Permissions

- Staff/external users should only be able to open requests and view the minimum request history that is explicitly allowed.
- Handlers should manage and close requests but not manage users/system settings.
- Admins should manage users, students, classes, and device/accessibility fields.
- Confirm final policy: whether staff may view class-related requests, only their own requests, or only submit new requests.

## Branding

- Keep the UI based on the Mashi logo.
- Avoid using the dark central blue as the dominant app color.
- Use light blue as the base color and the logo dots as action/status accents.

## Student And Device Data

- Split `גורם אחריות מכשיר` into structured fields:
  - Name / responsibility text
  - Phone
  - Email
- Add student search in the admin area.
- Show how many requests/repairs were opened for each student.
- Add a student detail/history view showing all requests for a specific student.

## Notifications

- When a request is closed, send an email to the submitter with optional free text.
- Later: support templates for closing messages.
