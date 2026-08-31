# Provenance Audit — Reliable Fresh Export Management System

**Purpose:** for every table, field, enum value, numeric threshold, and business rule in this codebase, trace it back to (a) a client document, (b) a confirmed CEO answer, (c) the original Excel flow chart, or (d) nothing — a decision this team made up to keep moving. (d) is not a defect in the work done so far; it's a list of questions Reliable Fresh hasn't been asked yet, or has been asked but the answering document hasn't arrived.

**Sources consulted:** `CLAUDE.md`, `PHASE_MAP.md`, `Business_Rules.md`, `Open_Questions.md`, `docs_needed.md` (the CEO-document map), the SQLAlchemy models/schemas/routers under `backend/app/`, `backend/app/core/enums.py`, and the frontend types/constants under `frontend/src/features/*/types.ts`. No `docs/` folder existed before this file — the four root-level markdown files and `docs_needed.md` are the only discovery documentation in the repo.

**Headline finding before the detail:** three of the project's own foundational documents currently disagree with each other and with the running code on a basic fact — where the MH registration number lives. See §A.1. That contradiction alone should be the first thing raised with the CEO, because every other finding below is smaller in consequence.

---

## A. INVENTED — traceable to no source

### A.1 — MH registration number: three documents disagree, and the real document that would settle it has never been seen

**What it is:** whether `mh_number` belongs to the farmer (one number, shared across all their plots) or to the plot (a farmer with 3 plots has 3 different MH numbers).

**Where it lives:**
- Code, as built: `backend/app/models/farmer.py` has **no** `mh_number` column. `backend/app/models/plot.py:51` has `mh_registration_number = Column(String, unique=True, nullable=True)` — **per-plot**, unique.
- `CLAUDE.md` §3 Discovery 8 and §12: states MH number is **per-farmer**, "CEO confirmed," reversing an earlier plot-level decision.
- `Business_Rules.md` R2, R7a (rewritten 2026-08-11): same — **per-farmer**, "✅ CEO confirmed."
- `PHASE_MAP.md` §7 (`farmers.mh_number` entry, line 283-285): same narrative, **per-farmer**.
- `PHASE_MAP.md`'s own trailing **"New information"** table (the very last section of the file, line 1149): *"MH number is per plot (3 MH numbers for 1 farmer) — Revert plots.mh_registration_number — this was correct, not farmers.mh_number — High priority — data model."*

**What we assumed:** that the 2026-08-11 "CEO confirmation round" was the last word, and wrote it into three documents in prose form. But the actual running code was never migrated to match that decision (it still has `plots.mh_registration_number`, not `farmers.mh_number`) — and a later, less-polished note in the same file that documents the CEO round says the *opposite* of the round's own conclusion, without anyone reconciling it back into the narrative sections.

**What would confirm or correct it:** `docs_needed.md`'s own priority list already names this exactly — *"APEDA/GrapeNet farm registration certificate — Ends the MH number debate definitively — shows format and whether it's per farmer or per plot"* — and flags it as **not yet received**. Until that certificate is seen, treat this as unresolved regardless of what the prose sections claim, and do not "fix" the code to match either document without it — the code currently agrees with the newer, contradicting note, which may itself be the correct read of a document someone saw but didn't cite.

---

### A.2 — Pallet ID format: two different guesses in the docs, a third format in the code, and a fourth, real, format in an actual client document

**Where it lives:**
- Code: `backend/app/api/v1/routers/palletisation.py:45-53`, `_generate_pallet_id()` produces `PAL-{YYYYMMDD}-{seq}`, e.g. `PAL-20260315-1`.
- `PHASE_MAP.md` §12.2, line 958: *"Pallet ID format: TBD... e.g. sequential number with season prefix: `2026-P001`. Exact format pending CEO input (Open Question #10)."* — a **different** guess from what got built.
- Real client document, per `docs_needed.md` line 9: `RF-54_2025-26_Packing_List.pdf` shows actual pallet IDs **`N-90` through `N-112`** — a bare letter-prefix + number, matching neither the doc's guess nor the code.

