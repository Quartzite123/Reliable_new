# Reliable Fresh Export Management System

Internal PWA for Reliable Fresh (Pune) — see `CLAUDE.md` for full project context, `PHASE_MAP.md` for the complete data model and phase specs, `Business_Rules.md` for the 56 governing rules, and `Open_Questions.md` for items pending CEO confirmation.

**2026-08-11 update:** a CEO confirmation round changed several assumptions — Season Management is now a real module (Phase 0), plots can hold multiple varieties, a new Packaging Supervisor role was added, the Purchase Order module (Phase 12) was dropped entirely, and Finished Goods QC (Phase 13) was added to the pipeline between Palletisation and Pre-Cooling. See `CLAUDE.md`, `PHASE_MAP.md`, `Business_Rules.md`, and `Open_Questions.md` for full detail.

**2026-08-11 follow-up (same day):** two structural additions plus fixes. (1) Multi-variety plots corrected: variety is registered per plot via a new `plot_varieties` table, NOT recorded on `harvests` as the first pass of this update said — each variety gets its own independent `season_registration`/Field QC/Lab Sample/Contract/Harvest pipeline (R57). (2) Permissions are now phase-based, not role-based: a new `user_phase_access` table maps each user to specific phases; `users.role` is a display label only. Roles are display labels — actual access is phase-based via `user_phase_access`. Also fixed: farmer search now includes MH number (R3), the Farmer Invoice formula was clarified (no deductions beyond capped rejection, R48), and Q4 (multi-variety plots) is now marked RESOLVED rather than reopened.

Tech stack: Python + FastAPI + SQLAlchemy + Alembic + PostgreSQL (backend); React + TypeScript + Vite + Tailwind CSS (frontend PWA).

This file documents the **directory structure only** — no implementation exists yet. Folders are empty scaffolding; each entry below says what will eventually live there and which phase(s)/tables it corresponds to in `PHASE_MAP.md`.

---

## Repository layout

```
CLAUDE.md, PHASE_MAP.md, Business_Rules.md, Open_Questions.md   — project docs (see above)
README.md                                                        — this file
backend/                                                          — FastAPI + SQLAlchemy + Alembic
frontend/                                                         — React + TypeScript + Vite + Tailwind
scripts/                                                          — one-off / ops scripts (DB seed, weekly backup export)
```

---

## `backend/`

```
backend/
├── app/
│   ├── core/           — settings/config, JWT auth & security, role enum, shared constants
│   ├── db/              — SQLAlchemy engine/session setup, declarative Base
│   ├── models/           — SQLAlchemy ORM models, one file per table group (see mapping below)
│   ├── schemas/          — Pydantic request/response schemas, mirrors models/
│   ├── api/v1/routers/    — FastAPI routers, one per module (mirrors models/ + features/)
│   ├── services/          — business logic that isn't plain CRUD (status-machine gating,
│   │                        auto stock-out, Lot ID generation, PO tax calc, pre-cooling
│   │                        completion gating, fuzzy farmer search)
│   └── utils/              — shared helpers (file/photo upload handling, GPS payload parsing)
├── alembic/versions/        — migration scripts
└── tests/unit/, tests/integration/
```

**`app/models/` → table mapping** (full column detail in `PHASE_MAP.md` Section 7):

