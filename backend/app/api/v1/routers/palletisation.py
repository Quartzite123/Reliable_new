"""
Palletisation (Phase 10). Packaging Supervisor.

POST /pallets — create a pallet from one or more lots (R35: multi-lot
                allowed; service enforces the per-lot box cap — total boxes
                palletised from a lot can never exceed what was packed).
GET  /pallets — list with lot links.

Pallet ID: PAL-YYYYMMDD-<seq> (assumption — format pending CEO, Open
Question #10; unique + human-readable, safe to change later).

Season-registration status: creating a pallet advances every involved
registration PACKED -> PALLETISED (only when currently PACKED — a lot from
an already-PALLETISED registration doesn't regress or double-advance).

GET /pallets, GET /pallets/{id} are scoped to {palletisation, pre_cooling}
— pre-cooling reads pallets to know what's ready to log
(features/preCooling/api.ts).

The write (POST /pallets) is gated on palletisation (Step 3 conversion,
2026-09-01), replacing require_role(OFFICE_WORKER) — which was itself a
bug: CLAUDE.md §6 moved Palletisation from Office Worker to a new
Packaging Supervisor role on 2026-08-11, but require_role(
PACKAGING_SUPERVISOR) never appeared anywhere in the codebase. Office
Worker (a role that no longer owns this phase) could create pallets;
Packaging Supervisor (who does) couldn't. The phase gate fixes this
directly — whoever holds the palletisation phase can act, regardless of
role label. A packagingsupervisor@reliablefresh.com dev account
(scripts/seed_users.py) now holds this phase.
"""

from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func as sa_func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PalletStatus, PhaseKey, RegistrationStatus
from app.models.packaging import PackagingRecord
from app.models.palletisation import Pallet, PalletisationLot
from app.models.user import User
from app.schemas.palletisation import PalletCreate, PalletLotRead, PalletRead

router = APIRouter()

_pallets_read_phases = Depends(require_phase(PhaseKey.PALLETISATION, PhaseKey.PRE_COOLING))


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
    user: User = Depends(require_phase(PhaseKey.PALLETISATION)),
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

    # Packed -> Palletised, set inline here rather than via a status_machine.py
    # guard function — this is one of the two exceptions status_machine.py's
    # module docstring names explicitly. No 409 on a registration in the
    # wrong status; it's silently skipped instead.
    for reg in registrations.values():
        if reg.status == RegistrationStatus.PACKED:
            reg.status = RegistrationStatus.PALLETISED

    db.commit()
    db.refresh(pallet)
    return _pallet_read(pallet)


@router.get("/pallets", response_model=list[PalletRead], dependencies=[_pallets_read_phases])
def list_pallets(
    status_filter: PalletStatus | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Pallet).order_by(Pallet.id.desc())
    if status_filter is not None:
        stmt = stmt.where(Pallet.status == status_filter)
    return [_pallet_read(p) for p in db.scalars(stmt)]


@router.get("/pallets/{pallet_pk}", response_model=PalletRead, dependencies=[_pallets_read_phases])
def get_pallet(pallet_pk: int, db: Session = Depends(get_db)):
    pallet = db.get(Pallet, pallet_pk)
    if pallet is None:
        raise HTTPException(status_code=404, detail="Pallet not found")
    return _pallet_read(pallet)
