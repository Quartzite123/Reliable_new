# MASTER FRONTEND BUILD PROMPT
# Reliable Fresh Export Management System

You are the lead frontend architect and senior React engineer for this project.

Build the complete frontend for the Reliable Fresh Export Management System. This is an internal PWA used by approximately 12–20 staff members of an agricultural grape-export company based in Pune, India.

The frontend must contain all currently scoped functions but remain extremely simple for normal field, lab, office, and inventory workers.

==================================================
1. READ PROJECT CONTEXT FIRST
==================================================

Before writing or modifying any code, read these files in this exact order:

1. CLAUDE.md
2. Business_Rules.md
3. PHASE_MAP.md
4. Open_Questions.md

Treat these files as the source of truth.

Rules:
- Business_Rules.md overrides assumptions.
- PHASE_MAP.md defines the phase structure, data model, routes, and role matrix.
- Open_Questions.md must be checked before implementing ambiguous future behavior.
- Do not invent business rules that are not present in the project documents.
- If a required UI decision is unresolved, create a clear placeholder or TODO rather than silently making a permanent assumption.

After reading the files, inspect the existing repository structure. Reuse existing code only if it follows the current project context. This is a greenfield frontend; do not depend on old Node.js, Express, Prisma, or legacy authentication code.

==================================================
2. TECHNOLOGY REQUIREMENTS
==================================================

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Zod for frontend validation
- TanStack Query for server-state management
- A lightweight accessible component approach
- PWA support
- Browser Geolocation API
- Browser/device camera access
- Typed API service layer

Do not use:

- localStorage
- sessionStorage
- hardcoded production data
- hardcoded company GGN
- hardcoded company letterhead
- hardcoded customer names inside business logic
- hardcoded 7% rejection logic
- database logic inside components
- frontend-only workflow enforcement
- complicated animations
- unnecessary charts
- a public-facing marketing layout
- farmer self-registration
- farmer email fields
- farmer profile photos
- hard deletes

Authentication state must be held in React state/context and managed through the backend JWT and refresh-token API.

==================================================
3. CORE PRODUCT PRINCIPLE
==================================================

Build a complete operational system with a simple worker-facing interface.

The UI must feel like:

- A digital checklist
- A task register
- A guided process flow
- A mobile/tablet data-entry tool

It must not feel like:

- A complicated ERP
- A large analytics dashboard
- A public website
- A developer tool
- A spreadsheet with hundreds of visible columns

The application must contain every scoped function, but expose them through role-specific navigation and task-oriented screens.

==================================================
4. USER ROLES
==================================================

Implement role-aware access and navigation for:

1. Admin
2. Field Worker
3. Lab Worker
4. Office Worker
5. Stock/Inventory Manager

Role permissions must be represented in one centralized permission configuration. Do not scatter role checks throughout random components.

Expected permissions:

Admin:
- Full access
- User management
- Role assignment
- Company settings
- Customer settings
- GGN/settings
- Audit access

Field Worker:
- Farmer registration
- Farmer bank details
- Plot registration
- Field QC
- Harvesting
- Weighing
- Arrival QC
- Read access to required reference data

Lab Worker:
- Lab sampling
- MRL test details
- Sample document uploads
- Lab result entry
- Only sees plots that passed Field QC

Office Worker:
- Farmer and plot read access
- Farmer contracts
- Packaging
- Palletisation
- Pre-cooling
- Purchase orders
- Container indent when specified
- Export documents when specified
- Farmer invoices when specified
- Read access to all operational records

Stock/Inventory Manager:
- Item Master
- BOM
- Stock in
- Stock adjustments
- Stock movement history
- Low-stock alerts
- Inventory dashboard
- Purchase orders
- Packing material reference

Frontend route guards are required, but the backend remains authoritative for enforcement.

==================================================
5. INFORMATION MODEL
==================================================

Respect these relationships:

Farmer is a permanent master record.

Season Registration is a seasonal record linked to a Farmer.

A Farmer may have multiple Plots.

Each Plot has one variety under the current working rule.

Quality checks, lab sampling, contracts, and harvesting are plot-related.

Granularity:

