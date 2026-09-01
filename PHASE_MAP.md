# PHASE_MAP.md — Reliable Fresh Export Management System

> This is the single authoritative reference for phase scope, data model, and system-wide flows. It was originally consolidated from the Phase 0 discovery drafts (`TEMP_Phase01-05_Draft.md`, `TEMP_Phase06-08_Draft.md`, `TEMP_Phase09-12_Draft.md`), `context.md`, and the Excel flow-chart conversion — those working files have since been folded in here and removed from the project directory to avoid duplication. Where a section below says "originally drafted in Phase X spec," that refers to discovery-session history, not a file that still exists on disk. No new design decisions are made in this document beyond what was explicitly confirmed during the phase-map review — open ambiguities are called out in Section 9 rather than resolved silently.
>
> **Tech stack (authoritative):** Python + FastAPI + SQLAlchemy ORM + Alembic (migrations) + PostgreSQL backend; React + TypeScript + Vite + Tailwind CSS frontend; JWT auth with refresh tokens; PWA with service worker. This project is fully greenfield — no prototype codebase is being carried forward. See `CLAUDE.md` for full project context and decision history.

---

## 1. Project Summary

Reliable Fresh Export Management System is an internal PWA for Reliable Fresh, a Pune-based grape export company, used by ~12–20 staff to run their full export pipeline: registering ~500 Nashik-region farmers, running multi-stage quality checks, harvesting, weighing, packing to customer spec, managing packing-material inventory, palletising, cold-storage handling, and (in later, unscoped phases) container loading, invoicing, and export documentation. It replaces the company's current paper forms and Excel workbook with a structured, auditable, role-gated system built around one central state machine (`season_registrations.status`).

---

## 2. Complete Phase Map

**Numbering note:** Phases 1–12 use the numbering confirmed during discovery and now reconciled across `CLAUDE.md` and this file — see Section 9 for the numbering-conflict resolution history. The five not-yet-scoped modules below have no confirmed phase number in any doc; they're listed in flow-chart order with no number assigned.

| Phase | Module | Spec Status | Originally Spec'd In | Key Entities/Tables | Dependencies | Blocked by CEO Questions |
|---|---|---|---|---|---|---|
| 0 | Season Management *(added 2026-08-11)* | Scoped | CEO confirmation round, Aug 2026 | `seasons` | None — foundational, must exist before any registration | None |
| 1A | Farmer Registration — Identity | Fully spec'd | Phase 1–5 draft | `farmers` | None (foundational) | None |
| 1B | Farmer Registration — Bank Details | Fully spec'd | Phase 1–5 draft | `bank_details` | 1A | None |
| 2 | Plot Registration & Field QC (combined screen) | Fully spec'd | Phase 1–5 draft | `plots`, `plot_varieties` *(added 2026-08-11)*, `season_registrations`, `field_qc` | 1A | ~~#4 (multi-variety plots)~~ **RESOLVED 2026-08-11 — see Section 9; note Open_Questions.md marks Q4 "REOPENED" rather than closed, flagged as an inconsistency in the change report** |
| 3 | Lab Sampling / MRL Test | Fully spec'd | Phase 1–5 draft | `lab_samples` | 2 (Field QC must pass) | None |
| 4 | Farmer Contract | Fully spec'd | Phase 1–5 draft | `contracts` | 3 (Lab must pass) + 1B (bank details must exist) | ~~#5 (rejection % default/variance policy)~~ **RESOLVED 2026-08-31 — fixed 7%, not a contract term** |
| 5 | Harvesting | Fully spec'd | Phase 1–5 draft | `harvests`, `vehicle_trips` | 4 (Contract must exist) | #3 (harvest frequency — non-blocking, informational) |
| 6 | Weighing Record | Fully spec'd | Phase 6–8 draft | `weighing_records` | 5 (vehicle trips exist) | ~~#5 (rejection % feeds this calc)~~ **RESOLVED 2026-08-31 — fixed 7%, not from the contract** |
| 7 | Arrival QC | Fully spec'd | Phase 6–8 draft | `arrival_qc` | 6 (weighing complete) | None |
| 8 | Packaging | Fully spec'd | Phase 6–8 draft | `packaging_records` | 7 (Arrival QC must pass) | #1 (Lot ID rule), #7 (customer report formats) |
| 9 (9A/9B/9C) | Inventory Management (Item Master, Stock Management, Dashboard) | Scoped | Phase 9–12 draft | `item_master_materials`, `item_master_products`, `bom_entries`, `stock_movements` | 8 (auto stock-out hooks off packaging_records) | ~~#11 (ordering process)~~ **RESOLVED 2026-08-11 — Pattern C** ; #14 (per-box vs per-container deduction timing) still open |
| 10 | Palletisation | Scoped | Phase 9–12 draft | `pallets`, `palletisation_lots` | 8 (packaging records to draw lots from) | #10 (floor workflow, Pallet ID format) |
| 11 | Pre-Cooling | Scoped | Phase 9–12 draft | `pre_cooling_records` | 10 (pallets must exist), **now also 13 (Finished Goods QC must pass) — see Section 4** | #9 (who performs this role) |
| 12 | ~~Purchase Order (Farm Input Procurement)~~ | ❌ **DROPPED 2026-08-11** | Phase 9–12 draft | `purchase_orders`, `purchase_order_line_items` — **exist in the DB but unused; the router is unregistered from `app/main.py` as of 2026-09-01 (routes 404), tables/router file still pending removal** | None — fully standalone | Moot — CEO confirmed no fertilizer purchases, PO module out of scope entirely (Q12 resolved) |
| 13 | Finished Goods QC *(added 2026-08-11)* | ⚠️ Position confirmed, fields TBD | CEO confirmation round, Aug 2026 + Business Rule R21 | `finished_goods_qc` (pending design) | Sequenced between 10 (Palletisation) and 11 (Pre-Cooling) — **numbered 13 per explicit instruction even though it sits pipeline-earlier than 11; flagged as a numbering/sequencing mismatch in the change report** | Q13 resolved (position); exact fields still pending a CEO document |
| — | Container Indent | **Not yet scoped** | Flow chart + R46 | `container_indent_requests` (future) | 11 (Pre-Cooling complete, per R45) | None numbered, but the 3-step CHA handoff (R46) has no screen-level spec |
| — | Container Loading | **Not yet scoped** | Flow chart + R47 | `container_loading` (future) | Container Indent allocation confirmed by CHA | None numbered — no screen-level spec |
| — | Farmer Invoice | **Not yet scoped** | Flow chart + R48 | `farmer_invoices` (future) | Container Loading complete | #6 (deduction rules beyond rejection %) |
| — | Export Documents | **Scope confirmed 2026-09-01, schema not yet designed** — see Section 7 | Flow chart + R49–51 | `export_documents` (future) — gated by the new `reports_documents` phase (Section 5) | Tied to a shipment/container, not to a specific earlier phase | Q15 (attachment model — added 2026-09-01) |

---

## 3. Consolidated Entity Relationship Map

```
seasons (Phase 0, added 2026-08-11) ──1───► season_registrations
  │ admin-managed: name, start_date, end_date,        (season_id FK — PENDING,
  │ is_active (only one active at a time)              replaces season_year int)
  ▼

users ──1───► N user_phase_access (added 2026-08-11 — role is a display
  │            label only; actual screen access comes from here, see Section 5)
  │ (created_by / inspected_by / entered_by / registered_by FKs
  │  are referenced from every event record below)
  ▼

farmers ──1───► bank_details                                        [Phase 1B]
   │ (farmers.mh_number as of 2026-08-11 — see below)
   │
   │ 1
   ▼ N
 plots (permanent land record, persists across seasons;
   │    DOES have a variety column live in code, despite the 2026-08-11 plan
   │    to remove it — see Section 7's `plots` entry, flagged 2026-09-02)
   │ 1
   ▼ N
 plot_varieties (added 2026-08-11 — variety registered per plot here,     [Phase 2]
   │              NOT on plots or harvests — see Section 7, R57)
   │ 1
   ▼ N
 season_registrations                                                     [Phase 2]
   │
   │ 1
   ▼ N
 field_qc                                                                  [Phase 2]
   │ 1 (only the passed one gates the next step)
   ▼ 1
 lab_samples                                                                [Phase 3]
   │ 1 (only if passed)
   ▼ 1
 contracts                                                                   [Phase 4]
   │ 1 (must exist)
   ▼ N
 harvests (no variety column — inherits via season_registration →           [Phase 5]
   │        plot_variety, see Section 7, R57)
   │
   ├──► N vehicle_trips                                                     [Phase 5]
   │         │ 1
   │         ▼ 1
   │    weighing_records                                                    [Phase 6]
   │
   ▼ 1
 arrival_qc                                                                 [Phase 7]
   │ 1
   ▼ N
 packaging_records (each record = one Lot)                                  [Phase 8]
   │ N:M
   ▼
 palletisation_lots (junction table)                                        [Phase 10]
   │ N:1
   ▼
 pallets                                                                     [Phase 10]
   │ 1
   ▼ 1
 finished_goods_qc (Phase 13 — added 2026-08-11; position now                [Phase 13]
   │                 confirmed here, BEFORE Pre-Cooling; fields TBD)
   ▼ 1
 pre_cooling_records                                                         [Phase 11]
   │
   ▼
 container_loading (future) ◄── container_indent_requests (future)
   │
   ├──► farmer_invoices (future — per farmer, per shipment)
   └──► export_documents (future — per shipment, 5 certs)

 customers ◄── replaces the old denormalized string columns on
               packaging_records.customer_name and item_master_products.customer (see Section 7)


  Standalone reference/setup tables (Phase 9A) — no FK chain into the harvest pipeline above:

  item_master_materials ──┐
  item_master_products ───┼──► bom_entries                            [Phase 9A]
                           │
  stock_movements ◄────────┘  (material_id FK always; packaging_record_id FK
                                nullable — set only for movement_type='auto_out')  [Phase 9B]

  purchase_orders ──► purchase_order_line_items                        [Phase 12 — ⚠️ DROPPED
  (farm-input procurement — fertilizers/agro-chemicals, fully standalone,   2026-08-11. Tables
   no FK relationship to any table above)                                  exist, unused, will be
                                                                             removed in a future
                                                                             migration.]

  suppliers (future — denormalized autocomplete only; referenced conceptually
             by Stock In (9B) and PO supplier fields (12), no table defined yet)

  company_settings — feeds GGN number (Phase 1/8) and PO letterhead (Phase 12)  [see Section 7]
```

---

## 4. Unified Status Flow

### `season_registrations.status` — the central state machine

```
Registered
   │ Field QC saved with result = Pass
   ▼
Field QC Passed  ◄──(result = Fail)──►  Field QC Failed
   │                                          │ Field Worker logs a follow-up field_qc row
   │ Lab Sample saved with result = Pass       │ (old failed record kept, not touched)
   ▼                                          │ → status resets to "Registered"
Lab Passed  ◄──(result = Fail)──►  Lab Failed
   │
   │ Contract created (requires Lab Pass + bank_details exist)
   ▼
Under Contract
   │
   │ First Harvest recorded
   ▼
Harvested (partial)  ── additional harvest rounds keep status here (R26)
   │
   │ All vehicle trips for this registration's harvests are weighed
   ▼
Weighed
   │
   │ Arrival QC saved with result = Pass
   ▼
Arrival QC Passed  ◄──(result = Fail)──►  Arrival QC Failed
   │                                          │ Field Worker logs a follow-up arrival_qc row
   │ At least one packaging_records row created│ (mirrors the Field QC retry pattern —
   ▼                                          │  see Section 9, resolved at Phase 7 build time)
Packed                                        │ → status resets to "Weighed"
   │
   │ All boxes from this registration's lots are palletised
   ▼
Palletised
   │
   │ Finished Goods QC saved with result = Pass  (Phase 13, added 2026-08-11 —
   ▼                                               position confirmed: AFTER Palletisation,
Finished Goods QC Passed  ◄──(result = Fail)──►  Finished Goods QC Failed
   │                                               BEFORE Pre-Cooling. Fields/parameters TBD
   │                                               pending CEO document — see Section 7.
   │                                               Follow-up-on-fail pattern not yet specified.)
   │ All pallets containing this registration's lots have a complete pre_cooling_record
   ▼
Pre-Cooled
   │
   ▼
(future) Container Loaded
   │
   ▼
(future) Invoiced / Export Documents Complete / Dispatched
```

