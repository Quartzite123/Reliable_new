"""
Farmer Contract (Phase 4). Office Worker (R52).

POST /registrations/{id}/contract — gate: LAB_PASSED + farmer has bank
                                    details (status_machine enforces both)
GET  /contracts                   — list
GET  /registrations/{id}/contract — read one

Rejection is a fixed company-wide 7% (backend/app/core/constants.py::
FARMER_REJECTION_PCT), not a per-contract negotiated term — reversed
2026-08-31 (CLAUDE.md Discovery 7, Business_Rules R24/R28). Weighing and
packaging read the constant directly; contracts.rejection_percent still
exists on the model and always defaults to 7.00, but nothing reads it
anymore.

Reads (GET /contracts, GET .../contract): commercial terms — rate,
contract date — scoped to farmer_contract only, the one phase that reads
either endpoint.

The write (POST .../contract) is also gated on farmer_contract (Step 3
conversion, 2026-09-01), replacing require_role(OFFICE_WORKER) — role is
no longer checked anywhere in this file.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.contract import Contract
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractRead
from app.services import status_machine
from app.api.v1.routers.plots import get_registration_or_404

router = APIRouter()

_farmer_contract = Depends(require_phase(PhaseKey.FARMER_CONTRACT))


@router.post(
    "/registrations/{reg_id}/contract",
    response_model=ContractRead,
    status_code=status.HTTP_201_CREATED,
)
def create_contract(
    reg_id: int,
    body: ContractCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_phase(PhaseKey.FARMER_CONTRACT)),
):
    reg = get_registration_or_404(reg_id, db)
    status_machine.can_create_contract(reg)

    contract = Contract(
        season_registration_id=reg.id,
        created_by=user.id,
        **body.model_dump(),
    )
    db.add(contract)
    status_machine.apply_contract_created(reg)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/contracts", response_model=list[ContractRead], dependencies=[_farmer_contract])
def list_contracts(db: Session = Depends(get_db)):
    return list(db.scalars(select(Contract).order_by(Contract.id.desc())))


@router.get("/registrations/{reg_id}/contract", response_model=ContractRead, dependencies=[_farmer_contract])
def read_contract(reg_id: int, db: Session = Depends(get_db)):
    reg = get_registration_or_404(reg_id, db)
    if reg.contract is None:
        raise HTTPException(status_code=404, detail="No contract for this registration")
    return reg.contract
