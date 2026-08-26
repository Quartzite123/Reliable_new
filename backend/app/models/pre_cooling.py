"""
pre_cooling_records — PHASE_MAP.md Section 7, Phase 11.

out_time / out_berry_temp are explicitly nullable — supports the partial-
save workflow (log in-time now, complete out-time later). A pallet's
status flips from 'created' to 'pre_cooling' only once all four time/temp
fields are filled (R45 gate) — enforced at the service layer, not here.
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, Time, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class PreCoolingRecord(Base):
    __tablename__ = "pre_cooling_records"

    id = Column(Integer, primary_key=True, index=True)
    pallet_id = Column(Integer, ForeignKey("pallets.id"), nullable=False)
    date = Column(Date, nullable=True)
    num_pallets = Column(Integer, nullable=True)  # usually 1, but supports batch entry context
    num_boxes = Column(Integer, nullable=True)
    in_time = Column(Time, nullable=True)
    in_berry_temp = Column(Numeric, nullable=True)  # °C
    out_time = Column(Time, nullable=True)  # explicitly nullable — filled later
    out_berry_temp = Column(Numeric, nullable=True)  # explicitly nullable — filled later
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    pallet = relationship("Pallet", back_populates="pre_cooling_records")
    created_by_user = relationship(
        "User", back_populates="pre_cooling_records_created", foreign_keys=[created_by]
    )
