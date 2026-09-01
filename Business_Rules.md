# Business Rules — Reliable Fresh Export Management System

Status: **Frozen v1.4** (v1.3 + 2026-08-31 founder confirmation: rejection is a FIXED 7% company-wide, not a per-contract negotiated term and not capped/split against actual observed rejection — supersedes the "farmer absorbs up to contract %, exporter absorbs the rest" reading (R24, R28, R48 rewritten). v1.3 was: same-day follow-up, 2026-08-11: multi-variety plots corrected — variety lives on `plot_varieties`, not `harvests` as v1.2 said (R7, new R57), permissions are now phase-based via `user_phase_access` (R53 rewritten, new R58), farmer search fixed to include MH number (R3), Farmer Invoice formula clarified — no deductions beyond the contract-rejection cap (R48, now itself superseded, see above), Q4 is RESOLVED not reopened. v1.2 was: CEO confirmation round, 2026-08-11: Season Management is now a real module (R55), MH number reversed back to farmer-level (R2, R7a), multi-variety plots reversed (R7), Packaging Supervisor role added (R56), Purchase Order module dropped, Finished Goods QC position confirmed (R21); remaining open items in `Open_Questions.md` — note that file still says Q4 "REOPENED", not yet updated to match)
Last updated: 2026-08-31, founder confirmation on the rejection percentage (previously: 2026-08-11 same-day follow-up round; before that, 2026-08-11 CEO confirmation round; before that, Aug 2026 CEO answers on variety-per-plot and rejection-split; originally from Phase 0 discovery sessions)

These rules describe how the business actually operates. They are the foundation for all data model, API, and UI decisions. If code and this document disagree, this document wins until it is deliberately updated.

---

## 1. Farmer & Plot

1. A farmer is a real person. The system stores one **permanent** record per farmer, no matter how many seasons they participate.
2. ~~Each plot must have a unique mh_registration_number (APEDA plot-level registration). No MH identifier exists at the farmer level.~~ **REWRITTEN 2026-08-11 — reversed:** A farmer has a unique MH registration number (`mh_number`). This is a farmer-level identifier. No MH identifier exists at the plot level. ✅ **CEO confirmed** (2026-08-11): this reverses the previous plot-level rule, which was based on APEDA/NRC Grapes documentation research — CEO confirmation overrides that research; Reliable Fresh's actual practice is one MH number per farmer.
3. ~~A farmer can be searched by name or mobile number.~~ **UPDATED 2026-08-11:** A farmer can be searched by name, MH number, or mobile number.
4. A farmer can own one or more plots. A plot belongs to exactly one farmer.
5. Each plot has a unique plot number within that farmer's records.
6. Each plot stores its own location details (village, taluka, survey/gat number, area in acres, GPS if available) and its own agricultural details (pruning date, expected harvest date). Tree count is not tracked. **Variety removed from this list 2026-08-11 — see rewritten R7.**
7. ~~A plot is associated with one grape variety at a time. A farmer can grow multiple varieties, but each variety is registered as a **separate plot**. ✅ CEO confirmed (Aug 2026): one plot = one variety...~~ **REWRITTEN 2026-08-11, corrected same day:** A plot may contain multiple grape varieties. This reverses the Aug 2026 resolution above. ✅ **CEO confirmed, RESOLVED** (`Open_Questions.md` Q4 — settled, not open; see R57 for how this rewired the pipeline). *Same-day correction:* an earlier pass of this rule said the variety is recorded on the harvest record (`harvests.variety`) — that was wrong. Variety is registered on the plot via the `plot_varieties` table, and each variety gets its own independent registration/QC/lab/contract/harvest pipeline. Neither `plots` nor `harvests` has a variety column. See R57.
7a. ~~The MH registration number is a plot-level APEDA identifier only. It must never be stored or referenced at the farmer level.~~ **REWRITTEN 2026-08-11 — reversed accordingly:** The MH registration number is a farmer-level identifier only (see rewritten R2). It must never be stored or referenced at the plot level.
7b. Farmer search must tolerate spelling mistakes in names — search should return likely matches (not just exact matches) for the worker to confirm, rather than relying on exact text matching.
8. If a farmer stops working with the company, their record is marked **inactive**, never deleted. It can be reactivated later.
9. A farmer must exist in the system before they can be registered for any season.
10. Registering a farmer for a season does not modify the farmer's permanent record — it creates a new seasonal registration record linked to the farmer. Previously stored details (name, plot address) auto-fill on re-registration but remain editable by the field worker if something has changed.

