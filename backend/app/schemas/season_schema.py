"""
Schemas for Season Management (Phase 0).

Field names and shapes are matched exactly to the frontend's
`features/seasons/types.ts` (Season, CreateSeasonInput, UpdateSeasonInput)
— see BACKEND_CHANGELOG.md for the reconciliation note. The httpClient's
snake_case/camelCase transform means `start_date` <-> `startDate`,
`end_date` <-> `endDate`, etc. automatically; `year`, `notes`, and `status`
pass through unchanged since they're already single words.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel

SeasonStatus = Literal["active", "closed"]


class SeasonCreate(BaseModel):
    year: int = Field(ge=2020, le=2100)
    start_date: date
    end_date: date
    notes: str | None = None

    @model_validator(mode="after")
    def _end_not_before_start(self):
        # Frontend's zod schema allows end_date == start_date (uses >=,
        # despite the UI copy saying "must be after") — matched here.
        if self.end_date < self.start_date:
            raise ValueError("End date must be after start date.")
        return self


class SeasonUpdate(BaseModel):
    """Full-replace body for PUT /seasons/{id} — matches frontend's UpdateSeasonInput (id comes from the path, not the body)."""

    year: int = Field(ge=2020, le=2100)
    start_date: date
    end_date: date
    notes: str | None = None

    @model_validator(mode="after")
    def _end_not_before_start(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be after start date.")
        return self


class SeasonRead(ORMModel):
    id: int
    year: int
    start_date: date
    end_date: date
    notes: str | None = None
    status: SeasonStatus
    created_at: datetime
    updated_at: datetime
