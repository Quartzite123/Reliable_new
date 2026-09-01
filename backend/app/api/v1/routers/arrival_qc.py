"""
Arrival QC (Phase 7). Field Worker. One per harvest (DB-unique).

Granularity decision from discovery: per HARVEST (plot + day), not per
vehicle trip — several trucks on the same route the same day are one batch
for quality purposes. Gate: the registration must be WEIGHED (every trip
weighed) before arrival inspection.

NOTE: the DB has arrival_qc.harvest_id UNIQUE, so no follow-up rows after
a Fail (unlike Field QC). A failed Arrival QC is terminal for now — if the
business needs re-inspection here, that's a schema migration (flagged in
Open Questions).

GET /arrival-qc — all records (optionally filtered by harvest_id), newest
                  first. General list view for Field/Office Workers.

Everything in this file — reads and the write — is scoped to the
arrival_qc phase alone (Step 3 conversion, 2026-09-01), replacing
require_role(FIELD_WORKER)/FIELD_WORKER+OFFICE_WORKER. Role is no longer
checked anywhere in this file. This was held back until the live
user_phase_access data was corrected: fieldworker didn't hold arrival_qc
and labworker incorrectly did (CLAUDE.md §6 says Field Worker owns
Arrival QC) — fixed via a one-off SQL grant/revoke on 2026-09-01, verified
before this conversion was applied.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.arrival_qc import ArrivalQC
from app.models.harvest import Harvest
from app.models.user import User
from app.schemas.arrival_qc import ArrivalQCCreate, ArrivalQCRead
from app.services import status_machine

router = APIRouter()

_arrival_qc_phase = Depends(require_phase(PhaseKey.ARRIVAL_QC))


def _get_harvest_or_404(harvest_id: int, db: Session) -> Harvest:
    harvest = db.get(Harvest, harvest_id)
    if harvest is None:
        raise HTTPException(status_code=404, detail="Harvest not found")
    return harvest


@router.get("/arrival-qc", response_model=list[ArrivalQCRead], dependencies=[_arrival_qc_phase])
def list_arrival_qc(
    harvest_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(ArrivalQC).order_by(ArrivalQC.created_at.desc())
    if harvest_id is not None:
        stmt = stmt.where(ArrivalQC.harvest_id == harvest_id)
    return list(db.scalars(stmt))


@router.post(
    "/harvests/{harvest_id}/arrival-qc",
    response_model=ArrivalQCRead,
    status_code=status.HTTP_201_CREATED,
)
def record_arrival_qc(
    harvest_id: int,
    body: ArrivalQCCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_phase(PhaseKey.ARRIVAL_QC)),
):
    harvest = _get_harvest_or_404(harvest_id, db)
    if harvest.arrival_qc is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Arrival QC already recorded for this harvest",
        )

    # Every trip of THIS harvest must be weighed (spec: inspection covers
    # the whole day's arrival — nothing still on the road).
    unweighed = [t.id for t in harvest.vehicle_trips if t.weighing_record is None]
    if unweighed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Vehicle trip(s) {unweighed} not weighed yet — weigh all trips before Arrival QC",
        )

    reg = harvest.season_registration
    status_machine.can_record_arrival_qc(reg)

    qc = ArrivalQC(
        harvest_id=harvest.id,
        inspected_by=user.id,
        **body.model_dump(),
    )
    db.add(qc)
    status_machine.apply_arrival_qc_result(reg, body.result)
    db.commit()
    db.refresh(qc)
    return qc


@router.get("/harvests/{harvest_id}/arrival-qc", response_model=ArrivalQCRead, dependencies=[_arrival_qc_phase])
def read_arrival_qc(harvest_id: int, db: Session = Depends(get_db)):
    harvest = _get_harvest_or_404(harvest_id, db)
    if harvest.arrival_qc is None:
        raise HTTPException(status_code=404, detail="No Arrival QC recorded for this harvest")
    return harvest.arrival_qc
