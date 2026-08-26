"""
seasons — PHASE_MAP.md Section 7, Phase 0 (added 2026-08-11).

Admin-managed. A season has a year, a start date, an end date, and
optional notes. Only one season can be active at a time (R55).

Shape reconciled 2026-08-23 to match the frontend's `seasons` feature
(built and reviewed independently of the original backend pass): the
frontend uses `year` (int) + `status` ('active' | 'closed') + `notes`,
not `name` (string) + `is_active` (boolean). The frontend is authoritative
here per project decision — see BACKEND_CHANGELOG.md.
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    # 'active' | 'closed' — only one row may be 'active' at a time (R55),
    # enforced at the service/router layer, not a DB constraint.
    status = Column(String, nullable=False, default="active")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    created_by_user = relationship(
        "User", back_populates="seasons_created", foreign_keys=[created_by]
    )
    season_registrations = relationship("SeasonRegistration", back_populates="season")
