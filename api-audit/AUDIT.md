# Full API Contract Audit

**Date:** 2026-08-29
**Source of truth:** `api-audit/openapi.json`, fetched live from `https://reliable-fresh-backend.onrender.com/openapi.json` (85 (method, path) pairs, excluding `/health`).
**Frontend surface scanned:** every `httpClient.get/post/put/patch/delete` call under `frontend/src/` — 140 call sites across 23 `api.ts` files (verified by exact count, not sampling).

**Headline finding:** two of the three endpoints named in the prompt (`GET /plots/{id}`, `GET /farmers/{id}`) **now exist on the live backend** and are no longer broken — someone added them since they were last hit. Only `GET /farmers/{id}/bank-details` is still broken, and it's joined by one new module (Goods Receiving) that was never wired up on the backend at all, plus one silent-failure bug that isn't a 405/404 at all (the passbook photo upload).

---

## A. BROKEN — frontend calls a (method, path) the backend does not have

| # | Method + Path | Call sites | Backend status |
|---|---|---|---|
| A1 | `GET /farmers/{id}/bank-details` | `frontend/src/features/farmers/api.ts:21`, `frontend/src/features/contracts/api.ts:41` | **Path exists under a different method → 405.** `PUT /farmers/{farmer_id}/bank-details` and `POST /farmers/{farmer_id}/bank-details/photo` both exist; there is no `GET` at that path. This is a genuinely missing handler, not an invented path. |
| A2 | `GET /goods-receiving`, `GET /goods-receiving/eligible-trips`, `POST /goods-receiving` | `frontend/src/features/goodsReceiving/api.ts:5,6,7` | **Path does not exist at all, under any method → 404.** `grep -rl goods backend/app/` returns nothing relevant — there is no goods-receiving router, model, or schema anywhere in the backend. This whole module is frontend-only. |

**Two previously-broken calls that are now fine, confirmed live:**
- `GET /plots/{plot_id}` — now `200`. Used in `arrivalQc/api.ts`, `harvests/api.ts`, `packaging/api.ts`, `palletisation/api.ts`, `contracts/api.ts`, `plots/api.ts` (getDetail).
- `GET /farmers/{farmer_id}` — now `200`. Used in the same set of files, plus `farmers/api.ts` directly.

I verified these live with curl against the deployed backend (not just the schema) during a related fix earlier in this thread — both return real data for a valid id, not just a schema promise.