## 2. Seasonal Registration & Field QC

11. ~~A "Season" is identified simply by year (e.g., "2026"). There is no separate Season module — every registration, QC, contract, and harvest record is tagged with a season year.~~ **REWRITTEN 2026-08-11 — reversed, see new R55:** A season is a real, admin-managed entity with a name, start date, and end date. Only one season can be active at a time. Every registration is tagged with a season via `season_id` (FK to `seasons` — pending, replaces the old plain `season_year` integer). See R55.
12. A farmer's plot can be registered only once per season. A plot's harvest is tied to that specific plot's seasonal registration; farmer name/code travels as attached info on the plot/lot record.
13. Once a season's registration is submitted, a Field QC visit must happen before any lab sample is sent.
14. Field QC is performed **per plot**, not per farmer. A farmer with 3 plots gets 3 independent Field QC visits/results.
15. Field QC records who inspected (field worker login), date, and quality observations matching the Excel format (fruit colour, TSS/sugar %, thrips mark %, bhuri %, black spot %, cercospora spot %, overall plot observation, average exportable fruit quantity %). The field worker can also add free-text notes for anything unusual.
15a. Plot Registration and Field QC are presented to the Field Worker as **one combined screen** (matching how the source Excel already groups plot header info with QC observations) — this is a UI simplification only; the underlying data model still keeps Plot and Field QC as separate records, since a plot persists across seasons while a new QC record is created each time.
15b. **Field ownership principle:** every field is entered by whoever actually observed it. The Field Worker owns anything about the land, the plot, and visual crop inspection. The Lab Worker owns anything about the test and the physical sample. Reference details a lab worker didn't personally observe (e.g. GPS location, taluka, survey number) are passed to them as read-only info from the Plot record, never re-entered by the lab worker.
16. Field QC has a pass/fail outcome. A failed plot does not proceed to lab sampling or contract for that season. **Failed records are kept, not deleted**, for audit/history purposes.
17. A failed Field QC can be followed up later in the same season — the field worker logs a new inspection visit; it is not a permanent rejection.
18. Only after Field QC passes can a lab sample be created for that plot.
19. Lab sampling is performed per plot, not per farmer.
20. The lab result (pass/fail, TSS value, MRL report) must be recorded before a Farmer Contract can be created for that plot. Only proceed to contract if passed.

## 3. Multi-Stage QC, Contract & Harvest

21. Quality checks happen at **three distinct stages**, each recorded separately and linked to the same plot/lot:
    - **Field QC** — at the plot, before harvest
    - **Arrival QC** — when harvested goods reach the packhouse
    - **Finished Goods QC** — ~~Cold Storage Exit QC — when goods leave cold storage before dispatch~~ **REWRITTEN 2026-08-11 (position confirmed, resolves the old ambiguity):** Finished Goods QC (QC stage 3) happens AFTER palletisation and BEFORE pre-cooling. It is a check on the packed and palletised boxes before they enter the cold room — not a check on exit from cold storage as the earlier "Cold Storage Exit QC" wording implied. This is one check, not two (`Open_Questions.md` Q13, resolved). Exact parameters TBD pending CEO document.
