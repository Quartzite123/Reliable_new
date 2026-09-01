"""
packaging_records — PHASE_MAP.md Section 7. Each row = one Lot; multiple
allowed per harvest (a harvest can split across customers/pack sizes).

pack_size and compliance_type are typed with the PackSize/ComplianceType
enums from app/core/enums.py even though PHASE_MAP.md's shorthand calls
them "string" — their documented value sets ("4 Kg/4.5 Kg/5 Kg",
"EU/Non-Testing") match those enums exactly, and the entire point of
Prompt 0's enums.py was a single source of truth for exactly these closed
sets, so using the enum here is more faithful than a free-text string.

customer_id is an FK to customers (see PHASE_MAP.md Section 9 resolution —
was originally a plain customer_name string in the working drafts).
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import ComplianceType, PackSize
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class PackagingRecord(Base):
    __tablename__ = "packaging_records"

    id = Column(Integer, primary_key=True, index=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), nullable=False)
    date = Column(Date, nullable=True)
    slip_no = Column(String, nullable=True)
    lot_id = Column(String, unique=True, nullable=False)  # system-generated, traceable
    pack_size = Column(SAEnum(PackSize, name="pack_size", values_callable=_values), nullable=False)
    compliance_type = Column(
        SAEnum(ComplianceType, name="compliance_type", values_callable=_values), nullable=False
    )
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    total_weight_kg = Column(Numeric, nullable=False)
    rejection_contract_kg = Column(Numeric, nullable=True)  # fixed 7% (FARMER_REJECTION_PCT), not from the contract despite the name
    net_weight_kg = Column(Numeric, nullable=True)  # calculated
    actual_rejection_kg = Column(Numeric, nullable=True)  # observed only, never charged
    actual_rejection_pct = Column(Numeric, nullable=True)  # calculated from actual_rejection_kg; observed only, never charged
    num_boxes = Column(Integer, nullable=False)
    num_pallets = Column(Integer, nullable=True)
    ggn_number = Column(String, nullable=True)  # copied from company_settings at time of packing
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    harvest = relationship("Harvest", back_populates="packaging_records")
    customer = relationship("Customer", back_populates="packaging_records")
    created_by_user = relationship(
        "User", back_populates="packaging_records_created", foreign_keys=[created_by]
    )
    palletisation_lots = relationship("PalletisationLot", back_populates="packaging_record")
    stock_movements = relationship("StockMovement", back_populates="packaging_record")