**Status enum values, in order** (for implementers building the `RegistrationStatus` enum): `Registered`, `Field QC Passed`, `Field QC Failed`, `Lab Passed`, `Lab Failed`, `Under Contract`, `Harvested (partial)`, `Weighed`, `Arrival QC Passed`, `Arrival QC Failed`, `Packed`, `Palletised`, **`Finished Goods QC Passed`, `Finished Goods QC Failed`** *(new, 2026-08-11)*, `Pre-Cooled`.

### Pallet status flow (standalone)

```
Created (pallet built from one or more lots)
   │ pre_cooling_record completed (all four time/temp fields filled)
   ▼
Pre-Cooled
   │ (future phase: loaded into a container)
   ▼
Dispatched
```

### Purchase Order status flow (standalone) — ⚠️ DROPPED 2026-08-11

```
Draft → Issued → Completed
```
Independent of the harvest/packing pipeline — applied only to farm-input POs (Phase 12). **Phase 12 is now out of scope entirely** — CEO confirmed no fertilizer purchases and no formal PO process is needed. Kept here for historical reference only; do not build.

---

## 5. Role × Phase Matrix

> **As of 2026-08-11, the role × phase matrix below is a DEFAULT starting point only.** The actual permission system is phase-based: admin assigns specific phases to each user via `user_phase_access`. A user's role label does not determine their access — their phase assignments do. Any user can have any combination of phases. See Section 7 (`user_phase_access` table), `Business_Rules.md` R53 (rewritten) and R58, `CLAUDE.md` Section 4 and Section 12.

