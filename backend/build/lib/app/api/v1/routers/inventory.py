"""
Item Master + BOM + Stock (Phase 9). Stock/Inventory Manager role (Admin
passes all gates as usual). Read access open to all authenticated users —
Packaging's material reference panel reads from here.

Materials:  POST/GET/PATCH /inventory/materials   (soft deactivate, no delete)
Products:   POST/GET/PATCH /inventory/products    (feeds Packaging cascade)
BOM:        POST/GET/PATCH /bom                   (per-container + per-box qty)
Stock:      POST /inventory/stock-in
            POST /inventory/adjustments           (reason required)
            GET  /inventory/movements
            GET  /inventory/alerts                (computed stock <= reorder point)
Calculator: POST /inventory/order-calculator      (the Excel BOM's Order Qty row)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import MaterialType, MovementType, UserRole
from app.models.customer import Customer
from app.models.inventory import BOMEntry, ItemMasterMaterial, ItemMasterProduct, StockMovement
from app.models.user import User
from app.schemas.inventory import (
    BOMEntryCreate,
    BOMEntryRead,
    BOMEntryUpdate,
    LowStockAlert,
    MaterialCreate,
    MaterialRead,
    MaterialUpdate,
    MovementRead,
    OrderCalcLine,
    OrderCalcRequest,
    OrderCalcResponse,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StockAdjustmentCreate,
    StockInCreate,
)
from app.services.inventory import compute_stock, compute_stock_bulk, low_stock_materials

router = APIRouter()

_stock_manager = Depends(require_role(UserRole.STOCK_MANAGER))


def _material_read(material: ItemMasterMaterial, stock: int) -> MaterialRead:
    out = MaterialRead.model_validate(material)
    out.current_stock = stock
    return out


# ---------------------------------------------------------------- Materials
@router.post(
    "/inventory/materials", response_model=MaterialRead,
    status_code=status.HTTP_201_CREATED, dependencies=[_stock_manager],
)
def create_material(
    body: MaterialCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STOCK_MANAGER)),
):
    material = ItemMasterMaterial(**body.model_dump(), is_active=True, created_by=user.id)
    db.add(material)
    db.commit()
    db.refresh(material)
    return _material_read(material, 0)


@router.get("/inventory/materials", response_model=list[MaterialRead])
def list_materials(
    material_type: MaterialType | None = None,
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(ItemMasterMaterial).order_by(
        ItemMasterMaterial.material_type, ItemMasterMaterial.variant_name
    )
    if material_type is not None:
        stmt = stmt.where(ItemMasterMaterial.material_type == material_type)
    if not include_inactive:
        stmt = stmt.where(ItemMasterMaterial.is_active.is_(True))
    materials = list(db.scalars(stmt))
    stocks = compute_stock_bulk(db, [m.id for m in materials])
    return [_material_read(m, stocks[m.id]) for m in materials]


@router.patch("/inventory/materials/{material_id}", response_model=MaterialRead, dependencies=[_stock_manager])
def update_material(material_id: int, body: MaterialUpdate, db: Session = Depends(get_db)):
    material = db.get(ItemMasterMaterial, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return _material_read(material, compute_stock(db, material.id))


# ---------------------------------------------------------------- Products
@router.post(
    "/inventory/products", response_model=ProductRead,
    status_code=status.HTTP_201_CREATED, dependencies=[_stock_manager],
)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    if db.get(Customer, body.customer_id) is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    clash = db.scalar(
        select(ItemMasterProduct).where(
            ItemMasterProduct.variety == body.variety,
            ItemMasterProduct.customer_id == body.customer_id,
            ItemMasterProduct.pack_size == body.pack_size,
            ItemMasterProduct.compliance_type == body.compliance_type,
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This variety/customer/pack size/compliance combination already exists",
        )
    product = ItemMasterProduct(**body.model_dump(), is_active=True)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/inventory/products", response_model=list[ProductRead])
def list_products(
    customer_id: int | None = None,
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(ItemMasterProduct).order_by(ItemMasterProduct.variety)
    if customer_id is not None:
        stmt = stmt.where(ItemMasterProduct.customer_id == customer_id)
    if not include_inactive:
        stmt = stmt.where(ItemMasterProduct.is_active.is_(True))
    return list(db.scalars(stmt))


@router.patch("/inventory/products/{product_id}", response_model=ProductRead, dependencies=[_stock_manager])
def update_product(product_id: int, body: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(ItemMasterProduct, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


# ---------------------------------------------------------------- BOM
@router.post("/bom", response_model=BOMEntryRead, status_code=status.HTTP_201_CREATED, dependencies=[_stock_manager])
def create_bom_entry(body: BOMEntryCreate, db: Session = Depends(get_db)):
    if db.get(ItemMasterProduct, body.product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if db.get(ItemMasterMaterial, body.material_id) is None:
        raise HTTPException(status_code=404, detail="Material not found")
    clash = db.scalar(
        select(BOMEntry).where(
            BOMEntry.product_id == body.product_id,
            BOMEntry.material_id == body.material_id,
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A BOM entry for this product+material already exists — PATCH it instead",
        )
    entry = BOMEntry(**body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/bom", response_model=list[BOMEntryRead])
def list_bom(
    product_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(BOMEntry).order_by(BOMEntry.product_id, BOMEntry.material_id)
    if product_id is not None:
        stmt = stmt.where(BOMEntry.product_id == product_id)
    return list(db.scalars(stmt))


@router.patch("/bom/{entry_id}", response_model=BOMEntryRead, dependencies=[_stock_manager])
def update_bom_entry(entry_id: int, body: BOMEntryUpdate, db: Session = Depends(get_db)):
    entry = db.get(BOMEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="BOM entry not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------- Stock
@router.post(
    "/inventory/stock-in", response_model=MovementRead,
    status_code=status.HTTP_201_CREATED,
)
def stock_in(
    body: StockInCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STOCK_MANAGER)),
):
    if db.get(ItemMasterMaterial, body.material_id) is None:
        raise HTTPException(status_code=404, detail="Material not found")
    movement = StockMovement(
        material_id=body.material_id,
        movement_type=MovementType.IN_,
        quantity=body.quantity,  # positive
        date=body.date,
        supplier_name=body.supplier_name,
        reference=body.reference,
        created_by=user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.post(
    "/inventory/adjustments", response_model=MovementRead,
    status_code=status.HTTP_201_CREATED,
)
def stock_adjustment(
    body: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STOCK_MANAGER)),
):
    if body.quantity == 0:
        raise HTTPException(status_code=422, detail="Adjustment quantity cannot be zero")
    material = db.get(ItemMasterMaterial, body.material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    if body.quantity < 0 and compute_stock(db, material.id) + body.quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Adjustment would make stock negative — check the quantity",
        )
    movement = StockMovement(
        material_id=body.material_id,
        movement_type=MovementType.ADJUSTMENT,
        quantity=body.quantity,
        date=body.date,
        reason=body.reason,
        created_by=user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.get("/inventory/movements", response_model=list[MovementRead])
def list_movements(
    material_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(StockMovement).order_by(StockMovement.id.desc()).limit(500)
    if material_id is not None:
        stmt = stmt.where(StockMovement.material_id == material_id)
    return list(db.scalars(stmt))


@router.get("/inventory/alerts", response_model=list[LowStockAlert])
def low_stock_alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    alerts = []
    for material, stock in low_stock_materials(db):
        alerts.append(
            LowStockAlert(
                material=_material_read(material, stock),
                current_stock=stock,
                reorder_point=material.reorder_point or 0,
                shortfall=(material.reorder_point or 0) - stock,
            )
        )
    return alerts


# ------------------------------------------------- Order calculator
@router.post("/inventory/order-calculator", response_model=OrderCalcResponse)
def order_calculator(
    body: OrderCalcRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """The Excel BOM's bottom rows as an endpoint:
    required = qty_per_container × containers; to_order = required − stock."""
    product = db.get(ItemMasterProduct, body.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    entries = list(db.scalars(select(BOMEntry).where(BOMEntry.product_id == product.id)))
    stocks = compute_stock_bulk(db, [e.material_id for e in entries])
    lines = []
    for entry in entries:
        required = entry.qty_per_container * body.num_containers
        stock = stocks.get(entry.material_id, 0)
        lines.append(
            OrderCalcLine(
                material=_material_read(entry.material, stock),
                required=required,
                current_stock=stock,
                to_order=max(required - stock, 0),
            )
        )
    return OrderCalcResponse(product_id=product.id, num_containers=body.num_containers, lines=lines)
