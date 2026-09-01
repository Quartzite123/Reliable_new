# Open Questions — Pending CEO Confirmation

These items are currently built on best-guess assumptions (see corresponding rule numbers in `Business_Rules.md` and phase specs). None of them block development. Resolved items are marked ✅ with date; fold future answers back the same way.

*(2026-08-11: Phase 12, referenced in earlier revisions of this line as part of "Phases 1–12," is dropped — see Q12 below. Phase 13, Finished Goods QC, was added the same day — see Q13 below.)*

*(2026-09-01: Q15 added — Export Documents' attachment model, following the CEO's confirmation of that module's scope. See `PHASE_MAP.md` Section 7 for the scope write-up.)*

*(2026-09-02: Q16 added — a pre-existing conflict in `PHASE_MAP.md` between the "MH number is farmer-level" narrative (Section 7) and the "MH number is per plot" finding (tail "New information" section) was found during doc review, marked in both places, and recorded here rather than silently resolved either way.)*

---

## Original Questions (from Phase 0 Discovery)

1. **Lot ID rule** — Confirm: one plot + one harvest day + one packing type = one Lot?

2. **GrapeNet / APEDA / GlobalG.A.P.** — Confirm a manual-entry-friendly system (good export tables/formats a worker can copy into the GrapeNet portal) is sufficient for now, with no direct system integration required.

3. **Harvest frequency** — Is one plot typically harvested once per season, or in multiple rounds? (System supports either; this just sets expectations for staff.)

4. **Multiple varieties per plot** — ⚠️ **REOPENED (2026-08-11):** The Aug 2026 resolution below assumed one plot = one variety. New CEO-confirmed information shows this is incorrect: a plot can contain multiple grape varieties, and variety is recorded at harvest time (`harvests.variety`), not at plot registration. `plots` has no variety column as of 2026-08-11. See `Business_Rules.md` R7 (rewritten), `CLAUDE.md` Discovery 3 (rewritten), `PHASE_MAP.md` Section 7.
   *~~Previous resolution (Aug 2026), now superseded:~~ "A farmer can grow multiple varieties, but one plot has one variety. Multiple varieties = registered as separate plots, exactly as built. Also reconfirmed: a farmer can own multiple plots (R4). No system change needed." — kept for history; no longer correct.*
   *Note on status wording: this item is marked REOPENED rather than given a fresh RESOLVED tag, per the instruction that produced this update — even though the other three documents (`CLAUDE.md`, `PHASE_MAP.md`, `Business_Rules.md`) now state the multi-variety reality as settled fact. Flagged as a minor cross-document inconsistency worth the user's attention: is this genuinely still open pending further CEO detail, or should it be marked RESOLVED like Q11–Q13 below?*

5. **Rejection excess handling** — ✅ **RESOLVED (Aug 2026):** Rejection up to the contracted % (default 7%) is on the farmer's account (standard deduction at Weighing). Rejection beyond the contracted % is **absorbed by the exporter** — the farmer is never charged extra. The actual-rejection tracking in Packaging is management loss-visibility only. Backend already works this way; Farmer Invoice (future phase) must compute payable from contract-% net weight only. Rules updated: R28, R48.

5a. **Rejection percentage variability** — ⏳ Still open: is 7% a fixed company-wide figure, or genuinely negotiated per farmer/contract? (System supports per-contract values with a 7% default either way — this only affects office guidance.)

6. **Farmer Invoice deductions** — Besides the rejection %, what other deductions apply (transport, crates, etc.)?

7. **Customer-specific report formats** — Do any customers (OFD, Roveg, FS, N&K, MASCL, Boonkee) require shipment/traceability data in their own specific format?

8. **Role structure** — Confirm the 5-role structure: Admin, Office Worker, Field Worker, Lab Worker, Stock/Inventory Manager.

9. **Palletisation and Pre-Cooling role assignment** — Who physically handles palletisation and pre-cooling at the packhouse? Is it the Office Worker, a dedicated packhouse worker, or someone else? (Currently assumed to be Office Worker.)

---

## New Questions (from Phase 9–12 Scoping)

10. **Palletisation workflow** — How does palletisation work on the floor? Does the packing worker stack boxes onto pallets as they pack (continuous action), or does someone organize packed boxes into pallets as a separate step? Can a pallet contain boxes from different lots/farmers/varieties? How are Pallet IDs assigned currently — numbered labels, stickers, or informal? Does palletisation need its own screen, or can it be folded into the packaging step?

11. **Packing material ordering** — ✅ **RESOLVED (2026-08-11):** Pattern C confirmed — bulk pre-season order placed before season starts, plus weekly top-up orders during the season as stock runs low. Makes the Phase 9C Order Calculator a genuine must-have for the pre-season bulk order. Rule updated: none directly (no numbered rule existed for this); reflected in `PHASE_MAP.md` Section 12.1.

12. **Purchase Order scope** — ✅ **RESOLVED (2026-08-11):** PO module dropped entirely. No fertilizers. No formal PO process needed. CEO confirmed there are no fertilizer purchases at all — the question of whether packing-material ordering shares the same formal process is moot, since the formal process itself (Phase 12) is out of scope. `purchase_orders`/`purchase_order_line_items` tables remain in the DB, unused, pending removal in a future migration. Rules updated: R43 (voided), R52 (role list). See `PHASE_MAP.md` Phase 12 (marked DROPPED), `CLAUDE.md` Section 12.

13. **Finished Goods QC / Cold Storage Exit QC** — ✅ **RESOLVED (2026-08-11):** Finished Goods QC happens after palletisation, before pre-cooling. One check only (not two) — the earlier "Cold Storage Exit QC" wording in R21 described the same stage, not a separate one. Exact parameters (which fields, pass/fail criteria) are still pending a CEO document — the `finished_goods_qc` table is a placeholder only. Rule updated: R21. See `PHASE_MAP.md` Section 4 (status flow) and Section 7 (`finished_goods_qc` table), new Phase 13.

14. **Per-box vs. per-container materials** — Some packing materials scale per box (liner bags, puneets, pouches, grape guards, stickers) and some scale per container (angle boards = 84, pallets = 20, clips = 254, strapping rolls = 4). Current design auto-deducts per-box materials when packaging is recorded, and per-container materials when a container is loaded. Does this match how you track material usage, or do you reconcile everything at a different point?

---

## New Questions (Reports & Export Documents scoping, 2026-09-01)

15. **Export document attachment model** — CEO confirmed the scope of the new `reports_documents` phase (`PhaseKey.REPORTS_DOCUMENTS`, added 2026-09-01 — see `PHASE_MAP.md` Section 5 and Section 7, `CLAUDE.md` §6): it gates the real export document images/files per shipment — fumigation certificate, phytosanitary certificate, certificate of origin, AGMARK, packing list, and other shipment-specific certificates. These attach to specific entities (a pallet, a container, a shipment — clicking through to one of those should show its documents), stored in Cloudinary the same way every other upload in this system already is. Access is phase-gated.

    This is confirmed *scope*, not a design — no schema exists yet, deliberately, until these are answered:
    - **Which entity does each document type attach to?** A pallet? A container? A shipment (a concept with no table yet — `container_loading`/`export_documents` are both still unscoped as tables)? Different document types plausibly attach at different levels — e.g. a packing list might be per-lot while a certificate of origin is per-container.
    - **Is it one document per type, or many?** Can a shipment have multiple phytosanitary certificates (reissued, corrected), or is each type strictly 1:1 with its parent entity?
    - **Who uploads them?** System-generated (like the packing list plausibly could be), Office Worker upload after receiving the physical/digital certificate from a certifying body, or a mix depending on document type?
    - **Are they needed before or after shipping?** Some (packing list) are plausibly available pre-shipment; others (phytosanitary, fumigation) are issued by external authorities and may only exist close to or after departure. This decides whether "document complete" ever gates a status transition the way QC stages do, or whether it's purely a reference attachment with no gating behavior at all.

---

## New Question (data-model conflict found during doc review, 2026-09-02)

16. **MH registration number — farmer-level or plot-level?** `PHASE_MAP.md` Section 7 narrates a 2026-08-11 "CEO confirmed" decision that MH number moved to the farmer (`farmers.mh_number`). The document's own tail "New information" section says the opposite — MH number is per plot, three per farmer, and that the farmer-level move should be reverted. These two sections directly contradict each other, and neither has been reconciled. **The live code follows the per-plot version**: `backend/app/models/farmer.py`'s `Farmer` class has no `mh_number` column at all; `backend/app/models/plot.py`'s `Plot` class has `mh_registration_number` (unique, nullable) — confirmed by reading both files. That the code currently agrees with the "New information" row is not the same as that row being confirmed correct; it was never checked against Section 7's conflicting claim. **Marked, not resolved** — pending an APEDA registration certificate from the client, which should settle definitively whether MH registration is issued per-farmer or per-plot. See `PHASE_MAP.md` Section 7 (`farmers`/`plots` table definitions) and the "New information" section, both flagged with matching conflict notes as of 2026-09-02.

---

## How to Use This Document

When the CEO confirms an answer:
1. Update the relevant Business Rule in `Business_Rules.md`
2. Update the relevant phase spec in `PHASE_MAP.md` *(the `TEMP_Phase01-05_Draft.md`/`TEMP_Phase06-08_Draft.md`/`TEMP_Phase09-12_Draft.md` files this step used to point to were folded into `PHASE_MAP.md` and removed during the 2026-08-07 directory cleanup — reference removed 2026-09-02, they no longer exist)*
3. Mark the question as resolved here with the answer and date
4. If the answer changes a working assumption, flag any code that was built against the old assumption