- Farmer: permanent identity
- Season Registration: yearly participation
- Plot: permanent/traceable farm unit
- Field QC: per plot
- Lab Sampling: per plot
- Contract: per plot/season
- Harvest: per plot event
- Vehicle Trip: one or more per harvest
- Weighing: per vehicle trip
- Arrival QC: per harvest
- Packaging: per packing run/lot
- Palletisation: pallet may contain boxes from multiple lots
- Pre-Cooling: pallet/batch log

Never:
- Store variety, area, or pruning date as Farmer fields.
- Treat Farmer MH Number and Plot MH Code as the same field.
- Treat MH Number or Plot Number as database primary keys.
- Delete failed or inactive records.

Use clear UI labels:
- Farmer MH Number
- Plot MH Code
- Plot Number
- Season
- Lot ID
- Vehicle Trip

==================================================
6. APPLICATION SHELL
==================================================

Create:

- Login screen
- Protected application shell
- Responsive sidebar for desktop/tablet
- Bottom navigation or compact navigation for mobile
- Header with page title, role, user name, and notifications
- Breadcrumbs
- Global search where appropriate
- Toast notifications
- Confirmation dialogs
- Error boundaries
- Loading states
- Empty states
- Skeleton states
- Offline/network warning banner
- Mobile-friendly form layout

Primary worker navigation:

- Home
- My Tasks
- New Entry
- My Records
- Notifications
- Help
- Logout

Supervisor/admin navigation may include:

- Dashboard
- All Records
- Farmers
- Quality Control
- Harvest and Weighing
- Packaging
- Inventory
- Palletisation
- Pre-Cooling
- Purchase Orders
- Documents
- Reports
- Users
- Settings

Do not show every navigation item to every role.

==================================================
7. REQUIRED ROUTES
==================================================

Create routes for all scoped modules:

Authentication:
- /login
- /forgot-password
- /change-password

Worker:
- /home
- /tasks
- /records
- /notifications
- /help

Farmer and plot:
- /farmers
- /farmers/new
- /farmers/:id
- /farmers/:id/edit
- /farmers/:id/bank-details
- /season-registrations
- /plots
- /plots/new
- /plots/:id

Pre-harvest:
- /field-qc
- /field-qc/new
- /field-qc/:id
- /lab-samples
- /lab-samples/new
- /lab-samples/:id
- /contracts
- /contracts/new
- /contracts/:id

Harvest and receiving:
- /harvests
- /harvests/new
- /harvests/:id
- /vehicle-trips
- /weighing
- /weighing/new
- /weighing/:id
- /arrival-qc
- /arrival-qc/new
- /arrival-qc/:id
- /goods-receiving
- /goods-receiving/new

Packing:
- /packaging
- /packaging/new
- /packaging/:id
- /palletisation
- /palletisation/new
- /palletisation/:id
- /pre-cooling
- /pre-cooling/new
- /pre-cooling/:id

Inventory:
- /inventory
- /inventory/materials
- /inventory/materials/new
- /inventory/materials/:id
- /inventory/stock-in
- /inventory/adjustments
- /inventory/movements
- /inventory/alerts
- /bom
- /bom/new
- /bom/:id

Office and future-scoped placeholders:
- /purchase-orders
- /purchase-orders/new
- /purchase-orders/:id
- /container-indents
- /container-loading
- /farmer-invoices
- /export-documents
- /finished-goods-qc

For modules that are not yet fully scoped, create a clear placeholder page stating:
“Screen specification pending business confirmation.”
Do not invent final workflow behavior for these modules.

==================================================
8. HOME AND TASK EXPERIENCE
==================================================

The home screen must be task-based.

Show:

- Greeting
- Today’s pending tasks
- In-progress records
- Recently completed records
- Important alerts
- Current workflow actions

Example:

Farmer:
Ajay Digambar Vadje

Plot:
Plot 1 — Thompson

Current stage:
Weighing

Actions:
- Continue task
- View details
- View history

Use large cards and clear labels. Avoid complex graphs.

The full workflow progress should be visible:

Registered
→ Field QC
→ Lab
→ Contract
→ Harvest
→ Weighing
→ Arrival QC
→ Packaging
→ Palletisation
→ Pre-Cooling
→ Future dispatch stages

Use statuses:
- Not Started
- In Progress
- Submitted
- Passed
- Failed
- Approved
- Rejected
- Completed
- Blocked

