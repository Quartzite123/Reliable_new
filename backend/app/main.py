import logging
import re
import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException

from app.core.config import settings

logger = logging.getLogger("app")

app = FastAPI(title="Reliable Fresh Export Management System")

# Pinned to settings.FRONTEND_ORIGINS (2026-09-01 security audit fix #5) —
# previously ["*"], which combined with allow_credentials=True is a real
# misconfiguration (Starlette reflects the request's actual Origin instead
# of a literal "*" once credentials are allowed, verified live with a
# forged Origin header — any site was trusted for credentialed requests).
# Set FRONTEND_ORIGINS in the environment to the deployed frontend's exact
# origin(s); see core/config.py.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# The frontend's ApiError expects `{"message": ..., "fieldErrors"?: {field: msg}}`
# (see frontend/src/types/common.ts ApiErrorShape) — FastAPI's defaults are
# `{"detail": "..."}` for HTTPException and `{"detail": [...]}` for validation
# errors, so without these the frontend silently falls back to a generic
# "This could not be saved" message for every 4xx except 401/403/404, hiding
# both validation errors and status-machine gate messages.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # exc.errors() is a list of {"loc": [...], "msg": ..., "type": ...} — the
    # frontend's fieldErrors is a flat {field: message} map, and PlotRegistrationPage
    # (and any other form) calls setError(field, ...) with the *camelCase* form
    # field name. `loc` is snake_case (matches the Pydantic field name); relying
    # on httpClient's toCamel() to convert these keys on the way in, same as
    # every other response body, is simpler than converting here.
    field_errors: dict[str, str] = {}
    for error in exc.errors():
        loc = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
        field = ".".join(loc) if loc else "detail"
        field_errors[field] = error["msg"]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": "Validation error", "fieldErrors": field_errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


# Known unique-constraint names -> plain-language messages. Real names
# confirmed against the live DB (pg_constraint / pg_indexes), not guessed
# from SQLAlchemy's naming convention — several were hand-named in
# migrations (uq_*) while others fall back to Postgres's own
# <table>_<column>_key default. Add a new one here whenever a new unique
# constraint is added to a model; unmapped names fall back to a generic
# message rather than ever leaking the constraint name to the client.
_CONSTRAINT_MESSAGES: dict[str, str] = {
    "uq_plots_mh_registration_number": "A plot with this MH Registration Number already exists.",
    "uq_plots_farmer_plot_number": "This farmer already has a plot with that number.",
    "uq_season_registrations_plot_season": "This plot is already registered for that season.",
    "bank_details_farmer_id_key": "This farmer already has bank details on file.",
    "arrival_qc_harvest_id_key": "Arrival QC has already been recorded for this harvest.",
    "weighing_records_vehicle_trip_id_key": "This vehicle trip has already been weighed.",
    "contracts_season_registration_id_key": "A contract already exists for this registration.",
    "lab_samples_season_registration_id_key": "A lab sample has already been recorded for this registration.",
    "customers_name_key": "A customer with this name already exists.",
    "pallets_pallet_id_key": "That pallet ID is already in use.",
    "purchase_orders_po_number_key": "That purchase order number is already in use.",
    "packaging_records_lot_id_key": "That lot ID is already in use.",
    "uq_plot_varieties_plot_variety": "This variety is already registered on this plot.",
    "uq_user_phase_access_user_phase": "That phase is already assigned to this user.",
    "ix_users_email": "A user with this email already exists.",
}


