"""Schemas for plot varieties (Phase 2 — multi-variety plots, R57)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class PlotVarietyCreate(BaseModel):
    variety_name: str = Field(min_length=1)
    # Nullable — field measurement is imprecise and workers won't always
    # subdivide acreage cleanly at registration time. See models/plot_variety.py.
    area_acres: Decimal | None = None


class PlotVarietyUpdate(BaseModel):
    """
    area_acres only — deliberately no variety_name. season_registrations
    reference a plot_variety by id, and every downstream record (Field QC,
    lab sample, contract, harvest...) traces back to "this variety" through
    that reference. Allowing a rename would silently change what an
    already-recorded inspection was performed on, after the fact, with
    nothing in the historical record showing it happened. Area carries no
    such risk — nothing downstream reads it for anything but display (see
    models/plot_variety.py), so correcting it is just fixing a number, not
    rewriting what a past record means.
    """

    area_acres: Decimal | None = None


class PlotVarietyRead(ORMModel):
    id: int
    plot_id: int
    variety_name: str
    area_acres: Decimal | None
    created_at: datetime
