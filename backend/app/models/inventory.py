"""
item_master_materials, item_master_products, bom_entries, stock_movements
— PHASE_MAP.md Section 7, Phase 9A/9B.

`item_master_products.variety` is a plain String, same reasoning as
plots.variety (see plot.py docstring) — no Variety enum exists.
`item_master_products.customer_id` is an FK to customers (Section 9
resolution — was a plain string in the original drafts).

Current stock for a material is always computed as
`SUM(quantity) GROUP BY material_id` over stock_movements — intentionally
not a stored column anywhere (avoids sync issues, PHASE_MAP.md Section 7).
"""

from sqlalchemy import (
    Boolean,
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

from app.core.enums import ComplianceType, MaterialType, MovementType, PackSize, ScaleLevel, UnitOfMeasure
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class ItemMasterMaterial(Base):
    __tablename__ = "item_master_materials"

    id = Column(Integer, primary_key=True, index=True)
    material_type = Column(
        SAEnum(MaterialType, name="material_type", values_callable=_values), nullable=False
    )
    variant_name = Column(String, nullable=False)
    unit_of_measure = Column(
        SAEnum(UnitOfMeasure, name="unit_of_measure", values_callable=_values), nullable=False
    )
    scale_level = Column(SAEnum(ScaleLevel, name="scale_level", values_callable=_values), nullable=False)
    reorder_point = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)  # no delete — deactivate
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    created_by_user = relationship(
        "User", back_populates="item_master_materials_created", foreign_keys=[created_by]
    )
    bom_entries = relationship("BOMEntry", back_populates="material")
    stock_movements = relationship("StockMovement", back_populates="material")


class ItemMasterProduct(Base):
    __tablename__ = "item_master_products"

    id = Column(Integer, primary_key=True, index=True)
    variety = Column(String, nullable=False)  # see module docstring — no Variety enum exists
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    pack_size = Column(SAEnum(PackSize, name="pack_size", values_callable=_values), nullable=False)
    compliance_type = Column(
        SAEnum(ComplianceType, name="compliance_type", values_callable=_values), nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="item_master_products")
    bom_entries = relationship("BOMEntry", back_populates="product")


class BOMEntry(Base):
    __tablename__ = "bom_entries"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("item_master_products.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("item_master_materials.id"), nullable=False)
    qty_per_container = Column(Integer, nullable=False)
    qty_per_box = Column(Numeric, nullable=True)  # calculated: qty_per_container / boxes_per_container
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    product = relationship("ItemMasterProduct", back_populates="bom_entries")
    material = relationship("ItemMasterMaterial", back_populates="bom_entries")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("item_master_materials.id"), nullable=False)
    movement_type = Column(
        SAEnum(MovementType, name="movement_type", values_callable=_values), nullable=False
    )
    quantity = Column(Integer, nullable=False)  # positive for in/found, negative for out/lost
    date = Column(Date, nullable=True)
    supplier_name = Column(String, nullable=True)  # stock-in only
    reference = Column(String, nullable=True)  # invoice/challan no.
    reason = Column(Text, nullable=True)  # required (at app level) when movement_type = adjustment
    packaging_record_id = Column(
        Integer, ForeignKey("packaging_records.id"), nullable=True
    )  # explicitly nullable in spec — set only for auto_out
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    material = relationship("ItemMasterMaterial", back_populates="stock_movements")
    packaging_record = relationship("PackagingRecord", back_populates="stock_movements")
    created_by_user = relationship(
        "User", back_populates="stock_movements_created", foreign_keys=[created_by]
    )