| File | Tables | Phase |
|---|---|---|
| `season.py` *(new, 2026-08-11)* | `seasons` | 0 |
| `user.py` | `users` (role enum now includes `packaging_supervisor`, added 2026-08-11) | cross-cutting |
| `user_phase_access.py` *(new, 2026-08-11)* | `user_phase_access` — role is a display label only; screen access is phase-based, see `PHASE_MAP.md` Section 5 | cross-cutting |
| `farmer.py` | `farmers` (gained `mh_number` back, 2026-08-11), `bank_details` | 1A, 1B |
| `plot.py` | `plots` (lost `variety` and `mh_registration_number`, 2026-08-11), `season_registrations`, `field_qc` | 2 |
| `plot_variety.py` *(new, 2026-08-11)* | `plot_varieties` — a plot can have multiple varieties, each with its own registration/QC/lab/contract/harvest pipeline (R57) | 2 |
| `lab.py` | `lab_samples` | 3 |
| `contract.py` | `contracts` | 4 |
| `harvest.py` | `harvests` (no `variety` column — inherits via `season_registration → plot_variety`, corrected 2026-08-11 same-day), `vehicle_trips` | 5 |
| `weighing.py` | `weighing_records` | 6 |
| `arrival_qc.py` | `arrival_qc` | 7 |
| `packaging.py` | `packaging_records` | 8 |
| `customer.py` | `customers` | (new — decided during phase-map review) |
| `inventory.py` | `item_master_materials`, `item_master_products`, `bom_entries`, `stock_movements` | 9A/9B |
| `palletisation.py` | `pallets`, `palletisation_lots` | 10 |
| `finished_goods_qc.py` *(new, 2026-08-11 — fields TBD)* | `finished_goods_qc` | 13 |
| `pre_cooling.py` | `pre_cooling_records` | 11 |
| ~~`purchase_order.py`~~ | ~~`purchase_orders`, `purchase_order_line_items`~~ | ~~12~~ — **⚠️ DROPPED 2026-08-11, do not build. Tables exist unused in the DB, pending removal.** |
| `company_settings.py` | `company_settings` | (new — decided during phase-map review) |

`app/api/v1/routers/` and `app/schemas/` will mirror this same file-per-module split.

---

## `frontend/`

```
frontend/
├── public/                — PWA manifest, icons, service worker
└── src/
    ├── api/                — API client + one request module per backend router
    ├── components/          — shared/reusable UI (buttons, forms, tables, inputs)
    ├── features/             — one folder per phase/module (screen components, local state)
    ├── hooks/                 — shared React hooks
    ├── layouts/               — role-based shell/nav (Admin, Field Worker, Lab Worker,
    │                            Office Worker, Stock/Inventory Manager, Packaging Supervisor
    │                            — added 2026-08-11)
    ├── store/                  — auth/session state
    ├── types/                  — shared TS types, mirrors backend schemas/
    ├── utils/                  — shared frontend helpers
    └── assets/
```

**`src/features/` → phase mapping:**

| Folder | Phase(s) |
|---|---|
| `season/` *(new, 2026-08-11)* | 0 |
| `auth/` | login |
| `farmer/` | 1A, 1B |
| `plot-field-qc/` | 2 (variety field removed from this screen 2026-08-11 — see `harvesting/`) |
| `lab-sampling/` | 3 |
| `contract/` | 4 |
| `harvesting/` | 5 (gained a variety field 2026-08-11) |
| `weighing/` | 6 |
| `arrival-qc/` | 7 |
| `packaging/` | 8 |
| `inventory/` | 9A, 9B, 9C |
| `palletisation/` | 10 (role moved from Office Worker to Packaging Supervisor, 2026-08-11) |
| `finished-goods-qc/` *(new, 2026-08-11 — fields TBD)* | 13 |
| `pre-cooling/` | 11 |
| ~~`purchase-order/`~~ | ~~12~~ — **⚠️ DROPPED 2026-08-11, do not build** |
| `admin/` | user management, company settings, season management (2026-08-11) |
| `dashboard/` | role-specific dashboards / list views (`PHASE_MAP.md` §10.2 6.10) |

---

## Not yet scaffolded

Container Indent, Container Loading, Farmer Invoice, and Export Documents have no folders yet — they're not scoped (see `PHASE_MAP.md` Section 2 and Section 9). Add `models/`, `schemas/`, `api/v1/routers/`, and `features/` entries for them once they're spec'd, following the same one-file/one-folder-per-module pattern above.

*Finished Goods QC moved out of this list 2026-08-11 — its position in the pipeline is now confirmed (Phase 13, between Palletisation and Pre-Cooling) even though its fields are still pending a CEO document; see the `finished_goods_qc.py` / `finished-goods-qc/` entries above.*

## Next steps

No code has been written yet — this is folder structure only. Next: `requirements.txt`/`pyproject.toml` + FastAPI app entrypoint, `package.json` + Vite config, Alembic init, then SQLAlchemy models starting with Phase 1 (`user.py`, `farmer.py`, `plot.py`).
