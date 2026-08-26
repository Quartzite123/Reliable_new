# CLAUDE.md — Reliable Fresh Export Management System

> **Purpose:** This is the master context file for the entire project. Any agent, developer, or AI working on this project should read this file FIRST before touching any code or spec. It captures every decision, discovery, assumption, and plan from the Phase 0 discovery sessions, and is kept current as the project moves into build.
>
> **Last updated:** 2026-08-11 — CEO confirmation round folded in: Season Management is now a real module (not just a year tag), plots can hold multiple varieties (see same-day follow-up below for where variety actually lives), MH registration number moved back to the farmer level, a new Packaging Supervisor role was added, the Purchase Order module was dropped entirely, Finished Goods QC's position in the pipeline was confirmed, and the inventory-ordering pattern was confirmed. See `Business_Rules.md` R55/R56 and the rewritten R2/R7/R7a/R21, and `Open_Questions.md` Q4 (**resolved**, not reopened — see 2026-08-11 same-day follow-up below), Q11/Q12/Q13 (resolved) for full detail.
>
> **Same-day follow-up (2026-08-11):** Q4's answer was refined further: variety lives on a new `plot_varieties` table (not on `harvests` as the entry above still literally states — see the corrected Discovery 3 below), each variety gets its own independent pipeline (`Business_Rules.md` R57), permissions became phase-based rather than role-based (`user_phase_access`, R53 rewritten, R58), farmer search was fixed to include MH number (R3), and the Farmer Invoice formula was clarified (R48). **Note:** `Open_Questions.md` itself was not part of this follow-up round and still marks Q4 "REOPENED" rather than "RESOLVED" — flagged as a cross-document inconsistency in the change report; that file needs the same correction next time it's touched.
>
> **Previously:** 2026-08-07 — directory cleanup, consolidated down to 4 files (this file, `PHASE_MAP.md`, `Business_Rules.md`, `Open_Questions.md`). The earlier working drafts (`TEMP_Phase01-05_Draft.md`, `TEMP_Phase06-08_Draft.md`, `TEMP_Phase09-12_Draft.md`, `context.md`, `Export_Process_Flow_Chart.md`, `CLAUDE_CODE_PROMPT.md`) were folded into `PHASE_MAP.md` and this file, then removed to avoid duplication and drift between documents.

---

## 1. What is this project?

An internal web application (PWA) for **Reliable Fresh**, an agricultural export company based in Pune, India, sourcing grapes from the Nashik region. The software digitizes their complete grape export workflow — from farmer registration through quality inspection, harvesting, packing, cold storage, container loading, and export documentation.

**It replaces:** paper records, Excel sheets, manual communication, and repeated data entry that currently run the business.

**It is NOT:** a public-facing app, a farmer portal, a customer portal, or a marketplace. Internal staff only.

---

## 2. The client and the business

- **Company:** Reliable Fresh, Pune
- **What they do:** Buy grapes from ~500 farmers in the Nashik region, pack them to customer specifications, and export via sea containers to international buyers
- **Scale:** ~500 farmers now, expected to grow to ~1,000. About 12 actual users of the software (designing for 20). One packhouse operation.
- **Customers:** OFD, Roveg, N&K, FS, MASCL, Boon Kee — each has their own packing specifications (box types, stickers, compliance requirements)
- **Season:** Grape season runs roughly February to April. The entire annual cycle (register → inspect → harvest → pack → ship) happens within this window.
- **Competitor:** Magnus Farm Fresh LLP, Shirasgaon, Nashik — similar operation, already technology-enabled. CEO wants to match/exceed their capabilities. Their website (magnusfarm.com) is marketing-only — no internal process details are public.

---

## 3. Critical discoveries from Phase 0

These are things that were NOT obvious from the original Excel and significantly changed the system design:

### Discovery 1: Farmers are seasonal, not permanent-and-done
The business works with ~500 farmers per season. Same farmer may return next year or not. The system must NOT delete farmers between seasons — instead:
- **Farmer = permanent master record** (name, address, mobile, bank details)
- **Season Registration = temporary yearly record** linked to the farmer
- On re-registration: search by name/MH/mobile → auto-fill old details → editable → register for current season
- One search box flow, no "old vs new" toggle — system decides based on search results

