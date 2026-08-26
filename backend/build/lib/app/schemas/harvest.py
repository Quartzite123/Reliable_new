"""Schemas for harvests + vehicle trips (Phase 5).

A harvest is created WITH its vehicle trips (min 1) in one request —
matching the screen design: harvest header + repeatable vehicle rows."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class VehicleTripCreate(BaseModel):
    vehicle_no: str | None = None
    driver_name: str | None = None
    num_crates: int | None = Field(default=None, ge=0)
    approx_weight_kg: Decimal | None = Field(default=None, ge=0)


class VehicleTripRead(ORMModel):
    id: int
    harvest_id: int
    vehicle_no: str | None
    driver_name: str | None
    num_crates: int | None
    approx_weight_kg: Decimal | None
    is_weighed: bool = False  # filled by router — True once a weighing record exists


class HarvestCreate(BaseModel):
    harvest_date: date
    supervisor_name: str | None = None
    supervisor_contact: str | None = None
    vehicle_trips: list[VehicleTripCreate] = Field(min_length=1)


class HarvestRead(ORMModel):
    id: int
    season_registration_id: int
    harvest_date: date
    supervisor_name: str | None
    supervisor_contact: str | None
    created_by: int
    created_at: datetime
    vehicle_trips: list[VehicleTripRead] = []