**Two route-ordering hazards I checked and ruled out** (worth recording since they're the classic FastAPI footgun — a static path shadowed by a `{param}` path declared earlier would silently misroute):
- `farmers.py`: `@router.get("/search")` is declared at line 45, `@router.get("/{farmer_id}")` at line 128 — search comes first, correctly ordered.
- `seasons.py`: `@router.get("/current")` at line 100, `@router.get("/{season_id}")` at line 112 — current comes first, correctly ordered.

---

## B. UNGUARDED — what happens in the UI when A1/A2 fire

| Call | Consumed via | Component | What actually happens |
|---|---|---|---|
| A1 (`farmers/api.ts:21`) | `useBankDetails()` hook (`farmers/hooks.ts:52`) | `frontend/src/features/farmers/pages/FarmerDetailPage.tsx:18` | Only `{ data: bankDetails }` is destructured — no `error` check. The 405 is swallowed by React Query; `bankDetails` stays `undefined` forever. The farmer detail page renders fine overall, but its bank-details section reads as "not added yet" **even for a farmer who has bank details on file.** Misleading empty state, not a white screen. |
| A1 (`farmers/api.ts:21`) | same hook | `frontend/src/features/farmers/pages/BankDetailsPage.tsx:22` | Same — `{ data: existing, isLoading: bankLoading }`, no error check. Existing bank details silently fail to pre-fill the edit form. A worker editing a farmer who already has bank details on file sees a **blank form**, and could resubmit a duplicate/incomplete record without knowing one already exists. |
| A1 (`contracts/api.ts:41`, via `getPrerequisites`) | `useContractPrerequisites()` (`contracts/hooks.ts:18`) | `frontend/src/features/contracts/pages/ContractNewPage.tsx:75` | `const { data: prereqs, isLoading } = ...` — no error check at all. `getPrerequisites` throws before it ever returns, so `prereqs` never populates. `if (!prereqs) return null` — **this is a genuine white screen**: the entire Contract creation form renders nothing, forever, with zero explanation. This is the worst of the four. |
| A2 (`goods-receiving/eligible-trips`) | `useEligibleTripsForGoodsReceiving()` | `frontend/src/features/goodsReceiving/pages/GoodsReceivingNewPage.tsx:32` | `const { data, isLoading } = ...` — no error check. Renders `<EmptyState title="Nothing waiting to be confirmed" />` on every load, indistinguishable from a real empty queue. **This is the exact same bug class as the lab-sampling picker fixed earlier in this thread** — same shape, same missing `isError`/`error` destructure, same fix. |
| A2 (`goods-receiving` list) | `useGoodsReceivingRecords()` | `frontend/src/features/goodsReceiving/pages/GoodsReceivingListPage.tsx:13` | **Correctly guarded.** `const { data, isLoading, error, refetch } = ...` and `{error && <ErrorState error={error} onRetry={...} />}` renders before the empty-table case. This one already does it right — flagging as a positive control, not a bug. |

Net: **3 white-screen/misleading-empty bugs** (bank-details ×2 render locations + contract prerequisites), **1 already-correct** (goods-receiving list), and the goods-receiving picker repeats a bug class already fixed once elsewhere in this codebase.

---

## C. UNUSED — backend endpoints no frontend code calls

| Endpoint | Assessment |
|---|---|
| `GET /users/me` | **Legitimately unused, by design.** `auth/api.ts` has a comment explaining the login response already returns the full user object, so no separate round trip is needed. Not a gap. |
| `GET /registrations/{reg_id}/contract` | **Legitimately unused, alternate pattern.** The frontend fetches `GET /contracts` (the full list) and filters client-side instead of looking up per-registration. Works, just a different shape than the backend offers; not worth rewiring unless the contracts list grows large enough that N+1-avoidance stops being "load everything once." |
| `GET /harvests/{harvest_id}`, `GET /arrival-qc`, `GET /seasons/{season_id}` | **Legitimately unused, alternate pattern.** Same story — the frontend always goes through the list/parent-scoped route (`/registrations/{id}/harvests`, `/harvests/{id}/arrival-qc`, `/seasons` + `/seasons/current`) instead of the singular one. Consistent with how this codebase composes data client-side everywhere else. |
| `POST /customers`, `PATCH /customers/{customer_id}` | **Unused, and there's no UI to use it.** `frontend/src/features/customers/` has no `pages/` directory at all — only `list()` exists in `api.ts`. Customers can currently only be created or edited by calling the API directly; there's no admin screen for it. Not a broken-call bug, but worth flagging as a real product gap if customer management is expected to happen inside the app. |
| `GET /plots/{plot_id}/varieties`, `POST /plots/{plot_id}/varieties`, `DELETE /plot-varieties/{variety_id}` | **Unused — and this is the interesting one.** This is the backend's support for `plot_varieties` (CLAUDE.md Discovery 3: one plot can hold multiple varieties, each with its own independent pipeline, resolved 2026-08-11). The backend has full CRUD for it; the frontend has **zero UI for it** — `grep -rl varieties frontend/src` turns up nothing except an unrelated `GRAPE_VARIETIES` constant and a product-combination page. This isn't a wiring bug like A1/A2 — it's an entire confirmed business feature with backend support and no frontend screen at all. |
| **`POST /farmers/{farmer_id}/bank-details/photo`** | **Unused — and this is a live bug, just not the 405/404 kind you asked me to find.** `BankDetailsPage.tsx` lets the worker pick a passbook photo (`setPassbookPhoto`) and then does `saveBankDetails.mutateAsync({ ...values, passbookPhoto })` — but `saveBankDetails` only calls `PUT /farmers/{id}/bank-details` with a JSON body. The `File` object gets folded into that JSON payload (where `toSnake`/`JSON.stringify` cannot serialize a `File` meaningfully) instead of being sent to the multipart endpoint that actually exists for this. The photo is silently never uploaded. This is exactly the situation you flagged for `GET /lab-samples/queue` before — the correct endpoint exists and nobody called it — just on the write side instead of the read side. |

---

## Summary — what's actually broken right now

1. **`GET /farmers/{id}/bank-details`** — 405, hits 2 call sites, produces 1 white screen (Contract creation) and 2 misleading-empty renders (Farmer detail + Bank Details edit form).
2. **Goods Receiving module** — entire module (`GET/POST /goods-receiving*`) has no backend implementation. List page handles it correctly; the "new" picker page doesn't, reproducing the exact bug class already fixed in Lab Sampling.
3. **Passbook photo upload** — not a missing-endpoint bug, but a real one: the endpoint exists and is never called; the file silently vanishes into a JSON body instead.
4. **Plot Varieties feature** — fully built on the backend, zero frontend surface. Not urgent unless multi-variety-per-plot is currently expected to work in the app.

No code was changed for this audit — `api-audit/openapi.json` and `api-audit/AUDIT.md` are the only new files.
