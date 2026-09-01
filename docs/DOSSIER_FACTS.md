# DOSSIER_FACTS.md

Raw facts extracted directly from the repository on 2026-09-02, for use in compiling
the handover document. Report only — no application code was changed to produce this.

---

## 1. TIMELINE

**First commit:** `5bdfa2a` — "Initial commit - Reliable Fresh" — 2026-08-26 10:20:48 +0530.

**Total commits:** 23 (all on `main`; `git log --merges` returns nothing — there is
**no merge commit anywhere in this history**, which matters for Section 6).

**Last commit:** `8d383c5` — "login latency configured" — 2026-09-02.

**Uncommitted at time of writing** (`git status --short`): 7 modified files
(`backend/app/api/v1/routers/auth.py`, `backend/app/core/deps.py`,
`backend/app/main.py`, `frontend/src/api/httpClient.ts`,
`frontend/src/app/AuthContext.tsx`, `frontend/src/app/ToastContext.tsx`,
`frontend/src/utils/errorMessages.ts`) plus one untracked file (`PROJECT_DOSSIER.md`
at the repo root — see Section 6). These 7 files are the session-expiry/401-interceptor
work described inline in their own code comments; not yet committed.

### Phase-grouped commit history

**Phase A — Scaffold and initial deploy config (2026-08-26, 4 commits)**
```
5bdfa2a  Initial commit - Reliable Fresh
7396205  Fix render.yaml - chain migrations into startCommand for free tier
e63df09  Add email-validator dependency
7c9c524  files renamed
```
`7396205` is the first deployment-infrastructure commit — it edits `render.yaml`
directly (`render.yaml | 14 +-------` per `git show --stat`), chaining Alembic
migrations into Render's free-tier start command. This is the closest thing in git
history to a "deployment commit"; there is no later commit that reads as a distinct
go-live event.

**Phase B — Frontend integration burst (2026-08-29, 7 commits, all same day)**
```
7104800   loginpage.tsk changed
b6d1844   fixeed error
a7fd416   changes
26929ac   api/changes
310b343   changes
63f4315   Add missing icons, return user from login
e5277ed   apis configured
ec02950   Add error states to remaining pickers and detail pages
```
Commit messages are terse and largely non-descriptive, but the cluster (login page,
API wiring, icons, error states) is consistent with a frontend integration pass
against a real backend for the first time — the kind of work PROJECT_DOSSIER.md's
§8.1 ("frontend called endpoints that never existed") and §9.1 (API contract audit)
describe. Git history alone does not name a "Team 2" or a merge event — see Section 6.

**Phase C — Hardening and cleanup (2026-08-30, 6 commits)**
```
49ff895  Untrack stale backend/build artifact
ca9a21b  Add root gitignore covering env files, build artifacts, dependencies
d16a653  Move file uploads to Cloudinary
6b64518  Error Handling
4321b5b  errors handled gracefully
43f83ee  fixed timing n+1
```
`d16a653` is the Cloudinary migration (file storage moved off Render's ephemeral
disk). `43f83ee` is an N+1 fix pass, one of several referenced across this session's
prior work (a later, larger N+1 pass landed as `85d5bcd` on 2026-09-01, see Phase E).

**Phase D — Dashboard fixes and nav cleanup (2026-08-31, 2 commits)**
```
e477440   dashboard data changes
86e507d  Hide Field QC nav entry
```
`86e507d` matches the commented-out Field QC nav entry confirmed live in
`frontend/src/routes/navConfig.ts:64-68` (Section 5).

**Phase E — Authorization, authentication, and session-handling overhaul
(2026-09-01 to 2026-09-02, 3 commits)**
```
85d5bcd    n+1 changes final 2
51c319c    Add user management, users phase, login rate limiting, session invalidation
8d383c5    login latency configured
```
`51c319c` is a single commit bundling what was a large multi-part effort: the
`users`/`reports_documents` phases, `user_admin_guard.py`, login rate limiting
(`MAX_FAILED_LOGIN_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES` in
`backend/app/core/security.py:25-26`), and token-revocation via
`password_changed_at`. `8d383c5` similarly bundles the CORS/`pool_pre_ping`/health-check
latency work. **The commit count under-represents the actual amount of work done** —
several of these single commits correspond to what took many turns of a working
session to build and verify.

The 7 files modified-but-uncommitted as of this writing (session-expiry 401 handling,
listed above) represent a further chunk of work done after `8d383c5` that has no
commit yet.

---

## 2. STATUS MACHINE

Source: `backend/app/services/status_machine.py` (161 lines) plus
`backend/app/core/enums.py::RegistrationStatus` (13 values, confirmed — no
`Finished Goods QC Passed`/`Failed` values exist in the enum) and two router-level
transitions that live outside this file (see note at the end).

The module's own docstring calls itself "THE single place where
`season_registrations.status` changes" — this is **not fully true**; see the note
below the table.

### Legal transitions

| From | To | Guard function | Apply function | Triggering action |
|---|---|---|---|---|
| `Registered` | `Field QC Passed` / `Field QC Failed` | `can_record_field_qc` | `apply_field_qc_result` | `POST` a field QC record |
| `Field QC Failed` | `Field QC Passed` / `Field QC Failed` | `can_record_field_qc` | `apply_field_qc_result` | Follow-up field QC record (R17) |
| `Field QC Passed` | `Lab Passed` / `Lab Failed` | `can_record_lab_sample` | `apply_lab_result` | `POST` a lab sample |
| `Lab Passed` | `Under Contract` | `can_create_contract` | `apply_contract_created` | `POST` a contract |
| `Under Contract` | `Harvested (partial)` | `can_record_harvest` | `apply_harvest_recorded` | `POST` a harvest |
| `Harvested (partial)` | `Harvested (partial)` | `can_record_harvest` | `apply_harvest_recorded` | Additional harvest round (R26) |
| `Weighed` | `Harvested (partial)` | `can_record_harvest` | `apply_harvest_recorded` | New picking round after earlier trips were weighed |
| `Harvested (partial)` | `Weighed` (conditional) | `can_record_weighing` | `apply_weighing_recorded` | `POST` a weighing record — only advances once *every* vehicle trip under the registration has one |
| `Weighed` | `Weighed` (conditional, stays) | `can_record_weighing` | `apply_weighing_recorded` | Additional weighing record while other trips remain unweighed |
| `Weighed` | `Arrival QC Passed` / `Arrival QC Failed` | `can_record_arrival_qc` | `apply_arrival_qc_result` | `POST` an arrival QC record — **terminal**, no re-attempt path in this file |
| `Arrival QC Passed` | `Packed` | `can_record_packaging` | `apply_packaging_recorded` | `POST` a packaging record |
| `Packed` | `Packed` | `can_record_packaging` | `apply_packaging_recorded` | Additional packaging run (harvest split across customers/pack sizes) |
| `Packed` | `Palletised` (conditional) | — (inline in router, not in this file) | — | `POST /pallets` — see note |
| `Palletised` | `Pre-Cooled` (conditional) | — (inline in router, not in this file) | — | Pre-cooling record completed on every lot on that pallet — see note |

### Guard function bodies (quoted verbatim, all short)

```python
def can_record_field_qc(reg: SeasonRegistration) -> None:
    require_status(
        reg,
        RegistrationStatus.REGISTERED,
        RegistrationStatus.FIELD_QC_FAILED,
        action="record Field QC",
    )
```

```python
def can_record_lab_sample(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.FIELD_QC_PASSED, action="record a lab sample")
    if reg.lab_sample is not None:
        raise _conflict("A lab sample already exists for this registration")
```

```python
def can_create_contract(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.LAB_PASSED, action="create a contract")
    if reg.contract is not None:
        raise _conflict("A contract already exists for this registration")
    farmer = reg.plot.farmer
    if farmer.bank_details is None:
        raise _conflict(
            "Farmer has no bank details on record — add bank details before creating a contract"
        )
```
`can_create_contract` is the only guard that checks something other than the status
enum — it also requires `farmer.bank_details is not None`, i.e. bank details exist
for the farmer who owns the plot behind this registration.

