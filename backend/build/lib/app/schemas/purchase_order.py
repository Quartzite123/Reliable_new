"""Schemas for purchase orders (Phase 12). All money math is server-side:
amount = qty_kg × rate per line; assessable value, CGST/SGST (GST split
half-half), grand total, and Indian amount-in-words are computed, never
accepted from the client."""

import datetime as dt
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import POStatus
from app.schemas.common import ORMModel


class POLineItemCreate(BaseModel):
    particulars: str = Field(min_length=1)
    hsn_code: str | None = None
    qty_kg: Decimal | None = Field(default=None, gt=0)
    units: int | None = Field(default=None, gt=0)
    kg_per_unit: Decimal | None = Field(default=None, gt=0)
    make: str | None = None
    rate: Decimal | None = Field(default=None, ge=0)
    gst_percent: Decimal | None = Field(default=None, ge=0, le=100)


class POCreate(BaseModel):
    po_date: dt.date | None = None
    supplier_name: str = Field(min_length=1)
    supplier_address: str | None = None
    supplier_email: str | None = None
    supplier_gst: str | None = None
    payment_terms: str | None = None
    supplier_ref: str | None = None
    other_refs: str | None = None
    dispatch_through: str = "Road Transport"
    destination: str | None = None
    freight: str | None = None
    other_charges: Decimal = Field(default=Decimal(0), ge=0)
    line_items: list[POLineItemCreate] = Field(min_length=1)


class POStatusUpdate(BaseModel):
    status: POStatus


class POLineItemRead(ORMModel):
    id: int
    sr_no: int | None
    particulars: str
    hsn_code: str | None
    qty_kg: Decimal | None
    units: int | None
    kg_per_unit: Decimal | None
    make: str | None
    rate: Decimal | None
    gst_percent: Decimal | None
    amount: Decimal | None


class PORead(ORMModel):
    id: int
    po_number: str
    po_date: dt.date | None
    supplier_name: str
    supplier_address: str | None
    supplier_email: str | None
    supplier_gst: str | None
    payment_terms: str | None
    supplier_ref: str | None
    other_refs: str | None
    dispatch_through: str
    destination: str | None
    assessable_value: Decimal | None
    cgst_total: Decimal | None
    sgst_total: Decimal | None
    freight: str | None
    other_charges: Decimal
    grand_total: Decimal | None
    total_in_words: str | None
    status: POStatus
    created_by: int
    created_at: datetime
    line_items: list[POLineItemRead] = []
