# Backend Changelog — 2026-08-23

## Session 1: Team 2 Reconciliation (merge)

Merged team 2's user activity tracking additions into the main backend.

### Files changed
| File | What changed |
|---|---|
| `app/models/user.py` | Added 5 activity columns: `last_login_at`, `last_logout_at`, `last_activity_at`, `failed_login_count`, `last_failed_login_at` |
| `app/schemas/user.py` | Added `UserActivityRead` schema |
| `app/api/v1/routers/auth.py` | Login tracks `last_login_at`, `last_activity_at`, `failed_login_count`, `last_failed_login_at`; logout tracks `last_logout_at` via `get_optional_user` |
| `app/core/deps.py` | Added `get_optional_user` dependency (returns None instead of raising on bad/expired tokens) |
| `app/main.py` | Added `user_activity` router import + mount |

### New files
| File | What |
|---|---|
| `app/api/v1/routers/user_activity.py` | `GET /api/v1/user-activity` — admin-only, returns login/session activity per user |

### Migrations
| Revision | What |
|---|---|
| `2879f513c1dd` | Add user activity tracking columns to `users` (copied from team 2) |
| `23983045218e` | Merge revision joining Phase 6 head (`35cdf2cd9d3c`) and team 2 head (`2879f513c1dd`) |

---

## Session 2: Deployment-Blocking Additions

Added the three items that block switching the frontend off mock mode.

### New tables

**`seasons`** — Phase 0, admin-managed
- `id`, `name` (unique, e.g. "2025-26"), `start_date`, `end_date`, `is_active` (only one active at a time), `created_by` FK→users, `created_at`, `updated_at`
- CRUD endpoints at `/api/v1/seasons`

**`plot_varieties`** — per-plot variety registration (R57)
- `id`, `plot_id` FK→plots, `variety_name`, `created_at`
- Unique constraint: `(plot_id, variety_name)`
- Endpoints at `/api/v1/plots/{plot_id}/varieties` and `DELETE /api/v1/plot-varieties/{variety_id}`

### New columns
| Table | Column | Type | Why |
|---|---|---|---|
| `farmers` | `ggn_number` | String, nullable | GlobalG.A.P. number per farmer |
| `season_registrations` | `season_id` | Integer FK→seasons, nullable | Replaces legacy `season_year` — nullable until data backfilled |
| `season_registrations` | `plot_variety_id` | Integer FK→plot_varieties, nullable | Links registration to a specific variety on a plot (R57) |

### Files changed
| File | What changed |
|---|---|
| `app/models/farmer.py` | Added `ggn_number` column |
| `app/models/plot.py` | Added `plot_varieties` relationship to `Plot`; added `season_id`, `plot_variety_id` FKs + relationships to `SeasonRegistration` |
| `app/models/user.py` | Added `seasons_created` back-reference |
| `app/schemas/farmer.py` | Added `ggn_number` to `FarmerCreate`, `FarmerUpdate`, `FarmerRead`, `FarmerSearchResult` |
| `app/schemas/plot.py` | Added `season_id`, `plot_variety_id` to `SeasonRegistrationCreate` and `SeasonRegistrationRead` |
| `app/api/v1/routers/plots.py` | Updated `register_plot_for_season` to pass through `season_id` and `plot_variety_id` |
| `app/db/__init__.py` | Registered `Season` and `PlotVariety` models |
| `app/main.py` | Added `seasons` and `plot_varieties` router imports + mounts |

### New files
| File | What |
|---|---|
| `app/models/season.py` | `Season` SQLAlchemy model |
| `app/models/plot_variety.py` | `PlotVariety` SQLAlchemy model |
| `app/schemas/season.py` | `SeasonCreate`, `SeasonUpdate`, `SeasonRead` |
| `app/schemas/plot_variety.py` | `PlotVarietyCreate`, `PlotVarietyRead` |
| `app/api/v1/routers/seasons.py` | Season CRUD: create, list, get active, get by id, update (with single-active enforcement) |
| `app/api/v1/routers/plot_varieties.py` | Add/list/remove varieties per plot |

### Migration
| Revision | What |
|---|---|
| `a1b2c3d4e5f6` | Creates `seasons`, `plot_varieties` tables; adds `farmers.ggn_number`; adds `season_registrations.season_id` and `season_registrations.plot_variety_id` FKs |

### New API endpoints (9 new)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/seasons` | Admin | Create a season |
| GET | `/api/v1/seasons` | Any auth | List all seasons |
| GET | `/api/v1/seasons/active` | Any auth | Get the currently active season |
| GET | `/api/v1/seasons/{season_id}` | Any auth | Get season by ID |
| PATCH | `/api/v1/seasons/{season_id}` | Admin | Update a season (activating auto-deactivates others) |
| POST | `/api/v1/plots/{plot_id}/varieties` | Any auth | Add a variety to a plot |
| GET | `/api/v1/plots/{plot_id}/varieties` | Any auth | List varieties on a plot |
| DELETE | `/api/v1/plot-varieties/{variety_id}` | Any auth | Remove a variety (blocked if registrations exist) |

---

## MH Number Clarification (corrects project docs)

**MH registration number is per-plot, not per-farmer.** One farmer can have multiple MH numbers (one per plot). This matches:
- The actual running code (`plots.mh_registration_number` exists, `farmers.mh_number` was dropped in migration `4f78801a91fd`)
- PHASE_MAP.md's "New information" table (line 1149)
- CEO's latest clarification

The earlier docs (CLAUDE.md Discovery 8, Business_Rules R2) said the opposite based on a CEO confirmation that has since been superseded. Those docs should be updated.

---

## Current Backend State After Both Sessions

- **26 tables** in the migration chain (24 original + `seasons` + `plot_varieties`)
- **82 endpoints** across 62 paths
- **10 migrations** in a single-head chain: `a1b2c3d4e5f6`
- App imports cleanly
- Alembic shows exactly 1 head

### What's still not built
| Item | Status | Blocks deployment? |
|---|---|---|
| `user_phase_access` table | Not built — role enum fallback works | No |
| `finished_goods_qc` table | Not built — fields TBD by CEO | No |
| `packaging_supervisor` in UserRole enum | Not added | No |
| `Finished Goods QC Passed/Failed` in RegistrationStatus enum | Not added | No |
| Removal of `purchase_orders` tables/code | Deferred | No |

### Migration to run on Neon
```bash
cd backend
alembic upgrade head
```
This runs migration `a1b2c3d4e5f6` which creates the two new tables, adds the three new columns, and sets up the FK constraints. Non-destructive — all new columns are nullable, no existing data is modified.
