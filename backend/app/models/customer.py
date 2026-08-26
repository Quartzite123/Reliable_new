"""
customers — PHASE_MAP.md Section 7, "New tables (decided during phase-map
review)". Replaces the plain-string customer_name / customer columns from
the original working drafts (packaging_records, item_master_products) —
needed for real cascading dropdowns and BOM lookups, not string matching.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, nullable=True)  # optional
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    packaging_records = relationship("PackagingRecord", back_populates="customer")
    item_master_products = relationship("ItemMasterProduct", back_populates="customer")