### Discovery 2: Quality checks belong to the plot, not the farmer
One farmer can have multiple plots. Plot A may pass QC, Plot B may fail. Therefore Field QC, Lab Sampling, Contract, and Harvest are all **per plot**, not per farmer. This changed every relationship in the data model.

### Discovery 3: One plot can contain multiple varieties, each with its own pipeline (reversed 2026-08-11, corrected same day)
**One plot can contain multiple varieties.** This reverses the original working assumption ("one plot = one variety, multiple varieties = separate plots"). CEO confirmed the answer: Open Question #4 is **RESOLVED**, not merely reopened — this is settled, not open.

Variety is registered on the plot via the new `plot_varieties` table (one row per variety grown on that plot). Each variety then gets its own independent pipeline: its own `season_registration`, Field QC, Lab Sample, Contract, and Harvest — see `Business_Rules.md` R57. Harvests inherit their variety by walking the chain `harvest → season_registration → plot_variety`, rather than storing it directly.

*Correction note: an earlier same-day revision of this document said variety is "captured at harvest time" and lives on the `harvests` table. That was wrong — it created a conflict with the `plot_varieties` model introduced the same day. Resolved in favor of `plot_varieties`: neither `plots` nor `harvests` has a variety column. See `PHASE_MAP.md` Section 7.*

### Discovery 4: Multi-stage QC
Quality checks happen at THREE distinct stages, each recorded independently:
1. **Field QC** — at the plot, before harvest
2. **Arrival QC** — when goods reach the packhouse
3. **Finished Goods QC** — after palletisation, before pre-cooling (confirmed 2026-08-11, exact parameters pending CEO document)

### Discovery 5: Granularity shifts through the pipeline
| Stage | Granularity | Why |
|---|---|---|
| Field QC, Lab, Contract | per Plot | quality/agreement = about the land |
| Harvest | per Plot (event) + per Vehicle (trips) | one picking, multiple trucks |
| Weighing | per Vehicle Trip | each truck weighed separately |
| Arrival QC | per Harvest (plot + day) | quality = batch property, not per-truck |
| Packaging | per Lot (one packing run) | harvest can split across customers |

### Discovery 6: Bank details belong at registration, not contract
Bank details (account, IFSC, passbook photo) are a farmer-level permanent fact, not a per-contract fact. Collected during farmer registration (Phase 1B) but not required to create the farmer — only required before a Contract can be created.

### Discovery 7: The 7% rejection is NOT hardcoded
The Excel references "7% Farmer Rejection" everywhere, but it's actually a **per-contract negotiated term** that defaults to 7%. The system stores it on the Contract and pulls it dynamically for Weighing and Packaging calculations.

### Discovery 8: MH registration number belongs to the farmer, not the plot (reversed 2026-08-11)
**MH registration number belongs to the farmer, not the plot. One MH number per farmer.** This matches Reliable Fresh's operational practice. Note: APEDA/NRC Grapes documentation suggests plot-level registration (format: MH[state][district][taluka][product][farm][plot]), and an earlier pass of this document "corrected" the original Excel to plot-level on that basis — but CEO confirmation overrides the documentation research. Follow business practice: `farmers.mh_number` (string, unique, nullable). There is no MH identifier at the plot level. See `Business_Rules.md` R2/R7a.

### Discovery 9: Packing material inventory is a core requirement
Not just tracking what was packed — the system must track stock levels of all packing materials (boxes, foam, pouches, grape guards, angle boards, pallets, clips, stickers, strapping rolls), auto-deduct on packing, and alert the Stock/Inventory Manager when materials fall below a reorder threshold.

