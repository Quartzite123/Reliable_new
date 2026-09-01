"""
Packaging (Phase 8). Office Worker. Each record = one Lot.

POST /harvests/{id}/packaging — gate: registration ARRIVAL_QC_PASSED (or
                                PACKED — multiple runs per harvest allowed).
                                Server generates lot_id, applies the fixed
                                7% rejection (app/core/constants.py, not
                                read from the contract), stamps GGN from
                                company_settings.
GET  /packaging               — list (filter by harvest/customer)

Lot ID format: RF-<plotId>-<harvestdate YYYYMMDD>-<customer code>-<packsize>-<seq>
e.g. RF-P12-20260215-OFD-5KG-1 — unique, human-readable, traceable (R31, R34).

Post-save hook: auto stock-out of per-box materials via stock_movements
(services/inventory.py) — silent no-op until the BOM is set up.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.constants import FARMER_REJECTION_PCT
from app.core.deps import get_current_user, require_role
from app.core.enums import PackSize, UserRole
from app.models.company_settings import CompanySettings
from app.models.customer import Customer
from app.models.harvest import Harvest
from app.models.packaging import PackagingRecord
from app.models.user import User
from app.schemas.packaging import PackagingCreate, PackagingRead
from app.services import status_machine
from app.services.inventory import auto_stock_out_for_packaging

router = APIRouter()

_PACK_CODE = {
    PackSize.FOUR_KG: "4KG",
    PackSize.FOUR_POINT_FIVE_KG: "4-5KG",
    PackSize.FIVE_KG: "5KG",
}


def _generate_lot_id(db: Session, harvest: Harvest, customer: Customer, pack_size: PackSize) -> str:
    cust_code = (customer.code or customer.name.replace(" ", "")[:6]).upper()
    base = (
        f"RF-P{harvest.season_registration.plot_id}"
        f"-{harvest.harvest_date.strftime('%Y%m%d')}"
        f"-{cust_code}-{_PACK_CODE[pack_size]}"
    )
    seq = 1
    while db.scalar(select(PackagingRecord).where(PackagingRecord.lot_id == f"{base}-{seq}")) is not None:
        seq += 1
    return f"{base}-{seq}"


@router.post(
    "/harvests/{harvest_id}/packaging",
    response_model=PackagingRead,
    status_code=status.HTTP_201_CREATED,
)
def record_packaging(
    harvest_id: int,
    body: PackagingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.OFFICE_WORKER)),
):
    harvest = db.get(Harvest, harvest_id)
    if harvest is None:
        raise HTTPException(status_code=404, detail="Harvest not found")
    if harvest.arrival_qc is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This harvest has no Arrival QC yet",
        )

    reg = harvest.season_registration
    status_machine.can_record_packaging(reg)

    customer = db.get(Customer, body.customer_id)
    if customer is None or not customer.is_active:
        raise HTTPException(status_code=404, detail="Customer not found or inactive")

    total = Decimal(body.total_weight_kg)
    # Fixed 7% deduction, founder-confirmed — not read from the contract.
    # See app/core/constants.py. "rejection_contract_kg" is a legacy column
    # name from when this was contract-driven; it now just means "the
    # rejection weight charged."
    rejection_contract_kg = (total * FARMER_REJECTION_PCT / Decimal(100)).quantize(Decimal("0.01"))
    net_kg = (total - rejection_contract_kg).quantize(Decimal("0.01"))

    actual_rej_pct = None
    if body.actual_rejection_kg is not None:
        actual_rej_pct = (
            Decimal(body.actual_rejection_kg) / total * Decimal(100)
        ).quantize(Decimal("0.01"))

    settings_row = db.scalar(select(CompanySettings).limit(1))
    ggn = settings_row.ggn_number if settings_row is not None else None

    record = PackagingRecord(
        harvest_id=harvest.id,
        date=body.date,
        slip_no=body.slip_no,
        lot_id=_generate_lot_id(db, harvest, customer, body.pack_size),
        pack_size=body.pack_size,
        compliance_type=body.compliance_type,
        customer_id=customer.id,
        total_weight_kg=total,
        rejection_contract_kg=rejection_contract_kg,
        net_weight_kg=net_kg,
        actual_rejection_kg=body.actual_rejection_kg,
        actual_rejection_pct=actual_rej_pct,
        num_boxes=body.num_boxes,
        num_pallets=body.num_pallets,
        ggn_number=ggn,  # stamped from company settings, never typed (Phase 8)
        created_by=user.id,
    )
    db.add(record)
    status_machine.apply_packaging_recorded(reg)
    db.flush()  # record.id needed for stock movement references
    auto_stock_out_for_packaging(db, record, user.id)  # Phase 9 hook — silent if no BOM yet
    db.commit()
    db.refresh(record)
    return record


@router.get("/packaging", response_model=list[PackagingRead])
def list_packaging(
    harvest_id: int | None = None,
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(PackagingRecord).order_by(PackagingRecord.id.desc())
    if harvest_id is not None:
        stmt = stmt.where(PackagingRecord.harvest_id == harvest_id)
    if customer_id is not None:
        stmt = stmt.where(PackagingRecord.customer_id == customer_id)
    return list(db.scalars(stmt))
