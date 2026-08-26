"""
farmers, bank_details — PHASE_MAP.md Section 7.

Both permanent records (Design Principle #4 — persistent records, seasonal
actions). bank_details is 1:1 with farmer, kept as a separate table so bank
info can be added after the farmer record exists (not required to create a
farmer — only required before a Contract can be created, R23).
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import FarmerStatus
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    mobile = Column(String, nullable=False, index=True)
    ggn_number = Column(String, nullable=True)  # GlobalG.A.P. number, per farmer
    status = Column(SAEnum(FarmerStatus, name="farmer_status", values_callable=_values), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    bank_details = relationship("BankDetails", back_populates="farmer", uselist=False)
    plots = relationship("Plot", back_populates="farmer")


class BankDetails(Base):
    __tablename__ = "bank_details"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), unique=True, nullable=False)
    account_holder_name = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    ifsc_code = Column(String, nullable=False)
    branch_name = Column(String, nullable=True)  # explicitly "optional" in spec
    passbook_photo_url = Column(String, nullable=True)  # file upload — may be added after initial save
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    farmer = relationship("Farmer", back_populates="bank_details")
