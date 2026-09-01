"""
Weighing Record (Phase 6). Field Worker (packhouse supervisor).

GET  /weighing/pending?farmer_id= — un-weighed vehicle trips (the dropdown
                                    the supervisor picks from)
GET  /weighing?harvest_id=        — weighing records, optionally filtered by harvest
GET  /weighing/{id}               — single weighing record
POST /vehicle-trips/{id}/weighing — one weighing per trip (weighing slip #937 addendum).
                                    Service:
                                    * derives tare_weight_kg from crate count ×
                                      company_settings.crate_tare_weight_kg
                                      (fallback 1.6 kg) and net_fruit_weight_kg
                                      from gross − tare; total_weight_kg on the
                                      record IS that net figure ("Gross Weight"
                                      on the slip, i.e. post-tare/pre-rejection)
                                    * charges a FIXED 7% rejection (founder-
                                      confirmed, app/core/constants.py) —
                                      not read from the contract, not
                                      capped/split against actual observed
                                      rejection. actual_rejection_pct is
                                      still captured (operator-entered) but
                                      is informational only, never charged (R28)
                                    * flags crate mismatch vs harvest count
                                      (red inline warning, does NOT block)
POST /weighing/{id}/slip-photo    — weighbridge slip photo (camera upload)

Everything in this file is scoped to the weighing phase alone (Step 3
conversion, 2026-09-01) — no other feature reads or writes weighing data,
so GET /weighing and GET /weighing/{id}'s former FIELD_WORKER/OFFICE_WORKER
role gate collapses to the same single phase as the rest of the file.
Role is no longer checked anywhere in this file.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.core.constants import FARMER_REJECTION_PCT
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.company_settings import CompanySettings
from app.models.harvest import Harvest, VehicleTrip
from app.models.plot import Plot, SeasonRegistration
from app.models.user import User
from app.models.weighing import WeighingRecord
from app.schemas.weighing import PendingTripRead, WeighingCreate, WeighingRead
from app.services import status_machine

DEFAULT_CRATE_TARE_WEIGHT_KG = Decimal("1.6")


def _crate_tare_weight_kg(db: Session) -> Decimal:
    """Slip #937 addendum — configurable per company_settings, falls back to 1.6 kg if no row exists."""
    settings = db.scalars(select(CompanySettings)).first()
    if settings is not None and settings.crate_tare_weight_kg is not None:
        return Decimal(settings.crate_tare_weight_kg)
    return DEFAULT_CRATE_TARE_WEIGHT_KG

router = APIRouter()

_weighing_phase = Depends(require_phase(PhaseKey.WEIGHING))


def _trip_with_context(trip: VehicleTrip) -> PendingTripRead:
    reg = trip.harvest.season_registration
    return PendingTripRead(
        id=trip.id,
        harvest_id=trip.harvest_id,
        vehicle_no=trip.vehicle_no,
        driver_name=trip.driver_name,
        num_crates=trip.num_crates,
        approx_weight_kg=trip.approx_weight_kg,
        farmer_name=reg.plot.farmer.name,
        variety=reg.plot.variety,
        harvest_date=trip.harvest.harvest_date,
    )