**Updated 2026-09-01:** `user_phase_access` now has 16 phase keys, not 14. The matrix below still only has columns for the 13 numbered pipeline phases (1A–13) — `admin` was never a column here either, since "full access to every pipeline phase" is a row-level fact about the Admin role, not a pipeline stage. The two additions are the same shape as `admin`: cross-cutting, not pipeline stages, so they don't get columns.
- **`users`** (split out of `admin`) — user management: create/edit/deactivate accounts and assign phases to non-Admin users. Any role can hold it, not just Admin — see `CLAUDE.md` §6 and `backend/app/services/user_admin_guard.py` for the real boundary (a `users` holder still can't touch Admin accounts, grant `users`/`admin`, or edit their own phases; the phase gate alone is not the whole story).
- **`reports_documents`** — placeholder, same pattern as `finished_goods_qc` was before Phase 13 got its position confirmed. As of 2026-09-01 it has confirmed *scope* (see the new subsection at the end of Section 7) but no schema yet — gates nothing today.

Admin holds all 16 phases, always (enforced server-side — an Admin's phase set can never be partially edited, by anyone, including another Admin). Read that as the Admin row below implicitly extending to "F" for `users` and `reports_documents` too, the same way it already covers `admin` itself without a column for it.

Legend: **F** = full access (setup/manage) · **C** = primary create/data-entry role · **R** = read-only · **—** = no access

| Role | 1A | 1B | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 ⚠️DROPPED | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Admin** | F | F | F | F | F | F | F | F | F | F | F | F | — | F |
| **Field Worker** | C | C¹ | C | — | — | C | C | C | — | — | — | — | — | — |
| **Lab Worker** | — | — | — | C | — | — | — | — | — | — | — | — | — | — |
| **Office Worker** | R | R | R | R | C | R | — | — | C | R (dashboard only) | —² | C | — | — |
| **Stock/Inventory Manager** | — | — | — | — | — | — | — | — | — | F (all of 9A/9B/9C) | — | — | — | — |
| **Packaging Supervisor** *(added 2026-08-11)* | — | — | R | — | — | R | — | — | R | — | C³ | — | — | — |

¹ Bank Details (1B) role isn't explicitly assigned in any spec — assumed Field Worker since it's offered as part of the same farmer-onboarding flow as 1A. Flag if this is wrong.
² **Changed 2026-08-11:** Office Worker no longer has Palletisation create access — moved to the new Packaging Supervisor role.
³ Packaging Supervisor's Phase 10 (Palletisation) is its only write/create access. Its Phase 2/5/8 cells are read-only, scoped specifically to season registrations, harvests, and packaging records ("to know what's been packed") — not full read access to those phases' other data. Column 12 (Purchase Order) is struck for every role — the module is dropped entirely (2026-08-11), not merely reassigned. Column 13 (Finished Goods QC) has no role assignment yet — not specified in the CEO confirmation round; flagged as a gap.

**Note on Phase 10/11 role assignment:** explicitly flagged as an assumption during discovery — "the person physically at the packhouse doing these tasks is likely the Office Worker, but this may be the Field Worker or a dedicated role." Tied to Open Question #9.

---

## 6. Design Principles

Extracted from the original Phase 1–5 discovery spec. These apply to **every phase**, not just Phases 1–5:

1. **Field ownership** — every field is entered by whoever actually observed it, not relayed by someone else. Field Workers own land/plot/visual crop facts; Lab Workers own test/sample facts; Office Workers own paperwork/agreement facts. Reference info from other roles is passed through as read-only, never re-typed.

2. **Fuzzy search over exact match** — farmer/plot search must tolerate spelling mistakes on names by returning likely matches for the worker to confirm. Exact-text matching on Indian farmer names is unreliable.

3. **Business key vs. database key** — the database uses invisible internal IDs as primary keys. Business/human identifiers (Plot Number, MH Number) are unique constraints for record integrity but never exposed as the primary "key" to users. *(Which table MH Number lives on is UNRESOLVED as of 2026-09-02 — see Section 7's `farmers`/`plots` table definitions and the conflict flagged there and in the tail "New information" section. Don't restate `farmers.mh_number` as settled; the live column is `plots.mh_registration_number`.)*

4. **Persistent records, seasonal actions** — Farmer, Plot, and Bank Details are permanent records that persist across seasons. Registration, QC, Contract, Harvest are seasonal events attached to those permanent records. No "delete" — inactive/failed records are kept for audit.

5. **Auto-fill on re-entry, always editable** — anything the system already knows (from prior seasons or from other tables) pre-fills the form. The worker can always edit if reality has changed.

6. **Single-screen where the Excel already merges concerns** — don't force workers through separate tabs for information that logically belongs together (e.g. Plot + Field QC is one screen even though it's two database tables).

**Recurring implementation rules** (stated repeatedly across every phase's Definition of Done — worth treating as equally binding):
- **Backend enforces all gates.** Status transitions (e.g. "can't create Contract without Lab Pass") must be enforced by the API, not just the UI.
- **Soft delete only.** No hard deletes anywhere — use status fields (active/inactive, pass/fail) for lifecycle, per R8 and R16.

---

## 7. Full Data Model (column-level)

Consolidated from every phase's data model, in pipeline order. `FK` = foreign key. All tables get `created_at`/`updated_at` timestamps per the audit-trail requirement (R30) even where not spelled out per-column below.

### Core identity & seasonal chain

**`seasons`** (Phase 0, added 2026-08-11) — admin-managed, must exist before any registration
`id` PK · `name` string (e.g. "2025-26") · `start_date` date · `end_date` date · `is_active` boolean (only one row may be active at a time) · `created_by` FK→users · `created_at`
*Note: replaces the old assumption that a season is just a year integer. See `Business_Rules.md` R55.*

**`users`** *(columns below current as of 2026-09-01 — several were missing from earlier revisions of this document; the table itself was already this shape, only the write-up lagged)*
`id` PK · `email` string unique (login username) · `name` string, nullable · **`mobile` string, nullable in the DB but required by the API for new accounts** *(added 2026-09-01 — not unique, same treatment as `farmers.mobile`)* · `password_hash` string · `role` enum(admin, field_worker, lab_worker, office_worker, stock_manager, **packaging_supervisor** *(added 2026-08-11)*) · `active` boolean (soft-deactivate) · `created_at`, `updated_at` · `last_login_at`, `last_logout_at`, `last_activity_at` datetime, nullable (login/session bookkeeping, backs the admin User Activity view) · `failed_login_count` integer, default 0 · `last_failed_login_at` datetime, nullable · **`password_changed_at` datetime, not nullable, `server_default=now()`** *(added 2026-09-01 — see the security-audit note below)*

*Login lockout (2026-09-01):* `failed_login_count`/`last_failed_login_at` are enforced, not just tracked — 5 consecutive failures locks the account for 15 minutes (`backend/app/core/security.py::MAX_FAILED_LOGIN_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`); an Admin or `users`-phase holder can clear a lockout early from the Users screen.

*Token revocation (2026-09-01):* `password_changed_at` is compared against the `iat` claim of every access/refresh token on every request (`backend/app/core/deps.py::token_predates_password_change`) — a password change immediately invalidates every session the account currently holds, access and refresh tokens both. This is also the account-recovery mechanism referenced in `CLAUDE.md` §6: there is no self-service or email-based password reset; an Admin/`users`-holder resets a password from the Users screen, and if no working Admin account exists at all, `scripts/seed_admin.py` is the documented break-glass procedure.

**`user_phase_access`** (added 2026-08-11) — maps users to their permitted phases
`id` PK · `user_id` FK→users · `phase_key` string enum(farmer_registration, plot_registration, field_qc, lab_sampling, farmer_contract, harvesting, weighing, arrival_qc, packaging, inventory_management, palletisation, pre_cooling, finished_goods_qc, admin, **users, reports_documents** *(added 2026-09-01 — see Section 5)*) · `created_at`
Unique constraint: `(user_id, phase_key)`
*Note: `users.role` is a display label only. Actual screen access is determined by `user_phase_access` entries. Admin assigns any combination of the 16 phases *(was 14 — `users` and `reports_documents` added 2026-09-01)* to any user, subject to the enforcement in `backend/app/services/user_admin_guard.py` (a non-Admin `users`-phase holder has real restrictions on which accounts and phases they can touch — see Section 5). See `Business_Rules.md` R53 (rewritten), R58, `CLAUDE.md` Section 4 and Section 12.*

**`farmers`** (Phase 1A) — permanent
`id` PK · `name` string req · `address` string req · `mobile` string req, indexed · ~~**`mh_number` string, unique, nullable**~~ *(added back 2026-08-11 — Maharashtra farmer registration number, per farmer, not per plot; CEO confirmed)* · `status` enum(active, inactive) · `created_at`, `updated_at`
*Note (rewritten 2026-08-11): the MH registration number lives on this table, not on `plots`. This reverses an earlier "correction" (see prior revision history below) that moved it to the plot level based on APEDA/NRC Grapes documentation — that documentation suggests plot-level registration, but CEO confirmation overrides it: Reliable Fresh's actual practice is one MH number per farmer. See `Business_Rules.md` R2, R7a.*
*Superseded note, kept for history: "no MH identifier lives on this table — the MH registration number is a plot-level APEDA identifier only. See `plots.mh_registration_number`." — no longer correct as of 2026-08-11.*

> ⚠️ **DOCUMENTATION CONFLICT — UNRESOLVED, marked not fixed (2026-09-02).** The paragraphs directly above describe the 2026-08-11 "CEO confirmed farmer-level" decision as settled. It is not settled. The live code contradicts it: `backend/app/models/farmer.py`'s `Farmer` class has no `mh_number` column at all, and `backend/app/models/plot.py`'s `Plot` class has `mh_registration_number = Column(String, unique=True, nullable=True)` — confirmed by reading both files directly, not inferred. The code follows the **per-plot** model, i.e. the *opposite* of what this section and `CLAUDE.md` Discovery 8 both narrate as resolved. This is pending an APEDA registration certificate from the client — see `Open_Questions.md` Q16. Do not treat either version as authoritative until that's resolved. See the matching flag in Section 9's "New information" table below, and do not read this note as itself the resolution — it isn't one.

**`bank_details`** (Phase 1B) — 1:1 with farmer
`id` PK · `farmer_id` FK→farmers, unique · `account_holder_name` string · `bank_name` string · `account_number` string · `ifsc_code` string · `branch_name` string, optional · `passbook_photo_url` string · `created_at`, `updated_at`

**`plots`** (Phase 2) — permanent, persists across seasons
`id` PK · `farmer_id` FK→farmers · `plot_number` string (unique within farmer, R5) · ~~`mh_registration_number` string, unique~~ ~~`variety` enum~~ · `area_acres` decimal · `village` string · `taluka` string · `survey_no` string · `gps_lat`, `gps_long` decimal · `pruning_date` date · `approx_harvest_date` date · `created_at`, `updated_at`
*Note (rewritten 2026-08-11, both halves corrected 2026-09-02 — neither column was actually removed):*
*1. `mh_registration_number` — this note (and the strikethrough above) describe the 2026-08-11 decision, which the actual code does not follow — see the conflict flag under the `farmers` table above. `plots.mh_registration_number` is live in `backend/app/models/plot.py:51` today; it was never actually removed. **UNRESOLVED**, not a documentation lag to just fix in one direction — see the `farmers` table note above and `Open_Questions.md` Q16.*
*2. `variety` — the plan was to remove it: a plot can contain multiple grape varieties, registered per-plot via the new `plot_varieties` table instead of as a plot column. **That plan was never carried out.** `backend/app/models/plot.py:52` still has a live `variety` string column, and it is not inert — `frontend/src/features/plots/pages/PlotRegistrationPage.tsx` has it as a *required* field on the plot registration form, and `backend/app/api/v1/routers/weighing.py:77` reads `reg.plot.variety` directly for the Weighing screen's reference panel, not via `season_registration → plot_variety` as this document's own Phase 6/8 screen notes (Section 11.1/11.3) claim. `plot_varieties` has a full backend (model, router, schemas) but no frontend screen anywhere in the codebase, so `season_registrations.plot_variety_id` is always null in practice — the multi-variety pipeline below is unreachable by any current user action. This is a real gap (build the `plot_varieties` UI, then move `weighing.py:77` and the plot registration form off `plots.variety`), not a documentation lag — flagged 2026-09-02, see `CLAUDE.md` Section 12 and `Business_Rules.md` R7 for the matching correction. (Superseded note, still historically accurate: an earlier revision of this document said variety instead lives on `harvests` — that was corrected the same day, 2026-08-11; `harvests` genuinely has no variety column, that part of the original correction was right.)*
*`num_trees` remains explicitly dropped — not tracked (unrelated, pre-existing decision).*

**`plot_varieties`** (Phase 2, added 2026-08-11) — varieties grown on a plot
`id` PK · `plot_id` FK→plots · `variety_name` string · `created_at`
Unique constraint: `(plot_id, variety_name)`
*Note: a single plot can grow multiple grape varieties. Each variety is registered here. Each variety runs its own pipeline — its own `season_registration`, Field QC, Lab Sample, Contract, and Harvest. See `Business_Rules.md` R57.*

**`season_registrations`** (Phase 2) — the seasonal join on `plots`, via `plot_varieties`
`id` PK · `plot_id` FK→plots · **`plot_variety_id` FK→plot_varieties — PENDING, not yet built** (added 2026-08-11, alongside the `season_id` change below) · ~~`season_year` integer (R11)~~ **`season_id` FK→seasons — PENDING, not yet built** (added 2026-08-11; replaces `season_year`, see `seasons` table above) · `status` enum (see Section 4 state machine — now includes `Finished Goods QC Passed`/`Failed`, added 2026-08-11) · `registered_by` FK→users · `registered_at` timestamp · unique constraint on `(plot_variety_id, season_id)` (R12, was `(plot_id, season_year)`) — **one registration per variety per plot per season**
*Note: both `plot_variety_id` and `season_id` are pending schema changes, not yet built — until they land, the codebase still uses `plot_id` directly and `season_year` as a plain integer. Do not write new code that treats `season_year` as authoritative going forward (`CLAUDE.md` Section 12).*

**`field_qc`** (Phase 2) — multiple rows per registration allowed (follow-up rule, R17)
`id` PK · `season_registration_id` FK · `inspection_date` date req · `planned_sampling_date` date · `tentative_harvest_date` date · `fruit_colour` enum(Green, Milky Green, Yellow) · `tss_percent` decimal · `thrips_percent` decimal · `bhuri_percent` decimal · `black_spot_percent` decimal · `cercospora_percent` decimal · `overall_observation` enum(Good, Very Good, Excellent) · `exportable_fruit_percent` decimal · `notes` text · `result` enum(Pass, Fail) · `inspected_by` FK→users · `created_at`

**`lab_samples`** (Phase 3) — one per registration, only after Field QC passes
`id` PK · `season_registration_id` FK, unique · `lab_name` enum · `sampling_date` date · `seal_no` string · `variety_confirmed` enum · `area_ha_2a` decimal · `yield_4b_mt` decimal · `seal_photo_url` string · `documents_2a4b_url` string · `remark` text · `tss_value` decimal · `result` enum(Pass, Fail) · `entered_by` FK→users · `created_at`
*Note (added 2026-08-11): lab sampling typically happens 5–6 days before the planned harvest date. The system does not enforce this window, but the planned sampling date (`field_qc.planned_sampling_date`) should be displayed prominently on this screen so the worker can plan around it.*

**`contracts`** (Phase 4) — one per registration, only after Lab passes + bank_details exist
`id` PK · `season_registration_id` FK, unique · `contract_date` date · `rate_per_kg` decimal · ~~`rejection_percent` decimal, default 7.00, editable (R24)~~ · `created_by` FK→users · `created_at`
*Note (2026-08-31): `rejection_percent` column still exists (always 7.00) but is no longer editable per contract and no longer read by any calculation — rejection is a fixed constant (`backend/app/core/constants.py::FARMER_REJECTION_PCT`), not a contract term. See `Business_Rules.md` R24/R28 (rewritten).*

**`harvests`** (Phase 5) — multiple per registration allowed (R26)
`id` PK · `season_registration_id` FK · `harvest_date` date req · `supervisor_name` string · `supervisor_contact` string · `created_by` FK→users · `created_at`
*Note (corrected 2026-08-11, same day as introduced): `harvests` has no `variety` column. An earlier revision of this document added one, on the theory that variety is captured at harvest time — that's now superseded by the `plot_varieties` table above. Since each `season_registration` links to exactly one `plot_variety` (via the pending `plot_variety_id` FK), and each `harvest` links to exactly one `season_registration`, variety is fully determined by walking the chain: `harvest → season_registration → plot_variety.variety_name`. Storing it again on `harvests` would be redundant. See `Business_Rules.md` R57.*

**`vehicle_trips`** (Phase 5) — multiple per harvest
`id` PK · `harvest_id` FK→harvests · `vehicle_no` string · `driver_name` string · `num_crates` integer · `approx_weight_kg` decimal (field estimate — real weight captured in Weighing)

### Post-harvest pipeline

**`weighing_records`** (Phase 6) — one per vehicle trip
`id` PK · `vehicle_trip_id` FK→vehicle_trips, unique · `date` date · `slip_no` string · `supervisor_name` string · `num_crates` integer · `total_weight_kg` decimal · `rejection_pct` decimal (the fixed rate actually charged, always `FARMER_REJECTION_PCT` — not a contract snapshot, see note below) · `actual_rejection_pct` decimal (operator-observed; recorded for reference only, never charged) · `rejection_kg` decimal (calculated: `total_weight_kg × FARMER_REJECTION_PCT / 100`) · `net_weight_kg` decimal (calculated) · `slip_photo_url` string · `created_by` FK→users · `created_at`
*Note (2026-08-31): `rejection_pct` previously snapshotted the contract's (then-editable) `rejection_percent`. Founder confirmation reverses this — rejection is now a fixed 7% company-wide constant, not read from the contract. See `Business_Rules.md` R28 (rewritten).*

**`arrival_qc`** (Phase 7) — one per harvest event (plot + day)
`id` PK · `harvest_id` FK→harvests · `inspection_date` date · `fruit_colour_green_pct`, `fruit_colour_milky_pct`, `fruit_colour_yellow_pct` decimal · `tss_percent` decimal · `thrips_percent` decimal · `bhuri_percent` decimal · `black_spot_percent` decimal · `cercospora_percent` decimal · `overall_observation` enum(Good, Very Good, Excellent) · `result` enum(Pass, Fail) · `notes` text · `inspected_by` FK→users · `created_at`

**`packaging_records`** (Phase 8) — each row = one Lot; multiple per harvest allowed
`id` PK · `harvest_id` FK→harvests · `date` date · `slip_no` string · `lot_id` string unique (system-generated, traceable to plot+date+customer) · `pack_size` string(4 Kg / 4.5 Kg / 5 Kg) · `compliance_type` string(EU / Non-Testing) · `customer_id` FK→customers *(was a plain string — see resolution in Section 9)* · `total_weight_kg` decimal · `rejection_contract_kg` decimal (fixed 7% of `total_weight_kg`, founder-confirmed 2026-08-31 — legacy column name, no longer "the contract's" rate; see `Business_Rules.md` R28) · `net_weight_kg` decimal (calculated) · `actual_rejection_kg` decimal (observed, entered fresh at packing — informational only) · `actual_rejection_pct` decimal (calculated from `actual_rejection_kg`; informational only) · `num_boxes` integer · `num_pallets` integer · `ggn_number` string (copied from `company_settings` at time of packing) · `created_by` FK→users · `created_at`

### Inventory (Phase 9)

**`item_master_materials`** (9A)
`id` PK · `material_type` enum(Box, Liner Bag, Puneet, Pouch, Grape Guard, Angle Board, Pallet, Strapping Roll, Clip, Sticker) · `variant_name` string · `unit_of_measure` enum(pieces, kg, rolls) · `scale_level` enum(per_box, per_container) · `reorder_point` integer · `is_active` boolean, default true (no delete — deactivate) · `created_by` FK→users · `created_at`, `updated_at`

**`item_master_products`** (9A) — valid variety × customer × pack-size combos
`id` PK · `variety` string · `customer_id` FK→customers *(was a plain string — see Section 9)* · `pack_size` string · `compliance_type` string(EU / Non-Testing) · `is_active` boolean, default true · `created_at`, `updated_at`

**`bom_entries`** (9A)
`id` PK · `product_id` FK→item_master_products · `material_id` FK→item_master_materials · `qty_per_container` integer · `qty_per_box` decimal (calculated: `qty_per_container / boxes_per_container`) · `created_at`, `updated_at`

**`stock_movements`** (9B) — current stock is always `SUM(quantity) GROUP BY material_id`, never a stored column
`id` PK · `material_id` FK→item_master_materials · `movement_type` enum(in, auto_out, adjustment) · `quantity` integer (positive for in/found, negative for out/lost) · `date` date · `supplier_name` string (stock-in only) · `reference` string (invoice/challan no.) · `reason` text (required when `movement_type = adjustment`) · `packaging_record_id` FK→packaging_records, nullable (set only for `auto_out`, for audit traceability) · `created_by` FK→users · `created_at`

### Palletisation, Finished Goods QC & Pre-Cooling (Phase 10, 13, 11)

**`pallets`**
`id` PK · `pallet_id` string unique (system-generated, human-readable, e.g. `2026-P001`) · `date` date · `pallet_type` enum(Big, Mini) · `total_boxes` integer · `notes` text · `status` enum(created, pre_cooling, dispatched) · `created_by` FK→users · `created_at`
*Reference (added 2026-08-11): approximately 120 boxes per big pallet, 20 pallets per container, approximately 2,400 boxes per container. These are operational averages, not hard constraints — do not validate against them.*

**`palletisation_lots`** — junction table; a pallet may hold boxes from multiple lots (R35)
`id` PK · `pallet_id` FK→pallets · `packaging_record_id` FK→packaging_records · `num_boxes` integer · `created_at`
*Constraint: `SUM(num_boxes)` for a given `packaging_record_id` across all pallets must not exceed that packaging record's `num_boxes`.*

**`finished_goods_qc`** (Phase 13, added 2026-08-11) — ⚠️ pending design, fields TBD
`id` PK · `season_registration_id` or `pallet_id` FK (**undecided — TBD**) · ...fields TBD pending CEO document... · `result` enum(Pass, Fail) presumed · `created_at`
*Position confirmed 2026-08-11: this check happens AFTER Palletisation (Phase 10) and BEFORE Pre-Cooling (Phase 11) — see Section 4 status flow. It is one check, not two (resolves the old "Finished Goods QC vs. Cold Storage Exit QC" ambiguity — they're the same stage). Column list above is a placeholder only; do not build against it without the CEO document. See `Business_Rules.md` R21, `Open_Questions.md` Q13.*

**`pre_cooling_records`**
`id` PK · `pallet_id` FK→pallets · `date` date · `num_pallets` integer · `num_boxes` integer · `in_time` time · `in_berry_temp` decimal (°C) · `out_time` time, nullable (filled later) · `out_berry_temp` decimal, nullable (filled later) · `created_by` FK→users · `created_at`, `updated_at`
*Pallet's `status` flips from `created` to `pre_cooling` only once all four time/temp fields are filled (R45 gate). Gate now also depends on Finished Goods QC having passed (Phase 13, added 2026-08-11) — exact enforcement point TBD alongside the `finished_goods_qc` table design.*

### Purchase Order (Phase 12) — ⚠️ DROPPED 2026-08-11, standalone, farm inputs only

**CEO confirmed no fertilizer purchases. This module is out of scope entirely.** The two tables below exist in the database but are unused; the router itself is unregistered from `app/main.py` as of 2026-09-01 (every `/purchase-orders/*` route now 404s), and the router file/tables are pending removal. Kept here for historical reference only — do not build or expose this module (`CLAUDE.md` Section 12).

**`purchase_orders`**
`id` PK · `po_number` string unique (format `RF-PO##/YYYY-YY`, auto-incremented) · `po_date` date · `payment_terms` string · `supplier_ref` string · `other_refs` string · `dispatch_through` string, default 'Road Transport' · `destination` string · `supplier_name` string · `supplier_address` text · `supplier_email` string · `supplier_gst` string · `assessable_value` decimal (calculated) · `cgst_total` decimal (calculated) · `sgst_total` decimal (calculated) · `freight` string ("At Actual" or a number) · `other_charges` decimal, default 0 · `grand_total` decimal (calculated) · `total_in_words` string (auto-generated, Indian Lac/Crore format) · `status` enum(draft, issued, completed) · `created_by` FK→users · `created_at`, `updated_at`

**`purchase_order_line_items`**
`id` PK · `purchase_order_id` FK→purchase_orders · `sr_no` integer · `particulars` string · `hsn_code` string · `qty_kg` decimal · `units` integer · `kg_per_unit` decimal · `make` string · `rate` decimal · `gst_percent` decimal · `amount` decimal (calculated: `qty_kg × rate`) · `created_at`

### New tables (decided during phase-map review, not yet built anywhere)

**`company_settings`** — single-row (or key-value) Admin-managed config. Feeds GGN number (referenced from Phase 1 farmer/plot context and stamped onto Phase 8 packaging) and the PO letterhead (Phase 12).
Proposed: `id` PK · `company_name` string · `company_address` text · `company_phone` string · `company_gst_number` string · `company_email` string · `ggn_number` string · `updated_by` FK→users · `updated_at`

**`customers`** — replaces the plain-string `customer_name` (on `packaging_records`) and `customer` (on `item_master_products`) columns from the original drafts. Needed for real cascading dropdowns and BOM lookups (variety → customer → pack size), not string matching.
Proposed: `id` PK · `name` string unique · `code` string, optional · `is_active` boolean, default true · `created_at`, `updated_at`

### Reports & Export Documents — scope confirmed 2026-09-01, schema NOT yet designed

CEO confirmed what the `reports_documents` phase (Section 5, `user_phase_access`) actually gates, going forward: the real export document **images/files** per shipment — fumigation certificate, phytosanitary certificate, certificate of origin, AGMARK, packing list, and other shipment-specific certificates. These attach to specific entities (a pallet, a container, a shipment — clicking through to one of those shows its documents), stored in Cloudinary the same way every other upload in this system already is (passbook photos, lab seal photos, weighing slips). Access is phase-gated.

**This is scope, not a design** — no table, no columns, no entity relationships below. Deliberately not started until the questions below are answered; see `Open_Questions.md` Q15 for the full list, added 2026-09-01:
- Which entity does each document type attach to (pallet? container? a shipment concept that doesn't exist as a table yet)? Different types may attach at different levels.
- Is it one document per type, or many (reissued/corrected certificates)?
- Who uploads them — system-generated, Office Worker upload after receiving from a certifying body, or both depending on type?
- Are they needed before or after shipping — does this ever gate a status transition the way QC stages do, or is it purely a reference attachment?

Once these are answered, this becomes a real subsection here with a table definition, the same way `company_settings`/`customers` moved from "decided, not built" to fully specified.

### Deferred to future (unscoped) phases — not designed here, just named
`container_indent_requests`, `container_loading`, `farmer_invoices`, `suppliers` (denormalized autocomplete, referenced by Stock In and, formerly, PO supplier fields — the PO half of that is moot now that Phase 12 is dropped, but Stock In autocomplete still applies).
*`finished_goods_qc` moved out of this list 2026-08-11 — it now has a confirmed position (Phase 13, between Palletisation and Pre-Cooling) even though its column-level fields are still pending design. See the Phase 13 entry above.*
*`export_documents` moved out of this list 2026-09-01 — it now has confirmed scope (see the subsection immediately above) even though, unlike Finished Goods QC, it has no confirmed schema or even entity-attachment model yet. Genuinely earlier-stage than Finished Goods QC was; don't read the two notes as equivalent.*

---

## 8. Reference & Seed Data

Pulled from the client's Excel workbook — useful for seeding Item Master / dropdowns during scaffolding. Treat as a starting point, not confirmed-final; the Excel itself is example/template data, and Open Question #7 asks whether any customer needs its own report format.

**Grape varieties:** Sonaka, Thompson Seedless, Sharad Seedless, Tas-e-Ganesh, Flame, Crimson, Black Jumbo Seedless, Other

**Labs:** TUV India Ltd, Microchem, NHRDF, NCML, Bureau Veritas, Vimta, Envirocare, ITC Ltd, Eurofins Scientific

**Customers:** OFD, Roveg, N&K, FS, MASCL, Boon Kee

**Pack size tiers:** 4 Kg, 4.5 Kg, 5 Kg — not every customer takes every tier: 4 Kg is only produced for EU / Non-Testing / OFD / MASCL; 5 Kg is the only tier that includes Boon Kee.

**Packing material catalog (10 types, with variant examples from the Excel Item Master sheet):**
- **Box** — 4 Kg: Stayro Foam. 4.5 Kg: Green (Europe), Sunworld (Dubai/MASCL), Taza Fresh Blue/Khaki (MASCL), Hex (Dubai/MASCL). 5 Kg: Greenshed dotted (N&K), Green Plain (OFD/Roveg), Khaki (FS).
- **Liner Bag** — 4.5 Kg, 5 Kg (1 Puneet = 500g)
- **Puneet** — Open (Heatshell), Clamshell — 5 Kg, 1 box = 10 puneets
- **Pouch** — 4.5 Kg: Simple Blue (Europe/MASCL), Ziplock (Blue/Canada/China), Paper (Europe), Green (MASCL)
- **Grape Guard** — 4.5 Kg, 5 Kg
- **Angle Board (Corner Post)** — White, Khaki — 84 per container each
- **Pallets** — Big (20/container), Mini (1/container)
- **Strapping Roll** — 4/container
- **Clips** — 254/container
- **Stickers** — per-customer (OFD/FS/Roveg/N&K: puneet sticker + barcode/GGN/LOT code sticker) plus a generic Box Sticker (1/box)

**Valid product combinations (variety → customer → pack size), from the Excel's Finished Material list:**
| Variety | Customer — Pack Size combos |
|---|---|
| Sonaka | MASCL – 4 Kg |
| Thompson | MASCL – 4.5/5 Kg, OFD – 4.5/5 Kg, Roveg – 4.5/5 Kg, FS – 4.5/5 Kg, N&K – 4.5/5 Kg |
| Sharad | MASCL – 4.5/5 Kg |
| Flame | N&K – 5 Kg |
| Crimson | N&K – 5 Kg |
| Black Jumbo Seedless | MASCL – 4.5 Kg, Boonkee – 5 Kg |

This table is what seeds `item_master_products` (Phase 9A) and, until Phase 9A is built, the hardcoded cascading dropdown in Phase 8.

---

## 9. Open Items Summary

### CEO questions that could change the build
Full detail in `Open_Questions.md` (16 items as of 2026-09-02). None block Phases 1–8.

| # | Question | Affects | Status |
|---|---|---|---|
| 1 | Lot ID rule: one plot + one harvest day + one packing type = one Lot? | Phase 8 | Open |
| 2 | Is manual GrapeNet/APEDA export data entry sufficient (no integration)? | Cross-cutting | Open |
| 3 | One harvest per plot per season, or multiple rounds? (non-blocking) | Phase 5 | Open |
| 4 | Multiple varieties per plot — separate plots or one plot, multiple varieties? | Phase 1–2 data model | **✅ RESOLVED 2026-08-11** — one plot, multiple varieties, each with its own pipeline (see Section 9 note below) |
| 5 | Is 7% rejection a fixed default or does it vary? Who absorbs excess actual rejection? | Phase 4, 6, 8 | **✅ RESOLVED 2026-08-31** — fixed, company-wide, founder-confirmed. Not negotiated per contract; no MIN()/split against actual (`Business_Rules.md` R28, rewritten) |
| 6 | What Farmer Invoice deductions apply besides rejection %? | Farmer Invoice (unscoped) | Open |
| 7 | Do any customers need shipment/traceability data in their own format? | Phase 8 | Open |
| 8 | Confirm the 5-role structure | Cross-cutting | Open (now moot in its literal form — role count is 6 as of 2026-08-11 with Packaging Supervisor added) |
| 9 | Who physically handles Palletisation and Pre-Cooling? | Phase 10, 11 | Partially resolved 2026-08-11 — Palletisation now Packaging Supervisor; Pre-Cooling role still unconfirmed |
| 10 | Palletisation floor workflow — separate step or folded into packing? Pallet ID format? | Phase 10 | Open |
| 11 | Bulk pre-season ordering vs. reactive reordering vs. both? Supplier lead times? | Phase 9C (Order Calculator) | **✅ RESOLVED 2026-08-11** — Pattern C confirmed |
| 12 | Does packing-material ordering use the same formal PO process (HSN/GST) as farm inputs, or informal ordering? | ~~Phase 12 scope~~ | **✅ RESOLVED 2026-08-11** — moot, PO module dropped entirely |
| 13 | Is Finished Goods QC the same check as "Cold Storage Exit QC" (R21), or two separate inspections? | Phase 13 | **✅ RESOLVED 2026-08-11** — same check, position confirmed |
| 14 | Does per-box-at-packing / per-container-at-loading material deduction timing match real practice? | Phase 9B | Open |
| 15 | Export document attachment model — which entity does each document type attach to, one-per-type or many, who uploads, before or after shipping? *(added 2026-09-01)* | Export Documents | Open — scope confirmed (see Section 7), attachment model not yet designed |
| 16 | MH registration number — farmer-level or plot-level? Section 7 narrates farmer-level as CEO-confirmed; the tail "New information" section says plot-level; the live code follows plot-level. Conflict marked in both locations, not resolved. *(added 2026-09-02)* | Farmer/Plot data model (R2/R7a) | Open — pending an APEDA registration certificate from the client |

### Resolved during phase-map review (2026-08-07)
Captured here as a decision log so context isn't lost now that the working drafts have been removed:

- **Phase numbering conflict.** `CLAUDE.md`'s module table was renumbered to match this document: Phase 9 = Inventory Management, 10 = Palletisation, 11 = Pre-Cooling, 12 = Purchase Order, with Finished Goods QC / Container Indent / Container Loading / Farmer Invoice / Export Documents left unscoped and unnumbered. One canonical numbering now exists. *(Superseded in part 2026-08-11 — Phase 12 dropped, Phase 13 = Finished Goods QC added; see below.)*
- **`company_settings` table.** Decision: model as a real table (single-row config) during the SQLAlchemy data-model step — see Section 7 for proposed columns. Feeds GGN number and the (now-dropped) Phase 12 PO letterhead. Not built yet; no project directory exists.
- **`customers` table.** Decision: model as a real table during the data-model step, replacing the plain-string `customer_name`/`customer` columns — see Section 7. Needed for Phase 8's cascading dropdowns and Phase 9A's BOM lookups. Not built yet.
- **"Arrival QC Failed" status.** Field QC and Lab Sampling both have explicit Fail branches with follow-up/reset behavior (R16, R17); the original Phase 6–8 draft's status diagram showed only `Arrival QC Passed`, with no failure branch. Decision: not a CEO question — resolve by mirroring the Field QC follow-up pattern (new `arrival_qc` row on retry, status resets to `Weighed`) when Phase 7 is actually built. Reflected in the Section 4 status flow above.

### Resolved during CEO confirmation round (2026-08-11)
- **Season Management.** Confirmed as a real module (Phase 0), not just a year tag. See Section 2, Section 7 (`seasons` table), `Business_Rules.md` R55.
- **Multi-variety plots (Q4) — ✅ RESOLVED 2026-08-11, corrected same day.** The previous Aug 2026 resolution ("one plot = one variety") is confirmed incorrect. CEO confirmed the actual answer: one plot can hold multiple varieties, each variety gets its own independent pipeline (registration, Field QC, Lab Sample, Contract, Harvest — R57). Variety is registered per plot via the new `plot_varieties` table — **not** on `harvests` as an earlier same-day pass of this document said; that was corrected within the same round. This is settled, not open — `CLAUDE.md`, `PHASE_MAP.md`, and `Business_Rules.md` all now mark Q4 RESOLVED. **Flag:** `Open_Questions.md` itself was not touched in this round and still says "REOPENED" for Q4 — a real cross-document inconsistency until that file is updated to match (see change report).
- ~~**MH registration number (R2/R7a).** Reversed from plot-level back to farmer-level...~~ **This was never actually settled — see the UNRESOLVED flag in Section 7's `farmers`/`plots` entries (added 2026-09-02) and `Open_Questions.md` Q16.** The farmer-level reversal recorded here at the time conflicts with this same document's own tail "New information" section, and with the live code, which is per-plot. Do not read this bullet as a decision to build against.
- **Packaging Supervisor role added.** Palletisation moved from Office Worker to this new role. See Section 5.
- **Purchase Order module dropped (Q12).** No fertilizer purchases, no formal PO process needed. Tables remain in the DB, unused, pending removal.
- **Finished Goods QC position (Q13).** Confirmed: after Palletisation, before Pre-Cooling. One check, not two. Exact fields still pending a CEO document. Phase 13 added to the phase table.
- **Inventory ordering pattern (Q11).** Pattern C confirmed: bulk pre-season order before the season starts, plus weekly top-up orders during the season as stock runs low. See Section 12.1's now-resolved Order Calculator note below.
- **Pallet/container reference numbers.** ~120 boxes/big pallet, 20 pallets/container, ~2,400 boxes/container — operational averages, not hard constraints. See Section 7 `pallets` table.
- **Lab sampling timing.** Typically 5–6 days before planned harvest date, not enforced, should be displayed prominently. See Section 7 `lab_samples` table.

### Still open
- ~~**Finished Goods QC sequencing is unclear.**~~ **RESOLVED 2026-08-11** — see above and Section 4.
- **The Excel source had two conflicting flow-chart versions** ("Flow chart" vs. "Flow chart-Final") with different step numbering and one substantive difference (Goods Receive Note vs. Purchase Order under Inventory). The specs assumed "Final" was authoritative; this was never confirmed by the CEO. *(Notable in hindsight: the "Purchase Order" side of that discrepancy is now moot — the module is dropped — which may mean "Goods Receive Note" was actually the intended flow all along. Worth asking the CEO directly if this ever resurfaces.)*
- **The Excel's Item Master was multi-crop** (included Pomegranate and Banana varieties alongside grapes), but every phase spec scopes grapes only. Not a current gap, but worth remembering if the system is ever asked to generalize.

### Backfill items (from each phase's own discovery-session notes)
| Item | Belongs in | Status |
|---|---|---|
| Bank Details (account, IFSC, passbook photo) | Phase 1B | ✅ Folded in |
| Plot Survey No / Gat No | Phase 2 `plots` | ✅ Folded in |
| GGN Number | `company_settings` | ✅ Table decided (Section 7) — build during scaffolding |
| `customers` table | Phase 9 setup data | ✅ Table decided (Section 7) — build during scaffolding, replacing plain-string columns |
| `company_settings`: name, address, phone, GST, email | New table, feeds Phase 8 (GGN) and Phase 12 (PO header) | ✅ Table decided (Section 7) — build during scaffolding |
| Swap Phase 8's hardcoded valid product combinations for a live query to `item_master_products` | Phase 8, once Phase 9A exists | Pending |
| Swap Phase 8's hardcoded material reference panel for a query to `item_master_materials` + `bom_entries` | Phase 8, once Phase 9A exists | Pending |
| Post-save hook on `packaging_records` to create `stock_movements` (auto stock-out) | Phase 8 → Phase 9B link | Pending — mechanism not yet built |
| `suppliers` table | Phase 9/12 setup data | Pending — denormalized autocomplete only, no table defined |

---

## 10. Phase 1–5 Full Detail (complete, verbatim from original draft)

### 10.1 Users & Roles Active in Phases 1–5

| Role | What they do in Phases 1-5 |
|---|---|
| **Admin** | Create user accounts, assign roles. Full read/write on everything. |
| **Field Worker** | Farmer create/search, Plot Registration & Field QC, Harvesting |
| **Lab Worker** | Lab Sampling only (only sees plots that passed Field QC) |
| **Office Worker** | Read access to all records for reporting. Creates Farmer Contracts (Phase 4). |
| **Stock/Inventory Manager** | No role in Phases 1-5. Exists in the users table for later phases. |

Login: email as username, admin-created accounts only, no self-signup (R53, R54).

### 10.2 Screen-by-Screen Specification

#### 6.1 Login
Email + password. Redirects by role.

#### 6.2 Farmer Home / Search (Field Worker default landing)
Single search box accepting name / MH number / mobile *(MH number added 2026-08-11, R3)*. Returns fuzzy-matched suggestions. Actions per result:
- **Add New Plot** — opens 6.5 with this farmer pre-selected
- **Re-register [existing plot] for [current season]** — opens 6.5 with plot pre-filled from prior record

No results → **Create New Farmer** button opens 6.3.

#### 6.3 New Farmer Form (Phase 1A)
Only farmer-level identity fields. `num_trees`, `area` do NOT belong here regardless of what the source Excel shows — those are plot-level. (`variety` doesn't belong here either — as of 2026-08-11 it's plot-level too, via `plot_varieties`, not farmer-level or a single plot column.)

Fields: Name (req), Address (req), Mobile No. (req), **MH Number (optional, unique)** *(added 2026-08-11 — farmer-level as of R2/R7a; see Discovery 8)*.

On save, prompts: "Add bank details now?" (opens 6.4) or "Add first plot" (opens 6.5). Bank details are not required to save the farmer.

#### 6.4 Bank Details Form (Phase 1B)
Attached to a farmer. Fields: Account Holder Name, Bank Name, Account Number, IFSC Code, Branch Name (optional), Passbook Photo upload. Editable later. No IFSC auto-fill for v1.

#### 6.5 Plot Registration & Field QC (Phase 2 — one combined screen)
Two visible sections on one page, saved together. Behind the scenes, saves to `plots` (create or update) + `season_registrations` (create) + `field_qc` (create).

**Section A — Plot Identity:** Plot Number (placeholder "Plot-1", editable), ~~MH Registration Number (APEDA/NRC Grapes plot-level registration, editable)~~, ~~Variety (dropdown)~~, Area in Acres, Village, Taluka, Plot Survey No / Gat No, GPS Location (auto-capture button using browser Geolocation API), Pruning Date, Approx Harvesting Date.
*Note (2026-08-11): MH Registration Number and Variety removed from this section. MH Number is farmer-level (see 6.3). Variety is not set at plot level — varieties are added to a plot via `plot_varieties` (a small separate add-variety action, not part of this screen's field list) and each variety gets its own season registration (R57). This screen's Section A now describes the plot itself; which variety(ies) it grows, and which season each is registered for, are handled through `plot_varieties`/`season_registrations`.*

**Section B — Field QC Observations:** Date of Inspection (req), Planned Sampling Date, Tentative Harvesting Date, Fruit Colour (Green/Milky Green/Yellow), TSS %, Thrips %, Bhuri %, Black Spot %, Cercospora %, Overall Plot Observation (Good/Very Good/Excellent), Average Exportable Fruit Quantity %, Notes (free text), Result (Pass/Fail), Inspected By (auto from login).

**Re-registration behavior:** Section A pre-fills from prior plot record (editable). Section B always starts blank.

**Follow-up-after-fail behavior:** If a plot has an existing failed Field QC for this season, "Log Follow-up Inspection" creates a new `field_qc` row without touching the failed one, and resets `season_registrations.status` to "Registered" for the re-check.

#### 6.6 Lab Sampling (Phase 3)
Only opens for `season_registrations.status = Field QC Passed`. One per season_registration.

**Section A — Reference (auto-filled read-only):** Farmer Name, Address/Village, Taluka, **Variety** (source: `season_registration → plot_variety`, was "Variety (as registered)" sourced from the plot record before 2026-08-11), **MH Number** (source: Farmer record, was "MH Registration Number" from the plot record before 2026-08-11), Plot Survey No / Gat No.

**Section B — Lab Entry:** Lab Name (dropdown), Sampling Date, Seal No., Variety Confirmed (choice), Area of Plot (Ha) on 2A Certificate, 4B Yield (MT), Plot Sampling Seal Photo (upload), 2A & 4B Documents (PDF upload), Remark (lab-side issues only), TSS Value, MRL Result (Pass/Fail).

On Pass → status → `Lab Passed`. On Fail → status → `Lab Failed`, record kept.

#### 6.7 Farmer Contract (Phase 4)
Opens for `season_registrations.status = Lab Passed`. Office Worker role.

**Section A — Reference (read-only):** Farmer Name, Address, Mobile No., Plot No., **Variety** (source: `season_registration → plot_variety`, changed 2026-08-11 — was "Plot record"), Bank Details (shown for verification — if missing, block save with prompt: "Add bank details before contract").

**Section B — Contract Terms:** Contract Date, Rate per Kg (numeric, req), Rejection % (default 7, editable).

On save → status → `Under Contract`.

#### 6.8 Harvesting (Phase 5)
Opens for `season_registrations.status ∈ {Under Contract, Harvested (partial)}`. Field Worker role.

**Header — Harvest Record:** Farmer Name / Plot No. / Variety (auto-filled read-only — Variety source: `season_registration → plot_variety`, not from the plot record; remains read-only since it's not stored on the harvest itself and there's nothing for the worker to confirm or edit, changed 2026-08-11), Date of Harvesting (req), Supervisor Name & Contact No.

**Repeatable — Vehicle Trips (1 or more):** Vehicle No., Driver Name, No. of Crates, Approximate Weight (Kg). "+ Add Another Vehicle" button. Small harvest = 1 vehicle trip. Big harvest = multiple.

System auto-totals crates and approx weight across all vehicle trips within a harvest for display convenience.

On save → status → `Harvested (partial)`. Additional harvest rounds allowed while status stays here until later phases progress it.

#### 6.9 Admin — User Management
Create user (email, initial password, role), edit role, deactivate. Available only to admin role.

#### 6.10 List / Dashboard Views
- **All Farmers** (searchable, filterable by active status)
- **All Plots** (filterable by current season_registration status)
- **Pending Field QC** (Field Worker queue — includes new + follow-ups)
- **Pending Lab Sampling** (Lab Worker queue — `Field QC Passed` only)
- **Pending Contracts** (Office queue — `Lab Passed` only)
- **Active Harvests** (Field Worker queue — `Under Contract` + `Harvested (partial)`)

### 10.3 Reference Data (dropdowns)

**Grape varieties:** Sonaka, Thompson Seedless, Sharad Seedless, Tas-e-Ganesh, Flame, Crimson, Black Jumbo Seedless, Other

**Labs:** TUV India Ltd, Microchem, NHRDF, NCML, Bureau Veritas, Vimta, Envirocare, ITC Ltd, Eurofins Scientific

### 10.4 Technical Notes (Phase 1–5)

- **GPS capture:** browser/device Geolocation API (`navigator.geolocation.getCurrentPosition`) — free, permission-prompt only, no API key required. No paid mapping service in this scope.
- **File uploads:** seal photos, 2A/4B PDFs, passbook photos — plain file storage (local disk or S3-style bucket), no processing needed.
- **No offline mode required for v1** but keep forms simple enough that offline could be added later without redesign — field workers on weak rural networks are a foreseeable pain point.
- **No external integrations** in Phases 1–5 (no GrapeNet upload, no bank/payment gateway, no accounting sync). Clean, exportable data is the requirement (Open Question #2).
- **Timestamps everywhere:** `created_at`, `updated_at` on every table. Required for the audit-trail / traceability rebuild in R30.
- **Soft delete only:** no hard delete of farmers, plots, or any failed record. Use `status` fields for lifecycle.

### 10.5 Explicitly NOT in Phases 1–5
- Weighing Record (Phase 6+)
- Arrival QC (Phase 6+)
- Packaging, Item Master, BOM (Phase 7)
- Palletisation, Finished Goods QC (Phase 8)
- Pre-Cooling (Phase 9)
- Container Indent, Loading (Phase 10)
- Export Documents (Phase 11)
- Farmer Invoice / payment computation (Phase 12)
- Number of Trees field on plots — removed permanently
- Contract signature/acknowledgment — deferred
- IFSC auto-fill — deferred

*(Note: these phase numbers for "Weighing/Arrival QC/Packaging/etc." reflect the original Phase 1–5 draft's own internal counting scheme at the time it was written, which differs from the canonical numbering used elsewhere in this document — see Section 2. Kept verbatim for historical accuracy.)*

### 10.6 Backfill List (Phase 1–5, as originally recorded)

- **Bank Details** (surfaced during Phase 4 discussion, structurally belongs to Farmer) — added as Phase 1B. ✅ Already folded in above.

### 10.7 Definition of Done (Phases 1–5)
- Field Worker can search farmer with fuzzy matching, create new farmer, and add bank details (either at creation or later).
- Field Worker can complete Plot Registration & Field QC as one combined action; GPS auto-capture works; follow-up inspections don't overwrite failed records.
- Lab Worker sees only Field-QC-passed plots, reference info is read-only, and lab entry saves correctly.
- Office Worker cannot create a Contract until Lab Result = Pass AND Bank Details exist.
- Field Worker can log Harvest with 1+ vehicle trips per harvest event; multiple harvest rounds are allowed per season.
- Every status transition on `season_registrations.status` is enforced by the backend, not just the UI (frontend enforcement alone is not enough).
- Admin can create/deactivate users and assign roles; role gating is enforced everywhere.
- All list views reflect correct current statuses.

---

## 11. Phase 6–8 Full Detail (complete, verbatim from original draft)

### 11.1 Phase 6: Weighing Record — Flow & Screen

**Flow:** Worker searches/selects Farmer → system shows that farmer's **un-weighed vehicle trips** (from Harvest Phase 5) → worker picks one → Farmer Name, Variety, Vehicle No. auto-fill → worker enters weighing data.

**Section A — Reference (auto-filled from Vehicle Trip / Harvest / Plot)**

| Field | Source |
|---|---|
| Farmer Name | Farmer record |
| Variety | `season_registration → plot_variety` (via harvest) — changed 2026-08-11, was "Plot record" |
| Vehicle No. | Vehicle Trip record |

**Section B — Weighing Entry (entered by supervisor)**

| Field | Type | Notes |
|---|---|---|
| Date | date | weighing date — can differ from harvest date |
| Slip No. | text | physical weighbridge slip number |
| Supervisor Name | text | |
| No. of Crates | integer | actual count at arrival |
| Total Weight (Kg) | decimal | actual weighbridge reading |
| Slip Photo | photo upload | direct camera access via device permission, no API key |

**Section C — System-calculated (read-only, shown to supervisor)**

| Field | Calculation |
|---|---|
| Rejection % | ~~pulled from this farmer's Contract `rejection_percent` (NOT hardcoded 7%)~~ **REVERSED 2026-08-31: fixed at 7% company-wide (founder-confirmed) — `backend/app/core/constants.py::FARMER_REJECTION_PCT`, not read from the contract. See `Business_Rules.md` R28.** |
| Rejection Amount (Kg) | Total Weight × Rejection % |
| Net Weight (Kg) | Total Weight − Rejection Amount |

**Crate count mismatch warning:** if No. of Crates here differs from the No. of Crates logged at Harvest (vehicle trip level), show a **small red inline message** (e.g. "Harvest recorded 45 crates, weighing shows 43 — please verify"). Does NOT block saving.

### 11.2 Phase 7: Arrival QC — Flow & Screen

**Flow:** Worker selects a harvest that has completed weighing → plot/farmer info auto-fills → worker enters quality observations.

**Section A — Reference (auto-filled from Harvest / Plot)**

| Field | Source |
|---|---|
| Farmer Name & Address | Farmer record |
| Plot No. | Plot record |
| Area in Acres | Plot record |
| Grower Code | Plot/Registration record |
| Pruning Date | Plot record |
| Planned Sampling Date | Field QC record |
| Tentative Harvesting Date | Plot record |

**Section B — Inspection (entered fresh)**

| Field | Type | Notes |
|---|---|---|
| Date of Inspection | date | required |
| Fruit Colour — Green % | decimal | |
| Fruit Colour — Milky Green % | decimal | |
| Fruit Colour — Yellow % | decimal | |
| TSS (Sugar) % | decimal | |
| Non-Acceptable Thrips Mark % | decimal | |
| Non-Acceptable Bhuri % | decimal | |
| Non-Acceptable Black Spot % | decimal | |
| Cercospora Spot % | decimal | |
| Overall Material Observation | choice | Good / Very Good / Excellent |
| Result | Pass / Fail | |
| Notes | free text | |
| Inspected By | auto-filled | from logged-in user |

**Important:** Arrival QC uses the **same quality parameters** as Field QC (Phase 2) but is an independent inspection — grapes can degrade between plot and packhouse (heat, delay, rough roads). This is QC stage 2 of 3 per R21.

### 11.3 Phase 8: Packaging — Flow & Screen

**Flow:** Worker selects a harvest that has passed Arrival QC → farmer/variety auto-fills → worker selects Pack Size → Compliance Type → Customer (cascading dropdowns driven by valid product combinations) → GGN auto-fills from company settings → worker enters packing details.

**Section A — Reference (auto-filled)**

| Field | Source |
|---|---|
| Farmer Name | Farmer record |
| Variety | `season_registration → plot_variety` (via harvest) — changed 2026-08-11, was "Plot record" |
| GGN (GlobalGAP No.) | Company settings (entered once by Admin, auto-fills everywhere) |

**Section B — Packing Selection (cascading dropdowns)**

| Step | Options |
|---|---|
| 1. Pack Size | 4 Kg / 4.5 Kg / 5 Kg |
| 2. Compliance Type | EU / Non-Testing (filtered by selected pack size) |
| 3. Customer | OFD / Roveg / N&K / FS / MASCL / Boon Kee (filtered by pack size + compliance) |

Once Customer is selected, system shows the **correct packing materials** for this combination (from Item Master setup, when built in Phase 9) as a reference panel so the worker knows which box type, pouch type, sticker type to use.

**Section C — Packing Entry (entered fresh)**

| Field | Type | Notes |
|---|---|---|
| Date | date | |
| Slip No. | text | |
| Total Weight (Kg) | decimal | weight going into this packing run |
| 7% Farmer Rejection (Kg) | decimal | system-calculated from a fixed 7% company-wide rate (founder-confirmed 2026-08-31 — not from the contract), shown read-only |
| Net Weight (Kg) | decimal | system-calculated |
| Actual Rejection (Kg) | decimal | defects found during packing — separate from farmer rejection |
| Actual Rejection (%) | decimal | system-calculated from actual rejection kg / total weight |
| No. of Boxes Packed | integer | |
| No. of Pallets | integer | |
| Lot ID | system-generated | format: plot identifier + harvest date + customer/pack code. Must be unique and traceable back to plot, farmer, and all QC/lab records. |

**Multiple packing runs per harvest:** allowed without restriction. If a harvest gets split across different customers or pack sizes, each packing run creates its own record with its own Lot ID.

### 11.4 Roles active in Phases 6–8

| Role | Phases |
|---|---|
| **Field Worker** | Phase 6 (Weighing), Phase 7 (Arrival QC) |
| **Office Worker** | Phase 8 (Packaging) |
| **Admin** | Full access to all |

### 11.5 Technical Notes (Phase 6–8)

- **Camera access** for Weighing slip photo: same mechanism as GPS capture — browser/device permission prompt, no API key, no extra cost.
- ~~**Rejection % snapshot:** when saving a Weighing Record, copy the contract's `rejection_percent` into the weighing record itself. This preserves historical accuracy — if the contract rate is later corrected, old weighing records still reflect what was applied at the time.~~ **REVERSED 2026-08-31:** rejection is a fixed 7% company-wide constant (founder-confirmed, `backend/app/core/constants.py::FARMER_REJECTION_PCT`) — there's no contract rate to snapshot anymore. `weighing_records.rejection_pct` and `packaging_records.rejection_contract_kg` are both computed from the fixed constant, not read from `contracts.rejection_percent`. Actual observed rejection is still captured (`actual_rejection_pct`/`actual_rejection_kg`) but is informational only — see `Business_Rules.md` R28 (rewritten).
- **Lot ID generation:** exact format TBD, but must encode enough to be traceable (e.g. plot code + date + customer code). Must be unique system-wide.
- **Cascading dropdowns in Packaging:** for Phase 8 to work independently of Phase 9 (Item Master), hardcode the valid combinations from the Excel's "Finished Material" list as static reference data. When Phase 9 is built, swap the hardcoded list for the `finished_products` table.

### 11.6 Backfill to Phase 1–5 spec

- **Add `ggn_number` to company settings** (OrganizationSetting or equivalent) — stored once by Admin, auto-fills in Packaging.
- **`customer_name` on `packaging_records`** is a plain string for now. When Phase 9 introduces a `customers` table, migrate this to a proper FK.

### 11.7 Definition of Done (Phases 6–8)

- Supervisor can select an un-weighed vehicle trip, enter weighing data, and see rejection calculated from a fixed 7% company-wide rate (founder-confirmed, 2026-08-31 — reverses the earlier "from the contract, not hardcoded" wording; see `Business_Rules.md` R28).
- Crate count mismatch shows a red warning but does not block saving.
- Slip photo can be captured directly from device camera.
- Arrival QC can only be created for harvests that have completed weighing; uses same quality fields as Field QC; pass/fail gates progression.
- Packaging can only be created for harvests that passed Arrival QC.
- Cascading dropdown correctly filters compliance type and customer based on selected pack size.
- GGN auto-fills from company settings.
- Lot ID is auto-generated, unique, and traceable.
- Multiple packaging records per harvest are supported.
- All status transitions enforced by backend, not just frontend.

---

## 12. Phase 9–12 Full Detail (complete, verbatim from original draft)

### 12.1 Phase 9: Inventory Management — full detail

Phase 9 is the Stock/Inventory Manager's domain. No packaging worker or field worker interacts with these screens. It has three parts — reference setup, stock operations, and a dashboard.

#### 9A — Item Master (Reference Data / Admin Setup)

**Purpose:** Stores three catalogs that feed Phase 8 (Packaging) and the inventory system:
1. **Packing Materials** — the 10 material types and their named variants (which box/pouch/sticker is used for which customer and pack size)
2. **Valid Product Combinations** — which variety can go to which customer in which pack size (powers the cascading dropdown in Phase 8's Packaging screen)
3. **BOM Quantities** — how much of each material is needed per container, per product combination

**Who uses it:** Admin or Stock/Inventory Manager. Entered at the start of a season, updated when a new customer, material variant, or product combination appears. Not a daily-use screen.

**Screen: Material Catalog**

A list/table of all packing material types and their variants. Each entry stores:

| Field | Type | Notes |
|---|---|---|
| Material Type | enum | Box, Liner Bag, Puneet, Pouch, Grape Guard, Angle Board, Pallet, Strapping Roll, Clip, Sticker |
| Variant Name | text | e.g. "Stayro Foam", "Green Plain", "Simple Blue Pouch" |
| Applicable Pack Sizes | multi-select | 4 Kg / 4.5 Kg / 5 Kg (which sizes this variant is used for) |
| Applicable Customers | multi-select | OFD / Roveg / N&K / FS / MASCL / Boon Kee |
| Unit of Measure | enum | pieces / kg / rolls |
| Reorder Point | integer | minimum stock threshold — alert when stock drops below this |
| Scale Level | enum | per-box / per-container |
| Notes | text | optional — e.g. "Heatshell type", "84 per container" |

**Scale Level** distinguishes materials that are consumed per packed box (liner bags, puneets, pouches, grape guards, stickers) from materials consumed per loaded container (angle boards, pallets, strapping rolls, clips). Per-box materials auto-deduct at packing time (Phase 8). Per-container materials auto-deduct at container loading time (future Phase — Container Loading).

The manager can add, edit, or deactivate material variants. No delete — deactivated variants remain for historical records.

**Screen: Valid Product Combinations**

A list of allowed variety × customer × pack size combinations, matching the Excel's "Finished Material" list. Each entry:

| Field | Type | Notes |
|---|---|---|
| Variety | select | from grape variety list |
| Customer | select | OFD / Roveg / N&K / FS / MASCL / Boon Kee |
| Pack Size | select | 4 Kg / 4.5 Kg / 5 Kg |
| Compliance Type | select | EU / Non-Testing |
| Active | boolean | can be deactivated without deletion |

This table directly powers the cascading dropdown in Phase 8's Packaging screen. If a combination doesn't exist here, the worker can't select it during packing.

**Phase 8 integration note:** Phase 8 currently hardcodes the valid combinations from the Excel. When Phase 9A is built, swap the hardcoded list for a query against this table.

**Screen: BOM Quantities**

For each valid product combination, the manager enters how much of each material is needed per container:

| Field | Type | Notes |
|---|---|---|
| Product Combination | FK | links to a valid product combination from above |
| Material Variant | FK | links to a material from the catalog |
| Quantity per Container | integer | how many of this material per container of this product |

The system also calculates and stores a **quantity per box** for per-box materials: `quantity_per_container / boxes_per_container`. This is what drives auto stock-out during packing.

Example from Excel: Thomson / OFD / 4.5 Kg — one container uses 18,720 Green boxes, 18,720 liner bags, 168,500 clamshell puneets, 18,720 grape guards, 420 white angle boards, 100 big pallets + 5 mini, 1,270 clips, and customer-specific stickers.

#### 9B — Stock Management (Operational)

**Purpose:** Tracks every material movement — what came in, what went out, what was adjusted. Current stock for any material is always: `sum(Stock In) − sum(Stock Out) + sum(Adjustments)`.

**Who uses it:** Stock/Inventory Manager. Used whenever materials are received from suppliers or when manual corrections are needed (damage, loss, miscounts).

**Screen: Stock In**

When packing materials arrive from a supplier, the manager records:

| Field | Type | Notes |
|---|---|---|
| Date | date | date materials received |
| Material Variant | select | from material catalog (Phase 9A) |
| Quantity | integer | amount received |
| Supplier Name | text | plain text — no supplier master table for now |
| Reference | text | optional — invoice number, delivery challan, etc. |
| Notes | text | optional |

Saving a Stock In entry creates a `stock_movements` record with `movement_type = 'in'`.

**Manual Adjustments**

When materials are damaged, lost, found, or miscounted, the manager records a correction:

| Field | Type | Notes |
|---|---|---|
| Date | date | |
| Material Variant | select | from material catalog |
| Quantity | integer | positive for found/returned, negative for damaged/lost |
| Reason | text | required — why the adjustment was made |

Creates a `stock_movements` record with `movement_type = 'adjustment'`.

**Auto Stock Out (background — no screen)**

When a packaging record is saved in Phase 8, the system automatically creates `stock_movements` records with `movement_type = 'auto_out'` for every per-box material in that product's BOM:

`boxes packed × qty_per_box = quantity deducted`

The packaging worker never sees this. It happens in the background. The `stock_movements` record links back to the `packaging_record_id` that triggered it for audit traceability.

Per-container materials (angle boards, pallets, clips, strapping rolls) do NOT auto-deduct at packing time. They deduct at container loading time (future phase). Until that phase is built, the manager can use manual adjustments to track these.

#### 9C — Inventory Dashboard (Read-heavy)

**Purpose:** The Stock/Inventory Manager's daily view. Shows what's in stock, what needs attention, and what's been moving.

**Screen: Current Stock Overview**

A table showing every active material variant with:

| Column | Source |
|---|---|
| Material Type | from catalog |
| Variant Name | from catalog |
| Current Stock | calculated from stock_movements |
| Reorder Point | from catalog |
| Status | Green (stock > 2× reorder), Yellow (stock > reorder but < 2×), Red (stock ≤ reorder) |

Materials at or below reorder point appear at the top with a red indicator. The system also sends an alert/notification to the inventory manager when any material crosses its reorder point (alert mechanism TBD — in-app notification for now).

**Screen: Movement Log**

A chronological table of all stock movements, filterable by:
- Material type / variant
- Movement type (in / auto_out / adjustment)
- Date range

Each row shows: date, material variant, movement type, quantity, who recorded it, and (for auto_out) which packaging record triggered it.

**Screen: Order Calculator (Planning Tool)**

An optional planning view where the manager can estimate material needs:

| Field | Type | Notes |
|---|---|---|
| Product Combination | select | from valid products |
| Planned Containers | integer | how many containers the manager expects for this product this season |

The system calculates: `planned_containers × qty_per_container = total_needed` for each material. Then shows:

| Column | Source |
|---|---|
| Material Variant | from BOM |
| Total Needed | planned containers × BOM qty |
| Current Stock | from stock_movements |
| To Order | Total Needed − Current Stock (floor at 0) |

This is a **planning aid, not a gating step**. The manager can use it or ignore it. It does not create purchase orders or trigger any workflow — it just shows numbers. The manager uses these numbers to decide when and how much to order from suppliers (which now happens outside the system via phone, WhatsApp, etc. — the Phase 12 Purchase Order module referenced here previously has been dropped, 2026-08-11).

**Resolved 2026-08-11 (Open Question #11):** Pattern C confirmed — the company places a bulk pre-season order before the season starts, plus weekly top-up orders during the season as stock runs low. This makes the planning tool a genuine must-have for the pre-season bulk order, not just a nice-to-have.

### 12.2 Phase 10: Palletisation — full detail

**Purpose:** After packaging (Phase 8), packed boxes need to be organized onto pallets for cold storage and eventual container loading. A pallet can contain boxes from **multiple lots** (R35), and the system must track exactly which lots are on which pallet for traceability.

**Flow:** Worker goes to Palletisation screen → sees a list of packed lots (from Phase 8) with available boxes → selects one or more lots → enters pallet details → system generates Pallet ID → saves.

**Section A — Lot Selection**

A list/table of packaging records (lots) that have been packed but not yet fully palletised. Each row shows:

| Column | Source |
|---|---|
| Lot ID | from packaging_records |
| Farmer Name | from farmer record |
| Variety | from `season_registration → plot_variety` (via harvest) — changed 2026-08-11, was "from plot record" |
| Customer | from packaging_records |
| Pack Size | from packaging_records |
| Boxes Packed | from packaging_records.num_boxes |
| Boxes Already Palletised | calculated from palletisation_lots |
| Boxes Available | Boxes Packed − Boxes Already Palletised |

Worker selects one or more lots and specifies how many boxes from each lot go onto this pallet.

**Section B — Pallet Entry**

| Field | Type | Notes |
|---|---|---|
| Date | date | |
| Total Boxes on Pallet | integer | auto-calculated from selected lots, editable for correction |
| Pallet Type | select | Big / Mini |
| Pallet ID | system-generated | unique identifier, auto-assigned on save |
| Notes | text | optional |

**Pallet ID format:** TBD — must be unique system-wide and encode enough for physical identification (e.g. sequential number with season prefix: `2026-P001`). Exact format pending CEO input (Open Question #10).

**Constraint:** The sum of `palletisation_lots.num_boxes` for a given `packaging_record_id` across all pallets must not exceed `packaging_records.num_boxes`. The UI should prevent over-allocation by showing "Boxes Available" and blocking if the worker tries to assign more boxes than remain unpalletised.

### 12.3 Phase 11: Pre-Cooling — full detail

**Purpose:** A simple log recording when pallets enter and exit cold storage, with berry temperature readings. Required before dispatch (R44, R45).

**Flow:** Worker selects a pallet that hasn't been pre-cooled yet → enters cooling details → saves. This is a straightforward data entry screen — no calculations, no cascading logic.

| Field | Type | Notes |
|---|---|---|
| Pallet ID | select | from pallets with status = 'created' (not yet pre-cooled) |
| Date | date | |
| No. of Pallets | integer | auto-filled as 1 (since entry is per pallet), editable if logging a batch |
| No. of Boxes | integer | auto-filled from pallet record |
| Pre-Cooling In-Time | time | when the pallet entered cold storage |
| In-Time Berry Temperature | decimal | temperature reading at entry (°C) |
| Pre-Cooling Out-Time | time | when the pallet exited cold storage |
| Out-Time Berry Temperature | decimal | temperature reading at exit (°C) |

**Workflow note:** In practice, the worker may log the in-time and in-temperature when the pallet goes into cold storage, then come back later to log the out-time and out-temperature when it comes out. The system should support saving a partial record (in-time only) and completing it later (adding out-time). A pallet is considered "pre-cooling complete" only when all four time/temperature fields are filled.

**Batch entry option:** If the manager sends multiple pallets into cold storage at the same time and temperature, allow selecting multiple pallets and applying the same in-time and in-temperature to all of them in one action, rather than entering each pallet individually.

**Status update:** When a pre-cooling record is saved with all fields complete (out-time and out-temperature filled), the linked pallet's `status` updates from `'created'` to `'pre_cooling'` (meaning pre-cooling is done). This gates the next phases — a pallet cannot be loaded into a container until its pre-cooling record is complete (R45).

### 12.4 Phase 12: Purchase Order — full detail — ⚠️ DROPPED 2026-08-11

> **This entire module is out of scope.** CEO confirmed no fertilizer purchases and no formal PO process needed. The rest of Section 12.4 below is kept verbatim for historical reference only — do not build or expose any of it (`CLAUDE.md` Section 12). `purchase_orders`/`purchase_order_line_items` tables already exist in the database (unused) and will be removed in a future migration.

**Purpose:** Generates a formatted Purchase Order document for ordering **farm inputs** (fertilizers, chemicals) from suppliers. This is completely separate from packing material inventory (Phase 9) — the PO format from the client's Excel is specifically for NPK fertilizers and agro-chemicals purchased from suppliers like A.S. Joshi & Co.

**Flow:** Office Worker or Stock/Inventory Manager opens PO screen → enters supplier details → adds line items (product, HSN code, quantity, rate, GST %) → system calculates totals including CGST/SGST → worker generates a printable PO document in the standard Indian business format.

**Section A — PO Header**

| Field | Type | Notes |
|---|---|---|
| PO Number | system-generated | format: RF-PO##/YYYY-YY (e.g. RF-PO01/2025-26), auto-incremented |
| PO Date | date | defaults to today |
| Mode/Terms of Payment | text | |
| Supplier Reference | text | optional |
| Other References | text | optional |
| Dispatch Through | text | defaults to "Road Transport" |
| Destination | text | |

**Section B — Company Details (auto-filled from company settings)**

Pre-filled from organization settings (same settings that store GGN number from Phase 8):

| Field | Source |
|---|---|
| Company Name | company settings |
| Company Address | company settings |
| Company Phone | company settings |
| Company GST Number | company settings |
| Company Email | company settings |

These are entered once by the Admin and auto-fill on every PO.

**Section C — Supplier Details**

| Field | Type | Notes |
|---|---|---|
| Supplier Name | text | with search/autocomplete from previously used suppliers |
| Supplier Address | text | |
| Supplier Email | text | optional |
| Supplier GST Number | text | |

When a supplier is selected from previous entries, their details auto-fill. New suppliers are saved for future autocomplete.

**Section D — Line Items**

A dynamic table where each row is one product:

| Field | Type | Notes |
|---|---|---|
| Sr. No. | auto | sequential |
| Particulars | text | product name/code (e.g. "12-61-00", "CaNo3") |
| HSN Code | text | Harmonized System code for GST |
| Qty in Kg | decimal | total quantity ordered |
| Unit | integer | number of bags/units |
| Kg Per Bag/Unit | decimal | weight per bag |
| Make | text | e.g. "Imported", "Domestic" |
| Rate | decimal | price per kg (₹) |
| GST % | decimal | GST rate (e.g. 5%, 18%) |
| Amount | decimal | auto-calculated: Qty × Rate |

Worker can add/remove rows as needed.

**Section E — Totals (auto-calculated)**

| Field | Calculation |
|---|---|
| Assessable Value | sum of all line item amounts |
| CGST | Assessable Value × (GST% / 2) — grouped by GST rate |
| SGST | Assessable Value × (GST% / 2) — grouped by GST rate |
| Freight | manual entry, defaults to "At Actual" |
| Other Charges | manual entry, defaults to 0 |
| Grand Total | Assessable Value + CGST + SGST + Freight + Other Charges |
| Total Amount in Words | auto-generated in Indian English format (e.g. "Two Lac Thirty Two Thousand Three Hundred Thirteen Rs Only") |

**GST calculation note:** For line items with different GST rates, the tax breakdown table groups by rate and calculates CGST/SGST separately for each group.

**Output: Printable PO Document.** On "Generate PO", the system produces a formatted document (PDF or printable HTML) matching the Excel's PO layout:
- Company letterhead with address and GST
- Supplier block with address and GST
- Line item table with HSN codes
- Tax breakdown table (CGST/SGST split)
- Amount in words
- "For Reliable Fresh" signature block with "Authorised Signatory" line

The PO is saved in the system and can be reprinted, emailed, or downloaded as PDF.

### 12.5 Roles Active in Phases 9–12

| Role | Phase 9 | Phase 10 | Phase 11 | Phase 12 ⚠️DROPPED |
|---|---|---|---|---|
| **Admin** | Full access | Full access | Full access | — |
| **Stock/Inventory Manager** | All of 9A, 9B, 9C | — | — | — |
| **Office Worker** | Read access to dashboard | ~~Palletisation entry~~ **removed 2026-08-11** | Pre-cooling entry | — |
| **Packaging Supervisor** *(added 2026-08-11)* | — | Palletisation entry (moved here from Office Worker) | — | — |
| **Field Worker** | — | — | — | — |
| **Lab Worker** | — | — | — | — |

**Note:** Exact role assignment for Pre-Cooling is still assumed — the person physically at the packhouse doing this task is likely the Office Worker, but this may be the Field Worker or a dedicated role. Confirm with CEO (Open Question #9, partially resolved 2026-08-11 for Palletisation only). Phase 12 column struck entirely — module dropped, CEO confirmed no fertilizer purchases.

### 12.6 Technical Notes (Phase 9–12)

- **Auto stock-out trigger:** When `packaging_records` insert fires, look up BOM entries where `scale_level = 'per_box'` for that product combination, multiply by `num_boxes`, and insert corresponding `stock_movements` records. This should be a database trigger or a service-layer hook, not frontend logic.
- **Current stock is always computed**, never stored as a column. This avoids sync issues. If performance becomes a concern with large movement logs, add a materialized view or periodic snapshot — but for ~500 farmers and a 4-month season, the volume is trivial.
- ~~**Supplier autocomplete for POs:** Store a denormalized `suppliers` reference table built from previously used supplier names/addresses/GST. Not a full supplier master — just autocomplete data.~~ ⚠️ **DROPPED 2026-08-11** — Phase 12 out of scope.
- ~~**Amount in words:** Use a standard Indian numbering library (Lac/Crore format, not Million/Billion). Several npm packages handle this (e.g. `num-words`, `number-to-words` with Indian locale).~~ ⚠️ **DROPPED 2026-08-11** — Phase 12 out of scope.
- ~~**PO PDF generation:** Same mechanism as the weighing slip photo — generate server-side using a templating engine (e.g. Puppeteer for HTML→PDF, or a lighter library like `pdfkit`). The template matches the Excel's PO layout.~~ ⚠️ **DROPPED 2026-08-11** — Phase 12 out of scope.
- **Pre-cooling partial save:** The `out_time` and `out_berry_temp` fields are nullable. The UI shows a "Complete" button when a record has only in-time data, allowing the worker to fill out-time later without creating a new record.

### 12.7 Backfill to Earlier Phase Specs

- **Phase 8 (Packaging):** When Phase 9A is built, replace the hardcoded valid product combinations with a query to `item_master_products`. Replace the hardcoded material reference panel with a query to `item_master_materials` + `bom_entries`.
- **Phase 8 (Packaging) → Phase 9B link:** Add a post-save hook on `packaging_records` that creates `stock_movements` entries for per-box materials. This is the auto stock-out mechanism.
- **Company Settings:** Add fields for company name, address, phone, GST number, email — these auto-fill in Phase 12 PO header and are also used for Phase 8's GGN number.

### 12.8 Definition of Done (Phases 9–12)

**Phase 9 — Inventory Management**
- Admin/Inventory Manager can add, edit, and deactivate packing material variants with reorder points.
- Admin/Inventory Manager can manage valid product combinations (variety → customer → pack size → compliance type).
- Admin/Inventory Manager can enter BOM quantities per product combination per container.
- Stock In screen allows recording material receipts with supplier reference.
- Manual adjustment screen allows corrections with required reason field.
- Auto stock-out creates movement records when Phase 8 packaging records are saved (per-box materials only).
- Dashboard shows current stock levels with green/yellow/red indicators based on reorder points.
- Movement log shows all stock events, filterable by material, type, and date range.
- Order calculator allows entering planned container counts and shows total needed vs. current stock vs. to-order.
- Reorder alert fires when any material drops below its reorder point.

**Phase 10 — Palletisation**
- Worker can see available packed lots with box counts (total, already palletised, available).
- Worker can select one or more lots and specify box counts for a new pallet.
- System prevents over-allocation (assigning more boxes than available from a lot).
- Pallet ID is auto-generated and unique.
- Mixed lots on one pallet are supported and tracked through the junction table.
- Pallet type (Big/Mini) is recorded.

**Phase 11 — Pre-Cooling**
- Worker can select a pallet that hasn't been pre-cooled.
- Entry supports partial save (in-time only) and later completion (out-time added).
- Batch entry allows applying same in-time/temperature to multiple pallets at once.
- Pallet status updates to 'pre_cooled' when all fields are complete.
- All fields match the Excel's Pre-Cooling sheet (date, pallets, boxes, in-time, in-temp, out-time, out-temp).

**Phase 12 — Purchase Order — ⚠️ DROPPED 2026-08-11, do not implement.** Kept below for historical reference only.
- ~~Worker/Manager can enter supplier details with autocomplete from previous POs.~~
- ~~Dynamic line item table supports add/remove rows with HSN code, qty, rate, GST %.~~
- ~~System correctly calculates CGST/SGST split, even with mixed GST rates across line items.~~
- ~~Amount in words generates in Indian English format (Lac/Crore).~~
- ~~"Generate PO" produces a formatted PDF matching the Excel's PO layout.~~
- ~~PO number auto-increments in RF-PO##/YYYY-YY format.~~
- ~~POs can be saved as draft, issued, or marked completed.~~
- ~~POs can be reprinted/downloaded.~~

**Phase 13 — Finished Goods QC** *(added 2026-08-11, definition of done not yet written — fields pending CEO document)*




## New information

> ⚠️ **The MH-number row below conflicts with Section 7's `farmers`/`plots` table definitions (marked there, not resolved, 2026-09-02).** Section 7 narrates the 2026-08-11 "CEO confirmed farmer-level" decision as settled; this row says the opposite — MH number is per plot. The live code follows *this* row, not Section 7: `backend/app/models/farmer.py` has no `mh_number` column, `backend/app/models/plot.py` has `mh_registration_number`. Neither section is authoritative — this is pending an APEDA registration certificate from the client, see `Open_Questions.md` Q16. Don't read this table as the resolution just because the code currently agrees with it; it was never confirmed against Section 7's conflicting claim.

| Finding | Impact | Priority |
|---|---|---|
| MH number is per plot (3 MH numbers for 1 farmer) | Revert plots.mh_registration_number — this was correct, not farmers.mh_number | High — data model |
| "Containers wise Stock" is the primary metric | Dashboard should show containers-worth as primary, raw stock as secondary | Medium — UI |
| Thermacol 4 Kg highlighted RED in their sheet | Our red/yellow/green system matches their manual process | Confirms our design |
| Donnage Bag is a real material type | Add to MaterialType enum | Low |
| TSS recorded at inward/weighing | Add TSS field to weighing records | Medium |
| Multiple supervisors per harvest | Current design has one supervisor — may need to be free text | Low |

