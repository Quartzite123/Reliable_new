"""
arrival_qc — PHASE_MAP.md Section 7. One per harvest event (plot + day).
QC stage 2 of 3 (R21) — same quality parameters as field_qc but an
independent inspection (grapes can degrade in transit).

Reuses the OverallObservation enum from field_qc (same Good/Very
Good/Excellent scale) — see app/core/enums.py.
"""

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import relationship

from app.core.enums import ArrivalQCResult, OverallObservation
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class ArrivalQC(Base):
    __tablename__ = "arrival_qc"

    id = Column(Integer, primary_key=True, index=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), unique=True, nullable=False)
    inspection_date = Column(Date, nullable=True)
    fruit_colour_green_pct = Column(Numeric, nullable=True)
    fruit_colour_milky_pct = Column(Numeric, nullable=True)
    fruit_colour_yellow_pct = Column(Numeric, nullable=True)
    tss_percent = Column(Numeric, nullable=True)
    thrips_percent = Column(Numeric, nullable=True)
    bhuri_percent = Column(Numeric, nullable=True)
    black_spot_percent = Column(Numeric, nullable=True)
    cercospora_percent = Column(Numeric, nullable=True)
    overall_observation = Column(
        SAEnum(OverallObservation, name="overall_observation", values_callable=_values), nullable=True
    )
    result = Column(
        SAEnum(ArrivalQCResult, name="arrival_qc_result", values_callable=_values), nullable=False
    )
    notes = Column(Text, nullable=True)
    inspected_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    harvest = relationship("Harvest", back_populates="arrival_qc")
    inspected_by_user = relationship(
        "User", back_populates="arrival_qc_inspected", foreign_keys=[inspected_by]
    )
