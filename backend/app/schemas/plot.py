"""Schemas for plots, season registrations, and field QC (Phase 2).

The UI shows Plot Registration & Field QC as ONE combined screen (R15a),
but the API keeps them as separate composable operations so re-registration
(pre-filled plot, fresh QC) works cleanly. The frontend calls:
  1. POST /plots  (or PATCH /plots/{id} on re-registration edits)
  2. POST /plots/{id}/register        -> season registration
  3. POST /registrations/{id}/field-qc
"""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import (
    FieldQCResult,
    FruitColour,
    OverallObservation,
    RegistrationStatus,
)
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- Plot
class PlotCreate(BaseModel):
    farmer_id: int
    plot_number: str = Field(min_length=1, description='Placeholder "Plot-1" style, editable (R5)')
    mh_registration_number: str | None = Field(
        default=None,
        description="APEDA/NRC Grapes plot-level registration number, assigned per plot",
    )
    variety: str | None = None
    area_acres: Decimal | None = None
    village: str | None = None
    taluka: str | None = None
    survey_no: str | None = None
    gps_lat: Decimal | None = None
    gps_long: Decimal | None = None
    pruning_date: date | None = None
    approx_harvest_date: date | None = None


class PlotUpdate(BaseModel):
    plot_number: str | None = None
    mh_registration_number: str | None = None
    variety: str | None = None
    area_acres: Decimal | None = None
    village: str | None = None
    taluka: str | None = None
    survey_no: str | None = None
    gps_lat: Decimal | None = None
    gps_long: Decimal | None = None
    pruning_date: date | None = None
    approx_harvest_date: date | None = None


class PlotRead(ORMModel):
    id: int
    farmer_id: int
    plot_number: str
    mh_registration_number: str | None
    variety: str | None  # legacy/denormalized — see models/plot.py's comment on the column
    variety_names: list[str] = []  # authoritative — every variety this plot carries (plot_varieties)
    area_acres: Decimal | None
    village: str | None
    taluka: str | None
    survey_no: str | None
    gps_lat: Decimal | None
    gps_long: Decimal | None
    pruning_date: date | None
    approx_harvest_date: date | None
    created_at: datetime
    updated_at: datetime


# ------------------------------------------------- Season Registration
class SeasonRegistrationCreate(BaseModel):
    season_year: int = Field(ge=2020, le=2100)
    season_id: int | None = None  # FK to seasons table (preferred over season_year)
    # Required as of 2026-09-03 (alembic 9d2f6a1c8b3e made the DB column
    # NOT NULL) — was Optional, which let a caller omit it and hit a
    # confusing DB-level IntegrityError instead of a clean 422. Every
    # registration is for a specific variety now, including the
    # single-variety case (one plot_varieties row at minimum per plot).
    plot_variety_id: int = Field(description="FK to plot_varieties — per-variety pipeline (R57)")


class SeasonRegistrationRead(ORMModel):
    id: int
    plot_id: int
    season_year: int
    season_id: int | None = None
    plot_variety_id: int
    variety_name: str | None = None  # authoritative source for every reader — see models/plot.py
    status: RegistrationStatus
    registered_by: int
    registered_at: datetime


# ---------------------------------------------------------------- Field QC
class FieldQCCreate(BaseModel):
    inspection_date: date
    planned_sampling_date: date | None = None
    tentative_harvest_date: date | None = None
    fruit_colour: FruitColour | None = None
    tss_percent: Decimal | None = None
    thrips_percent: Decimal | None = None
    bhuri_percent: Decimal | None = None
    black_spot_percent: Decimal | None = None
    cercospora_percent: Decimal | None = None
    overall_observation: OverallObservation | None = None
    exportable_fruit_percent: Decimal | None = None
    notes: str | None = None
    result: FieldQCResult


class FieldQCRead(ORMModel):
    id: int
    season_registration_id: int
    inspection_date: date
    planned_sampling_date: date | None
    tentative_harvest_date: date | None
    fruit_colour: FruitColour | None
    tss_percent: Decimal | None
    thrips_percent: Decimal | None
    bhuri_percent: Decimal | None
    black_spot_percent: Decimal | None
    cercospora_percent: Decimal | None
    overall_observation: OverallObservation | None
    exportable_fruit_percent: Decimal | None
    notes: str | None
    result: FieldQCResult
    inspected_by: int
    created_at: datetime
