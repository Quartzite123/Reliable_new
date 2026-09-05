# Changes Since the Dossier

**Companion to:** `PROJECT_DOSSIER.md` and `DOSSIER_FACTS.md`
**Covers:** 1–3 September 2026
**Written for:** the developer taking over the project

---

## How to use this file

`PROJECT_DOSSIER.md` is still the main reference for what this project is and how the domain works. Read it first.

But it was written before the last few days of decisions, and it has four known errors. This file records everything that changed after it, plus the corrections. **Where the two disagree, this file is right.**

---

## 1. Corrections to the dossier

Four things in the dossier are wrong and have not been fixed in the dossier itself:

| Dossier says | Correct |
|---|---|
| 29 tables | **28 tables** |
| A specific boxes-per-pallet figure | Figure is unconfirmed — still waiting on the CEO. Working estimate is ~120, do not treat as fact |
| Goods Receiving appears as a nav entry | It is **not an agreed pipeline step**. Team 2 built a frontend for it with no backend and no specification. Scope decision still open |
| The branch-merge narrative | Team 2 did not fork from the current branch — they forked from the original pre-Phase-6 codebase independently. Their backend was missing all Phase 6 work, and the Alembic chains diverged from the same root (`ee800d0eaf23`). A merge revision was needed to rejoin them |

---

## 2. MH number — final decision

The dossier contains contradictory statements on this. It is now settled:

**The MH number is per plot, not per farmer.** One farmer can hold several MH numbers, one per plot. It is stored on `plots.mh_registration_number`.

Evidence: the container loading sheet shows two different MH numbers (MH06093910801, MH06094254601) belonging to the same farmer. Team 2's migration `4f78801a91fd` already moved the column to `plots` and is correct.

`PHASE_MAP` sections R2 and R7a still describe the old per-farmer model and need updating.

Still pending: the APEDA certificate from the CEO, which would confirm this from the source document.

---

## 3. Auth and access decisions (1 September)

- **Admin-set passwords are permanent.** No forced password change at next login.
- **No self-service password reset.** There is no email-based reset flow. A worker who forgets their password contacts the admin, who sets a new one. The Forgot Password link is being removed from the login page.
- **Two new phases added to the phase system:**
  - `users` — user management screen. Must not be able to reach admin accounts, and nobody can grant themselves a phase they do not already hold.
  - `reports_documents` — see section 5.
- **Root / break-glass admin credential still does not exist.** It must be created, documented, and handed to Reliable Fresh at handover. This is easy to forget and important.

---

## 4. Scope statement from the CEO (2 September)

The system is being built **for grapes only, for now**. The CEO wants pomegranate and banana added to the same system once grapes are working.

This is a future concern, not a current one. But it affects one design question: whether `variety` stays a plain field, or eventually needs a crop-type level above it. Worth keeping in mind, not worth building yet.

---

## 5. Documents section — scope and navigation

**Scope (confirmed 1 September):** the documents section holds the real export certificates per shipment — fumigation certificate, phytosanitary certificate, COO, AGMARK, COC, packing list, shipping bill, seaway bill, test reports. Files live in cloud storage (Cloudinary). Access is phase-gated like every other module.

**Navigation (resolved 3 September):** the earlier plan of attaching each document to a specific entity — click a pallet, see its documents — is **deferred**. The client asked for something simpler and explicitly temporary:

- **Folder-based.** One folder per shipment/container, since that is how certificates are actually issued — one phyto, one COO, one fumigation certificate per consignment
- **Easy navigation** — click into a folder, see what is inside
- **In-browser preview** — PDFs and images open in a viewer, no forced download
- **Download** — a single file, or the whole folder as a zip
- Upload carries a document type label and a date

This keeps the schema small: a `documents` table with file URL, document type, folder/shipment reference, uploaded-by and uploaded-at. **Design it so a proper entity link can be added later without a rewrite** — add nullable `related_entity_type` and `related_entity_id` columns now and leave them unused.

---

## 6. Season lifecycle — the important one

The dossier says records are "archived as storage" after a season ends. That was vague, and the vagueness was dangerous. Here is what it actually means.

### Records are hidden, not deleted

"Records vanish at season end" means **they disappear from the current season's screens.** It does not mean they are erased.

- Every operational record carries a `season_id`. All lists, searches, dropdowns and dashboards filter to the **active season only**
- A lab worker opening Lab Samples during 2026-27 sees only 2026-27 samples. A 2025-26 sample is not shown, not searchable, not selectable. That clutter is exactly the client's complaint
- The rows stay in the database, untouched
- They remain reachable through the **season archive** — read-only, one entry per closed season, no edit controls anywhere

This matters beyond convenience: export compliance normally requires retaining traceability records for years. Actually deleting them at season end would create a serious problem during an audit.

