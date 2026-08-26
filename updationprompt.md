# FRONTEND CONTINUATION PROMPT
# Reliable Fresh Export Management System
# Admin Panel, Season Management, User Status Toggle, Edit History, and Logo

This prompt continues from the old MASTER FRONTEND BUILD PROMPT that has already been executed.

Do NOT undo or weaken any behavior from the original prompt.
Add the features below on top of the existing frontend.

==================================================
0. READ CURRENT STATE FIRST
==================================================

Before changing code:

1. Re-read:
   - CLAUDE.md
   - Business_Rules.md
   - PHASE_MAP.md
   - Open_Questions.md

2. Inspect the current frontend:
   - Routes and layouts
   - Existing Admin pages (if any)
   - User management implementation
   - Season tag logic
   - Any existing audit logs or activity views

3. Confirm:
   - Role-based navigation works.
   - Field/Lab/Office/Inventory worker screens are simple and operational.

Only then apply the updates below.

==================================================
1. BRANDING AND LOGO USAGE
==================================================

Add the Reliable Fresh logo (from project assets) consistently:

- Show the logo on:
  - Login screen
  - App header/sidebar
  - Admin Dashboard top area

Rules:

- Preserve the logo’s aspect ratio.
- Use it on a light background (white or very light) so colours remain readable.
- If header background is dark, place the logo in a light block inside the header.
- If logo cannot load, fall back to text:
  Reliable Fresh
  Quality With Traceability

Do not invent a new logo or tagline.

==================================================
2. ADMIN DASHBOARD AND ACTIVE FARMS
==================================================

Create/complete the Admin-specific dashboard.

Routes:

- /admin/dashboard
- /admin/active-farms

Visible only to Admin role (and any explicitly allowed future role).

### 2.1 Admin Dashboard top section

Show:

- Welcome message:
  "Welcome, {AdminName}"
- Current season summary:
  "Current Season: {year}"
  "Start: {start_date}"
  "End: {end_date}"
- Button:
  [Start New Season]

Also show the logo at the top.

### 2.2 Dashboard summary cards

Use simple cards (no complex charts) for:

- Active farmers (current season)
- Active season registrations
- Active plots
- Field QC pending
- Lab sampling/tests pending
- Contracts pending
- Harvests in progress
- Weighing pending
- Arrival QC pending
- Packaging runs today
- Pre-cooling pending
- Low-stock alerts

Each card should be clickable, opening a filtered view (existing records page with appropriate filters).

### 2.3 Active Farms page

Route: /admin/active-farms

List active seasonal operations using:

- Farmer name
- Farmer MH Number
- Mobile (if allowed)
- Village / address
- Current season
- Number of plots
- Plot numbers & varieties
- Plot MH Codes
- Field QC status
- Lab status
- Contract status
- Harvest status
- Current workflow stage
- Last updated
- Assigned Field Worker

Support filters:

- Season
- Village
- Variety
- Stage (Registered / QC / Lab / Under Contract / Harvest / Packing etc.)
- Active/inactive farmer
- Passed/failed status

On mobile, use cards; on desktop, use tables.

==================================================
3. USER MANAGEMENT: MULTI-ROLE + STATUS TOGGLE
==================================================

Routes (if not already):

- /admin/users
- /admin/users/new
- /admin/users/:id

### 3.1 Multi-role checkboxes

In the user create/edit form:

Fields:

- Full name
- Email (username)
- Password / Confirm Password (for create; edit as per current flow)
- Roles (checkbox group):
  - [ ] Admin
  - [ ] Field Worker
  - [ ] Lab Worker
  - [ ] Office Worker
  - [ ] Stock/Inventory Manager

Rules:

- A user may have multiple roles.
- At least one role must be selected.
- Persist roles through the existing API (or extend it accordingly).
- Role-based navigation must respect multiple roles (union of permissions).

List view:

- Show roles as comma-separated text, e.g. “Field Worker, Office Worker”.

### 3.2 Active / Inactive toggle

In the Users list and detail page, add a status toggle:

- Status badge: 
  - Active → green
  - Inactive → gray
  - Deleted → red (no toggle)

- Toggle control:
  Label: "Active / Inactive"
  Visual: a switch with two states.

Behavior:

- When toggling Active → Inactive:
  - Show confirmation:
    “Change status to Inactive? This user will not be able to log in.”
  - On confirm: call backend API to set status = inactive.
  - On success: update badge and toggle.
  - On failure: revert toggle and show error.

- When toggling Inactive → Active:
  - Confirmation:
    “Change status to Active? This user will be able to log in again.”
  - Follow same pattern.

This must be a **soft** status change. It must not delete the user.

### 3.3 Soft delete action

Add a separate “Delete” action for users:

- Confirm dialog:
  “Delete this user? This will disable login but keep their history.”

Backend:
- Mark user as deleted (status field).
- Do not hard-delete from database.

UI:
- Deleted users show status “Deleted” with red badge.
- No Active/Inactive toggle.
- They remain visible in audit/user activity with a filter to show/hide them.

==================================================
4. SEASON MANAGEMENT WITH CALENDAR DATES
==================================================

Route: /admin/seasons or use a subpanel under /admin/dashboard (depending on existing design).

### 4.1 Start New Season form

