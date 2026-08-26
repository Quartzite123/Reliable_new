"""Schemas for Item Master, BOM, and stock (Phase 9).

current_stock in responses is ALWAYS the API-computed SUM of movements —
the frontend must never treat it as an editable value (frontend prompt §16).
"""

import datetime as dt
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import (
    ComplianceType,
    MaterialType,
    MovementType,
    PackSize,
    ScaleLevel,
    UnitOfMeasure,
)
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- Materials
class MaterialCreate(BaseModel):
    material_type: MaterialType
    variant_name: str = Field(min_length=1)
    unit_of_measure: UnitOfMeasure
    scale_level: ScaleLevel
    reorder_point: int | None = Field(default=None, ge=0)


class MaterialUpdate(BaseModel):
    variant_name: str | None = None
    unit_of_measure: UnitOfMeasure | None = None
    scale_level: ScaleLevel | None = None
    reorder_point: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class MaterialRead(ORMModel):
    id: int
    material_type: MaterialType
    variant_name: str
    unit_of_measure: UnitOfMeasure
    scale_level: ScaleLevel
    reorder_point: int | None
    is_active: bool
    created_at: datetime
    current_stock: int = 0  # computed — filled by router


# ---------------------------------------------------------------- Products
class ProductCreate(BaseModel):
    variety: str = Field(min_length=1)
    customer_id: int
    pack_size: PackSize
    compliance_type: ComplianceType


class ProductUpdate(BaseModel):
    variety: str | None = None
    customer_id: int | None = None
    pack_size: PackSize | None = None
    compliance_type: ComplianceType | None = None
    is_active: bool | None = None


class ProductRead(ORMModel):
    id: int
    variety: str
    customer_id: int
    pack_size: PackSize
    compliance_type: ComplianceType
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------- BOM
class BOMEntryCreate(BaseModel):
    product_id: int
    material_id: int
    qty_per_container: int = Field(gt=0)
    qty_per_box: Decimal | None = Field(
        default=None, ge=0,
        description="Per-box consumption for per_box materials (drives auto stock-out)",
    )


class BOMEntryUpdate(BaseModel):
    qty_per_container: int | None = Field(default=None, gt=0)
    qty_per_box: Decimal | None = Field(default=None, ge=0)


class BOMEntryRead(ORMModel):
    id: int
    product_id: int
    material_id: int
    qty_per_container: int
    qty_per_box: Decimal | None
    created_at: datetime


# ---------------------------------------------------------------- Stock
class StockInCreate(BaseModel):
    material_id: int
    quantity: int = Field(gt=0)
    date: dt.date | None = None
    supplier_name: str | None = None
    reference: str | None = Field(default=None, description="Invoice/challan number")


class StockAdjustmentCreate(BaseModel):
    material_id: int
    quantity: int = Field(description="Signed: +found / -lost or damaged. Not zero.")
    date: dt.date | None = None
    reason: str = Field(min_length=3, description="Required — why the adjustment (audit)")


class MovementRead(ORMModel):
    id: int
    material_id: int
    movement_type: MovementType
    quantity: int
    date: dt.date | None
    supplier_name: str | None
    reference: str | None
    reason: str | None
    packaging_record_id: int | None
    created_by: int
    created_at: datetime


class LowStockAlert(BaseModel):
    material: MaterialRead
    current_stock: int
    reorder_point: int
    shortfall: int


# ------------------------------------------------- Order calculator
class OrderCalcRequest(BaseModel):
    product_id: int
    num_containers: int = Field(gt=0)


class OrderCalcLine(BaseModel):
    material: MaterialRead
    required: int
    current_stock: int
    to_order: int  # max(required - stock, 0) — the Excel BOM's "Order Qty" row


class OrderCalcResponse(BaseModel):
    product_id: int
    num_containers: int
    lines: list[OrderCalcLine]
