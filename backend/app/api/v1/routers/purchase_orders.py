"""
Purchase Orders (Phase 12). Stock/Inventory Manager (per handoff role
matrix). Farm-input procurement — standalone from packing inventory
(deliberate model separation; scope pending Open Question #12).

POST  /purchase-orders            — create as Draft; server computes line
                                    amounts, assessable value, CGST/SGST
                                    (GST split evenly), grand total, and
                                    Indian amount-in-words
GET   /purchase-orders            — list (filter by status)
GET   /purchase-orders/{id}       — full PO with line items (print preview source)
PATCH /purchase-orders/{id}/status — draft -> issued -> completed (forward only)

PO number: RF-PO<seq>/<fy> where fy is the Indian financial year
(Apr–Mar), e.g. RF-PO01/2026-27 — matches the Excel's format.
"""

from datetime import date as date_cls
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import POStatus, UserRole
from app.models.purchase_order import POLineItem, PurchaseOrder
from app.models.user import User
from app.schemas.purchase_order import POCreate, PORead, POStatusUpdate
from app.utils.indian_words import rupees_in_words

router = APIRouter()

_stock_manager = require_role(UserRole.STOCK_MANAGER)

_TWO_PLACES = Decimal("0.01")

_ALLOWED_TRANSITIONS = {
    POStatus.DRAFT: {POStatus.ISSUED},
    POStatus.ISSUED: {POStatus.COMPLETED},
    POStatus.COMPLETED: set(),
}


def _financial_year(on_date: date_cls) -> str:
    """Indian FY: April–March. 2026-05-10 -> '2026-27'; 2026-02-10 -> '2025-26'."""
    start = on_date.year if on_date.month >= 4 else on_date.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def _generate_po_number(db: Session, on_date: date_cls) -> str:
    fy = _financial_year(on_date)
    count = db.scalar(
        select(sa_func.count(PurchaseOrder.id)).where(
            PurchaseOrder.po_number.like(f"RF-PO%/{fy}")
        )
    ) or 0
    seq = count + 1
    while db.scalar(
        select(PurchaseOrder).where(PurchaseOrder.po_number == f"RF-PO{seq:02d}/{fy}")
    ) is not None:
        seq += 1
    return f"RF-PO{seq:02d}/{fy}"


@router.post("/purchase-orders", response_model=PORead, status_code=status.HTTP_201_CREATED)
def create_po(
    body: POCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_stock_manager),
):
    assessable = Decimal(0)
    cgst = Decimal(0)
    sgst = Decimal(0)

    po = PurchaseOrder(
        po_number=_generate_po_number(db, body.po_date or date_cls.today()),
        po_date=body.po_date,
        supplier_name=body.supplier_name,
        supplier_address=body.supplier_address,
        supplier_email=body.supplier_email,
        supplier_gst=body.supplier_gst,
        payment_terms=body.payment_terms,
        supplier_ref=body.supplier_ref,
        other_refs=body.other_refs,
        dispatch_through=body.dispatch_through,
        destination=body.destination,
        freight=body.freight,
        other_charges=body.other_charges,
        status=POStatus.DRAFT,
        created_by=user.id,
    )

    for index, item in enumerate(body.line_items, start=1):
        amount = None
        if item.qty_kg is not None and item.rate is not None:
            amount = (Decimal(item.qty_kg) * Decimal(item.rate)).quantize(_TWO_PLACES)
            assessable += amount
            if item.gst_percent:
                gst_amount = amount * Decimal(item.gst_percent) / Decimal(100)
                cgst += gst_amount / 2  # GST split evenly CGST/SGST (intra-state,
                sgst += gst_amount / 2  # matches the Excel PO — assumption)
        po.line_items.append(
            POLineItem(sr_no=index, amount=amount, **item.model_dump())
        )

    po.assessable_value = assessable.quantize(_TWO_PLACES)
    po.cgst_total = cgst.quantize(_TWO_PLACES)
    po.sgst_total = sgst.quantize(_TWO_PLACES)
    po.grand_total = (assessable + cgst + sgst + Decimal(body.other_charges)).quantize(_TWO_PLACES)
    po.total_in_words = rupees_in_words(po.grand_total)

    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.get("/purchase-orders", response_model=list[PORead])
def list_pos(
    status_filter: POStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.line_items))
        .order_by(PurchaseOrder.id.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
    return list(db.scalars(stmt))


@router.get("/purchase-orders/{po_id}", response_model=PORead)
def get_po(po_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.patch("/purchase-orders/{po_id}/status", response_model=PORead)
def update_po_status(
    po_id: int,
    body: POStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_stock_manager),
):
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if body.status not in _ALLOWED_TRANSITIONS[po.status]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot move PO from '{po.status.value}' to '{body.status.value}'",
        )
    po.status = body.status
    db.commit()
    db.refresh(po)
    return po
