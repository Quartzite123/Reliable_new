# Untitled

---

## CEO Documents Received — Full Map

| File | What it is | Phase it feeds | Key data extracted |
| --- | --- | --- | --- |
| `RF-54_2025-26_Packing_List.pdf` | Packing List for N&K shipment to Rotterdam | Container Loading, Export Docs | Pallet IDs (N-90 to N-112), GlobalG.A.P. numbers per farmer, MH numbers, 120 boxes/pallet, packing dates, variety, CLAMSHELL package type, container SUDU6290035, temp recorder ID |
| `RF-54_2025-26_Packing_List__1_.pdf` | Same packing list (duplicate) | Same as above | Same |
| `RF-64_2025-26__MASCL.pdf` | Proforma Invoice for MASCL/Saudi Arabia shipment | Export Docs, Invoice | Invoice format RF/64/2025-26, consignee details, HSN 08061000, 3744 boxes, 16848 net kg, 18720 gross kg, C&F USD 16/box, container MNBU0527947, bank details, REX declaration |
| `RF-64_2025-26_COO.pdf` | Certificate of Origin (MACCIA/Nashik) | Export Docs (R49) | Reference format, exporter/consignee, container number, box count, HS code, description "3744 BOXES INDIAN FRESH GRAPES", origin criterion "p" |
| `RF-46_2025-26_COC.pdf` | Certificate of Conformity (Cotecna Saudi, 4 pages) | Export Docs | COC number format SAU-COC26-*, two line items (Sonaka 2551 boxes + Black Seedless 900 boxes), SFDA standard, batch details with Product Registration Numbers |
| `RF-35_2025-26__Test_Report.pdf` | MRL Lab Test Report (Envirocare Labs, 5 pages) | Phase 3 — Lab Sampling | 93 pesticide parameters tested, all BLQ except Fluopyram (0.028) and Spirotetramat (0.013), SFDA MRL standard, sample: Thompson Seedless, seal no AD-942465, test report no 01/ETHGR2500451 |
| `RF-32_2025-26_Fumigation_Cert_.pdf` | Fumigation Certificate (Siddhivinayak Pest Control) | Export Docs (R49) | Treatment cert SH123-2025-26-0857, Methyl Bromide, 48 gm/m³, 24hrs, container MNBU9018961, 21 wooden pallets, exporter/importer details, ISPM-15 compliance |
| `RF-32_2025-26_Phyato_loading_Sheet.pdf` | Phytosanitary Certificate (Govt of India) | Export Docs (R49) | Reg PSC160NA202600, 3744 boxes, 16848 kg, Grape-Fruits Vitis vinifera, port Jeddah, two invoices (RF/64 grapes + RF/64 loading) |
| `RF-32_2025-26_Shipping_Bill.pdf` | Indian Customs Shipping Bill (6 pages) | Export Docs, Container Loading | SB 9336450, 2496 boxes/14976 kg, Thompson Seedless, FOB 2804092.2 INR, drawback 4206.14, RODTEP 53664, container MNBU9018961, N&K B.V. Rotterdam |
| `RF-32-Seaway_Bill.pdf` | Non-Negotiable Waybill (Maersk) | Export Docs | B/L 265947057, vessel AL RIFFA 605W, Nhava Sheva → Rotterdam, 2496 boxes, 14976 kg, temp 1.0°C, shipper seal SPPL40368583 |
| `RF-32_2025-26_Agmark.pdf` | AGMARK Grading Certificate | Export Docs | Cert AUD/GR/26/0017, RCMC 151580, packhouse Varad Vinayak Export, 2496 boxes 5kg, Thompson Seedless, Class I, two Agmark Inspection IDs, CAGID 020269306762 |
| `Global_Gap_2025-26.pdf` | GlobalG.A.P. Certificate (12 pages) | Phase 1, Packaging, Packing List | **GGN: 4052852773348**, 45 grape producers, 4 pomegranate producers, valid 2025-06-16 to 2026-03-23, producer group Option 2, individual farmer GGN numbers listed |
| `16560_Varad_Vinayak_BRCGS_Food_2025_Certificate.pdf` | BRCGS Food Safety Certificate | Company reference | Packhouse certification, Grade B, Varad Vinayak Export Pvt Ltd, Nashik, valid to 14 May 2026 |
| `QC___Arrival___Report.pdf` | Customer QC Report (Sharbatly Fruit, Jeddah) | Phase 7 reference | **This is the CUSTOMER'S arrival QC** — not ours. Pomegranates (not grapes), quality "Poor", 81% minor defects, 53.1% mechanical injury, claim "Cosmetic & Weight", 10500 qty, container CRLU 140891-3 |
| `RF-15_2024-25.pdf` | Statement of Bank Realisation (DGFT) | Financial/Export reference | BRC certificate, bill RF-15-2024-25, realised USD 51,000, Axis Bank, no deductions |
| `RF-54_Sale_Account.pdf` | N&K Sales Report / Account Sale | **Farmer Invoice reference** | Lot 17.429, 8% commission, 2496 boxes, cost breakdown (seafreight 3000, warehouse 630, QC inspection 120.75, insurance 350, import duties 2404.80, lab tests 135, total import cost 1288.09), advance payment 17472, **net payable EUR 7,207.10** |