### Discovery 10: Season Management is a real module, not just a year tag (added 2026-08-11)
CEO confirmation reverses the original assumption that a "season" is nothing more than a year integer stamped on registrations. It is now a real admin-managed entity:
- Admin selects a season name (e.g. "2025-26"), a start date, and an end date.
- Only one season can be active at a time.
- Season Management must exist as a module before any farmer/plot registration can happen for that season — it is a pre-phase (Phase 0), admin-only.
- `season_registrations.season_year` (plain integer) will be replaced by `season_registrations.season_id` (FK to the new `seasons` table) in the next schema update — this is a pending, not-yet-built change. See `PHASE_MAP.md` Section 7 and Section 2 (Phase 0).

---

## 4. Design principles (apply to every phase)

These emerged from discovery and should never be violated. (Full list, with the two recurring implementation rules, also lives in `PHASE_MAP.md` Section 6 — kept here too since it's foundational enough to want in both places.)

1. **Field ownership** — every field is entered by whoever actually observes it. Field Workers own land/plot/crop facts. Lab Workers own test/sample facts. Office Workers own paperwork/agreement facts. Reference info from other roles is passed as read-only, never re-typed.

2. **Fuzzy search over exact match** — farmer/plot search must tolerate spelling mistakes by returning likely matches for confirmation. Indian farmer names are unreliable for exact-text matching.

3. **Business key vs database key** — the database uses invisible internal IDs as primary keys. Plot Number and MH Number (`farmers.mh_number` as of 2026-08-11 — this used to say "Plot MH Registration Number," a stale reference from before the farmer-level reversal, corrected here) are unique constraints for integrity but never exposed as the "primary key" to users.

4. **Persistent records, seasonal actions** — Farmer, Plot, and Bank Details are permanent. Registration, QC, Contract, Harvest are seasonal events attached to permanent records. No delete — inactive/failed records kept for audit.

5. **Auto-fill on re-entry, always editable** — anything the system already knows pre-fills. The worker can always edit if reality changed.

6. **Single screen where Excel already merges concerns** — don't force separate tabs for logically connected info (e.g. Plot + Field QC = one combined screen, two database tables).

7. **Backend enforces all gates** — status transitions (e.g. "can't create Contract without Lab Pass") enforced by the API, not just the UI. Frontend-only enforcement is not sufficient.

8. **Soft delete only** — no hard deletes anywhere. Use status fields (active/inactive, pass/fail) for lifecycle.

9. **Phase-based permissions** *(added 2026-08-11)* — roles are display labels only. Admin assigns specific phases to each user via `user_phase_access`. A user sees only screens for their assigned phases. Never use `users.role` for permission checks — always check `user_phase_access`. See `PHASE_MAP.md` Section 5 and Section 7, `Business_Rules.md` R53 (rewritten) and R58.

---

## 5. Tech stack (current, confirmed)

| Layer | Choice |
|---|---|
| **Backend** | Python + FastAPI + SQLAlchemy ORM + Alembic (migrations) |
| **Database** | PostgreSQL |
| **Frontend** | React + TypeScript + Vite + Tailwind CSS |
| **Auth** | JWT with refresh tokens |
| **Deployment** | Managed platform (Render or Railway) — team has zero server experience; managed means no OS updates, restart management, or certificate renewals to worry about |
| **App type** | PWA (Progressive Web App) — field workers use phones with weak rural connectivity |
| **File storage** | Simple file storage (local or S3-style bucket) — for seal photos, slip photos, passbook photos, 2A/4B PDFs |
| **GPS** | Browser Geolocation API — free, permission-prompt only, no paid API key |
| **Camera** | Browser/device camera access — free, permission-prompt only, for slip photos and document photos |
| **Offline mode** | Not required for v1, but forms are kept simple enough to retrofit later |
| **Backups** | Automated weekly database export to company storage — CEO wants season archives on company PC; doubles as disaster recovery |

**Rejected options:**
- AWS/Google Cloud/Azure — higher complexity, more security responsibility, unpredictable billing, overkill for ~20 internal users
- Raw VPS — cheapest, but requires server maintenance skills nobody on the team has
- GrapeNet integration — deferred; system just provides clean, exportable data a worker can manually enter into the GrapeNet portal (Open Question #2)
- IFSC auto-fill — deferred, out of scope for v1

**History:** this stack was decided after an earlier plan to carry forward a teammate's Node.js/Express/Prisma prototype was dropped. That prototype is not being used in any capacity — this is a fully greenfield build. No legacy code, auth system, or schema exists to reconcile against.

---

## 6. User roles (confirmed)

| Role | What they do |
|---|---|
| **Admin** | Create user accounts, assign roles, manage company settings (GGN, etc.), full access |
| **Field Worker** | Farmer registration, Plot registration, Field QC, Harvesting, Weighing, Arrival QC |
| **Lab Worker** | Lab Sampling / MRL test entry only — sees only plots that passed Field QC |
| **Office Worker** | Farmer Contract, Packaging, Pre-Cooling, and (once scoped) Container Indent, Export Docs, Farmer Invoice; read access to everything. **No longer has Palletisation** (moved to Packaging Supervisor, 2026-08-11) or Purchase Orders (module dropped, 2026-08-11) |
| **Stock/Inventory Manager** | Packing material stock, Item Master, BOM, low-stock alerts. **No longer has Purchase Orders** (module dropped, 2026-08-11) |
| **Packaging Supervisor** *(added 2026-08-11)* | Palletisation only. Read access to packaging records and harvest context (packaging records, season registrations, harvests — to know what's been packed). Everything else: read-only or no access |

Login: email as username, admin-created accounts only, no self-signup. Each user has individual login — no shared accounts (audit trail requirement).

Full role × phase access matrix is in `PHASE_MAP.md` Section 5.

---

## 7. Complete module list and phase plan

| Phase | Module | Status | Key decisions |
|---|---|---|---|
| 0 | Season Management *(added 2026-08-11)* | ✅ Scoped | Admin-only, pre-phase — must exist before any registration. Admin sets name/start date/end date; only one season active at a time. `seasons` table; `season_registrations.season_id` FK is pending (replaces `season_year`) |
| 1A | Farmer Registration (identity) | ✅ Fully spec'd | Permanent record, unique business key is internal ID only, fuzzy search on name and mobile |
| 1B | Farmer Bank Details | ✅ Fully spec'd | 1:1 with farmer, not required to create farmer, required before Contract |
| 2 | Plot Registration & Field QC | ✅ Fully spec'd | Combined single screen, per plot, GPS via browser API, follow-up-after-fail allowed |
| 3 | Lab Sampling / MRL | ✅ Fully spec'd | Per plot, field-ownership split (reference auto-filled, lab fields entered fresh), 2A/4B upload |
| 4 | Farmer Contract | ✅ Fully spec'd | Rate/kg + rejection % (default 7%, editable), gated on Lab Pass + Bank Details exist |
| 5 | Harvesting | ✅ Fully spec'd | Per plot event + multiple vehicle trips, supervisor + driver per vehicle |
| 6 | Weighing Record | ✅ Fully spec'd | Per vehicle trip, rejection from contract (not hardcoded), crate mismatch red warning, slip photo via camera |
| 7 | Arrival QC | ✅ Fully spec'd | Per harvest (plot+day), same quality fields as Field QC, independent inspection |
| 8 | Packaging | ✅ Fully spec'd | Cascading dropdown (size→compliance→customer), GGN from settings, Lot ID auto-generated, multiple runs per harvest |
| 9 | Item Master + BOM + Packing Material Inventory (9A/9B/9C) | ✅ Scoped | 10 material types with variants, BOM per container, stock in/out, reorder alerts |
| 10 | Palletisation | ✅ Scoped | Own screen (not folded into Packaging), pallet can span multiple lots, Pallet ID format pending CEO (Q10) |
| 11 | Pre-Cooling | ✅ Scoped | Berry temp in/out, partial save + batch entry supported |
| 12 | ~~Purchase Order (Farm Input Procurement)~~ | ❌ **DROPPED (2026-08-11)** | CEO confirmed no fertilizer purchases — module is out of scope entirely. `purchase_orders`/`purchase_order_line_items` tables exist in the DB but are unused and will be removed in a future migration |
| 13 | Finished Goods QC *(added 2026-08-11)* | ⚠️ Position confirmed, fields TBD | QC stage 3. Sequenced **between Palletisation (10) and Pre-Cooling (11)** in the actual pipeline — numbered 13 per CEO instruction, not by pipeline position (flagged inconsistency, see report). One check only, not two. Exact parameters pending CEO document (Q13 resolved, detail still pending) |
| — | Container Indent | ❌ Not yet scoped | 3-step CHA handoff (R46), no screen-level spec yet |
| — | Container Loading | ❌ Not yet scoped | Final traceability link (R47), no screen-level spec yet |
| — | Farmer Invoice | ❌ Not yet scoped | Net weight × rate − deductions (R48), deduction rules pending CEO (Q6) |
| — | Export Documents | ❌ Not yet scoped | 5 certificates tracked (R49–51), rules confirmed but no screen-level spec |

Full phase table with source, key entities, dependencies, and CEO-question blockers is in `PHASE_MAP.md` Section 2. Full column-level data model for every table is in `PHASE_MAP.md` Section 7.

---

## 8. Key decisions & rationale (Phases 9–12)

These explain *why* the Phase 9–12 data model looks the way it does — worth keeping since the reasoning isn't obvious from the schema alone.

**Phase 9 — Inventory Management, three parts, not one screen:**
- **9A Item Master** (packing materials catalog, valid product combinations, BOM quantities) is reference/setup data — entered at season start, rarely touched daily.
- **9B Stock Management** is operational — Stock In, Manual Adjustments, and background Auto Stock-Out (triggered by Phase 8 packaging saves).
- **9C Dashboard** is read-heavy — current stock with reorder alerts, movement log, and an optional Order Calculator (planning aid, not a gating step).
- **Key decision:** the packaging worker's job ends at Phase 8. Everything about material tracking — including damaged boxes and discrepancies — is the Inventory Manager's domain via manual adjustments, not the packing worker's.
- **Key decision:** there's no clean "BOM generation event" to trigger off of. Instead the system stays continuously useful — always tracking what's been packed and what's in stock — with the Order Calculator as an optional planning layer on top, not a required workflow step.

**Phase 10 — Palletisation is its own screen, not folded into Packaging:**
Reasoning: pallets can contain boxes from multiple lots (R35), which requires seeing across packaging records and grouping them — a different workflow from packing itself. Open Question #10 asks whether this could be simplified on the actual packhouse floor; the working decision was "better to build separate and merge later than to split later."

**Phase 11 — Pre-Cooling is a simple log:**
Seven fields matching the Excel (date, pallets, boxes, in-time, in-temp, out-time, out-temp). Supports partial save (log in-time now, complete out-time later) and batch entry for multiple pallets entering cold storage together at the same temperature.

**Phase 12 — Purchase Order — ⚠️ DROPPED (2026-08-11):**
CEO confirmed there are no fertilizer purchases and no formal PO process is needed — this module is out of scope entirely (Open Question #12, resolved). Kept below for historical reference only; do not build or expose it. The `purchase_orders`/`purchase_order_line_items` tables already exist in the database but are unused and will be removed in a future migration.

*Original rationale (superseded):* The PO sheet in the client's Excel is specifically for NPK fertilizers and agro-chemicals (e.g. "12-61-00", "13-00-45", CaNo3, "19-19-19") from suppliers like A.S. Joshi & Co., a Mumbai-based agro-chemical distributor — nothing to do with packing materials or the packhouse. The module generates a formatted Indian business document: company letterhead with GST, supplier block with GST, line items with HSN codes, CGST/SGST split, amount in words (Lac/Crore format), authorized-signatory line, as a printable PDF. Completely standalone — no connection to packing-material inventory (Phase 9).

**Finished Goods QC — position confirmed 2026-08-11 (was: genuinely unresolved):**
CEO confirmed the flow-chart placement: Finished Goods QC happens **after Palletisation, before Pre-Cooling** — Packed → Palletised → Finished Goods QC Passed/Failed → Pre-Cooled. It is one check, not two (the earlier "Cold Storage Exit QC" language in R21 described the same stage, not a separate one — R21 has been rewritten accordingly). Exact parameters (which fields, pass/fail criteria) are still TBD pending a CEO document; the `finished_goods_qc` table exists in the model as a placeholder only. See `Business_Rules.md` R21 and `Open_Questions.md` Q13 (resolved).

---

## 9. Technical implementation notes

Cross-cutting mechanisms referenced across multiple phases — collected here so they don't have to be re-derived per phase during the build.

- **GPS capture** (Phase 2 plot location): browser/device Geolocation API (`navigator.geolocation.getCurrentPosition`) — free, permission-prompt only, no API key, no paid mapping service.
- **Camera access** (Phase 6 weighing slip photo, and document photos elsewhere): same permission-prompt mechanism as GPS — no API key, no extra cost.
- **File uploads** (seal photos, 2A/4B PDFs, passbook photos, slip photos): plain file storage (local disk or S3-style bucket), no image/PDF processing needed.
- **Rejection % snapshot** (Phase 6 Weighing, Phase 8 Packaging): copy the contract's `rejection_percent` into the weighing/packaging record at save time, not just reference the contract live. Preserves historical accuracy — if a contract is corrected later, old records still reflect what was actually applied.
- **Lot ID generation** (Phase 8): format not fully pinned down (Open Question #1 proposes plot + harvest day + pack type = one Lot), but must encode enough to trace back to plot, farmer, and full QC/lab history, and must be unique system-wide.
- **Cascading dropdowns in Packaging** (Phase 8): hardcode the valid variety→customer→pack-size combinations from the Excel (see `PHASE_MAP.md` Section 8 for the seed list) until Phase 9A's `item_master_products` table exists, then swap the hardcoded list for a live query. Same pattern for the packing-materials reference panel, swapped for a query to `item_master_materials` + `bom_entries` once built.
- **Auto stock-out trigger** (Phase 8 → Phase 9B): on `packaging_records` insert, look up BOM entries where `scale_level = 'per_box'` for that product, multiply by `num_boxes`, insert corresponding `stock_movements` rows. Implement as a service-layer hook, not frontend logic — the packaging worker never sees this happen. Per-container materials (angle boards, pallets, clips, strapping rolls) do NOT auto-deduct here; they wait for the future Container Loading phase.
- **Current stock is always computed**, never a stored column (`SUM(quantity) GROUP BY material_id` over `stock_movements`) — avoids sync issues. Add a materialized view only if performance ever becomes a concern; unlikely at ~500 farmers / one 4-month season.
- ~~**Supplier autocomplete for POs** (Phase 12): a denormalized `suppliers` reference table built from previously used supplier names/addresses/GST — not a full supplier master, just autocomplete data.~~ ⚠️ **DROPPED (2026-08-11)** — Phase 12 is out of scope, do not build.
- ~~**Amount in words** (Phase 12 PO): use a standard Indian-numbering library (Lac/Crore format, not Million/Billion) — e.g. an `num-words`/`number-to-words`-style package with Indian locale support.~~ ⚠️ **DROPPED (2026-08-11)** — Phase 12 is out of scope, do not build.
- ~~**PO PDF generation** (Phase 12): server-side templating (e.g. Puppeteer HTML→PDF, or a lighter library like `pdfkit`), matching the Excel's PO layout exactly (letterhead, supplier block, line items, tax breakdown, amount in words, signature block).~~ ⚠️ **DROPPED (2026-08-11)** — Phase 12 is out of scope, do not build.
- **Pre-cooling partial save** (Phase 11): `out_time`/`out_berry_temp` are nullable; the UI shows a "Complete" action on records that only have in-time data, letting the worker fill in the rest later without creating a duplicate record.
- **No offline mode in v1**, but keep every form simple enough to retrofit — field workers on weak rural networks are a foreseeable pain point for a future iteration.
- **No external integrations** in the current scope (no GrapeNet upload, no bank/payment gateway, no accounting sync) — clean, exportable data is the requirement (Open Question #2), not a live integration.
- **Timestamps everywhere** (`created_at`/`updated_at` on every table) — required for the audit-trail/traceability rebuild (R30): from any harvest record you should be able to walk back through contract → lab → QC → plot → farmer without ambiguity.

---

## 10. The status state machine

*(This is the section that carries the state-machine diagram; a 2026-08-11 update instruction referred to it as "Section 8" — that section is actually "Key decisions & rationale," Section 8 above. Updating here, the correct location, and flagged in the change report.)*

Everything downstream flows through `season_registrations.status`. Full diagram (including the Arrival QC Failed branch, and future-phase placeholders through dispatch) is in `PHASE_MAP.md` Section 4 — short version:

```
Registered → Field QC Passed/Failed → Lab Passed/Failed → Under Contract
  → Harvested (partial) → Weighed → Arrival QC Passed/Failed → Packed
  → Palletised → Finished Goods QC Passed/Failed → Pre-Cooled
  → (future: Container Loaded → Dispatched/Invoiced)
```

**Position of Finished Goods QC confirmed 2026-08-11** (was a future/unplaced status): it sits between Palletised and Pre-Cooled, not after Pre-Cooled as an earlier draft speculated. `'Finished Goods QC Passed'` and `'Finished Goods QC Failed'` are now real values in the `season_registrations.status` enum, not future placeholders. Exact QC parameters (the `finished_goods_qc` table's fields) are still TBD pending a CEO document — see `PHASE_MAP.md` Section 7.

Failed states are not dead ends — Field QC, Lab, and (per the Section 8 resolution) Arrival QC all support a follow-up record without deleting the failed one, resetting status back to re-attempt the gate. Whether Finished Goods QC Failed supports the same follow-up pattern is not yet specified — flag as a gap alongside the pending field-level design.

Standalone flows: **Pallet** — Created → Pre-Cooled → Dispatched. ~~**Purchase Order** — Draft → Issued → Completed.~~ ⚠️ **DROPPED (2026-08-11)** — module out of scope, no longer applicable.

---

## 11. Files in this repository

```
CLAUDE.md              — This file: master project context, decisions, rationale, technical notes
PHASE_MAP.md            — Phase table, full data model, ER diagram, status flows, role matrix, reference/seed data
Business_Rules.md       — 56 confirmed business rules (R1–R56), organized by topic — wins on any conflict
Open_Questions.md       — 14 numbered questions; several resolved as of 2026-08-11 (Q4, Q11, Q12, Q13) — see file for current status per item (note: the file itself still says Q4 "REOPENED" as of this writing, not yet updated to match — see change report)
```

**How to use these files:**
1. Read this file first — full narrative context, decisions, and rationale.
2. Read `Business_Rules.md` — the rules every screen must enforce; authoritative if anything conflicts.
3. Read `PHASE_MAP.md` — the phase table, full column-level data model, ER diagram, and status flows to build against.
4. Check `Open_Questions.md` before assuming an ambiguous behavior — if the CEO has answered a question since this was last updated, fold the answer back into `Business_Rules.md` and the relevant section here, per that file's own "How to Use" instructions.

---

## 12. Things to NEVER do

- Never hardcode 7% rejection — always pull from the contract
- Never delete farmer, plot, or failed QC records — soft delete / status change only
- Never let a user bypass a gate (e.g. create Contract without Lab Pass) via frontend — backend must enforce
- Never store area or pruning date on the Farmer table — these belong to Plot. (Variety no longer belongs to Plot either as of 2026-08-11 — see below.)
- ~~Never store variety on the Plot table — as of 2026-08-11, a plot can hold multiple varieties; variety is recorded per Harvest instead (`harvests.variety`), not at plot registration time.~~ **CORRECTED same day (2026-08-11):** variety is not a `harvests` column either — it's registered per plot via the new `plot_varieties` table, and `harvests` inherits it through `season_registration → plot_variety`. See the `plot_varieties`/`user_phase_access` rule below and `Business_Rules.md` R57.
- Never store MH number on the plot — it belongs to the farmer (`farmers.mh_number`). (Reversed 2026-08-11 — previously this said the opposite: MH number is plot-level only. CEO confirmation overrides the earlier APEDA-documentation-based correction; APEDA documentation still suggests plot-level registration, but Reliable Fresh operates at farmer level — follow business practice.)
- Never use `season_year` as a plain integer — always reference the `seasons` table (as of 2026-08-11; `season_registrations.season_id` FK is the pending replacement for the old `season_year` integer column — see `PHASE_MAP.md` Section 7)
- Never add farmer email, profile photo, or self-signup — farmers don't use the system
- Never use localStorage/sessionStorage in the frontend — use React state
- Never deploy on raw VPS or big cloud without a dedicated DevOps person — use Render/Railway
- Never treat `packaging_records.customer_name` or `item_master_products.customer` as plain strings going forward — both are now `customer_id` FKs into a real `customers` table (see Section 8 decision, `PHASE_MAP.md` Section 7)
- Never leave GGN number or company letterhead details hardcoded — pull from `company_settings` (see Section 8 decision, `PHASE_MAP.md` Section 7)
- Never build or expose the Purchase Order module — confirmed out of scope by CEO (2026-08-11). `purchase_orders`/`purchase_order_line_items` tables exist in the DB but are unused and slated for removal in a future migration.
- Never use `users.role` for permission checks — always check `user_phase_access`. Role is a display label only (added 2026-08-11; see `PHASE_MAP.md` Section 5/7, `Business_Rules.md` R53/R58).
- Never store variety directly on `plots` or `harvests` — variety is registered per plot via `plot_varieties` (added 2026-08-11); `harvests` inherits it through `season_registration → plot_variety`, never its own column (see `Business_Rules.md` R57).

---

## 13. Open items still to be discussed

- **Item Master field-by-field confirmation** — the three sub-catalogs (packing materials, raw materials, finished products) and their structure are scoped, but the material-consumption log during packing (worker confirms/adjusts actual quantities used vs. BOM) wasn't fully fleshed out.
- **Finished Goods QC** — position now confirmed (2026-08-11): after Palletisation, before Pre-Cooling, one check (Open Question #13 resolved). Screen-level spec / exact fields still TBD pending a CEO document.
- **Container Indent & Loading** — rules exist (R46, R47) but no screen-level spec yet.
- **Export Documents** — rules confirmed (R49–R51), screen spec should be straightforward once picked up.
- **Farmer Invoice** — calculation logic discussed (net weight × rate − deductions), deduction details pending CEO. Open Question #6.
- **Cold Room Stock** — this is a computed dashboard view (boxes packed minus boxes loaded), not a data-entry screen. Not yet designed.
- **Reports & Dashboards** — not discussed at all yet. What reports does management actually need? CEO should be asked.
- **Offline mode** — not in v1, but the PWA foundation should support retrofitting it if field workers hit connectivity issues in practice.

---

## 14. Project timeline

| Step | What | Status |
|---|---|---|
| Phase 0: Discovery | Business rules, requirements, assumptions | ✅ Mostly complete |
| Foundation docs | This file, `PHASE_MAP.md`, `Business_Rules.md`, `Open_Questions.md` | ✅ Done, consolidated to 4 files |
| CEO meeting | Answer the 14 open questions | Pending |
| Scaffolding | FastAPI backend + React frontend project setup | Next |
| SQLAlchemy models + Alembic migrations | Full data model across all scoped phases, including `company_settings` and `customers` | Next |
| Phase 1–5 build | Farmer, Plot+Field QC, Lab, Contract, Harvesting | After scaffolding |
| Phase 1–5 review | Show CEO, gather feedback, adjust | After build |
| Phase 6–8 build | Weighing, Arrival QC, Packaging | After Phase 1–5 stable |
| Phase 9–11 + 13 build | Inventory, Palletisation, Pre-Cooling, Finished Goods QC. ~~Purchase Order~~ dropped 2026-08-11 | After Phase 6–8 |
| Deployment | Push to Render/Railway, set up automated backups | When MVP is ready |

**Realistic timeline:** each build phase runs roughly a few days to two weeks depending on complexity. Full system across all scoped + eventually-scoped phases is likely 3–5 months. Grape season is Dec–April, so starting builds now targets a live system for the coming season.
