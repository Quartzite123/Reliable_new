"""
contracts — PHASE_MAP.md Section 7. One per season_registration, only
creatable after lab_samples.result = Pass AND bank_details exist for the
farmer (R23 + Phase 1B derivation) — enforced at the service layer.
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    season_registration_id = Column(
        Integer, ForeignKey("season_registrations.id"), unique=True, nullable=False
    )
    contract_date = Column(Date, nullable=True)
    rate_per_kg = Column(Numeric, nullable=False)  # agreed price — core purpose of the record
    rejection_percent = Column(Numeric, default=7.00, nullable=False)  # default 7.00, editable, R24
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    season_registration = relationship("SeasonRegistration", back_populates="contract")
    created_by_user = relationship(
        "User", back_populates="contracts_created", foreign_keys=[created_by]
    )