```python
def can_record_harvest(reg: SeasonRegistration) -> None:
    require_status(
        reg,
        RegistrationStatus.UNDER_CONTRACT,
        RegistrationStatus.HARVESTED_PARTIAL,
        RegistrationStatus.WEIGHED,
        action="record a harvest",
    )
```

```python
def can_record_weighing(reg: SeasonRegistration) -> None:
    require_status(
        reg,
        RegistrationStatus.HARVESTED_PARTIAL,
        RegistrationStatus.WEIGHED,
        action="record weighing",
    )
```

```python
def apply_weighing_recorded(db: Session, reg: SeasonRegistration) -> None:
    """If every vehicle trip under this registration now has a weighing
    record, the registration advances to WEIGHED."""
    for harvest in reg.harvests:
        for trip in harvest.vehicle_trips:
            if trip.weighing_record is None:
                return  # something still unweighed — stay HARVESTED_PARTIAL
    reg.status = RegistrationStatus.WEIGHED
```
This is the one `apply_*` function with real logic rather than a straight status
assignment — it walks every harvest and every vehicle trip under the registration and
only flips to `WEIGHED` if none are still missing a weighing record.

```python
def can_record_arrival_qc(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.WEIGHED, action="record Arrival QC")
```
No status value re-enters this guard once left — the module's own top-of-file comment
states Arrival QC Failed is "terminal for now (DB has one arrival_qc per harvest —
see routers/arrival_qc.py note)"; the actual terminal enforcement is a DB unique
constraint (`arrival_qc_harvest_id_key`, see `main.py:106`), not this guard function.

```python
def can_record_packaging(reg: SeasonRegistration) -> None:
    require_status(
        reg,
        RegistrationStatus.ARRIVAL_QC_PASSED,
        RegistrationStatus.PACKED,
        action="record packaging",
    )
```

`require_status` (the shared primitive every guard calls) raises HTTP 409, not 400 or
422:
```python
def require_status(reg: SeasonRegistration, *allowed: RegistrationStatus, action: str) -> None:
    if reg.status not in allowed:
        raise _conflict(
            f"Cannot {action}: registration is '{reg.status.value}', "
            f"requires {[s.value for s in allowed]}"
        )
```

### Note: two transitions live outside status_machine.py

Despite the module's docstring claim to be the single place status changes,
**`Palletised` and `Pre-Cooled` are set directly inside their routers**, not through
this file:

- `backend/app/api/v1/routers/palletisation.py:121-123`:
  ```python
  for reg in registrations.values():
      if reg.status == RegistrationStatus.PACKED:
          reg.status = RegistrationStatus.PALLETISED
  ```
- `backend/app/api/v1/routers/pre_cooling.py:54-62` (`_apply_completion`):
  ```python
  def _apply_completion(db: Session, record: PreCoolingRecord) -> None:
      """Pallet created -> pre_cooling; registrations PALLETISED -> PRE_COOLED."""
      pallet = record.pallet
      if pallet.status == PalletStatus.CREATED:
          pallet.status = PalletStatus.PRE_COOLING
      for link in pallet.palletisation_lots:
          reg = link.packaging_record.harvest.season_registration
          if reg.status == RegistrationStatus.PALLETISED:
              reg.status = RegistrationStatus.PRE_COOLED
  ```

Neither of these has a corresponding `can_*` guard function — the `if reg.status ==
...` check inline in the router is the entire gate for these two transitions. There is
no `_conflict`/409 raised if the status doesn't match; the loop just silently skips
that registration instead of erroring.

---

## 3. DIRECTORY STRUCTURE

Both trees below are from an actual `find` run against the working tree on
2026-09-02, filtered to exclude `node_modules`, `.venv`, `__pycache__`,
`alembic/versions/*.py`, and build artifacts.

### Backend — `backend/app/` (67 Python files, one line each)

```
app/
  __init__.py
  main.py                                   FastAPI app: CORS, /health (DB-querying), 3 global
                                             exception handlers (validation/HTTP/IntegrityError/
                                             catch-all), constraint-name → message map, router
                                             registration (18 of 19 router files wired in)

  api/__init__.py
  api/v1/__init__.py
  api/v1/routers/__init__.py
  api/v1/routers/arrival_qc.py              Arrival QC CRUD (one per harvest, terminal on fail)
  api/v1/routers/audit_log.py               Audit trail read endpoint (admin)
  api/v1/routers/auth.py                    login, refresh, logout, rate limiting/lockout
  api/v1/routers/contracts.py               Farmer contract CRUD (rejection_percent dead, see §5)
  api/v1/routers/customers.py               Customers CRUD + company_settings
  api/v1/routers/farmers.py                 Farmer CRUD, bank details, passbook photo, fuzzy search
  api/v1/routers/harvests.py                Harvest + vehicle trip CRUD
  api/v1/routers/inventory.py               item_master_materials/products, BOM, stock movements,
                                             low-stock alerts, order calculator
  api/v1/routers/lab_samples.py             Lab sample CRUD, seal photo, 2A/4B document upload,
                                             lab queue endpoint
  api/v1/routers/packaging.py               Packaging record CRUD, lot ID generation
  api/v1/routers/palletisation.py           Pallet CRUD, pallet ID generation, lot allocation
  api/v1/routers/plot_varieties.py          Per-plot variety list CRUD (incl. DELETE)
  api/v1/routers/plots.py                   Plot CRUD, season registrations, field QC
  api/v1/routers/pre_cooling.py             Pre-cooling record CRUD, partial-save completion logic
  api/v1/routers/purchase_orders.py         UNREGISTERED — file present, not imported by main.py
  api/v1/routers/seasons.py                 Season CRUD (admin)
  api/v1/routers/user_activity.py           User activity log read endpoint (admin)
  api/v1/routers/users.py                   User CRUD, /me, phase assignment
  api/v1/routers/weighing.py                Vehicle trip weighing CRUD, slip photo, tare calc

  core/__init__.py
  core/config.py                            Pydantic Settings: DATABASE_URL, SECRET_KEY,
                                             ALGORITHM=HS256, ACCESS_TOKEN_EXPIRE_MINUTES=30,
                                             REFRESH_TOKEN_EXPIRE_DAYS=7, FRONTEND_ORIGINS,
                                             Cloudinary creds
  core/constants.py                         FARMER_REJECTION_PCT = Decimal("7") — the only
                                             constant in this file
  core/deps.py                              get_current_user/get_optional_user, require_phase,
                                             require_any_phase, token_predates_password_change
  core/enums.py                             18 Python enums, single source of truth for every
                                             enum column in the schema
  core/security.py                          bcrypt hashing, JWT encode/decode,
                                             MAX_FAILED_LOGIN_ATTEMPTS=5, LOGIN_LOCKOUT_MINUTES=15

  db/__init__.py
  db/base.py                                SQLAlchemy engine (pool_pre_ping=True, no
                                             pool_recycle — deliberate, see inline comment),
                                             SessionLocal, Base, get_db

  models/__init__.py
  models/arrival_qc.py                      ArrivalQC (1 table)
  models/audit_event.py                     AuditEvent (1 table)
  models/company_settings.py                CompanySettings (1 table, single-row)
  models/contract.py                        Contract (1 table)
  models/customer.py                        Customer (1 table)
  models/farmer.py                          Farmer, BankDetails (2 tables)
  models/harvest.py                         Harvest, VehicleTrip (2 tables)
  models/inventory.py                       ItemMasterMaterial, ItemMasterProduct, BOMEntry,
                                             StockMovement (4 tables)
  models/lab.py                             LabSample (1 table)
  models/packaging.py                       PackagingRecord (1 table)
  models/palletisation.py                   Pallet, PalletisationLot (2 tables)
  models/plot.py                            Plot, SeasonRegistration, FieldQC (3 tables)
  models/plot_variety.py                    PlotVariety (1 table)
  models/pre_cooling.py                     PreCoolingRecord (1 table)
  models/purchase_order.py                  PurchaseOrder, POLineItem (2 tables, unused router)
  models/season.py                          Season (1 table)
  models/user.py                            User (1 table) + every audit-trail back-reference
  models/user_phase_access.py               UserPhaseAccess (1 table)
  models/weighing.py                        WeighingRecord (1 table)

  schemas/__init__.py
  schemas/arrival_qc.py                     Pydantic I/O schemas mirroring models/arrival_qc.py
  schemas/audit_event.py                    Pydantic I/O schemas mirroring models/audit_event.py
  schemas/common.py                         Shared base schemas (pagination, etc.)
  schemas/contract.py                       Pydantic I/O schemas mirroring models/contract.py
  schemas/customer.py                       Pydantic I/O schemas mirroring models/customer.py
  schemas/farmer.py                         Pydantic I/O schemas mirroring models/farmer.py
  schemas/harvest.py                        Pydantic I/O schemas mirroring models/harvest.py
  schemas/inventory.py                      Pydantic I/O schemas mirroring models/inventory.py
  schemas/lab.py                            Pydantic I/O schemas mirroring models/lab.py
  schemas/packaging.py                      Pydantic I/O schemas mirroring models/packaging.py
  schemas/palletisation.py                  Pydantic I/O schemas mirroring models/palletisation.py
  schemas/plot.py                           Pydantic I/O schemas mirroring models/plot.py
  schemas/plot_variety.py                   Pydantic I/O schemas mirroring models/plot_variety.py
  schemas/purchase_order.py                 Pydantic I/O schemas mirroring models/purchase_order.py
  schemas/season.py                         Pydantic I/O schemas mirroring models/season.py
  schemas/user.py                           Pydantic I/O schemas mirroring models/user.py
  schemas/weighing.py                       Pydantic I/O schemas — contains a stale comment on
                                             rejection_pct, see §5/§6

  services/__init__.py
  services/audit.py                         Writes AuditEvent rows (snapshots user_name/role)
  services/inventory.py                     BOM lookup + auto stock-out on packaging insert
  services/status_machine.py                Status transition guards/applies — see §2
  services/user_admin_guard.py              Non-phase-gate enforcement for the `users` phase
                                             (admin visibility, self-edit, admin-phase immutability)

  utils/__init__.py
  utils/file_upload.py                      save_upload() — uploads to Cloudinary, returns URL
  utils/indian_words.py                     Amount-in-words helper (Lac/Crore) — built for the
                                             dropped Purchase Order module, otherwise unused
```

