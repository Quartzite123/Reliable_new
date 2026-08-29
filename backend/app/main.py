from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

app = FastAPI(title="Reliable Fresh Export Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: lock down to the deployed frontend origin(s) for production
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

from app.api.v1.routers import inventory, palletisation, pre_cooling, purchase_orders

app.include_router(inventory.router, prefix="/api/v1", tags=["inventory & bom"])
app.include_router(palletisation.router, prefix="/api/v1", tags=["palletisation"])
app.include_router(pre_cooling.router, prefix="/api/v1", tags=["pre-cooling"])
app.include_router(purchase_orders.router, prefix="/api/v1", tags=["purchase orders"])

# Not yet scoped (no tables/specs): Finished Goods QC, Container Indent,
# Container Loading, Farmer Invoice, Export Documents.
