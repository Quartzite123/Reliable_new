"""
Farmer Contract (Phase 4). Office Worker (R52).

POST /registrations/{id}/contract — gate: LAB_PASSED + farmer has bank
                                    details (status_machine enforces both)
GET  /contracts                   — list
GET  /registrations/{id}/contract — read one
Rejection % defaults to 7 but is stored per contract (R24) — weighing and
packaging always read it from here, never hardcode.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.models.contract import Contract
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractRead
from app.services import status_machine
from app.api.v1.routers.plots import get_registration_or_404

router = APIRouter()


@router.post(
    "/registrations/{reg_id}/contract",
    response_model=ContractRead,
    status_code=status.HTTP_201_CREATED,
)
def create_contract(
    reg_id: int,
    body: ContractCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.OFFICE_WORKER)),
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


@router.get("/contracts", response_model=list[ContractRead])
def list_contracts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return list(db.scalars(select(Contract).order_by(Contract.id.desc())))


@router.get("/registrations/{reg_id}/contract", response_model=ContractRead)
def read_contract(
    reg_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    reg = get_registration_or_404(reg_id, db)
    if reg.contract is None:
        raise HTTPException(status_code=404, detail="No contract for this registration")
    return reg.contract
