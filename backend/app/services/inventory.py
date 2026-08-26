"""
Inventory service — computed stock, low-stock detection, and the Phase 8
packaging auto-stock-out hook.

Current stock is ALWAYS computed as SUM(stock_movements.quantity) for the
material — never stored (model docstring: avoids sync issues). Movement
quantities are signed: positive for IN, negative for consumption.
"""

import math
from decimal import Decimal

import app.db  # noqa: F401  (must precede model imports — registers all mappers)
from sqlalchemy import func as sa_func, select
from sqlalchemy.orm import Session

from app.core.enums import MovementType, ScaleLevel
from app.models.inventory import BOMEntry, ItemMasterMaterial, ItemMasterProduct, StockMovement
from app.models.packaging import PackagingRecord


def compute_stock(db: Session, material_id: int) -> int:
    total = db.scalar(
        select(sa_func.coalesce(sa_func.sum(StockMovement.quantity), 0)).where(
            StockMovement.material_id == material_id
        )
    )
    return int(total or 0)


def compute_stock_bulk(db: Session, material_ids: list[int]) -> dict[int, int]:
    if not material_ids:
        return {}
    rows = db.execute(
        select(StockMovement.material_id, sa_func.sum(StockMovement.quantity))
        .where(StockMovement.material_id.in_(material_ids))
        .group_by(StockMovement.material_id)
    ).all()
    stocks = {mid: 0 for mid in material_ids}
    stocks.update({mid: int(total) for mid, total in rows})
    return stocks


def low_stock_materials(db: Session) -> list[tuple[ItemMasterMaterial, int]]:
    """Active materials whose computed stock is at/below their reorder point."""
    materials = list(
        db.scalars(
            select(ItemMasterMaterial).where(
                ItemMasterMaterial.is_active.is_(True),
                ItemMasterMaterial.reorder_point.isnot(None),
            )
        )
    )
    stocks = compute_stock_bulk(db, [m.id for m in materials])
    return [(m, stocks[m.id]) for m in materials if stocks[m.id] <= (m.reorder_point or 0)]


def find_product_for_packaging(db: Session, record: PackagingRecord) -> ItemMasterProduct | None:
    """Match a packaging record to its finished product (variety + customer +
    pack size + compliance). Variety comes from the plot up the chain."""
    variety = record.harvest.season_registration.plot.variety
    if variety is None:
        return None
    return db.scalar(
        select(ItemMasterProduct).where(
            ItemMasterProduct.variety == variety,
            ItemMasterProduct.customer_id == record.customer_id,
            ItemMasterProduct.pack_size == record.pack_size,
            ItemMasterProduct.compliance_type == record.compliance_type,
            ItemMasterProduct.is_active.is_(True),
        )
    )


def auto_stock_out_for_packaging(db: Session, record: PackagingRecord, user_id: int) -> list[StockMovement]:
    """Phase 8 -> 9 hook: when a lot is packed, deduct per-box materials
    according to the BOM (auto_out movements, negative quantities).

    Deliberately silent when no finished product / BOM exists yet — packing
    must never be blocked by incomplete inventory setup (assumption; flagged
    in Open Questions #14). per_container materials are NOT deducted here —
    they deduct at container loading (future phase).
    """
    product = find_product_for_packaging(db, record)
    if product is None:
        return []

    movements: list[StockMovement] = []
    entries = db.scalars(
        select(BOMEntry).where(BOMEntry.product_id == product.id)
    )
    for entry in entries:
        material = entry.material
        if material is None or not material.is_active:
            continue
        if material.scale_level != ScaleLevel.PER_BOX:
            continue
        if entry.qty_per_box is None:
            continue
        qty = math.ceil(Decimal(entry.qty_per_box) * record.num_boxes)
        if qty <= 0:
            continue
        movement = StockMovement(
            material_id=material.id,
            movement_type=MovementType.AUTO_OUT,
            quantity=-qty,  # negative = consumption
            date=record.date,
            reference=record.lot_id,
            reason=f"Auto stock-out for packing lot {record.lot_id} ({record.num_boxes} boxes)",
            packaging_record_id=record.id,
            created_by=user_id,
        )
        db.add(movement)
        movements.append(movement)
    return movements