22. Each QC stage is linked to the same plot/lot so a full quality history can be traced from plot to shipment.
23. A Farmer Contract can be created only after Field QC passed AND the lab result passed for that plot.
24. ~~A Contract stores the agreed rate per kg and the agreed rejection percentage (defaults to 7%, editable per contract). Whether the percentage varies per farmer or is a fixed company-wide 7% remains open (Open Question #5a).~~ **REWRITTEN 2026-08-31 — resolves Open Question #5a:** A Contract stores the agreed rate per kg only. Rejection is **not** a contract term — it is a fixed 7% company-wide rate, ✅ **founder-confirmed**, with no per-farmer or per-contract negotiation. The `contracts.rejection_percent` database column still exists (always defaults to 7.00) but is no longer read by any calculation, and the contract creation form no longer asks for it. See rewritten R28.
25. Harvesting is recorded per plot, with harvest date and field team involved.
26. A single plot may have more than one harvest record in a season (multiple picking rounds are supported, not forced to one).
27. After harvesting, a Weighing Record is created: gross weight, rejection percentage applied, net accepted weight.
28. ~~Rejection cost split — ✅ CEO confirmed (Aug 2026): Rejection up to the contracted percentage (default 7%) is deducted from the farmer's payable — the standard deduction applied at Weighing. Rejection beyond the contracted percentage is absorbed by the exporter — the farmer is never charged extra, regardless of actual rejection found at packing. The system still records actual rejection at Packaging and flags when it exceeds the contract percentage — but this flag is management loss-visibility information only, never a farmer deduction.~~ **REWRITTEN 2026-08-31 — ✅ founder-confirmed, supersedes the Aug 2026 reading above:**
    - The farmer is **always** paid on 93% of net weight. The rejection deduction is a **fixed 7%**, with no negotiation and no per-contract override.
    - There is no MIN() against actual observed rejection and no farmer/exporter split — actual observed rejection (whether 4% or 9%) makes **no difference** to what the farmer is paid.
    - Actual observed rejection is still captured — at Weighing (`weighing_records.actual_rejection_pct`) and at Packaging (`packaging_records.actual_rejection_pct`, from a separately entered `actual_rejection_kg`) — as real operational/quality data, but it is informational only and never affects the payable amount.
29. Arrival QC happens after Weighing, when goods physically reach the packhouse.
30. Every stage (Field QC, Lab, Contract, Harvest, Weighing, Arrival QC) is timestamped and tied back to the same Plot + Season, so a full timeline can be reconstructed for any batch.

## 4. Packaging & Item Master

31. Once Arrival QC passes, goods move to Packaging. Packaging is recorded per **Lot** (defined as: one plot + one harvest day + one packing type).
32. Each customer (OFD, Roveg, N&K, FS, MASCL, Boonkee, etc.) has its own packing specification (box type, liner bag, puneet, pouch, grape guard, angle board, sticker), stored in the Item Master.
33. When packing a lot, the worker selects the customer and variety/pack-size, and the system presents the correct materials from that customer's Item Master spec via a table/dropdown — the worker does not need to memorize each customer's spec.
34. Each packed box receives a Lot ID, linking back to plot, farmer, and full QC/lab history.
35. Boxes are grouped into pallets during Palletisation. A pallet may contain boxes from more than one lot; the system tracks exactly which lots are inside each pallet for traceability.
36. Item Master entries include the unit of measure for each material (pieces, kg, rolls, etc.).

## 5. Bill of Material (BOM) & Packing Material Inventory

37. The BOM defines how much of each packing material is needed per container, per customer/variety/pack-size combination (matching the Excel Bill of Material sheet structure).
38. When a container is planned/confirmed, the system calculates required materials from the BOM and compares against current stock (Total needed − stock on hand = quantity to order).
39. Packing material stock has two movements: **Stock In** (materials purchased/received) and **Stock Out** (auto-deducted when a container is packed, based on BOM).
40. Each material type has a manager-set minimum stock level (reorder point).
41. When a material's stock falls below its reorder point, the system alerts the **Stock/Inventory Manager**.
42. Stock records track the specific material variant (e.g., "Stayro Foam box, 4kg") and quantity used — not a generic material count.
43. ~~A Purchase Order can be raised (manually or system-suggested) when stock is low, referencing the Item Master/supplier. The Purchase Order format is general-purpose (covers packaging material, fertilizer, and other supplier purchases) — scope for Phase 1 build (packaging-only vs. all purchasing) is pending Open Question #8.~~ **VOID — 2026-08-11.** CEO confirmed no fertilizer purchases and no formal PO process needed; the Purchase Order module is dropped entirely. Low-stock alerts (R41) stand on their own — ordering happens outside the system. (Note: this rule's "Open Question #8" reference was itself a pre-existing mismatch — #8 is the role-count question, not PO scope, which was actually #12 — flagged for the record, not corrected further since the rule is void regardless.)

## 6. Pre-Cooling & Dispatch

44. Pre-Cooling is recorded per lot/pallet: berry temperature in, berry temperature out, time in cold storage.
45. Goods cannot be dispatched/loaded into a container until Pre-Cooling is completed and Cold Storage Exit QC has passed.
46. Container Indent is a 3-step handoff:
    - **Request** — office raises internal request for containers needed (quantity, customer/order, date)
    - **Allocation to CHA** — request sent to the Customs House Agent (CHA), an external party who books the actual shipping
    - **Allocation by CHA** — CHA confirms container number, vessel, and loading cutoff date/time back to the office (recorded manually — CHA does not get a system login)
47. Container Loading records exactly which pallets/lots go into which container — the final link in the traceability chain: container → pallet → lot → plot → farmer.
48. ~~Once a container is loaded, a Farmer Invoice is generated per farmer whose produce is in that shipment: `(net accepted weight × contract rate) − applicable deductions = amount payable`, where net accepted weight already reflects the contract rejection percentage only (excess rejection is the exporter's loss, per R28). Other deductions (transport, crates, etc.) pending Open Question #6. UPDATED 2026-08-11: Farmer payment = `net_weight_kg × rate_per_kg`. Net weight already accounts for rejection capped at the contracted percentage (default 7%). No other deductions apply — no transport, crates, advances, or any other charges. The farmer absorbs up to 7% of crop value as rejection; the exporter absorbs anything beyond that (consistent with R28). This resolves Open Question #6 in the negative — there are no deductions beyond the contract-rejection cap.~~ **REWRITTEN 2026-08-31 — supersedes the 2026-08-11 reading above (see rewritten R28):** Farmer payment = `net_weight_kg × rate_per_kg`, where `net_weight_kg = total_weight_kg × 0.93` — a fixed 7% deduction. There is no longer a "contracted percentage" to cap against, since rejection is not a contract term. No other deductions apply — no transport, crates, advances, or any other charges.

## 7. Export Documents & Roles

49. Five export documents are tracked per shipment: Custom Invoice, Fumigation Certificate, Phytosanitary Certificate, Insurance Certificate, Certificate of Origin.
50. These documents are issued by external authorities/agencies. The system's role is to track status (pending/received), store the certificate/reference number, and store the file if available — not to generate the legal document itself.
51. A shipment cannot be marked "fully ready to export" until all 5 documents are marked received.
52. ~~Five roles at launch~~ **Six roles as of 2026-08-11 (was five)**:
    - **Admin** — full access, manages users and permissions
    - **Office Worker** — registration, contracts, invoices, reports (no longer includes Palletisation as of 2026-08-11 — see R56)
    - **Field Worker** — plot registration, Field QC, harvesting
    - **Lab Worker** — sampling, lab results only
    - **Stock/Inventory Manager** — packing material low-stock alerts (no longer includes purchasing as of 2026-08-11 — the Purchase Order module was dropped, R43 below)
    - **Packaging Supervisor** *(added 2026-08-11)* — palletisation only; read access to packaging records and harvest context. See R56.
53. ~~Login uses **email as username**. The Admin creates each worker account, sets an initial password, and assigns role/access level from an admin dashboard. No self-signup.~~ **REWRITTEN 2026-08-11:** Login uses **email as username**. No self-signup. Admin creates user accounts, assigns a role label, and assigns phases. A user's screen access is determined by their assigned phases (`user_phase_access`), not their role label. See R58.
54. Each user logs in with their own individual account — no shared logins — so every action is traceable to a specific person (audit/accountability requirement).

## 8. Rules added — 2026-08-11 CEO confirmation round

55. A season has a name, a start date, and an end date. Only one season can be active at a time. All `season_registrations` belong to a season.
56. Palletisation is performed by the Packaging Supervisor role only. Office Worker does not have write access to palletisation.
57. Each variety on a plot gets its own independent pipeline: separate `season_registration`, Field QC, Lab Sample, Contract, and Harvest. A plot with 3 varieties requires 3 registrations, 3 inspections, 3 lab samples, and 3 contracts.
58. Any user can be assigned any combination of the 14 phases. A single user can handle harvesting, weighing, and arrival QC if assigned all three. Role labels are for display and organizational reference only.

---

*This document should be updated whenever a business rule changes or a new one is discovered. Treat it as a living document, not a one-time deliverable.*