**What we assumed:** that Pallet ID format was an open, harmless placeholder (it's explicitly marked TBD in the doc, so this isn't a silent invention — Open Question #10 already exists for it). What's newly notable is that a real document confirming the actual format (`N-XXX`) **has already been received and catalogued** in `docs_needed.md`, but nobody has gone back to update `PHASE_MAP.md`'s guess or the `_generate_pallet_id()` implementation to match it. This is now a **closeable** open question, not an open one.

**What would confirm or correct it:** re-read `RF-54_2025-26_Packing_List.pdf` (already in hand) for the full `N-XXX` numbering scheme (is it sequential across all pallets ever, per-season, per-container?) and change `_generate_pallet_id()` to match before any real pallet ID is printed on a physical label and compared against what the CHA or a customer expects.

---

### A.3 — Lot ID format and *what a Lot ID actually identifies*

**Where it lives:** `backend/app/api/v1/routers/packaging.py:44-54`, `_generate_lot_id()`:
```python
base = (
    f"RF-P{harvest.season_registration.plot_id}"
    f"-{harvest.harvest_date.strftime('%Y%m%d')}"
    f"-{cust_code}-{_PACK_CODE[pack_size]}"
)
```
producing IDs like `RF-P42-20260315-NANDK-5KG-1`.

**What we assumed:** `Business_Rules.md` R31/R34 and `PHASE_MAP.md` §7 define a Lot as "one plot + one harvest day + one packing type," generated at **Packaging** (Phase 8) — that part is a real, sourced definition (Open Question #1 asked exactly this, and the packing-list document answers it, per `docs_needed.md`'s own note: *"Packing List format — answers Q1 partially"*). But the docs never actually pinned down the **format**, and the format built (`RF-P{plot}-{date}-{cust}-{pack}-{seq}`) is our own invention.

**What the real documents show instead:** `docs_needed.md` line 28, the `Lot_Creation_Format.pdf` (RF/32 Loading Sheet) shows real Lot IDs as **12-digit numbers** — `202681006331`, `202623893116` — generated **per farmer-MH entry per container**, i.e. at the Container Loading stage bridging Phase 8 → Container Loading, not at Packaging. That's a different *granularity*, not just a different format: the client's "Lot ID" is one per farmer within a specific container's load, while our `lot_id` is one per packing run at Phase 8, before a container is even indented. These may turn out to be two genuinely different identifiers that both deserve to exist (a packing-run ID and a container-manifest lot number) — or our Phase 8 `lot_id` may need to be dropped/renamed once Container Loading is built and the real Lot ID scheme is implemented there. Either way, the current code's `lot_id` is not the client's Lot ID, and nothing in the docs says so.

**What would confirm or correct it:** the same `Lot_Creation_Format.pdf` / `RF-54_2025-26_Packing_List.pdf`, read specifically for whether the 12-digit number is assigned at packing, at loading, or is actually the AGMARK CAGID reused (see A.4) — the map entry calls it *"Consignment ID = AGMARK CAGID"* for the container as a whole but describes the 12-digit numbers as "LOT IDs," which reads like two different identifiers already visible in the same document that haven't been disentangled yet.

---

### A.4 — Container/export identifiers we have real documents for but no schema at all

`docs_needed.md` catalogues real, already-received documents naming several identifier schemes that don't exist anywhere in our data model:
- **AGMARK CAGID** (e.g. `020269306762`) — used in `docs_needed.md` as the "Consignment ID" for a container's Agmark grading.
- **Container number** (e.g. `MNBU9018961`, `SUDU6290035`) — appears on the Fumigation Certificate, Shipping Bill, Seaway Bill, and Packing List, but `container_loading` isn't a built table (correctly listed as unscoped in `PHASE_MAP.md` §2), so there's nowhere for this to live yet even as a plain string.
- **Bill of Lading / Seaway Bill number** (e.g. `265947057`) and **Shipping Bill number** (e.g. `9336450`) — same, no `export_documents` table exists yet (also correctly listed as unscoped).
- **Thermograph/temp recorder ID linked to a specific pallet** (`docs_needed.md` line 27: *"thermograph recorder ID linked to a specific pallet (N-110)"*) — this is a real, confirmed per-pallet data point with no column anywhere, not even a placeholder, and no existing "unscoped" table names it either.

These aren't inventions in the sense of "we guessed wrong" — they're facts the documents already gave us that haven't been carried into `PHASE_MAP.md`'s "Deferred to future" table at all. The gap here is one of transcription, not judgment: when Container Loading and Export Documents are eventually scoped, whoever does it needs to go back to these specific PDFs rather than re-deriving field lists from the flow chart alone, or these confirmed real fields will be silently re-guessed a second time.

---

### A.5 — Arrival QC follow-up-on-fail: the docs say build it, the schema says it's impossible, and this session removed the UI that assumed the docs were right

**Where it lives:**
- `PHASE_MAP.md` §4 (status flow diagram, lines 169-173) shows `Arrival QC Failed` with *"Field Worker logs a follow-up arrival_qc row (mirrors the Field QC retry pattern...)"*.
- `PHASE_MAP.md` §9, "Resolved during phase-map review" (line 456): *"'Arrival QC Failed' status... Decision: **not a CEO question** — resolve by mirroring the Field QC follow-up pattern... when Phase 7 is actually built."* — this is the document **admitting, in its own words, that this was never asked of the client** — it's a discovery-team modeling decision, dressed up as a resolved item.
- Actual schema: `arrival_qc.harvest_id` is DB-**unique** (confirmed live against the database this session — constraint `arrival_qc_harvest_id_key`), and `record_arrival_qc()` (`backend/app/api/v1/routers/arrival_qc.py`) 409s unconditionally the moment any record exists for a harvest, pass or fail. There is no code path that could ever create a second `arrival_qc` row for the same harvest.
- This session removed a frontend "Create follow-up / re-attempt" button from `ArrivalQcDetailPage.tsx` for exactly this reason — it could only ever produce a 409.

**What we assumed:** that mirroring Field QC's retry pattern was a safe, obvious default for Arrival QC too. It wasn't checked against the actual physical process — is a truck of rejected grapes at the packhouse gate genuinely re-inspectable the way a plot can be re-visited for Field QC, or is a packhouse-arrival failure just as terminal as the unique constraint now makes it? Nobody has asked whether Field QC's retry pattern actually applies here, or whether Arrival QC failing is supposed to end that harvest's produce right there (sent back, sold elsewhere, etc.) with no software path forward at all — which is what's currently built, just never stated as a deliberate decision.

**What would confirm or correct it:** ask the CEO directly whether a failed Arrival QC batch can be re-presented for inspection (e.g., after re-sorting on the spot) or whether it's genuinely final. If re-inspection is real, `arrival_qc.harvest_id`'s uniqueness constraint is wrong and needs a migration; if it's genuinely terminal, `PHASE_MAP.md` §4 and §9 need to stop describing a retry flow that was never built and never should be.

---

### A.6 — `ScaleLevel` and `MovementType`: our own categorization, not the client's vocabulary

**Where it lives:** `backend/app/core/enums.py:116-124`.

`ScaleLevel` (`per_box` / `per_container`) is a distinction *we* introduced to decide *when* a material auto-deducts (at Packaging vs. at the not-yet-built Container Loading). The underlying facts — some materials are counted per box, others per container — come from the Excel BOM sheet (`PHASE_MAP.md` §8: "84 per container," "20/container," etc.). But the two-value enum, and the decision to gate auto-deduction timing on it, is our schema design, not something the client described in these terms. This is **already self-flagged**: Open Question #14 asks exactly *"Does this match how you track material usage, or do you reconcile everything at a different point?"* — it's open, correctly, but worth restating here because it's a structural assumption (an enum baked into the schema), not a cosmetic one — if the answer is "we reconcile everything at month-end regardless of per-box/per-container," the auto-deduction *timing* mechanism, not just a value, needs to change.

`MovementType` (`in` / `auto_out` / `adjustment`) similarly splits Business_Rules R39's two client-described movements ("Stock In" and "Stock Out") into three, inventing the `auto_out` vs `adjustment` distinction ourselves for audit-trail purposes. This is a reasonable engineering choice, not something to un-do, but it means a Stock/Inventory Manager reading a movement log sees categories the client never named — worth confirming the labels read sensibly to the person actually using them, since "auto_out" is implementation vocabulary, not shop-floor vocabulary.

---

### A.7 — `goodsReceiving`: a whole module invented from a prompt, not a document, and it duplicates Arrival QC's job

**Where it lives:** `frontend/src/features/goodsReceiving/` (Team 2). Its own type file says so directly — `frontend/src/features/goodsReceiving/types.ts:6-8`:
> *"Not a named table in PHASE_MAP.md's data model — implemented per the prompt's explicit field list, kept independent of Weighing's own calculated fields."*

Confirmed via this session's own backend audit: there is no `/goods-receiving` route anywhere in the FastAPI app, no model, no schema. It is a fully client-rendered feature with a mock API only.

**What we assumed:** that "confirm goods receipt at the packhouse" needed its own field list (`receivedCrates`, `receivedWeightKg`, `acceptedWeightKg`, `rejectedWeightKg`, `warehouseLocation`) distinct from both Weighing (Phase 6) and Arrival QC (Phase 7) — both of which already exist specifically to record what arrives at the packhouse and whether it's accepted. Nothing in `Business_Rules.md`, `PHASE_MAP.md`, or `CLAUDE.md` describes a third inspection/confirmation step here, and no document in `docs_needed.md` mentions one either.

**What would confirm or correct it:** ask whether this step is real at all, or whether it's a restatement of Arrival QC under a different name built independently by a different session with a different prompt and no visibility into the existing spec. See §D for the disposition question this raises.

---

## B. PARTIALLY SOURCED — the field is real, the values/type/formula are ours

| Enum / field | Client-sourced part | What we composed |
|---|---|---|
| `FruitColour` (Green, Milky Green, Yellow) — `enums.py:59-62` | The field itself ("fruit colour") is on the Excel Field QC sheet, per Business_Rules R15 | The exact 3-value list. "Milky Green" is specific enough that it's plausibly real, but no document has been cited confirming these are the *only* three the client's form allows |
| `OverallObservation` (Good, Very Good, Excellent) — `enums.py:65-68` | Same — field is on the Excel sheet (R15) | Same concern — 3-value list not traced to a specific document |
| `FieldQCResult` / `LabResult` / `ArrivalQCResult` (Pass/Fail only) | The pass/fail *concept* is throughout Business_Rules (R16, R20, R29) | Binary-only is a natural assumption but unconfirmed — no document rules out a third state (e.g. "conditional pass") |
| `PalletStatus` (`created`, `pre_cooling`, `dispatched`) — `enums.py:127-130` | The pre-cooling gate itself (R45) is sourced | The specific 3-state machine and its string values are our design; `PHASE_MAP.md` §4's "Pallet status flow" presents `Created → Pre-Cooled → Dispatched` as settled, but note the code enum literally says `pre_cooling` (in progress) where the doc's diagram says `Pre-Cooled` (done) — a naming slip worth resolving even if the intent is right |
| `weighing_records` / `arrival_qc` quality percent fields (thrips %, bhuri %, black spot %, cercospora %) | Field names and the fact that they're percentages — sourced, Excel-derived, confirmed via the weighing-slip precedent for the adjacent fields | No document specifies valid ranges/precision (e.g. is 0–100 with 2 decimals right, or does the client's form use whole numbers, or a different scale like "marks out of 10"?) |
| `packaging_records.pack_size` / `compliance_type` stored as plain strings, not the `PackSize`/`ComplianceType` enums | The three pack sizes and two compliance types are Excel-sourced (§8) | Storing them as unconstrained strings rather than DB enums is our own looseness, not a client fact — worth tightening once Phase 9A's `item_master_products` is the live source of truth (`PHASE_MAP.md` §11.6 already flags migrating `customer_name` this way; `pack_size`/`compliance_type` weren't included in that migration note but have the same issue) |
| `item_master_materials.reorder_point` | The concept — "manager-set minimum stock level" — is sourced (R40) | Correctly built with **no** default (`backend/app/models/inventory.py:50`, nullable) — the manager sets it per material. This is the one item in this table that is *not* a risk: flagging it here only to show the contrast with the entries above, where a default or fixed value was assumed instead of left open |