Other top-level backend directories seen in the listing but excluded from the tree
above per the exclusion rules: `alembic/` (12 migration files under `versions/`,
excluded individually), `build/` (a **stale, untracked build artifact directory** —
`build/lib/app/...` mirrors the whole `app/` tree; `git log` shows a commit
"Untrack stale backend/build artifact" but the directory is still physically present
on disk, just git-ignored), `reliable_fresh_backend.egg-info/`, `scripts/`
(`seed_admin.py`, `seed_users.py`), `tests/` (`tests/integration/`, `tests/unit/` —
present as directories; not enumerated file-by-file here), `uploads/` (the old
pre-Cloudinary local upload directory — no longer referenced by any route since the
`/files` static mount was removed, per `main.py:169-172`).

### Frontend — `frontend/src/` (feature-by-feature)

Standard shape (per the project's own convention, confirmed in most features):
`api.ts`, `api.mock.ts`, `types.ts`, `hooks.ts`, `schema.ts`, `index.ts` (re-exports
+ picks real vs. mock by `USE_MOCK_API`), `mockStore.ts` (in-memory seeded mock data),
`pages/`, sometimes `components/`.

| Feature | Files | Deviation from standard shape |
|---|---|---|
| `adminDashboard` | `pages/ActiveFarmsPage.tsx`, `pages/AdminDashboardPage.tsx` only | **No** `api.ts`/`api.mock.ts`/`types.ts`/`hooks.ts`/`schema.ts`/`index.ts` at all — this feature has no data layer of its own, presumably composing other features' hooks directly in its pages |
| `arrivalQc` | full standard set + `components/ArrivalQcForm.tsx` | none |
| `auditLog` | `api.mock.ts`, `api.ts`, `auditLogFlow.test.tsx`, `hooks.ts`, `index.ts`, `mockStore.ts`, `pages/AuditTrailPage.tsx`, `types.ts` | **No `schema.ts`** — read-only feature, nothing to validate |
| `auth` | `api.mock.ts`, `api.ts`, `index.ts`, `pages/ChangePasswordPage.tsx`, `pages/LoginPage.tsx`, `schema.ts`, `types.ts` | **No `hooks.ts`, no `mockStore.ts`** — auth state is owned by `AuthContext.tsx`, not a React Query hook or a mock store |
| `bom` | full standard set + `mockStore.ts` | none |
| `companySettings` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `pages/CompanySettingsPage.tsx`, `schema.ts`, `types.ts` | **No `mockStore.ts`** — single-row config, likely a fixed mock object inline in `api.mock.ts` |
| `contracts` | full standard set + `mockStore.ts` | none |
| `customers` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `mockStore.ts`, `types.ts` | **No `schema.ts`, no `pages/` at all** — no dedicated screen; consumed as reference data by other features (packaging, contracts, item master) |
| `farmers` | full standard set + `components/FarmerMatchList.tsx`, `components/FarmerSelector.tsx` | none |
| `goodsReceiving` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `mockStore.ts`, `pages/GoodsReceivingListPage.tsx`, `pages/GoodsReceivingNewPage.tsx`, `schema.ts`, `types.ts` | Structurally standard, but **orphaned**: `api.ts` calls `/goods-receiving/eligible-trips`, `GET /goods-receiving`, `POST /goods-receiving` — none of which exist anywhere in the backend (confirmed: zero matches for `goods_receiving`/`goods-receiving` anywhere under `backend/`). No route in `routeConfig.tsx` mounts either page, and no nav entry in `navConfig.ts` references it — the only two hits for "goods" in `routeConfig.tsx`/`navConfig.ts` are `/finished-goods-qc` and a code comment. See §5 and §6. |
| `harvests` | full standard set + `mockStore.ts`, extra `pages/VehicleTripsPage.tsx` | none beyond the extra page |
| `inventory` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `inventoryFlow.test.tsx`, `mockStore.ts`, `pages/` (7 pages), `schema.ts`, `stockStatus.ts`, `types.ts` | Extra `stockStatus.ts` helper module; no `components/` |
| `itemMaster` | full standard set + `mockStore.ts`, `pages/` (6 pages) | none |
| `labSamples` | full standard set + `mockStore.ts` | none |
| `packaging` | full standard set + `mockStore.ts`, `comboSeed.ts`, `packagingFlow.test.tsx` | Extra `comboSeed.ts` — the hardcoded variety→customer→pack-size seed list referenced in CLAUDE.md §9 |
| `palletisation` | full standard set + `mockStore.ts`, `palletisationFlow.test.tsx` | none |
| `plots` | full standard set + `mockStore.ts`, `plotsFlow.test.tsx` | none |
| `preCooling` | full standard set + `mockStore.ts` | none |
| `purchaseOrders` | full standard set + `mockStore.ts`, `purchaseOrdersFlow.test.tsx` | Structurally complete but **dead**: no route in `routeConfig.tsx` mounts any of its pages (consistent with CLAUDE.md's "Frontend pages exist but no route mounts them") |
| `seasonRegistrations` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `pages/SeasonRegistrationsListPage.tsx`, `types.ts` | **No `schema.ts`, no `mockStore.ts`, no `components/`** — list-only feature, no create/edit form |
| `seasons` | full standard set + `components/SeasonForm.tsx`, `mockStore.ts`, `seasonsFlow.test.tsx` | none |
| `userActivity` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `mockStore.ts`, `pages/UserActivityPage.tsx`, `types.ts` | **No `schema.ts`** — read-only feature |
| `users` | full standard set + `mockStore.ts`, `phaseLabels.ts`, `usersFlow.test.tsx` | Extra `phaseLabels.ts` (display labels for the 16 `PhaseKey` values) |
| `weighing` | `api.mock.ts`, `api.ts`, `hooks.ts`, `index.ts`, `pages/` (4, incl. `WeighingSlipPrint.tsx`), `schema.ts`, `types.ts`, `weighingFlow.test.tsx` | **No `mockStore.ts`** |

Shared (not per-feature), confirmed present:
```
src/
  App.tsx, App.test.tsx, main.tsx, env.d.ts, index.css
  api/httpClient.ts          Low-level fetch wrapper, 401 interceptor, refresh de-dup
  api/mockDelay.ts           Artificial latency for mock mode
  api/transforms.ts          toCamel/toSnake case conversion
  app/AuthContext.tsx        Auth state (React state only, no persistence)
  app/ToastContext.tsx       Toast queue, empty-message no-op guard
  app/queryClient.ts         React Query client config
  components/data/           DataTable, EmptyState, ErrorState, FilterBar, LoadingState,
                              MobileRecordCard, Pagination, SearchBar (+ 2 test files)
  components/feedback/       Alert, ConfirmationDialog, Toast, UnsavedChangesWarning,
                              ValidationSummary
  components/forms/          CameraCapture, CheckboxGroup, DatePicker, FileUpload (+test),
                              FormField, GPSCapture, NumberInput, RadioGroup,
                              SearchableSelect, Select, SignatureField, Switch,
                              TextInput, Textarea, TimePicker, inputStyles.ts
  components/icons/          Icon.tsx, Logo.tsx
  components/layout/         AppShell, Breadcrumbs, ErrorBoundary, Header, MobileDrawer,
                              MobileNav, NetworkStatusBanner, PageHeader, SectionCard,
                              Sidebar
  components/workflow/       EditHistoryPanel, FollowUpAction, PrerequisitePanel,
                              ProgressCard, ReadOnlyReferenceCard, StatusBadge, TaskCard,
                              WorkflowStepper
  hooks/                      useGeolocation.ts, useNetworkStatus.ts
  pages/                      ComingSoonPage, FieldQcInfoPage, HelpPage, HomePage,
                              NotFoundPage, NotificationsPage, RecordsPage, TasksPage,
                              UnscopedPlaceholderPage
  permissions/                permissions.ts, permissions.test.ts, usePermission.ts,
                              usePhaseAccess.ts
  routes/                     ProtectedRoute.tsx, RequirePermission.tsx, RequirePhase.tsx,
                              navConfig.ts, routeConfig.tsx, useVisibleNav.ts
  schemas/common.ts
  styles/tokens.css
  test/                       flowHelpers.tsx, setup.ts
  types/                      common.ts, history.ts, season.ts
  utils/                      cn.ts, errorMessages.ts, fuzzySearch.ts (+test),
                              indianNumber.ts, workflowSteps.ts
```

---

## 4. SCHEMA VERIFICATION

Source: every file under `backend/app/models/` (19 files, read in full), cross-checked
against `backend/app/core/enums.py`. **28 tables total**, not 29 — see flag below.

### Identity and access

**`users`** (`models/user.py`)
- `id` int PK
- `email` string, **unique**, not null, indexed
- `name` string, nullable
- `mobile` string, nullable, **not unique** (matches `farmers.mobile` precedent per inline comment)
- `password_hash` string, not null
- `role` enum `user_role` (`UserRole`), not null
- `active` bool, not null
- `created_at` datetime, not null, default now
- `updated_at` datetime, not null, default/onupdate now
- `last_login_at` datetime, nullable
- `last_logout_at` datetime, nullable
- `last_activity_at` datetime, nullable
- `failed_login_count` int, not null, default 0
- `last_failed_login_at` datetime, nullable
- `password_changed_at` datetime, not null, server_default now
- (computed, not columns): `.phases` (list of `PhaseKey` from `phase_access`), `.locked_until`

**`user_phase_access`** (`models/user_phase_access.py`)
- `id` int PK
- `user_id` int FK → `users.id`, not null
- `phase_key` enum `phase_key` (`PhaseKey`, 16 values), not null
- `created_at` datetime, not null
- **Unique constraint:** `uq_user_phase_access_user_phase` on `(user_id, phase_key)`

**`audit_events`** (`models/audit_event.py`)
- `id` int PK
- `timestamp` datetime, not null, indexed, default now
- `user_id` int FK → `users.id`, **nullable**
- `user_name` string, not null (snapshotted, not joined live)
- `role` string, not null (snapshotted display label)
- `action` string, not null
- `module` string, not null
- `record_ref` string, nullable
- `result` string, not null (`'success'`/`'fail'`)
- `old_status` string, nullable
- `new_status` string, nullable

### Permanent records

**`farmers`** (`models/farmer.py`)
- `id` int PK
- `name` string, not null
- `address` string, not null
- `mobile` string, not null, indexed
- `ggn_number` string, nullable
- `status` enum `farmer_status` (`active`/`inactive`), not null
- `created_at`, `updated_at` datetime, not null
- **No `mh_number` column.** MH registration lives on `plots`, not `farmers` — see §6, this directly contradicts CLAUDE.md's current text.

**`bank_details`** (`models/farmer.py`)
- `id` int PK
- `farmer_id` int FK → `farmers.id`, **unique**, not null (1:1)
- `account_holder_name` string, not null
- `bank_name` string, not null
- `account_number` string, not null
- `ifsc_code` string, not null
- `branch_name` string, nullable
- `passbook_photo_url` string, nullable
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit, from `unique=True` on `farmer_id`):** `bank_details_farmer_id_key`

**`plots`** (`models/plot.py`)
- `id` int PK
- `farmer_id` int FK → `farmers.id`, not null
- `plot_number` string, not null
- `mh_registration_number` string, **unique globally**, nullable
- `variety` string, nullable — **plain string, not an enum** (module docstring explicitly notes PHASE_MAP.md calls it "enum" but no `Variety` enum exists in `enums.py`) — and this column **exists directly on `plots`**, contradicting CLAUDE.md §12's "Never store variety directly on `plots`" rule (see §6)
- `area_acres` numeric, nullable
- `village` string, nullable
- `taluka` string, nullable
- `survey_no` string, nullable
- `gps_lat`, `gps_long` numeric, nullable
- `pruning_date` date, nullable
- `approx_harvest_date` date, nullable
- `created_at`, `updated_at` datetime, not null
- **Unique constraint:** `uq_plots_farmer_plot_number` on `(farmer_id, plot_number)`
- **Unique constraint (implicit):** `mh_registration_number` unique globally (maps to `uq_plots_mh_registration_number` per `main.py:102`)

**`plot_varieties`** (`models/plot_variety.py`)
- `id` int PK
- `plot_id` int FK → `plots.id`, not null
- `variety_name` string, not null
- `created_at` datetime, not null (**no `updated_at`**)
- **Unique constraint:** `uq_plot_varieties_plot_variety` on `(plot_id, variety_name)`

**`customers`** (`models/customer.py`)
- `id` int PK
- `name` string, **unique**, not null
- `code` string, nullable
- `is_active` bool, not null, default true
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `customers_name_key`

**`seasons`** (`models/season.py`)
- `id` int PK
- `year` int, not null
- `start_date` date, not null
- `end_date` date, not null
- `notes` text, nullable
- `status` string, not null, default `"active"` (`'active'`/`'closed'` — **not a DB enum**, enforced at service layer only)
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- Module docstring notes this shape was "reconciled 2026-08-23 to match the
  frontend's `seasons` feature... see BACKEND_CHANGELOG.md" — **`BACKEND_CHANGELOG.md`
  does not exist anywhere in the repository** (confirmed via glob), same pattern as
  the `docs/PROJECT_DOSSIER.md` path mismatch in §6.

**`company_settings`** (`models/company_settings.py`)
- `id` int PK
- `company_name`, `company_address`, `company_phone`, `company_gst_number`,
  `company_email` — all nullable strings/text
- `ggn_number` string, nullable
- `crate_tare_weight_kg` numeric(4,2), nullable, default 1.6
- `updated_by` int FK → `users.id`, **nullable**
- `updated_at` datetime, not null
- No `created_at` on this table (single-row config)

### The pipeline

**`season_registrations`** (`models/plot.py`) — the central state machine
- `id` int PK
- `plot_id` int FK → `plots.id`, not null
- `season_year` int, not null — **legacy, kept for backward compat** per inline comment
- `season_id` int FK → `seasons.id`, **nullable** ("until data is backfilled")
- `plot_variety_id` int FK → `plot_varieties.id`, **nullable**
- `status` enum `registration_status` (`RegistrationStatus`, 13 values), not null
- `registered_by` int FK → `users.id`, not null
- `registered_at` datetime, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint:** `uq_season_registrations_plot_season` on `(plot_id, season_year)` — **note this is keyed on the legacy `season_year` integer, not the new `season_id` FK**

**`field_qc`** (`models/plot.py`) — many per registration
- `id` int PK
- `season_registration_id` int FK, not null
- `inspection_date` date, not null
- `planned_sampling_date`, `tentative_harvest_date` date, nullable
- `fruit_colour` enum `fruit_colour` (Green/Milky Green/Yellow), nullable
- `tss_percent`, `thrips_percent`, `bhuri_percent`, `black_spot_percent`,
  `cercospora_percent` numeric, nullable
- `overall_observation` enum `overall_observation` (Good/Very Good/Excellent), nullable
- `exportable_fruit_percent` numeric, nullable
- `notes` text, nullable
- `result` enum `field_qc_result` (Pass/Fail), not null
- `inspected_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null

**`lab_samples`** (`models/lab.py`) — 1:1 per registration
- `id` int PK
- `season_registration_id` int FK, **unique**, not null
- `lab_name` string, nullable — plain string, no `Lab` enum exists
- `sampling_date` date, nullable
- `seal_no` string, nullable
- `variety_confirmed` string, nullable
- `area_ha_2a`, `yield_4b_mt` numeric, nullable
- `seal_photo_url`, `documents_2a4b_url` string, nullable
- `remark` text, nullable
- `tss_value` numeric, nullable
- `result` enum `lab_result` (Pass/Fail), not null
- `entered_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `lab_samples_season_registration_id_key`

**`contracts`** (`models/contract.py`) — 1:1 per registration
- `id` int PK
- `season_registration_id` int FK, **unique**, not null
- `contract_date` date, nullable
- `rate_per_kg` numeric, not null
- `rejection_percent` numeric, default 7.00, not null — **exists and is populated, read by nothing computational** (see §5)
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `contracts_season_registration_id_key`

**`harvests`** (`models/harvest.py`) — many per registration
- `id` int PK
- `season_registration_id` int FK, not null
- `harvest_date` date, not null
- `supervisor_name`, `supervisor_contact` string, nullable
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **No `variety` column** — inherits variety via `season_registration → plot_variety`

**`vehicle_trips`** (`models/harvest.py`) — many per harvest
- `id` int PK
- `harvest_id` int FK, not null
- `vehicle_no`, `driver_name` string, nullable
- `num_crates` int, nullable (harvest-time estimate)
- `approx_weight_kg` numeric, nullable (harvest-time estimate)
- `crate_count_at_weighing` int, nullable (weighing-time actual)
- `gross_weight_kg` numeric(8,2), nullable
- `tare_weight_kg` numeric(8,2), nullable
- `net_fruit_weight_kg` numeric(8,2), nullable
- `created_at`, `updated_at` datetime, not null

**`weighing_records`** (`models/weighing.py`) — 1:1 per vehicle trip
- `id` int PK
- `vehicle_trip_id` int FK, **unique**, not null
- `date` date, nullable
- `slip_no`, `supervisor_name` string, nullable
- `num_crates` int, nullable
- `total_weight_kg` numeric, **not null**
- `rejection_pct` numeric, nullable — **fixed rate actually charged, `FARMER_REJECTION_PCT`, never the contract's**
- `actual_rejection_pct` numeric(5,2), nullable — observed only, never charged
- `rejection_kg` numeric, nullable (calculated)
- `net_weight_kg` numeric, nullable (calculated)
- `slip_photo_url` string, nullable
- `slip_serial_no`, `load_id`, `harvester_no`, `no_crt_reci`, `knitting` string, nullable
- `produce_type` string, nullable, default `"Grapes"`
- `average_size` string, nullable
- `average_sugar` numeric(5,2), nullable
- `village_name`, `contact_no` string, nullable
- `crate_tare_weight_kg` numeric(4,2), nullable — rate actually used, stored for audit
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `weighing_records_vehicle_trip_id_key`

**`arrival_qc`** (`models/arrival_qc.py`) — 1:1 per harvest, terminal
- `id` int PK
- `harvest_id` int FK, **unique**, not null
- `inspection_date` date, nullable
- `fruit_colour_green_pct`, `fruit_colour_milky_pct`, `fruit_colour_yellow_pct` numeric, nullable
- `tss_percent`, `thrips_percent`, `bhuri_percent`, `black_spot_percent`,
  `cercospora_percent` numeric, nullable
- `overall_observation` enum `overall_observation`, nullable (reuses field_qc's enum)
- `result` enum `arrival_qc_result` (Pass/Fail), not null
- `notes` text, nullable
- `inspected_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `arrival_qc_harvest_id_key` — the actual terminal-on-fail enforcement

**`packaging_records`** (`models/packaging.py`)
- `id` int PK
- `harvest_id` int FK, not null
- `date` date, nullable
- `slip_no` string, nullable
- `lot_id` string, **unique**, not null (system-generated, see §5)
- `pack_size` enum `pack_size` (4 Kg / 4.5 Kg / 5 Kg), not null
- `compliance_type` enum `compliance_type` (EU / Non-Testing), not null
- `customer_id` int FK → `customers.id`, not null
- `total_weight_kg` numeric, not null
- `rejection_contract_kg` numeric, nullable — **misleadingly named**: computed from the fixed `FARMER_REJECTION_PCT` constant, per its own inline comment, "not from the contract despite the name"
- `net_weight_kg` numeric, nullable (calculated)
- `actual_rejection_kg`, `actual_rejection_pct` numeric, nullable — observed only, never charged
- `num_boxes` int, **not null**
- `num_pallets` int, nullable
- `ggn_number` string, nullable (copied from `company_settings` at packing time)
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `packaging_records_lot_id_key`
- **No columns for package type, grade, brand, colour code, count/size, inventory code, or target market** — confirmed absent, consistent with PROJECT_DOSSIER.md's Tier 3 claim

**`pallets`** (`models/palletisation.py`)
- `id` int PK
- `pallet_id` string, **unique**, not null (system-generated, see §5)
- `date` date, nullable
- `pallet_type` enum `pallet_type` (Big/Mini), not null
- `total_boxes` int, nullable
- `notes` text, nullable
- `status` enum `pallet_status` (created/pre_cooling/dispatched), not null
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null
- **Unique constraint (implicit):** `pallets_pallet_id_key`

**`palletisation_lots`** (`models/palletisation.py`) — pure junction table
- `id` int PK
- `pallet_id` int FK → `pallets.id`, not null
- `packaging_record_id` int FK → `packaging_records.id`, not null
- `num_boxes` int, not null
- `created_at` datetime, not null (**no `updated_at`** — deliberate per its docstring, matches PHASE_MAP.md's explicit column list)
- No unique constraint of its own (a pallet may legitimately hold multiple rows for the same packaging record only if inserted separately — not prevented at the DB level)

**`pre_cooling_records`** (`models/pre_cooling.py`)
- `id` int PK
- `pallet_id` int FK → `pallets.id`, not null
- `date` date, nullable
- `num_pallets`, `num_boxes` int, nullable
- `in_time` time, nullable
- `in_berry_temp` numeric, nullable
- `out_time` time, **nullable** (partial-save)
- `out_berry_temp` numeric, **nullable** (partial-save)
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null

### Inventory

**`item_master_materials`** (`models/inventory.py`)
- `id` int PK
- `material_type` enum `material_type` (10 values, see below), not null
- `variant_name` string, not null
- `unit_of_measure` enum `unit_of_measure` (pieces/kg/rolls), not null
- `scale_level` enum `scale_level` (per_box/per_container), not null
- `reorder_point` int, nullable
- `is_active` bool, not null, default true
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null

**`item_master_products`** (`models/inventory.py`)
- `id` int PK
- `variety` string, not null — plain string, no `Variety` enum
- `customer_id` int FK → `customers.id`, not null
- `pack_size` enum `pack_size`, not null
- `compliance_type` enum `compliance_type`, not null
- `is_active` bool, not null, default true
- `created_at`, `updated_at` datetime, not null

**`bom_entries`** (`models/inventory.py`)
- `id` int PK
- `product_id` int FK → `item_master_products.id`, not null
- `material_id` int FK → `item_master_materials.id`, not null
- `qty_per_container` int, not null
- `qty_per_box` numeric, nullable (calculated)
- `created_at`, `updated_at` datetime, not null

**`stock_movements`** (`models/inventory.py`)
- `id` int PK
- `material_id` int FK → `item_master_materials.id`, not null
- `movement_type` enum `movement_type` (in/auto_out/adjustment), not null
- `quantity` int, not null (signed)
- `date` date, nullable
- `supplier_name` string, nullable
- `reference` string, nullable
- `reason` text, nullable
- `packaging_record_id` int FK → `packaging_records.id`, **nullable** (set only for `auto_out`)
- `created_by` int FK → `users.id`, not null
- `created_at`, `updated_at` datetime, not null

### Dropped / unused

**`purchase_orders`** (`models/purchase_order.py`) — router unregistered, table unused by any live endpoint
- `id` int PK; `po_number` string **unique**, not null; `po_date` date nullable;
  `payment_terms`, `supplier_ref`, `other_refs` string nullable;
  `dispatch_through` string not null default `"Road Transport"`; `destination` string
  nullable; `supplier_name` string not null; `supplier_address` text nullable;
  `supplier_email`, `supplier_gst` string nullable; `assessable_value`, `cgst_total`,
  `sgst_total` numeric nullable; `freight` string nullable; `other_charges` numeric
  not null default 0; `grand_total` numeric nullable; `total_in_words` string
  nullable; `status` enum `po_status` (draft/issued/completed) not null; `created_by`
  FK not null; `created_at`/`updated_at` not null.
- **Unique constraint (implicit):** `purchase_orders_po_number_key` — still present in
  `main.py`'s constraint-message map (`main.py:112`) despite the router being
  unregistered — dead code in the exception handler too, not just the router.

**`purchase_order_line_items`** (`models/purchase_order.py`)
- `id` int PK; `purchase_order_id` FK not null; `sr_no` int nullable; `particulars`
  string not null; `hsn_code` string nullable; `qty_kg`, `kg_per_unit`, `rate`,
  `gst_percent`, `amount` numeric nullable; `units` int nullable; `make` string
  nullable; `created_at`/`updated_at` not null.

### Enums (18 total, exact values, from `app/core/enums.py`)

| Enum | DB name | Values |
|---|---|---|
| `UserRole` | `user_role` | `admin`, `field_worker`, `lab_worker`, `office_worker`, `stock_manager`, `packaging_supervisor` |
| `FarmerStatus` | `farmer_status` | `active`, `inactive` |
| `RegistrationStatus` | `registration_status` | `Registered`, `Field QC Passed`, `Field QC Failed`, `Lab Passed`, `Lab Failed`, `Under Contract`, `Harvested (partial)`, `Weighed`, `Arrival QC Passed`, `Arrival QC Failed`, `Packed`, `Palletised`, `Pre-Cooled` — **13 values, no Finished Goods QC values** |
| `FruitColour` | `fruit_colour` | `Green`, `Milky Green`, `Yellow` |
| `OverallObservation` | `overall_observation` | `Good`, `Very Good`, `Excellent` |
| `FieldQCResult` | `field_qc_result` | `Pass`, `Fail` |
| `LabResult` | `lab_result` | `Pass`, `Fail` |
| `ArrivalQCResult` | `arrival_qc_result` | `Pass`, `Fail` |
| `PackSize` | `pack_size` | `4 Kg`, `4.5 Kg`, `5 Kg` |
| `ComplianceType` | `compliance_type` | `EU`, `Non-Testing` |
| `MaterialType` | `material_type` | `Box`, `Liner Bag`, `Puneet`, `Pouch`, `Grape Guard`, `Angle Board`, `Pallet`, `Strapping Roll`, `Clip`, `Sticker` — 10 values |
| `UnitOfMeasure` | `unit_of_measure` | `pieces`, `kg`, `rolls` |
| `ScaleLevel` | `scale_level` | `per_box`, `per_container` |
| `MovementType` | `movement_type` | `in`, `auto_out`, `adjustment` |
| `PalletStatus` | `pallet_status` | `created`, `pre_cooling`, `dispatched` |
| `PalletType` | `pallet_type` | `Big`, `Mini` |
| `POStatus` | `po_status` | `draft`, `issued`, `completed` |
| `PhaseKey` | `phase_key` | `farmer_registration`, `plot_registration`, `field_qc`, `lab_sampling`, `farmer_contract`, `harvesting`, `weighing`, `arrival_qc`, `packaging`, `inventory_management`, `palletisation`, `pre_cooling`, `finished_goods_qc`, `admin`, `users`, `reports_documents` — **16 values** |

### Flags for likely errors in an indirectly-assembled version

- **Table count is 28, not 29.** Full count by file: `arrival_qc`(1) + `audit_events`(1)
  + `company_settings`(1) + `contracts`(1) + `customers`(1) + `farmers`+`bank_details`(2)
  + `harvests`+`vehicle_trips`(2) + `item_master_materials`+`item_master_products`+
  `bom_entries`+`stock_movements`(4) + `lab_samples`(1) + `packaging_records`(1) +
  `pallets`+`palletisation_lots`(2) + `plots`+`season_registrations`+`field_qc`(3) +
  `plot_varieties`(1) + `pre_cooling_records`(1) + `purchase_orders`+
  `purchase_order_line_items`(2) + `seasons`(1) + `users`(1) + `user_phase_access`(1)
  + `weighing_records`(1) = **28**.
- **`plots.variety` exists as a plain string column.** If any assembled version
  states variety was fully removed from `plots` (per CLAUDE.md's current "never do"
  wording), that's wrong — see §6.
- **`farmers` has no MH-number column of any kind.** MH lives only on `plots`
  (`mh_registration_number`), unique globally, nullable.
- **`contracts.rejection_percent` is fully live in the schema** (not null, default
  7.00) — it is only *unread by calculations*, not absent or deprecated at the DB
  level.
- **`season_registrations`' unique constraint is keyed on the legacy `season_year`
  integer**, not the newer `season_id` FK — worth knowing if migrating fully to
  `season_id` later, since the uniqueness guarantee would need to move with it.
- **`palletisation_lots` has no unique constraint** — nothing in the DB prevents two
  identical `(pallet_id, packaging_record_id)` rows; the "don't exceed num_boxes"
  rule is service-layer only, per its own docstring.
- Every table not listed under "Dropped / unused" above is read by at least one
  active router — I did not find any additional orphaned table beyond
  `purchase_orders`/`purchase_order_line_items`.

---

## 5. TECHNICAL DEBT WITH LOCATIONS

**Pallet ID generation:**
`backend/app/api/v1/routers/palletisation.py:62-70`
```python
def _generate_pallet_id(db: Session, on_date: date_cls) -> str:
    base = f"PAL-{on_date.strftime('%Y%m%d')}"
    count = db.scalar(
        select(sa_func.count(Pallet.id)).where(Pallet.pallet_id.like(f"{base}-%"))
    ) or 0
    seq = count + 1
    while db.scalar(select(Pallet).where(Pallet.pallet_id == f"{base}-{seq}")) is not None:
        seq += 1
    return f"{base}-{seq}"
```
Format: `PAL-YYYYMMDD-<seq>` (e.g. `PAL-20260901-1`). Client's real documents use
`N-90` through `N-112` — a different format entirely (see §6).

**Lot ID generation:**
`backend/app/api/v1/routers/packaging.py:60-70`
```python
def _generate_lot_id(db: Session, harvest: Harvest, customer: Customer, pack_size: PackSize) -> str:
    cust_code = (customer.code or customer.name.replace(" ", "")[:6]).upper()
    base = (
        f"RF-P{harvest.season_registration.plot_id}"
        f"-{harvest.harvest_date.strftime('%Y%m%d')}"
        f"-{cust_code}-{_PACK_CODE[pack_size]}"
    )
    seq = 1
    while db.scalar(select(PackagingRecord).where(PackagingRecord.lot_id == f"{base}-{seq}")) is not None:
        seq += 1
    return f"{base}-{seq}"
```
Format: `RF-P<plotId>-YYYYMMDD-<CUSTCODE>-<PACKCODE>-<seq>`. Client's real Lot IDs
(per PROJECT_DOSSIER.md's document map) are 12-digit numeric, e.g. `202681006331` —
a completely different scheme.

**Boxes-per-pallet hardcoding:** **Not found.** Grepped `backend/app` for `120`,
`96`, `boxes_per_container`, `boxes_per_pallet` — the only hit is a comment
(`models/inventory.py:88`, `# calculated: qty_per_container / boxes_per_container`)
describing a *ratio*, not a hardcoded number; no literal `120`/`96` capacity constant
exists anywhere in backend business logic. Frontend grep for the same terms turns up
only unrelated matches (an SVG `height={120}`, a CSS `max-h-96` class, mock-data seed
comments, and test assertions in `palletisationFlow.test.tsx` that check a
*test-fixture* value of 120 boxes, not a hardcoded application constant).
`pallets.total_boxes` and `packaging_records.num_boxes` are both plain
user-entered/summed integers with no capacity ceiling anywhere in the schema or the
route handlers.

**Hardcoded numeric business constants found:**
| Constant | Value | Location |
|---|---|---|
| `FARMER_REJECTION_PCT` | `Decimal("7")` | `backend/app/core/constants.py:16` |
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | `backend/app/core/security.py:25` |
| `LOGIN_LOCKOUT_MINUTES` | `15` | `backend/app/core/security.py:26` |
| `DEFAULT_CRATE_TARE_WEIGHT_KG` | `Decimal("1.6")` | `backend/app/api/v1/routers/weighing.py:52` (falls back to `company_settings.crate_tare_weight_kg` if a row exists — see `weighing.py:55-59`) |
| `crate_tare_weight_kg` column default | `1.6` | `backend/app/models/company_settings.py:28` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | `backend/app/core/config.py:13` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | `backend/app/core/config.py:14` |
| `contracts.rejection_percent` default | `7.00` | `backend/app/models/contract.py:22` (dead — see below) |

**The `goodsReceiving` frontend module — every file, and whether any route mounts
it:**
```
frontend/src/features/goodsReceiving/
  api.mock.ts
  api.ts          calls /goods-receiving/eligible-trips, GET /goods-receiving,
                  POST /goods-receiving — none exist on the backend
  hooks.ts
  index.ts        picks goodsReceivingApiMock vs goodsReceivingApiReal by USE_MOCK_API
  mockStore.ts
  pages/GoodsReceivingListPage.tsx
  pages/GoodsReceivingNewPage.tsx
  schema.ts
  types.ts
```
**No route mounts it.** `frontend/src/routes/routeConfig.tsx` contains zero
references to `GoodsReceiving`/`goods-receiving` — the only nearby text is a code
comment at line 185 ("Arrival QC, Goods Receiving, Packaging (Phase 4)") sitting
above routes for Arrival QC and Packaging only. No `import` of anything from
`features/goodsReceiving` exists anywhere in `routeConfig.tsx`.

**Nav entry for `goodsReceiving`:** **Does not exist**, confirmed — `frontend/src/routes/navConfig.ts`
has zero matches for `goodsReceiving`/`goods-receiving` in any form (the only "goods"
hit in that file is `/finished-goods-qc`, an unrelated placeholder entry). This
sharpens a claim in PROJECT_DOSSIER.md's Tier 3 list ("hide the nav entry
meanwhile") — there is currently nothing to hide; either it was never wired to nav,
or it was already removed before this file was assembled.

**References to `contracts.rejection_percent`:**
- `backend/app/models/contract.py:22` — the column definition itself, still live,
  default 7.00, not null.
- `backend/app/schemas/contract.py:14` and `:22` — Pydantic schema fields for it
  (still accepted on read/write of a contract, just not consumed downstream).
- `backend/alembic/versions/ee800d0eaf23_initial_schema.py:255` — original migration
  that created the column.
- `backend/app/api/v1/routers/contracts.py:9-14` — docstring explicitly states "
  Weighing and packaging read the constant directly; `contracts.rejection_percent`
  still exists on the model and always defaults to 7.00, but nothing reads it
  anymore."
- **Stale comment found:** `backend/app/schemas/weighing.py:64` —
  `rejection_pct: Decimal | None  # the contract's rejection_percent, snapshotted at save time`
  — this comment describes the **pre-2026-08-30 design** (rejection sourced from the
  contract). The code no longer does this — `weighing.py`'s router reads
  `FARMER_REJECTION_PCT` from `constants.py` (confirmed at
  `backend/app/api/v1/routers/weighing.py:41,183,198`), not the contract. The
  comment was not updated when the founder's correction landed. Same pattern (stale
  comment, not stale behavior) at `backend/app/models/weighing.py:11`, which does
  correctly describe the *current* design in its module docstring, creating an
  internal inconsistency between the module docstring and the field-level comment
  in the schema file 64 lines into a different file.
- `backend/app/models/packaging.py:51` — `rejection_contract_kg` column comment:
  "fixed 7% (FARMER_REJECTION_PCT), not from the contract despite the name" — the
  column name itself is a residual naming artifact from before the reversal, though
  the comment correctly documents current behavior.
- No router computes anything from `contract.rejection_percent` — confirmed by
  reading `weighing.py` and `packaging.py` router logic directly; both import and use
  `FARMER_REJECTION_PCT` from `app.core.constants`.

**`purchase_orders` router, models, and unregistration confirmation:**
- Router file: `backend/app/api/v1/routers/purchase_orders.py` — present on disk,
  never imported in `main.py`.
- Models: `backend/app/models/purchase_order.py` — `PurchaseOrder` (table
  `purchase_orders`), `POLineItem` (table `purchase_order_line_items`) — both fully
  defined, both still created by migrations, neither read by any registered router.
- Unregistration confirmed at `backend/app/main.py:216-222`:
  ```python
  # purchase_orders.router is deliberately NOT included. CLAUDE.md §12/§7
  # (Phase 12) confirms the Purchase Order module is out of scope — no
  # fertilizer purchases, no PO process needed (CEO, 2026-08-11). The
  # purchase_orders/purchase_order_line_items tables still exist in the DB
  # and are slated for removal in a future migration; the router file itself
  # is left in app/api/v1/routers/ unregistered rather than deleted, in case
  # removal needs to be staged separately from unregistering the routes.
  ```
- The `IntegrityError`-message map in `main.py:112` still carries a
  `purchase_orders_po_number_key` entry — dead code riding along with the
  unregistered router; harmless (it can never fire, since nothing can insert a
  `PurchaseOrder` row through the API) but worth removing in the same future cleanup.
- Frontend: `frontend/src/features/purchaseOrders/` is structurally complete (see
  §3 table) but unreachable — no route in `routeConfig.tsx` mounts any of its pages.

---

## 6. WHAT I'VE PROBABLY GOT WRONG

**First: the file location itself is wrong.** The task instruction was to read
`docs/PROJECT_DOSSIER.md` — that path does not exist. The file exists at the repo
root, `PROJECT_DOSSIER.md` (confirmed via `find . -iname "PROJECT_DOSSIER.md"` and
`wc -l` → 1017 lines), and is **untracked in git** (`?? PROJECT_DOSSIER.md` in
`git status --short`). If the handover document assumes it lives under `docs/` or is
already committed, both assumptions are wrong as of this writing.

Below, each claim is checked against the code as it exists right now.

### Confirmed accurate (worth knowing what PROJECT_DOSSIER.md got *right*, not just wrong)

- §4.3's core claim — MH number is per-plot (`plots.mh_registration_number`, unique
  globally, nullable), **not** per-farmer — is correct. `farmers` has no MH column at
  all. This is the opposite of what CLAUDE.md currently states (CLAUDE.md Discovery 8
  and its "never do" list both say MH belongs to the farmer). PROJECT_DOSSIER.md is
  the one that matches the live schema; CLAUDE.md is the stale document here.
