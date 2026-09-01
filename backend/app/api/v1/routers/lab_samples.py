"""
Lab Sampling (Phase 3). Lab Worker only (R52) — sees only registrations
with status Field QC Passed (queue endpoint). One sample per registration.

POST /registrations/{id}/lab-sample          — gate: FIELD_QC_PASSED (R18)
POST /lab-samples/{id}/seal-photo            — photo upload
POST /lab-samples/{id}/documents             — 2A/4B PDF upload
GET  /lab-samples/queue                      — pending work for lab workers
GET  /registrations/{id}/lab-sample          — read

Read (registration-scoped, GET /registrations/{id}/lab-sample) is scoped
to {lab_sampling, packaging} — lab_samples' own screens plus packaging,
which pulls lab-sample context onto its own rows (features/packaging/
api.ts). Everything else in this file (the queue, the writes) is gated on
lab_sampling alone (Step 3 conversion, 2026-09-01), replacing
require_role(LAB_WORKER) — role is no longer checked anywhere in this
file.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey, RegistrationStatus
from app.models.lab import LabSample
from app.models.plot import SeasonRegistration
from app.models.user import User
from app.schemas.lab import LabSampleCreate, LabSampleRead
from app.schemas.plot import SeasonRegistrationRead
from app.services import status_machine
from app.api.v1.routers.plots import get_registration_or_404
from app.utils.file_upload import save_upload

router = APIRouter()

_lab_sampling = Depends(require_phase(PhaseKey.LAB_SAMPLING))
_lab_sample_read_phases = Depends(require_phase(PhaseKey.LAB_SAMPLING, PhaseKey.PACKAGING))


@router.get("/lab-samples/queue", response_model=list[SeasonRegistrationRead], dependencies=[_lab_sampling])
def lab_queue(db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(SeasonRegistration)
            .where(SeasonRegistration.status == RegistrationStatus.FIELD_QC_PASSED)
            .order_by(SeasonRegistration.id)
        )
    )


@router.post(
    "/registrations/{reg_id}/lab-sample",
    response_model=LabSampleRead,
    status_code=status.HTTP_201_CREATED,
)
def record_lab_sample(
    reg_id: int,
    body: LabSampleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_phase(PhaseKey.LAB_SAMPLING)),
):
    reg = get_registration_or_404(reg_id, db)
    status_machine.can_record_lab_sample(reg)

    sample = LabSample(
        season_registration_id=reg.id,
        entered_by=user.id,
        **body.model_dump(),
    )
    db.add(sample)
    status_machine.apply_lab_result(reg, body.result)
    db.commit()
    db.refresh(sample)
    return sample


@router.get("/registrations/{reg_id}/lab-sample", response_model=LabSampleRead, dependencies=[_lab_sample_read_phases])
def read_lab_sample(
    reg_id: int,
    db: Session = Depends(get_db),
):
    reg = get_registration_or_404(reg_id, db)
    if reg.lab_sample is None:
        raise HTTPException(status_code=404, detail="No lab sample recorded for this registration")
    return reg.lab_sample


def _get_sample_or_404(sample_id: int, db: Session) -> LabSample:
    sample = db.get(LabSample, sample_id)
    if sample is None:
        raise HTTPException(status_code=404, detail="Lab sample not found")
    return sample


@router.post("/lab-samples/{sample_id}/seal-photo", response_model=LabSampleRead, dependencies=[_lab_sampling])
def upload_seal_photo(sample_id: int, file: UploadFile, db: Session = Depends(get_db)):
    sample = _get_sample_or_404(sample_id, db)
    sample.seal_photo_url = save_upload(file, "lab-seals")
    db.commit()
    db.refresh(sample)
    return sample


@router.post("/lab-samples/{sample_id}/documents", response_model=LabSampleRead, dependencies=[_lab_sampling])
def upload_documents(sample_id: int, file: UploadFile, db: Session = Depends(get_db)):
    sample = _get_sample_or_404(sample_id, db)
    sample.documents_2a4b_url = save_upload(file, "lab-docs", allow_pdf=True)
    db.commit()
    db.refresh(sample)
    return sample