### What survives a rollover

**Preserved:** farmers, plots, MH and GGN numbers, inventory master data, users, roles, settings and personalisations.

**Hidden (not deleted):** season registrations, field QC, lab samples, contracts, harvests, weighing records, packaging, pallets, pre-cooling, containers.

### Season-end report and backup

- A **season-end report** is generated once at close, containing the full detailed data for that season
- **Cloud save** — the archive bundle stored in cloud storage
- **Offline backup** — a downloadable file the client keeps on their own machine

### Season-end warning flow

Closing a season must require a proper end date and must warn clearly before proceeding. The warning has to state **both** what will be cleared and what survives — not just "this cannot be undone".

### Still open for the CEO

1. What format is the offline backup — a zip of Excel/CSV files (readable by the client, not restorable) or a database dump (restorable, useless to a non-technical user)? Recommendation: give the client the Excel zip, keep a DB dump yourself.
2. Does the archive include the document images, or only tabular data? If images, the zip becomes large and the download should be per-container rather than per-season.

---

## 7. New client requests (2 September)

Logged as items 36–48 on the master to-do list. Summarised here:

**UI and design**
- Overall visual polish — more appealing, explicitly not flashy or overwhelming
- Login page background image is blurry, needs a higher-resolution asset
- Login page mobile layout is cramped — the form column squeezes the fields and the hero text wraps badly
- Colour palette review across the whole app — currently a single green

**Sessions**
- Session tracking and validation, modelled on the existing audit log: who logged in, from where, when, and whether the session is still active

**Inventory alerts**
- Verify the low-stock alert system actually fires. It shows a count on the dashboard, but the threshold logic has never been confirmed working end to end
- Add email or SMS delivery. Email is the easier path (Resend or Brevo, both free tiers). SMS in India needs DLT registration, which is paperwork the client would have to complete

---

## 8. Plot varieties work (3 September)

The most recent code changes. Items 6–8 on the master to-do list.

**What was built:**

- **Per-variety area is now always asked for.** The area field appears on every variety row, single or multi. Nothing is derived or defaulted from the plot's own total area any more — the silent auto-fill is gone
- **`PATCH /plot-varieties/{id}`** — new endpoint, accepts `area_acres` only, phase-gated like the other three plot-variety endpoints
- **Rename is deliberately excluded** from that endpoint. Registrations reference a variety by id; renaming would silently change what a recorded inspection was performed on. Area carries no such risk, since nothing downstream reads it except display. This reasoning is in the `PlotVarietyUpdate` docstring
- **`ensurePlotVariety` does not update area on a re-registration match.** Re-registering a variety for a new season is routine. If it silently overwrote area every time, a worker registering next season's Field QC could blank out an area someone had carefully corrected — with nothing on screen showing it happened. Area changes are now only ever explicit, through the edit control
- **`AddVarietyForm`** (on `PlotDetailPage`) now takes the plot's area and existing varieties, asks for area on add, and shows a soft dismissible warning when the total exceeds the plot area. Never blocking, silent when under
- **`PlotVarietyRow`** has an inline Edit control next to the area display → `NumberInput` plus Save/Cancel, using `useUpdatePlotVariety` with the same query-key invalidation as add and remove

**Status:** built, type-checked and linted clean. **Not committed** as of writing — check `git status` before assuming.

**Follow-ups requested but not yet confirmed done:**

1. Extend the over-total warning to the edit action as well, for consistency — adding warns, editing currently does not
2. Confirm the area field is optional, not required. Existing rows in the database have no area value, and a required field would block re-registration of old varieties
3. Confirm the edit control renders cleanly when area is null — `NumberInput` has had a NaN bug on optional fields before
4. Confirm `PATCH /plot-varieties/{id}` writes to the audit trail. Every other write does, and this endpoint is now the only way area can ever change

---

## 9. Reminder about legacy columns

`plots.variety` is a **legacy column** — still written to, never read, due for removal. The new plot-varieties work does not depend on it. Do not assume otherwise when cleaning up.

`contracts.rejection_percent` is similarly dead, following the flat-7% correction. Rejection is always exactly 7% of net weight regardless of what was observed, so the per-contract value has no effect on payment.

`purchase_orders` tables and router await removal — that scope was dropped when the CEO confirmed there are no fertilizer purchases.

---

## 10. Handover status

The project is being handed over. The previous developer is stepping away; the new developer receives the project folder, the laptop, and the working chat session.

Open at handover:
- The commercial question — the client had been expecting this work unpaid. No price has been quoted, and ongoing maintenance has not been discussed
- The root/break-glass admin credential (section 3)
- Credentials for Neon, Render, Vercel and Cloudinary
- Fourteen questions still waiting on the CEO — see the master to-do list, section 11
