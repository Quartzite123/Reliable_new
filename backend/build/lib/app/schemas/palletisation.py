"""Schemas for palletisation (Phase 10) and pre-cooling (Phase 11)."""

import datetime as dt
from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import PalletStatus, PalletType
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- Pallets
class PalletLotInput(BaseModel):
    packaging_record_id: int
    num_boxes: int = Field(gt=0)


class PalletCreate(BaseModel):
    date: dt.date | None = None
    pallet_type: PalletType
    notes: str | None = None
    lots: list[PalletLotInput] = Field(min_length=1)


class PalletLotRead(ORMModel):
    id: int
    packaging_record_id: int
    num_boxes: int
    lot_id: str = ""  # filled by router from the packaging record


class PalletRead(ORMModel):
    id: int
    pallet_id: str
    date: dt.date | None
    pallet_type: PalletType
    total_boxes: int | None
    notes: str | None
    status: PalletStatus
    created_by: int
    created_at: datetime
    lots: list[PalletLotRead] = []


# ---------------------------------------------------------------- Pre-cooling
class PreCoolingCreate(BaseModel):
    """Batch entry: one record is created per pallet_id (frontend prompt §18).
    Out-fields omitted = partial save; complete later via PATCH."""

    pallet_ids: list[int] = Field(min_length=1)
    date: dt.date | None = None
    num_boxes: int | None = Field(default=None, ge=0)
    in_time: time | None = None
    in_berry_temp: Decimal | None = None
    out_time: time | None = None
    out_berry_temp: Decimal | None = None


class PreCoolingComplete(BaseModel):
    out_time: time
    out_berry_temp: Decimal


class PreCoolingRead(ORMModel):
    id: int
    pallet_id: int
    date: dt.date | None
    num_pallets: int | None
    num_boxes: int | None
    in_time: time | None
    in_berry_temp: Decimal | None
    out_time: time | None
    out_berry_temp: Decimal | None
    created_by: int
    created_at: datetime
    is_complete: bool = False  # filled by router: all four time/temp fields present
