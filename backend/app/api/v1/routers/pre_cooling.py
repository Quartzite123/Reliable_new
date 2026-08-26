"""
Pre-Cooling (Phase 11). Office Worker or Stock Manager (role assignment
pending CEO — Open Question #9; both allowed for now).

POST  /pre-cooling                — batch entry: one record per pallet_id;
                                    out-fields optional (partial save)
PATCH /pre-cooling/{id}/complete  — fill out-time/out-temp on a partial
                                    record (never creates a duplicate)
GET   /pre-cooling                — list, filter incomplete

Completion flips the pallet's status created -> pre_cooling (model
docstring) and advances involved registrations PALLETISED -> PRE_COOLED.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import PalletStatus, RegistrationStatus, UserRole
from app.models.palletisation import Pallet
from app.models.pre_cooling import PreCoolingRecord
from app.models.user import User
from app.schemas.palletisation import PreCoolingComplete, PreCoolingCreate, PreCoolingRead

router = APIRouter()

_pre_cooling_roles = require_role(UserRole.OFFICE_WORKER, UserRole.STOCK_MANAGER)


def _is_complete(record: PreCoolingRecord) -> bool:
    return all(
        value is not None
        for value in (record.in_time, record.in_berry_temp, record.out_time, record.out_berry_temp)
    )


def _read(record: PreCoolingRecord) -> PreCoolingRead:
    out = PreCoolingRead.model_validate(record)
    out.is_complete = _is_complete(record)
    return out


def _apply_completion(db: Session, record: PreCoolingRecord) -> None:
    """Pallet created -> pre_cooling; registrations PALLETISED -> PRE_COOLED."""
    pallet = record.pallet
    if pallet.status == PalletStatus.CREATED:
        pallet.status = PalletStatus.PRE_COOLING
    for link in pallet.palletisation_lots:
        reg = link.packaging_record.harvest.season_registration
        if reg.status == RegistrationStatus.PALLETISED:
            reg.status = RegistrationStatus.PRE_COOLED


@router.post("/pre-cooling", response_model=list[PreCoolingRead], status_code=status.HTTP_201_CREATED)
def create_pre_cooling(
    body: PreCoolingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_pre_cooling_roles),
):
    records = []
    for pallet_pk in body.pallet_ids:
        pallet = db.get(Pallet, pallet_pk)
        if pallet is None:
            raise HTTPException(status_code=404, detail=f"Pallet {pallet_pk} not found")
        existing_open = db.scalar(
            select(PreCoolingRecord).where(
                PreCoolingRecord.pallet_id == pallet_pk,
                PreCoolingRecord.out_time.is_(None),
            )
        )
        if existing_open is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Pallet {pallet.pallet_id} already has an incomplete pre-cooling "
                    f"record (id={existing_open.id}) — complete it instead of creating a duplicate"
                ),
            )
        record = PreCoolingRecord(
            pallet_id=pallet_pk,
            date=body.date,
            num_pallets=len(body.pallet_ids),
            num_boxes=body.num_boxes,
            in_time=body.in_time,
            in_berry_temp=body.in_berry_temp,
            out_time=body.out_time,
            out_berry_temp=body.out_berry_temp,
            created_by=user.id,
        )
        db.add(record)
        records.append(record)

    db.flush()
    for record in records:
        if _is_complete(record):
            _apply_completion(db, record)
    db.commit()
    for record in records:
        db.refresh(record)
    return [_read(r) for r in records]


@router.patch("/pre-cooling/{record_id}/complete", response_model=PreCoolingRead)
def complete_pre_cooling(
    record_id: int,
    body: PreCoolingComplete,
    db: Session = Depends(get_db),
    _: User = Depends(_pre_cooling_roles),
):
    record = db.get(PreCoolingRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Pre-cooling record not found")
    if record.out_time is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This pre-cooling record is already completed",
        )
    record.out_time = body.out_time
    record.out_berry_temp = body.out_berry_temp
    if _is_complete(record):
        _apply_completion(db, record)
    db.commit()
    db.refresh(record)
    return _read(record)


@router.get("/pre-cooling", response_model=list[PreCoolingRead])
def list_pre_cooling(
    incomplete_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(PreCoolingRecord).order_by(PreCoolingRecord.id.desc())
    if incomplete_only:
        stmt = stmt.where(PreCoolingRecord.out_time.is_(None))
    return [_read(r) for r in db.scalars(stmt)]
