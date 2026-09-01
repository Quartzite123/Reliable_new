"""
Customers + Company Settings — setup data (Admin writes).

Customers feed Packaging's dropdown and Lot IDs. Company Settings holds
the GGN number (stamped onto every packaging record) and PO letterhead
details — never hardcoded anywhere (CLAUDE.md).

GET /customers is scoped to {packaging, palletisation, inventory_management}
— the three features that read it for dropdowns/joins (packaging/
palletisation/bom api.ts). GET /company-settings is scoped to
{admin, weighing, inventory_management} — CompanySettingsPage,
WeighingSlipPrint/WeighingNewPage, and OrderSheetPrintPage. Both stay
specific require_phase sets rather than require_any_phase — 3 of 13
phases is a real restriction, not the "most phases" case /plots and
/farmers are.

Writes are gated on the admin phase (Step 3 conversion, 2026-09-01),
replacing require_role() (no-args = admin-only) — role is no longer
checked anywhere in this file.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.company_settings import CompanySettings
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import (
    CompanySettingsRead,
    CompanySettingsUpdate,
    CustomerCreate,
    CustomerRead,
    CustomerUpdate,
)

router = APIRouter()

_admin_phase = Depends(require_phase(PhaseKey.ADMIN))
_customers_read_phases = Depends(require_phase(PhaseKey.PACKAGING, PhaseKey.PALLETISATION, PhaseKey.INVENTORY_MANAGEMENT))
_company_settings_read_phases = Depends(require_phase(PhaseKey.ADMIN, PhaseKey.WEIGHING, PhaseKey.INVENTORY_MANAGEMENT))


@router.post(
    "/customers", response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED, dependencies=[_admin_phase],
)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Customer).where(Customer.name == body.name)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer already exists")
    customer = Customer(**body.model_dump(), is_active=True)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers", response_model=list[CustomerRead], dependencies=[_customers_read_phases])
def list_customers(db: Session = Depends(get_db)):
    return list(db.scalars(select(Customer).order_by(Customer.name)))


@router.patch("/customers/{customer_id}", response_model=CustomerRead, dependencies=[_admin_phase])
def update_customer(customer_id: int, body: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/company-settings", response_model=CompanySettingsRead, dependencies=[_company_settings_read_phases])
def read_settings(db: Session = Depends(get_db)):
    row = db.scalar(select(CompanySettings).limit(1))
    if row is None:
        raise HTTPException(status_code=404, detail="Company settings not configured yet")
    return row


@router.put("/company-settings", response_model=CompanySettingsRead)
def update_settings(
    body: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_phase(PhaseKey.ADMIN)),
):
    row = db.scalar(select(CompanySettings).limit(1))
    if row is None:
        row = CompanySettings()
        db.add(row)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_by = admin.id
    db.commit()
    db.refresh(row)
    return row
