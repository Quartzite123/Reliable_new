"""
purchase_orders, purchase_order_line_items — PHASE_MAP.md Section 7,
Phase 12. Farm-input procurement (fertilizers/agro-chemicals) — fully
standalone, no FK relationship to the packing-material inventory tables
in inventory.py (see PHASE_MAP.md Section 2/8 — this is a deliberate
separation, not an oversight).
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
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import POStatus
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, nullable=False)  # system-generated RF-PO##/YYYY-YY
    po_date = Column(Date, nullable=True)
    payment_terms = Column(String, nullable=True)
    supplier_ref = Column(String, nullable=True)
    other_refs = Column(String, nullable=True)
    dispatch_through = Column(String, default="Road Transport", nullable=False)
    destination = Column(String, nullable=True)
    supplier_name = Column(String, nullable=False)
    supplier_address = Column(Text, nullable=True)
    supplier_email = Column(String, nullable=True)
    supplier_gst = Column(String, nullable=True)
    assessable_value = Column(Numeric, nullable=True)  # calculated
    cgst_total = Column(Numeric, nullable=True)  # calculated
    sgst_total = Column(Numeric, nullable=True)  # calculated
    freight = Column(String, nullable=True)  # "At Actual" or a number
    other_charges = Column(Numeric, default=0, nullable=False)
    grand_total = Column(Numeric, nullable=True)  # calculated
    total_in_words = Column(String, nullable=True)  # auto-generated, Indian Lac/Crore format
    status = Column(SAEnum(POStatus, name="po_status", values_callable=_values), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    created_by_user = relationship(
        "User", back_populates="purchase_orders_created", foreign_keys=[created_by]
    )
    line_items = relationship("POLineItem", back_populates="purchase_order")


class POLineItem(Base):
    __tablename__ = "purchase_order_line_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    sr_no = Column(Integer, nullable=True)  # sequential, auto
    particulars = Column(String, nullable=False)  # product name/code
    hsn_code = Column(String, nullable=True)
    qty_kg = Column(Numeric, nullable=True)
    units = Column(Integer, nullable=True)
    kg_per_unit = Column(Numeric, nullable=True)
    make = Column(String, nullable=True)
    rate = Column(Numeric, nullable=True)
    gst_percent = Column(Numeric, nullable=True)
    amount = Column(Numeric, nullable=True)  # calculated: qty_kg * rate
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="line_items")
