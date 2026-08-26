"""Schemas for arrival QC (Phase 7) — same quality parameters as Field QC,
independent inspection, one per harvest (DB-enforced unique)."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.core.enums import ArrivalQCResult, OverallObservation
from app.schemas.common import ORMModel


class ArrivalQCCreate(BaseModel):
    inspection_date: date
    fruit_colour_green_pct: Decimal | None = None
    fruit_colour_milky_pct: Decimal | None = None
    fruit_colour_yellow_pct: Decimal | None = None
    tss_percent: Decimal | None = None
    thrips_percent: Decimal | None = None
    bhuri_percent: Decimal | None = None
    black_spot_percent: Decimal | None = None
    cercospora_percent: Decimal | None = None
    overall_observation: OverallObservation | None = None
    notes: str | None = None
    result: ArrivalQCResult


class ArrivalQCRead(ORMModel):
    id: int
    harvest_id: int
    inspection_date: date
    fruit_colour_green_pct: Decimal | None
    fruit_colour_milky_pct: Decimal | None
    fruit_colour_yellow_pct: Decimal | None
    tss_percent: Decimal | None
    thrips_percent: Decimal | None
    bhuri_percent: Decimal | None
    black_spot_percent: Decimal | None
    cercospora_percent: Decimal | None
    overall_observation: OverallObservation | None
    notes: str | None
    result: ArrivalQCResult
    inspected_by: int
    created_at: datetime
