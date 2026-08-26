"""
Harvesting (Phase 5). Field Worker.

POST /registrations/{id}/harvests — harvest header + 1..N vehicle trips in
                                    one request. Gate: UNDER_CONTRACT or
                                    HARVESTED_PARTIAL/WEIGHED (multi-round, R26)
GET  /registrations/{id}/harvests — rounds with trips + weighed flags
GET  /harvests/{harvest_id}       — single harvest with its vehicle trips
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.models.harvest import Harvest, VehicleTrip
from app.models.user import User
from app.schemas.harvest import HarvestCreate, HarvestRead, VehicleTripRead
from app.services import status_machine
from app.api.v1.routers.plots import get_registration_or_404

router = APIRouter()


def _harvest_to_read(harvest: Harvest) -> HarvestRead:
    data = HarvestRead.model_validate(harvest)
    data.vehicle_trips = [
        VehicleTripRead.model_validate(trip).model_copy(
            update={"is_weighed": trip.weighing_record is not None}
        )
        for trip in harvest.vehicle_trips
    ]
    return data


@router.post(
    "/registrations/{reg_id}/harvests",
    response_model=HarvestRead,
    status_code=status.HTTP_201_CREATED,
)
def record_harvest(
    reg_id: int,
    body: HarvestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FIELD_WORKER)),
):
    reg = get_registration_or_404(reg_id, db)
    status_machine.can_record_harvest(reg)

    harvest = Harvest(
        season_registration_id=reg.id,
        harvest_date=body.harvest_date,
        supervisor_name=body.supervisor_name,
        supervisor_contact=body.supervisor_contact,
        created_by=user.id,
    )
    for trip in body.vehicle_trips:
        harvest.vehicle_trips.append(VehicleTrip(**trip.model_dump()))

    db.add(harvest)
    status_machine.apply_harvest_recorded(reg)
    db.commit()
    db.refresh(harvest)
    return _harvest_to_read(harvest)


@router.get("/registrations/{reg_id}/harvests", response_model=list[HarvestRead])
def list_harvests(
    reg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    get_registration_or_404(reg_id, db)
    harvests = db.scalars(
        select(Harvest)
        .options(selectinload(Harvest.vehicle_trips).selectinload(VehicleTrip.weighing_record))
        .where(Harvest.season_registration_id == reg_id)
        .order_by(Harvest.harvest_date)
    )
    return [_harvest_to_read(h) for h in harvests]


def get_harvest_or_404(harvest_id: int, db: Session) -> Harvest:
    harvest = db.get(
        Harvest,
        harvest_id,
        options=[selectinload(Harvest.vehicle_trips).selectinload(VehicleTrip.weighing_record)],
    )
    if harvest is None:
        raise HTTPException(status_code=404, detail="Harvest not found")
    return harvest


@router.get("/harvests/{harvest_id}", response_model=HarvestRead)
def get_harvest(
    harvest_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    harvest = get_harvest_or_404(harvest_id, db)
    return _harvest_to_read(harvest)
