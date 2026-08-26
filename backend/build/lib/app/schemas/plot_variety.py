"""Schemas for plot varieties (Phase 2 — multi-variety plots, R57)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class PlotVarietyCreate(BaseModel):
    variety_name: str = Field(min_length=1)


class PlotVarietyRead(ORMModel):
    id: int
    plot_id: int
    variety_name: str
    created_at: datetime