Failed states must not appear as deleted. Show:
- Failed record
- Reason
- Follow-up action
- Create follow-up/re-attempt

==================================================
9. FARMER REGISTRATION UI
==================================================

Implement a fuzzy-search-first flow.

The user enters:
- Farmer name
- Farmer MH Number
- Mobile number

Show likely matches and ask for confirmation.

Options:
- Use existing farmer
- Register new farmer

Permanent Farmer fields:
- Full name
- Address
- Mobile number
- Farmer MH Number
- Bank details, optionally added later
- Bank account holder name
- Bank name
- Account number
- IFSC
- Branch
- Passbook photo

Do not require bank details to create a farmer. Show a warning if bank details are missing and explain that they are required before contract creation.

Create a separate seasonal registration:
- Season year
- Farmer
- Registration status
- Registration date
- Notes

Use auto-fill on re-entry, but allow editing.

==================================================
10. PLOT REGISTRATION AND FIELD QC
==================================================

Provide one combined worker-friendly screen while preserving separate API/data concerns.

Plot fields:
- Farmer
- Season registration
- Plot number
- Plot MH Code
- Variety
- Area
- Number of trees
- Pruning date
- Expected harvest date
- Survey/Gat number
- Government registration number
- GPS coordinates

GPS:
- Use browser Geolocation API.
- Show permission state.
- Show captured latitude and longitude.
- Allow retry.
- Never require a paid map API.

Field QC fields:
- Inspection date
- Planned sampling date
- Fruit colour
- TSS percentage
- Thrips mark percentage
- Bhuri percentage
- Black spot percentage
- Cercospora/Kharda percentage
- Overall observation
- Exportable fruit quantity percentage
- Remarks
- Photos if supported by the API

Use simple radio buttons, numeric fields, and checklist controls.

Show clear result:
- Passed
- Failed
- Follow-up required

Never delete a failed QC record.

==================================================
11. LAB SAMPLING / MRL
==================================================

Only display plots that passed Field QC.

Fields:
- Lab
- Sampling date
- Seal number
- Farmer reference, read-only
- Plot reference, read-only
- Variety, read-only
- Plot MH Code, read-only
- Survey/Gat number
- Area
- Yield
- GPS coordinates
- Sampling seal photo
- 2A document PDF
- 4B document PDF
- Remarks
- MRL result
- Test report
- Pass/fail status

Clearly distinguish:
- Auto-filled read-only fields
- Lab-worker-owned fields
- Uploaded documents

==================================================
12. CONTRACT UI
==================================================

Contract creation must show prerequisites before the form:

- Field QC Passed
- Lab Passed
- Bank Details Available

If a prerequisite is missing, block submission and provide a direct link to resolve it.

Fields:
- Farmer
- Season
- Plot
- Variety
- Rate per kg
- Rejection percentage
- Contract dates
- Terms
- Notes

Default rejection percentage:
- 7%

This is a default only.
It must be editable.
Never hardcode 7% into weighing or packaging.

==================================================
13. HARVESTING AND WEIGHING
==================================================

Harvest screen:
- Farmer
- Season registration
- Plot
- Variety
- Harvest date
- Number of crates
- Estimated weight
- Vehicle trips
- Vehicle number
- Driver name
- Supervisor name
- Supervisor signature if supported
- Notes

Support multiple vehicle trips under one harvest.

Weighing screen is per vehicle trip:
- Farmer and plot read-only
- Harvest read-only
- Vehicle number
- Date
- Slip number
- Number of crates
- Total weight
- Contract rejection percentage, auto-filled and read-only
- Rejection weight, calculated
- Net weight, calculated
- Slip photo using camera/upload
- Supervisor details
- Notes

Show a red warning when:
- Weighed crate count does not match harvest crate count
- Net weight is invalid
- Required slip photo is missing

At save time, the backend/API must snapshot the contract rejection percentage into the weighing record. The frontend must display the snapshot value returned by the API.

==================================================
14. ARRIVAL QC AND GOODS RECEIVING
==================================================

Arrival QC is per harvest, not per vehicle trip.

Use similar fields and UI to Field QC:
- Fruit colour
- TSS
- Thrips
- Bhuri
- Black spot
- Cercospora/Kharda
- Overall material observation
- Remarks
- Photos
- Pass/fail

Allow follow-up inspection after failure without deleting the previous result.