def _constraint_name(exc: IntegrityError) -> str | None:
    diag = getattr(exc.orig, "diag", None)
    name = getattr(diag, "constraint_name", None) if diag else None
    if name:
        return name
    # Fallback for drivers/error types where .diag isn't populated — parse
    # it out of the raw DBAPI message, e.g.:
    # `duplicate key value violates unique constraint "uq_plots_..."`
    match = re.search(r'constraint "([^"]+)"', str(exc.orig))
    return match.group(1) if match else None


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    # No explicit db.rollback() here: get_db()'s `finally: db.close()` has
    # already run by the time this handler is invoked — FastAPI tears down
    # yield-dependencies as the endpoint's stack unwinds, before the
    # exception reaches a registered app-level handler — and
    # Session.close() itself rolls back any pending transaction before
    # releasing the connection back to the pool. Verified live: a query
    # against the same session immediately after rollback succeeds, so the
    # connection is never left poisoned for whatever runs next.
    name = _constraint_name(exc)
    message = _CONSTRAINT_MESSAGES.get(name, "That value is already in use.") if name else "That value is already in use."
    logger.warning("IntegrityError on %s %s — constraint=%s", request.method, request.url.path, name)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"message": message},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Last-resort safety net for anything not already caught above (by
    # this handler's own type or a more specific one — HTTPException,
    # RequestValidationError, and IntegrityError are all matched before
    # this ever runs, per Starlette's type-based handler resolution).
    # Never return a stack trace to the browser — only a short id the user
    # can report, with the full traceback logged server-side against it.
    error_id = uuid.uuid4().hex[:8]
    logger.error(
        "Unhandled exception [%s] on %s %s", error_id, request.method, request.url.path, exc_info=exc
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": f"Something went wrong on our end. If this keeps happening, report error {error_id}."},
    )


# /files/... static mount removed — uploads now go to Cloudinary and are
# served directly from its CDN. The local mount could never serve anything
# real on Render's ephemeral filesystem anyway (files were wiped on every
# restart); keeping it would just be a dead route that always 404s.

# Routers — one per backend/app/api/v1/routers/ file (see README.md for the
# phase mapping). Extend as more land:
from app.api.v1.routers import (
    arrival_qc,
    audit_log,
    auth,
    contracts,
    customers,
    farmers,
    harvests,
    lab_samples,
    packaging,
    plot_varieties,
    plots,
    seasons,
    user_activity,
    users,
    weighing,
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(user_activity.router, prefix="/api/v1/user-activity", tags=["user activity"])
app.include_router(audit_log.router, prefix="/api/v1/audit-log", tags=["audit log"])
app.include_router(seasons.router, prefix="/api/v1/seasons", tags=["seasons"])
app.include_router(farmers.router, prefix="/api/v1/farmers", tags=["farmers"])
app.include_router(plots.router, prefix="/api/v1", tags=["plots & field qc"])
app.include_router(plot_varieties.router, prefix="/api/v1", tags=["plot varieties"])
app.include_router(lab_samples.router, prefix="/api/v1", tags=["lab sampling"])
app.include_router(contracts.router, prefix="/api/v1", tags=["contracts"])
app.include_router(harvests.router, prefix="/api/v1", tags=["harvesting"])
app.include_router(weighing.router, prefix="/api/v1", tags=["weighing"])
app.include_router(arrival_qc.router, prefix="/api/v1", tags=["arrival qc"])
app.include_router(packaging.router, prefix="/api/v1", tags=["packaging"])
app.include_router(customers.router, prefix="/api/v1", tags=["customers & settings"])

from app.api.v1.routers import inventory, palletisation, pre_cooling

app.include_router(inventory.router, prefix="/api/v1", tags=["inventory & bom"])
app.include_router(palletisation.router, prefix="/api/v1", tags=["palletisation"])
app.include_router(pre_cooling.router, prefix="/api/v1", tags=["pre-cooling"])

# purchase_orders.router is deliberately NOT included. CLAUDE.md §12/§7
# (Phase 12) confirms the Purchase Order module is out of scope — no
# fertilizer purchases, no PO process needed (CEO, 2026-08-11). The
# purchase_orders/purchase_order_line_items tables still exist in the DB
# and are slated for removal in a future migration; the router file itself
# is left in app/api/v1/routers/ unregistered rather than deleted, in case
# removal needs to be staged separately from unregistering the routes.

# Not yet scoped (no tables/specs): Finished Goods QC, Container Indent,
# Container Loading, Farmer Invoice, Export Documents.
