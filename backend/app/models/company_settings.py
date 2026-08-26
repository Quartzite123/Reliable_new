"""
company_settings — PHASE_MAP.md Section 7, "New tables (decided during
phase-map review)". Single-row Admin-managed config. Feeds the GGN number
(referenced from Phase 1 farmer/plot context, stamped onto Phase 8
packaging) and the PO letterhead (Phase 12). All columns nullable — the
Admin may fill this in incrementally rather than all at once.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=True)
    company_address = Column(Text, nullable=True)
    company_phone = Column(String, nullable=True)
    company_gst_number = Column(String, nullable=True)
    company_email = Column(String, nullable=True)
    ggn_number = Column(String, nullable=True)
    # Phase 6 weighing: tare weight per empty crate, used to derive net fruit
    # weight from a trip's gross scale reading. Nullable — the weighing
    # service falls back to 1.6 kg when no company_settings row exists yet.
    crate_tare_weight_kg = Column(Numeric(4, 2), nullable=True, default=1.6)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    updated_by_user = relationship(
        "User", back_populates="company_settings_updated", foreign_keys=[updated_by]
    )