- §5.2's `plots` column list, including `variety` as a plain column on `plots`, is
  correct — and this directly contradicts CLAUDE.md §12's explicit rule ("Never
  store variety directly on `plots` or `harvests`"). The rule is violated in the
  live schema (`backend/app/models/plot.py:52`), not by PROJECT_DOSSIER.md's
  reporting of it.
- §5.3's claim that the DB enum has no Finished Goods QC values while the frontend
  type does is correct — confirmed: `RegistrationStatus` has exactly the 13 values
  listed in §5.3, and a grep for `finished_goods_qc`/`FinishedGoodsQC` across all of
  `backend/app` returns exactly one hit, the `PhaseKey.FINISHED_GOODS_QC` placeholder
  in `enums.py` — no table, no model, no status value.
- §4.7 / §9.6's purchase-orders claims are exactly right, down to the router being
  present-but-unregistered and the tables still existing. See §5 above for citations.
- §8.1–§8.10's bug narratives are all consistent with code-level evidence still
  visible today (e.g. the `/files` static mount really is removed with an explanatory
  comment at `main.py:169-172`; `pool_pre_ping=True` with `pool_recycle` deliberately
  absent is exactly as described, with the reasoning preserved verbatim in
  `db/base.py`'s comments).
- §11 Tier 2's pallet-ID and lot-ID format-mismatch claims are correct and are now
  citable — see §5 above.
- The `seasons` schema in §5.2 (`year`, `start_date`, `end_date`, `notes`, `status`,
  `created_by`) matches `models/season.py` exactly.

### Contradicted by the code

- **§11 Tier 3, "Pallet capacity assumed fixed... code likely assumes 120."** This is
  hedged ("likely") in the source document, and the hedge turns out to be doing a lot
  of work: it's not true. There is no hardcoded 96/120 boxes-per-pallet constant
  anywhere in the backend or the real (non-test, non-mock) frontend code. `num_boxes`
  and `total_boxes` are free integers with no ceiling. See §5 for the full grep
  evidence. If the handover document repeats this claim, it should be corrected to
  "not currently constrained in code either way — worth deciding deliberately rather
  than assuming a fixed number needs removing."
- **§11 Tier 3, "Goods Receiving backend... hide the nav entry meanwhile."** This
  phrasing presupposes a nav entry currently exists that needs hiding. It does not —
  `navConfig.ts` has no entry for goods receiving in any form (see §5). Either it was
  already removed by the time this draft was written, or it was never added to begin
  with; either way, the recommended action ("hide it") is already moot, and the
  actual remaining work is entirely about the orphaned `features/goodsReceiving/`
  directory and its dead calls to a nonexistent backend, not about nav visibility.
- **§2's "Team 2 merge" and "required a merge revision" narrative.** `git log
  --merges` returns nothing — there is no merge commit anywhere in this repository's
  23-commit history. This doesn't mean the underlying story (a second team building
  frontend against mock data, landing work that didn't match the real backend) is
  false — §8.1's symptoms (405s, endpoints that never existed) are real and still
  traceable in the current code's shape — but the specific claim that a *git merge*
  happened and "required a merge revision" for a diverged Alembic chain is not
  something git history can confirm. Either the merge was done by hand (copying files
  across, not `git merge`), or it happened before this repository's visible history
  began and the commits were later squashed/reset. If the handover document states
  this as a git-verifiable fact, soften it to "consistent with the commit pattern of
  2026-08-29, but not confirmable from git history directly."
- **§5.2's "29 tables."** Direct count from all 19 model files is 28 — see §4 above
  for the full per-file breakdown. Off by one; not a large discrepancy, but worth
  fixing since the rest of §5.2's table-by-table list is otherwise accurate against
  what I count.

### Unverifiable from the repository alone (neither confirmed nor contradicted)

- **§2's exact dates for anything before the first commit** (2026-08-11 CEO answer
  session, 2026-08-13 document receipt, 2026-08-14 Phase 6 backend, 2026-08-22 Team 2
  merge, 2026-08-23 Phase 6 frontend) — none of this predates `5bdfa2a` (2026-08-26),
  so none of it can be checked against git history at all. The entire pre-2026-08-26
  timeline in §2 rests on sources outside the repo (client documents, discovery
  notes) — which is exactly what the document's own epigraph says, so this isn't a
  contradiction, just a reminder that git cannot corroborate any of it.
- **§2's "2026-08-29 Deployment"** — no commit on that date reads as a deploy event
  specifically; it's inferred from Render/Vercel dashboard history, which this
  environment has no access to. The Phase B commit burst that day (login page, API
  wiring, icon fixes) is consistent with live-debugging right after a deploy, but
  isn't itself proof of one.
- **§8.7's git-email/Vercel-build story** (`bt23f06f042@gmail.com` vs.
  `bt23f06f042@geca.ac.in`) — the commit author email on every commit in this
  repository's history is in fact `bt23f06f042@gmail.com` (confirmed via `git log`),
  which is at least consistent with the claim; whether Vercel actually rejected
  builds from it is not something visible from the git repository itself.
- **§9.10's "frontend behaviour in a real browser is not yet confirmed"** — still
  true as of this writing; the 7 uncommitted files implementing that behavior exist
  and read correctly by inspection (traced through `httpClient.ts` →
  `AuthContext.tsx` → `ToastContext.tsx` → `errorMessages.ts`), but no browser test
  has been run in this session either.

### Not addressed above

Every other claim in the six sections of PROJECT_DOSSIER.md not called out above
(the document map in §3, the compliance-regime detail in §1, the phase-permission
model in §5.4, the guard rules in §5.4's "users phase" subsection, the seeded
test-account table in §10) was either outside the scope of what this pass checked
against code, or draws on external documents/business facts this repository cannot
verify one way or the other.