@router.get("/weighing/pending", response_model=list[PendingTripRead], dependencies=[_weighing_phase])
def pending_trips(
    farmer_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = (
        select(VehicleTrip)
        .join(VehicleTrip.harvest)
        .join(Harvest.season_registration)
        .join(SeasonRegistration.plot)
        .options(
            selectinload(VehicleTrip.harvest)
            .selectinload(Harvest.season_registration)
            .selectinload(SeasonRegistration.plot)
            .selectinload(Plot.farmer)
        )
        .where(~VehicleTrip.weighing_record.has())
        .order_by(VehicleTrip.id)
    )
    if farmer_id is not None:
        stmt = stmt.where(Plot.farmer_id == farmer_id)
    return [_trip_with_context(t) for t in db.scalars(stmt)]


def _weighing_response(record: WeighingRecord, trip: VehicleTrip) -> WeighingRead:
    out = WeighingRead.model_validate(record)
    # Tare/gross/net breakdown lives on the trip, not the weighing record —
    # see models/weighing.py docstring.
    out.crate_count_at_weighing = trip.crate_count_at_weighing
    out.gross_weight_kg = trip.gross_weight_kg
    out.tare_weight_kg = trip.tare_weight_kg
    out.net_fruit_weight_kg = trip.net_fruit_weight_kg
    if (
        trip.num_crates is not None
        and record.num_crates is not None
        and trip.num_crates != record.num_crates
    ):
        out.crate_mismatch = True
        out.crate_mismatch_message = (
            f"Harvest recorded {trip.num_crates} crates, weighing shows "
            f"{record.num_crates} — please verify"
        )
    return out


@router.get("/weighing", response_model=list[WeighingRead], dependencies=[_weighing_phase])
def list_weighing(
    harvest_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = (
        select(WeighingRecord)
        .join(WeighingRecord.vehicle_trip)
        .options(selectinload(WeighingRecord.vehicle_trip))
        .order_by(WeighingRecord.created_at.desc())
    )
    if harvest_id is not None:
        stmt = stmt.where(VehicleTrip.harvest_id == harvest_id)
    records = db.scalars(stmt)
    return [_weighing_response(r, r.vehicle_trip) for r in records]


@router.get("/weighing/{record_id}", response_model=WeighingRead, dependencies=[_weighing_phase])
def get_weighing(record_id: int, db: Session = Depends(get_db)):
    record = db.get(WeighingRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Weighing record not found")
    return _weighing_response(record, record.vehicle_trip)


@router.post(
    "/vehicle-trips/{trip_id}/weighing",
    response_model=WeighingRead,
    status_code=status.HTTP_201_CREATED,
)
def record_weighing(
    trip_id: int,
    body: WeighingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_phase(PhaseKey.WEIGHING)),
):
    trip = db.get(VehicleTrip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Vehicle trip not found")
    if trip.weighing_record is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This vehicle trip has already been weighed",
        )

    reg = trip.harvest.season_registration
    status_machine.can_record_weighing(reg)

    tare_rate = _crate_tare_weight_kg(db)
    tare_weight_kg = (Decimal(body.crate_count_at_weighing) * tare_rate).quantize(Decimal("0.01"))
    gross_weight_kg = Decimal(body.gross_weight_kg)
    net_fruit_weight_kg = (gross_weight_kg - tare_weight_kg).quantize(Decimal("0.01"))

    total = net_fruit_weight_kg  # "Gross Weight" on the slip = post-tare, pre-rejection
    # Fixed 7% deduction, founder-confirmed — not negotiated, not compared
    # against actual observed rejection. See app/core/constants.py.
    rejection_kg = (total * FARMER_REJECTION_PCT / Decimal(100)).quantize(Decimal("0.01"))
    net_kg = (total - rejection_kg).quantize(Decimal("0.01"))

    trip.crate_count_at_weighing = body.crate_count_at_weighing
    trip.gross_weight_kg = gross_weight_kg
    trip.tare_weight_kg = tare_weight_kg
    trip.net_fruit_weight_kg = net_fruit_weight_kg

    record = WeighingRecord(
        vehicle_trip_id=trip.id,
        date=body.date,
        slip_no=body.slip_no,
        supervisor_name=body.supervisor_name,
        num_crates=body.crate_count_at_weighing,
        total_weight_kg=total,
        rejection_pct=FARMER_REJECTION_PCT,               # the fixed rate actually charged
        actual_rejection_pct=body.actual_rejection_pct,   # observed only — recorded, never charged
        rejection_kg=rejection_kg,                        # calculated from the fixed rate only
        net_weight_kg=net_kg,              # calculated server-side
        slip_serial_no=body.slip_serial_no,
        load_id=body.load_id,
        harvester_no=body.harvester_no,
        no_crt_reci=body.no_crt_reci,
        knitting=body.knitting,
        produce_type=body.produce_type,
        average_size=body.average_size,
        average_sugar=body.average_sugar,
        village_name=body.village_name,
        contact_no=body.contact_no,
        crate_tare_weight_kg=tare_rate,
        created_by=user.id,
    )
    db.add(record)
    db.flush()  # so trip.weighing_record resolves below
    db.refresh(trip)
    status_machine.apply_weighing_recorded(db, reg)
    db.commit()
    db.refresh(record)
    return _weighing_response(record, trip)


@router.post("/weighing/{record_id}/slip-photo", response_model=WeighingRead, dependencies=[_weighing_phase])
def upload_slip_photo(record_id: int, file: UploadFile, db: Session = Depends(get_db)):
    from app.utils.file_upload import save_upload

    record = db.get(WeighingRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Weighing record not found")
    record.slip_photo_url = save_upload(file, "weighing-slips")
    db.commit()
    db.refresh(record)
    return _weighing_response(record, record.vehicle_trip)