Goods receiving:
- Harvest
- Vehicle/trip reference
- Received crates
- Received weight
- Accepted weight
- Rejected weight
- Warehouse location
- Notes
- Confirmation status

==================================================
15. PACKAGING
==================================================

Packaging is per packing run/lot.

Implement cascading selectors:

1. Variety
2. Compliance requirement
3. Customer
4. Pack size
5. Packing configuration

Customers must be selected through customer IDs returned by the API. Do not store or treat customer names as plain business strings in frontend logic.

Use company settings for:
- GGN
- Company name
- Letterhead
- Address
- GST details
- Contact information

Fields:
- Harvest/source reference
- Farmer/plot read-only references
- Packing date
- Customer
- Pack size
- Compliance
- Lot ID
- Total weight
- Rejection percentage from contract
- Actual rejection
- Net weight
- Number of boxes
- Number of pallets
- Notes

Lot ID:
- Use the generated ID returned by the backend.
- Display traceability links to farmer, plot, harvest, QC, and lab records.
- Do not implement permanent generation rules in the frontend.

The frontend must not perform inventory deduction. It should display material information returned by the backend.

==================================================
16. ITEM MASTER, BOM, AND INVENTORY
==================================================

Item Master has three areas:

1. Packing materials
2. Raw materials
3. Finished products

Support:
- Material name
- Type
- Variant
- Unit
- Active/inactive status
- Reorder threshold
- Notes

BOM:
- Product
- Customer
- Pack size
- Container configuration
- Material
- Quantity
- Scale level
- Per box/per container
- Effective status

Inventory:
- Current computed stock
- Stock-in entry
- Manual adjustment
- Movement history
- Low-stock alert
- Reorder threshold
- Optional order calculator

Do not store current stock as a manually editable frontend value. Display computed stock returned by the API.

Packaging material stock-out is a backend service concern. The frontend must not duplicate or simulate that calculation.

Inventory Manager owns damaged-box and discrepancy adjustments. Do not add these fields to the packaging worker’s workflow unless specified by the business documents.

==================================================
17. PALLETISATION
==================================================

Palletisation is a separate screen from Packaging.

Support:
- Create pallet
- Select multiple lots
- Add boxes from each lot
- Show total boxes
- Show source lots
- Pallet type
- Pallet identifier
- Status
- Notes

Pallets may contain boxes from multiple lots.

Do not assume a final Pallet ID format if it is unresolved. Use the API-generated identifier or a clearly marked temporary UI placeholder.

==================================================
18. PRE-COOLING
==================================================

Create a very simple log screen.

Fields:
- Date
- Number of pallets
- Number of boxes
- In-time
- In berry temperature
- Out-time
- Out berry temperature
- Notes

Support:
- Partial save
- Complete later
- Batch entry for multiple pallets
- Clear incomplete/completed status

Do not create duplicate pre-cooling records when completing a partially saved record.

==================================================
19. PURCHASE ORDERS
==================================================

Purchase Orders are for farm inputs such as fertilizer and agro-chemicals.

Do not connect this module to packing-material inventory unless the project documents are updated.

Support:
- Supplier autocomplete
- Supplier address
- Supplier GST
- PO number
- PO date
- Line items
- HSN code
- Quantity
- Unit
- Rate
- GST
- CGST/SGST
- Freight
- Other charges
- Total
- Amount in words
- Delivery terms
- Authorized signatory
- Draft/Issued/Completed status
- Printable preview

The frontend should provide a print-preview layout. The backend is responsible for final PDF generation.

Use Indian number formatting and Indian amount-in-words formatting when the backend provides the formatted result.

==================================================
20. FUTURE OR UNSCOPED MODULES
==================================================

Create navigation and placeholder pages for:

- Finished Goods QC / Cold Storage Exit QC
- Container Indent
- Container Loading
- Farmer Invoice
- Export Documents
- Reports and Dashboards

Do not invent complete behavior where the specification is unresolved.

Each placeholder must:
- Be role protected
- Use the application shell
- Explain that the screen specification is pending
- Avoid fake operational buttons
- Include a TODO note for future implementation

==================================================
21. REUSABLE COMPONENTS
==================================================

Create a consistent component library:

Layout:
- AppShell
- Sidebar
- MobileNav
- Header
- Breadcrumbs
- PageHeader
- SectionCard