WhatsApp_Image (Weighing Slip #937)	Physical weighing slip — Pre-Cleaning, inward vehicle	Phase 6 — Weighing	2 vehicle trips on one slip; 4-column format (A=crates, B=gross weights, C=crates, D=gross weights); tare=1.6kg/crate; Gross Weight = post-tare net (2115.2 kg); Rejection = 148.0 kg = exactly 7% cap; Net = 1967.2 kg; fields: Vehicle No, Vehicle Type, Date, Harvester No, Load Id, No.Crt Reci, Knitting, Farmer Name, MH No, GGN No, Village Name, Contact No, Grapes/Pomo checkbox, Avg Size, Avg Sugar, Variety	Fully specs Phase 6 UI + slip generation. Rejection % shown as dialog, defaults from contract.
Container_Loading_Sheet.pdf (RF/54)	Container Packing List — 21 pallets to Rotterdam	Container Loading (unscoped)	Same as RF-54 above — this IS the packing list. Per-pallet row confirmed. Also: thermograph recorder ID linked to a specific pallet (N-110)	Fully specs container_loading table structure
Lot_Creation_Format.pdf (RF/32 Loading Sheet)	Loading sheet grouping farmers by MH no.	Bridges Phase 8→Container Loading	Farmer Name + MH No → Boxes + Weight → Total KGS + Metric Tons; LOT IDs (202681006331, 202623893116); Consignment ID = AGMARK CAGID (020269306762); AGMARK Lab name recorded here	Lot ID = one per farmer-MH entry per container. Consignment ID = AGMARK CAGID for the container.

---

Which Documents Do You Still Need?

Based on current discovery gaps, here's what would actually unblock real decisions:

High priority — actively blocking design:

Document	What it unblocks
Finished Goods QC format (CEO promised a doc)	Phase 13 table — we have zero field data
APEDA/GrapeNet farm registration certificate	Ends the MH number debate definitively — shows format and whether it's per farmer or per plot
A farmer invoice (payment TO farmer)	Farmer Invoice module spec — the N&K Sales Account is what Reliable Fresh receives, not what they pay out

Medium priority — useful for verification:

Document	What it would confirm
Palletisation format / floor sheet	Phase 10 pallet ID system (N-XXX format origin), pallet types
Box sticker / label	Lot ID on-box format vs. system Lot ID

**Partially answered by uploaded PDFs:**

| Need | Answered by |
| --- | --- |
| Lab test format | `RF-35_2025-26__Test_Report.pdf` — Phase 3 is verified, 93 parameters |
| GlobalG.A.P. / GGN | `Global_Gap_2025-26.pdf` — GGN 4052852773348, 45 producers listed with individual GGNs |
| Phyto Certificate | `RF-64_2025-26_Phyto.pdf` — format fully visible |
| Certificate of Origin | `RF-64_2025-26_COO.pdf` — format fully visible |
| Fumigation Certificate | `RF-32_2025-26_Fumigation_Cert_.pdf` — format fully visible |
| Packing List format | `RF-54_2025-26_Packing_List.pdf` — **this IS the lot/pallet format** — answers Q1 partially |

*----