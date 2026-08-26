"""
plot_varieties — PHASE_MAP.md Section 7, Phase 2 (added 2026-08-11).

A single plot can grow multiple grape varieties. Each variety is registered
here. Each variety runs its own independent pipeline — its own
season_registration, Field QC, Lab Sample, Contract, and Harvest.

See Business_Rules.md R7, R57, CLAUDE.md Discovery 3.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlotVariety(Base):
    __tablename__ = "plot_varieties"
    __table_args__ = (
        UniqueConstraint("plot_id", "variety_name", name="uq_plot_varieties_plot_variety"),
    )

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False)
    variety_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    plot = relationship("Plot", back_populates="plot_varieties")
    season_registrations = relationship("SeasonRegistration", back_populates="plot_variety")
