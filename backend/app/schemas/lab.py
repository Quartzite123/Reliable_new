"""Schemas for lab samples (Phase 3). Reference info (farmer/plot) is NOT
part of the create body — the lab worker never re-types it (R15b); the
frontend reads it from the registration detail endpoint."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.core.enums import LabResult
from app.schemas.common import ORMModel


class LabSampleCreate(BaseModel):
    lab_name: str | None = None
    sampling_date: date | None = None
    seal_no: str | None = None
    variety_confirmed: str | None = None
    area_ha_2a: Decimal | None = None
    yield_4b_mt: Decimal | None = None
    remark: str | None = None
    tss_value: Decimal | None = None
    result: LabResult


class LabSampleRead(ORMModel):
    id: int
    season_registration_id: int
    lab_name: str | None
    sampling_date: date | None
    seal_no: str | None
    variety_confirmed: str | None
    area_ha_2a: Decimal | None
    yield_4b_mt: Decimal | None
    seal_photo_url: str | None
    documents_2a4b_url: str | None
    remark: str | None
    tss_value: Decimal | None
    result: LabResult
    entered_by: int
    created_at: datetime
