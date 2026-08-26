"""
pallets, palletisation_lots — PHASE_MAP.md Section 7, Phase 10.

palletisation_lots is the one genuine junction table in this schema (pure
pallet<->packaging_record link, R35 — a pallet may hold boxes from
multiple lots) — per PHASE_MAP.md's explicit column listing it gets
created_at only, no updated_at, unlike every other table.

Business-rule constraint (enforced at the service layer, not the DB):
SUM(num_boxes) for a given packaging_record_id across all pallets must
not exceed that packaging record's num_boxes.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import PalletStatus, PalletType
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class Pallet(Base):
    __tablename__ = "pallets"

    id = Column(Integer, primary_key=True, index=True)
    pallet_id = Column(String, unique=True, nullable=False)  # system-generated, human-readable
    date = Column(Date, nullable=True)
    pallet_type = Column(SAEnum(PalletType, name="pallet_type", values_callable=_values), nullable=False)
    total_boxes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(SAEnum(PalletStatus, name="pallet_status", values_callable=_values), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    created_by_user = relationship(
        "User", back_populates="pallets_created", foreign_keys=[created_by]
    )
    palletisation_lots = relationship("PalletisationLot", back_populates="pallet")
    pre_cooling_records = relationship("PreCoolingRecord", back_populates="pallet")


class PalletisationLot(Base):
    __tablename__ = "palletisation_lots"

    id = Column(Integer, primary_key=True, index=True)
    pallet_id = Column(Integer, ForeignKey("pallets.id"), nullable=False)
    packaging_record_id = Column(Integer, ForeignKey("packaging_records.id"), nullable=False)
    num_boxes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    # No updated_at — junction table, per PHASE_MAP.md Section 7's explicit column list.

    pallet = relationship("Pallet", back_populates="palletisation_lots")
    packaging_record = relationship("PackagingRecord", back_populates="palletisation_lots")