Forms:
- FormField
- TextInput
- NumberInput
- Select
- SearchableSelect
- DatePicker
- TimePicker
- RadioGroup
- CheckboxGroup
- Textarea
- FileUpload
- CameraCapture
- SignatureField
- GPSCapture

Workflow:
- WorkflowStepper
- StatusBadge
- PrerequisitePanel
- TaskCard
- ProgressCard
- FollowUpAction
- ReadOnlyReferenceCard

Data:
- DataTable
- MobileRecordCard
- SearchBar
- FilterBar
- Pagination
- EmptyState
- LoadingState
- ErrorState

Feedback:
- Toast
- Alert
- ConfirmationDialog
- ValidationSummary
- UnsavedChangesWarning

Domain:
- FarmerSelector
- PlotSelector
- VehicleTripSelector
- QCChecklist
- WeightCalculator
- PackagingSelector
- InventoryStatusCard
- DocumentPreview

==================================================
22. STATE AND API ARCHITECTURE
==================================================

Create a clean structure such as:

src/
  app/
  components/
  layouts/
  features/
    auth/
    farmers/
    seasonRegistrations/
    plots/
    fieldQc/
    labSamples/
    contracts/
    harvests/
    vehicleTrips/
    weighing/
    arrivalQc/
    goodsReceiving/
    packaging/
    palletisation/
    preCooling/
    inventory/
    bom/
    purchaseOrders/
  pages/
  routes/
  hooks/
  services/
  api/
  schemas/
  types/
  permissions/
  utils/
  styles/

Every feature should contain, where appropriate:

- API functions
- Types
- Schemas
- Hooks
- Components
- Pages
- Tests

Use a typed API client with separate modules.

Prepare API interfaces for:
- Auth
- Farmers
- Season registrations
- Plots
- QC
- Lab samples
- Contracts
- Harvests
- Vehicle trips
- Weighing
- Arrival QC
- Goods receiving
- Packaging
- Inventory
- BOM
- Pallets
- Pre-cooling
- Purchase orders
- Settings
- Customers
- Notifications

If the backend is not ready:
- Build a mock API adapter with the same typed interfaces.
- Keep mock data separate from components.
- Make it easy to replace mock services with real API calls.
- Do not hardcode mock arrays directly inside page components.

==================================================
23. VALIDATION AND ERROR HANDLING
==================================================

Use Zod and React Hook Form.

Every form must have:
- Required-field validation
- Numeric validation
- Date validation
- Percentage validation
- File-type validation
- File-size validation
- Clear inline error messages
- Save-draft support where applicable
- Submit confirmation
- API error handling

Use simple worker-friendly messages:

Good:
- “Select a farmer.”
- “Enter a valid percentage.”
- “Upload the weighing slip photo.”
- “This record cannot continue until Lab Pass is completed.”

Bad:
- “Invalid payload.”
- “Validation failed.”
- “HTTP 422.”
- “Unexpected server exception.”

Do not rely on frontend validation for workflow enforcement. Display backend errors clearly.

==================================================
24. ACCESSIBILITY AND WORKER USABILITY
==================================================

The UI must work for users with limited technical experience.

Requirements:
- Large touch targets
- Minimum readable font size
- Labels above fields
- No icon-only primary actions
- High contrast
- Keyboard accessibility
- Visible focus states
- Clear error messages
- No unnecessary scrolling horizontally on mobile
- Short forms broken into logical sections
- Auto-fill repeated information
- Read-only reference fields visually distinct
- One primary action per screen
- Fixed bottom action bar on mobile where useful

Use plain language rather than technical terms.

==================================================
25. RESPONSIVE DESIGN
==================================================

Design for:

- Mobile phone
- Tablet
- Desktop

Mobile:
- Single-column forms
- Bottom action buttons
- Compact navigation
- Record cards instead of wide tables

Tablet:
- Two-column forms where suitable
- Sidebar or compact navigation
- Better use of table layouts

Desktop:
- Sidebar
- Multi-column dashboard
- Tables for supervisors and inventory users

Never allow essential form actions to disappear on mobile.

==================================================
26. PWA REQUIREMENTS
==================================================

Configure the frontend as a PWA:

