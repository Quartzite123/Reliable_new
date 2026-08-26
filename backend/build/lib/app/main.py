from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


from fastapi.staticfiles import StaticFiles

from app.utils.file_upload import UPLOAD_ROOT

# Uploaded files (photos, PDFs) served back at /files/...
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_ROOT), name="files")

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