Triggered from [Start New Season] button on Admin Dashboard.

Fields:

- Season Year (number)
- Season Start Date (calendar picker)
- Season End Date (calendar picker)
- Notes (optional)

Calendar behavior:

- Clicking “Season Start Date” opens a date picker.
- On selecting a date, the field auto-fills with that date.
- Clicking “Season End Date” opens a date picker.
- After selecting a start date, end date picker must disable days *before* the selected start date.
- End date must be >= start date.

Validation messages:

- “Start date is required.”
- “End date is required.”
- “End date must be after start date.”
- “A season already exists that overlaps this period.” (if backend says so)

On successful creation:

- Refresh the Admin Dashboard’s “Current Season” summary.
- Optionally show a success toast: “New season created.”

### 4.2 Edit Season

Support editing the current season if allowed:

- Same calendar behavior.
- Maintain season/year rules from PHASE_MAP / Business_Rules.
- Respect backend constraints.

Do not create a separate “season management giant module” beyond what the backend expects; keep to the year + start/end dates approach.

==================================================
5. USER ACTIVITY AND AUDIT TRAIL
==================================================

Routes:

- /admin/user-activity
- /admin/audit-trail

### 5.1 User Activity

Display for each user:

- Name
- Email
- Roles
- Status (Active/Inactive/Deleted)
- Last successful login time
- Last logout time (if tracked)
- Last activity time
- Failed login count
- Last failed login time

Filters:

- Role
- Status
- Date range
- Active session vs not

Do NOT show:

- Password
- Password hash
- Access token
- Refresh token

### 5.2 Audit Trail

Display events like:

- Login success/fail
- Farmer created/edited
- Plot created/edited
- QC submitted
- Lab results submitted
- Contract created
- Harvest/weighing/packaging/pre-cooling submitted
- Stock in / adjustments
- User role changes
- User status changes
- Season created/edited

Columns:

- Timestamp (server-side)
- User
- Role
- Action
- Module
- Record reference
- Result (e.g. success/fail)
- Old status → new status where relevant

Filters:

- User
- Role
- Module
- Action
- Date range
- Result

==================================================
6. EDIT OPTION + EDIT HISTORY PER ROLE
==================================================

Enhance relevant detail pages (Field QC, Lab Sample, Contract, Harvest, Weighing, Packaging, Inventory adjustments, etc.) with:

Buttons:

- [View]
- [Edit] (if allowed by business rules and current status)
- [Submit] or [Finalize]
- [View History]

Edit history:

- Show chronologically:
  - Version number or timestamp
  - Edited by (user)
  - Edited at (time)
  - Field-level changes:
    “TSS: 14% → 16%”
    “Fruit colour: Green → Milky Green”

Rules:

- Editing is allowed only when:
  - Record is draft or in a correctable state.
  - Role has edit permission (e.g., Field Worker can edit own Field QC draft).
- Backed by backend:
  - Do NOT maintain history purely in frontend.
  - Use history data returned by the API.

==================================================
7. LOGO + HEADER INTEGRATION
==================================================

Update AppShell / main layout to:

- Show the Reliable Fresh logo in the header or sidebar.
- On desktop:
  - Logo on top-left of sidebar or header.
- On mobile:
  - Logo in the top bar on key screens (login, home).

Ensure:

- Logo is clickable to go Home (optional, consistent with UX).
- Text “Reliable Fresh” and tagline can be shown next to logo on larger screens.

Do not clutter worker screens; keep header small and clean.

==================================================
8. TESTS FOR NEW FEATURES
==================================================

Add tests for:

- Admin Dashboard loads and shows current season, cards, logo.
- “Start New Season” calendar behavior:
  - Start date selection auto-fills.
  - End date selection auto-fills.
  - End date cannot be before start date.
- Multi-role user creation/edit:
  - At least one role required.
  - Multiple roles displayed correctly.
- Active/Inactive toggle:
  - Confirmation dialog appears.
  - API errors revert toggle.
- Soft delete:
  - Deleted user cannot be toggled active/inactive.
  - Deleted user still appears in audit trail.
- User Activity page:
  - Shows login times, roles, status.
- Audit Trail page:
  - Shows correct events after actions.
- Edit History:
  - History appears.
  - Only allowed roles can edit.
- Role-based protection:
  - Non-admin cannot access admin routes.

==================================================
9. IMPLEMENTATION ORDER FOR THIS UPDATE
==================================================

Apply this update in the following order:

1. Logo integration into AppShell and Login.
2. Admin routes and navigation (dashboard, users, active farms, user-activity, audit-trail, season management).
3. Multi-role checkboxes in user form.
4. Active/Inactive toggle and soft delete for users.
5. Season calendar-based start/end date selection and integration with dashboard.
6. Active Farms list.
7. User Activity page.
8. Audit Trail page.
9. Edit button + edit-history components on key records.
10. Tests and responsive adjustments.

==================================================
10. WORKING METHOD
==================================================

- Do NOT rewrite the whole app.
- Extend existing structures:
  - Use the current role system.
  - Use existing auth.
  - Use existing layout and components.
- Keep worker screens simple as before.
- Make all new Admin features clearly Admin-only.
- Summarize changes after implementation:
  - Files changed
  - New routes
  - New components
  - New API calls required.