- Web app manifest
- App name and icons
- Installable application
- Responsive viewport
- Service-worker foundation
- Network status indicator
- Clear “connection required” messaging where submission needs the backend

Offline data entry is not required for v1. Do not implement fake offline synchronization. Keep forms and feature boundaries simple enough for future offline support.

==================================================
27. SECURITY REQUIREMENTS
==================================================

- Protect private routes.
- Do not expose secrets in frontend code.
- Do not store tokens in localStorage/sessionStorage.
- Do not display sensitive bank details unnecessarily.
- Mask account numbers where appropriate.
- Do not allow unauthorized role access.
- Do not expose internal database IDs as user-facing primary identifiers.
- Handle token refresh failures by returning the user to login safely.
- Do not include real client credentials or production secrets.

==================================================
28. TESTING REQUIREMENTS
==================================================

Add tests for:

- Route protection
- Role-based navigation
- Farmer fuzzy-search flow
- Seasonal re-registration
- Plot selection
- Field QC validation
- Lab visibility after Field QC Pass
- Contract prerequisite blocking
- Dynamic rejection percentage display
- Weighing calculations
- Crate mismatch warning
- Arrival QC follow-up
- Packaging cascading dropdowns
- Partial pre-cooling save and completion
- Inventory low-stock display
- Mobile rendering
- File upload validation
- API error states

Use realistic but clearly fake test data.

==================================================
29. IMPLEMENTATION ORDER
==================================================

Build in this order:

Phase 1:
- Project setup
- Tailwind design tokens
- App shell
- Auth
- Role system
- Routing
- Reusable components
- API client structure

Phase 2:
- Farmer registration
- Bank details
- Seasonal registration
- Plot registration
- Field QC

Phase 3:
- Lab sampling/MRL
- Farmer contract
- Harvesting
- Vehicle trips
- Weighing

Phase 4:
- Arrival QC
- Goods receiving
- Packaging

Phase 5:
- Item Master
- BOM
- Inventory
- Low-stock alerts

Phase 6:
- Palletisation
- Pre-cooling
- Purchase Orders

Phase 7:
- Future module placeholders
- Reports shell
- PWA polish
- Accessibility
- Testing
- Deployment preparation

==================================================
30. DEFINITION OF DONE
==================================================

The frontend is complete only when:

- All scoped modules have working screens.
- Every role sees the correct navigation.
- All forms are responsive.
- Forms use shared components.
- API calls are typed and isolated.
- Mock APIs can be replaced by real backend endpoints.
- No hardcoded 7% logic exists.
- No hardcoded GGN or company details exist.
- Farmer and plot relationships are correct.
- Seasonal registration is supported.
- Multiple plots per farmer are supported.
- Multiple vehicle trips per harvest are supported.
- Weighing is per vehicle trip.
- Arrival QC is per harvest.
- Packaging supports multiple runs and lot traceability.
- Palletisation is separate from packaging.
- Pre-cooling supports partial save and batch entry.
- Inventory stock is displayed from API-computed values.
- Failed records remain visible and support follow-up.
- No hard deletes exist.
- No localStorage/sessionStorage is used.
- Protected routes and permissions work.
- Mobile/tablet/desktop layouts work.
- Loading, empty, error, and success states exist.
- Tests cover critical workflow rules.
- Future unresolved modules are clearly marked rather than invented.
- The application is understandable to a normal worker without training in software systems.

==================================================
31. WORKING METHOD
==================================================

Before implementation:
1. Inspect repository.
2. Read all four context files.
3. Create a frontend implementation plan.
4. Create or update the route and permission map.
5. Create the design system.
6. Create shared components.
7. Implement one phase at a time.

After each phase:
1. Run type checking.
2. Run linting.
3. Run tests.
4. Check responsive behavior.
5. Check role access.
6. Check business-rule compliance.
7. Summarize changed files and remaining issues.

Do not rewrite large portions of the project without first explaining why.

When a business rule is unclear:
- Check Open_Questions.md.
- Preserve the uncertainty in the UI.
- Add a TODO or placeholder.
- Do not invent irreversible behavior.

Start by reading the repository files and producing:
1. A concise implementation plan.
2. The proposed route map.
3. The role-permission map.
4. The component architecture.
5. Any conflicts or missing decisions discovered.

Do not begin full feature implementation until this initial plan is shown.