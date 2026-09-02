"""
plot_varieties — PHASE_MAP.md Section 7, Phase 2 (added 2026-08-11).

A single plot can grow multiple grape varieties. Each variety is registered
here. Each variety runs its own independent pipeline — its own
season_registration, Field QC, Lab Sample, Contract, and Harvest.

This is the authoritative source for variety, per-registration. `plots.variety`
still exists (see models/plot.py) but is legacy/denormalized — see that
column's own comment.

See Business_Rules.md R7, R57, CLAUDE.md Discovery 3.
"""

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.enums import Crop
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class PlotVariety(Base):
    __tablename__ = "plot_varieties"
    __table_args__ = (
        UniqueConstraint("plot_id", "variety_name", name="uq_plot_varieties_plot_variety"),
    )

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False)
    variety_name = Column(String, nullable=False)
    # Acres this variety occupies within the plot's total area (plots.area_acres) —
    # NOT the plot's full area. Added 2026-09-03 alongside the multi-variety
    # frontend work: lab sampling's area/yield figures are per-variety, and a
    # variety inheriting the plot's whole area would double every downstream
    # figure once a plot carries two varieties. Nullable — field measurement
    # is imprecise and workers won't always subdivide acreage cleanly at
    # registration time. Not validated against plots.area_acres at the DB
    # level; the UI flags a soft warning if the sum across a plot's varieties
    # exceeds the plot's total, but doesn't block on it, and doesn't flag an
    # under-total (unallocated/non-varietal area is normal).
    area_acres = Column(Numeric, nullable=True)
    # Forward-compatibility only — see app/core/enums.py::Crop. Single value
    # ('Grape') today; the form never asks, this just stops "grape" from
    # being an unstated assumption once a second crop's data starts landing
    # in this same table.
    crop = Column(SAEnum(Crop, name="crop", values_callable=_values), nullable=False, default=Crop.GRAPE, server_default="Grape")
    created_at = Column(DateTime, default=func.now(), nullable=False)

    plot = relationship("Plot", back_populates="plot_varieties")
    season_registrations = relationship("SeasonRegistration", back_populates="plot_variety")