---

## C. SPECIFIED BUT NOT BUILT

- **`RegistrationStatus` enum is missing `Finished Goods QC Passed` / `Finished Goods QC Failed`.** `backend/app/core/enums.py:32-56` — the enum's own docstring says these are *"explicitly (future) placeholders... not added here until those phases are actually scoped."* But `CLAUDE.md` §10 states, in the present tense: *"'Finished Goods QC Passed' and 'Finished Goods QC Failed' are now real values in the `season_registrations.status` enum, not future placeholders."* One of these two statements is simply wrong about the current state of the code — confirmed by reading the enum directly, `CLAUDE.md` is the one that's stale.
- **`finished_goods_qc` table** — confirmed absent from `app/models/`, `app/schemas/`, and `app/api/` entirely (grepped, zero matches). `PHASE_MAP.md` §7 already flags this as "pending design, fields TBD," so this isn't a new finding — restated here only because `CLAUDE.md`'s Discovery 10 note is easy to misread as claiming otherwise if read in isolation from the enum check above.
- **`seasons.season_id` FK on `season_registrations`, `plot_variety_id` FK** — `PHASE_MAP.md` §7 explicitly labels these "PENDING, not yet built" (the code still uses the legacy `season_year` integer and direct `plot_id`, per this session's own confirmation earlier). Not a discrepancy — just restating the doc's own honest flag so it's in one place with everything else.
- **Container Indent's 3-step CHA handoff (R46)** — described in prose with no screen-level spec and, per `PHASE_MAP.md` §2, "no screen-level spec" at all. `docs_needed.md` shows real documents exist that would inform this (Shipping Bill, Seaway Bill both reference container allocation) but haven't been mapped to R46's 3 steps specifically.

---

## D. BUILT BUT UNSCOPED

- **`goodsReceiving`** (frontend only, no backend) — see A.7. This is the clearest case: built, working (in mock mode), appears in the nav, and is absent from every discovery document. Needs an explicit decision — kept, merged into Arrival QC, or removed — not just left running silently alongside the phase it duplicates.
- **`purchase_orders` / `purchase_order_line_items` tables** — not "unscoped" so much as *explicitly de-scoped* (Phase 12 dropped, CEO-confirmed, per `Open_Questions.md` Q12) but the tables and their columns are still live in the database schema, unused. Listed here only because "built but with nowhere in the current phase map" technically describes them too, even though the reason is documented (unlike goodsReceiving, where the reason for existing is not documented anywhere).

---

## E. DOCUMENTS TO REQUEST

Grouped by what they'd unblock, ranked within each group by how much the answer could change the schema if it differs from our current guess.

### Unblocks: MH number (A.1) — **highest priority, contradicts itself across 3 documents**
1. **APEDA/GrapeNet farm registration certificate** — already named as the #1 need in `docs_needed.md`. If it shows plot-level registration, `plots.mh_registration_number` (current code) is right and `CLAUDE.md`/`Business_Rules.md`/`PHASE_MAP.md`'s prose sections need correcting, not the code. If it shows farmer-level, the code needs a migration back to `farmers.mh_number` and `PHASE_MAP.md`'s own trailing note needs retracting. **Schema impact if wrong: high** — either direction requires an `alembic` migration, and every place that displays or searches by MH number (`farmers.py` search, `plots.py`) needs to change together.

### Unblocks: Palletisation & Lot ID (A.2, A.3) — **already-received documents, just not read for this purpose yet**
2. **Re-examine `RF-54_2025-26_Packing_List.pdf`** specifically for the `N-XXX` pallet numbering rule (sequential? reset per season? per container?). **Schema impact: medium** — changes `_generate_pallet_id()`'s format string only, no column changes, but matters the moment a physical pallet label needs to match what a customer or CHA expects.
3. **Re-examine `Lot_Creation_Format.pdf` (RF/32 Loading Sheet)** specifically to separate "Lot ID" from "Consignment ID/CAGID" — are these the same 12-digit number reused, or two different identifiers that both need columns once Container Loading is built? **Schema impact: medium-high** — determines whether Phase 8's `lot_id` survives as-is, gets renamed, or gets replaced by a new identifier generated later in the pipeline.

### Unblocks: Finished Goods QC (Phase 13) — **CEO already promised this document**
4. **Finished Goods QC format/checklist** — `docs_needed.md` lists this as the #1 outstanding high-priority item, already promised. Nothing in this codebase can move on Phase 13 without it. **Schema impact: high** — the entire `finished_goods_qc` table is currently zero columns beyond a placeholder PK; every field in it is presently a guess that hasn't even been written down as a guess, because there's nothing to guess from yet.

### Unblocks: Farmer Invoice — **we have the wrong side of the transaction**
5. **A real farmer payment voucher/invoice** (money Reliable Fresh pays *out*) — `docs_needed.md` is explicit that `RF-54_Sale_Account.pdf` (the N&K Sales Account) is money coming **in** from the customer, not what gets paid **out** to the farmer. Business_Rules R48 already has a formula (`net_weight_kg × rate_per_kg`, no other deductions) confirmed by the CEO in the negative (Open Question #6resolved — no extra deductions) — but a formula with no reference document to check it against is still an untested formula. **Schema impact: medium** — the calculation is simple and already agreed; the document mainly confirms formatting/fields for the `farmer_invoices` table that doesn't exist yet (farmer bank details reference, deduction line display even if the line is always zero, etc.).

### Unblocks: Container Loading / Export Documents — **rich real documents already in hand, not yet mapped to schema**
6. **No new document needed — this is a reconciliation task**, not a document request: `docs_needed.md` already has the Fumigation Certificate, Phytosanitary Certificate, Shipping Bill, Seaway Bill, Certificate of Origin, Certificate of Conformity, and AGMARK certificate on file (see A.4). The work here is going back through those PDFs to build the `container_loading` and `export_documents` column lists directly from real formats, instead of waiting for a document that already arrived. **Schema impact: high, but the raw material already exists** — flagging this because it's cheaper to close than anything else on this list.

### Lower priority — confirm, don't block on
7. **Any physical Field QC / Arrival QC form** showing the actual dropdown options for Fruit Colour and Overall Observation (B) — low schema impact (3-value enums, easy to extend), but cheap to confirm and removes two silent guesses.
8. **A page of the Item Master / BOM sheet mentioning "Donnage Bag"** — confirms it as a real `MaterialType` value (currently missing entirely from the 10-value enum) and, ideally, which product combinations use it. **Schema impact: low** (one enum value) but currently a flat-out gap, not a guess — the material is named in `PHASE_MAP.md`'s own notes as real and simply hasn't been added.
9. **Confirmation on whether Arrival QC failure is genuinely terminal** (A.5) — not a document so much as a direct question, since `PHASE_MAP.md` itself admits this was never asked. **Schema impact: high if the answer is "no, it should be retriable"** — would require dropping the `arrival_qc.harvest_id` unique constraint and rebuilding the follow-up flow this session just removed.
