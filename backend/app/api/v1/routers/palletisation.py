"""
Palletisation (Phase 10). Office Worker.

POST /pallets — create a pallet from one or more lots (R35: multi-lot
                allowed; service enforces the per-lot box cap — total boxes
                palletised from a lot can never exceed what was packed).
GET  /pallets — list with lot links.

Pallet ID: PAL-YYYYMMDD-<seq> (assumption — format pending CEO, Open
Question #10; unique + human-readable, safe to change later).

Season-registration status: creating a pallet advances every involved
registration PACKED -> PALLETISED (only when currently PACKED — a lot from
an already-PALLETISED registration doesn't regress or double-advance).
"""

from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func as sa_func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import PalletStatus, RegistrationStatus, UserRole
from app.models.packaging import PackagingRecord
from app.models.palletisation import Pallet, PalletisationLot
from app.models.user import User
from app.schemas.palletisation import PalletCreate, PalletLotRead, PalletRead

router = APIRouter()


def _pallet_read(pallet: Pallet) -> PalletRead:
    out = PalletRead.model_validate(pallet)
    out.lots = [
        PalletLotRead.model_validate(link).model_copy(
            update={"lot_id": link.packaging_record.lot_id}
        )
        for link in pallet.palletisation_lots
    ]
    return out


def _generate_pallet_id(db: Session, on_date: date_cls) -> str:
    base = f"PAL-{on_date.strftime('%Y%m%d')}"
    count = db.scalar(
        select(sa_func.count(Pallet.id)).where(Pallet.pallet_id.like(f"{base}-%"))
    ) or 0
    seq = count + 1
    while db.scalar(select(Pallet).where(Pallet.pallet_id == f"{base}-{seq}")) is not None:
        seq += 1
    return f"{base}-{seq}"


@router.post("/pallets", response_model=PalletRead, status_code=status.HTTP_201_CREATED)
def create_pallet(
    body: PalletCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.OFFICE_WORKER)),
):
    total_boxes = 0
    registrations = {}
    for lot in body.lots:
        record = db.get(PackagingRecord, lot.packaging_record_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Packaging record {lot.packaging_record_id} not found")

        already = db.scalar(
            select(sa_func.coalesce(sa_func.sum(PalletisationLot.num_boxes), 0)).where(
                PalletisationLot.packaging_record_id == record.id
            )
        ) or 0
        if already + lot.num_boxes > record.num_boxes:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Lot {record.lot_id}: only {record.num_boxes - already} boxes "
                    f"remain unpalletised, requested {lot.num_boxes}"
                ),
            )
        total_boxes += lot.num_boxes
        reg = record.harvest.season_registration
        registrations[reg.id] = reg

    on_date = body.date or date_cls.today()
    pallet = Pallet(
        pallet_id=_generate_pallet_id(db, on_date),
        date=body.date,
        pallet_type=body.pallet_type,
        total_boxes=total_boxes,
        notes=body.notes,
        status=PalletStatus.CREATED,
        created_by=user.id,
    )
    for lot in body.lots:
        pallet.palletisation_lots.append(
            PalletisationLot(
                packaging_record_id=lot.packaging_record_id, num_boxes=lot.num_boxes
            )
        )
    db.add(pallet)

    for reg in registrations.values():
        if reg.status == RegistrationStatus.PACKED:
            reg.status = RegistrationStatus.PALLETISED

    db.commit()
    db.refresh(pallet)
    return _pallet_read(pallet)


@router.get("/pallets", response_model=list[PalletRead])
def list_pallets(
    status_filter: PalletStatus | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Pallet).order_by(Pallet.id.desc())
    if status_filter is not None:
        stmt = stmt.where(Pallet.status == status_filter)
    return [_pallet_read(p) for p in db.scalars(stmt)]


@router.get("/pallets/{pallet_pk}", response_model=PalletRead)
def get_pallet(pallet_pk: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    pallet = db.get(Pallet, pallet_pk)
    if pallet is None:
        raise HTTPException(status_code=404, detail="Pallet not found")
    return _pallet_read(pallet)
