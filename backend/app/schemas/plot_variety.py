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


class PlotVarietyRead(ORMModel):
    id: int
    plot_id: int
    variety_name: str
    area_acres: Decimal | None
    created_at: datetime
