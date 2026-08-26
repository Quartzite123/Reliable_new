"""Schemas for contracts (Phase 4)."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ContractCreate(BaseModel):
    contract_date: date | None = None
    rate_per_kg: Decimal = Field(gt=0)
    rejection_percent: Decimal = Field(default=Decimal("7.00"), ge=0, le=100)


class ContractRead(ORMModel):
    id: int
    season_registration_id: int
    contract_date: date | None
    rate_per_kg: Decimal
    rejection_percent: Decimal
    created_by: int
    created_at: datetime
