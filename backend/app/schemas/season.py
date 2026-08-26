"""Schemas for Season Management (Phase 0)."""

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel


class SeasonCreate(BaseModel):
    name: str = Field(min_length=1, description='e.g. "2025-26"')
    start_date: date
    end_date: date
    is_active: bool = False

    @model_validator(mode="after")
    def _end_after_start(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class SeasonUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _end_after_start(self):
        if self.start_date is not None and self.end_date is not None:
            if self.end_date <= self.start_date:
                raise ValueError("end_date must be after start_date")
        return self


class SeasonRead(ORMModel):
    id: int
    name: str
    start_date: date
    end_date: date
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: datetime
