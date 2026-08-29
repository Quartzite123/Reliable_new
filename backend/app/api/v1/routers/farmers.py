"""
Farmer module (Phases 1A + 1B).

GET  /farmers/search?q=      — the single search box: name / mobile,
                               tolerant of spelling mistakes (7b)
POST /farmers                — create farmer
GET  /farmers                — list (filter by status)
GET  /farmers/{id}           — full card: bank details + plots
PATCH /farmers/{id}          — edit / mark inactive (soft delete, R8)
GET  /farmers/{id}/bank-details        — read (404 if none recorded yet)
PUT  /farmers/{id}/bank-details        — create-or-replace (Phase 1B)
POST /farmers/{id}/bank-details/photo  — passbook photo upload

Roles: Field Workers create/edit farmers in the field; Office Workers
manage bank details paperwork; every authenticated user can read.
"""

import difflib

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import FarmerStatus, UserRole
from app.models.farmer import BankDetails, Farmer
from app.models.user import User
from app.schemas.farmer import (
    BankDetailsRead,
    BankDetailsUpsert,
    FarmerCreate,
    FarmerRead,
    FarmerSearchResult,
    FarmerUpdate,
)
from app.utils.file_upload import save_upload

router = APIRouter()

_field_or_office = Depends(require_role(UserRole.FIELD_WORKER, UserRole.OFFICE_WORKER))

_FUZZY_THRESHOLD = 0.55  # difflib ratio; forgiving enough for "Vadje" vs "Vadaje"


@router.get("/search", response_model=list[FarmerSearchResult])
def search_farmers(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exact/substring matches first (name, mobile). If those are thin and
    the query looks like a name, add fuzzy name matches so spelling
    mistakes still find the farmer (design principle: fuzzy search over
    exact match — the worker confirms the right person from the list)."""
    needle = q.strip()
    like = f"%{needle}%"

    base = (
        select(Farmer)
        .options(selectinload(Farmer.plots))
        .where(
            or_(
                Farmer.name.ilike(like),
                Farmer.mobile.ilike(like),
            )
        )
        .order_by(Farmer.name)
        .limit(20)
    )
    results = list(db.scalars(base))

    if len(results) < 5 and len(needle) >= 3 and not needle.isdigit():
        found_ids = {f.id for f in results}
        # 500–1000 farmers total (discovery): scoring all names in Python is fine.
        candidates = db.scalars(
            select(Farmer).options(selectinload(Farmer.plots))
        )
        scored = []
        for farmer in candidates:
            if farmer.id in found_ids:
                continue
            ratio = difflib.SequenceMatcher(
                None, needle.lower(), farmer.name.lower()
            ).ratio()
            if ratio >= _FUZZY_THRESHOLD:
                scored.append((ratio, farmer))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        results.extend(farmer for _, farmer in scored[: 10 - len(results)])

    return results


@router.post(
    "",
    response_model=FarmerRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_field_or_office],
)
def create_farmer(body: FarmerCreate, db: Session = Depends(get_db)):
    farmer = Farmer(**body.model_dump(), status=FarmerStatus.ACTIVE)
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    return farmer


@router.get("", response_model=list[FarmerRead])
def list_farmers(
    status_filter: FarmerStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Farmer).options(
        selectinload(Farmer.plots), selectinload(Farmer.bank_details)
    )
    if status_filter is not None:
        stmt = stmt.where(Farmer.status == status_filter)
    return list(db.scalars(stmt.order_by(Farmer.name)))


def _get_farmer_or_404(farmer_id: int, db: Session) -> Farmer:
    farmer = db.get(Farmer, farmer_id)
    if farmer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer not found")
    return farmer


@router.get("/{farmer_id}", response_model=FarmerRead)
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return _get_farmer_or_404(farmer_id, db)


@router.patch("/{farmer_id}", response_model=FarmerRead, dependencies=[_field_or_office])
def update_farmer(farmer_id: int, body: FarmerUpdate, db: Session = Depends(get_db)):
    farmer = _get_farmer_or_404(farmer_id, db)
    updates = body.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(farmer, field, value)
    db.commit()
    db.refresh(farmer)
    return farmer


@router.get("/{farmer_id}/bank-details", response_model=BankDetailsRead)
def get_bank_details(
    farmer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    farmer = _get_farmer_or_404(farmer_id, db)
    if farmer.bank_details is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank details not recorded for this farmer",
        )
    return farmer.bank_details


@router.put(
    "/{farmer_id}/bank-details",
    response_model=BankDetailsRead,
    dependencies=[_field_or_office],
)
def upsert_bank_details(
    farmer_id: int, body: BankDetailsUpsert, db: Session = Depends(get_db)
):
    """Create-or-replace: bank details are 1:1 with the farmer and editable
    later (farmers change banks). Not required at farmer creation; required
    before a contract (enforced in the contract gate, not here)."""
    farmer = _get_farmer_or_404(farmer_id, db)
    if farmer.bank_details is None:
        farmer.bank_details = BankDetails(farmer_id=farmer.id, **body.model_dump())
    else:
        for field, value in body.model_dump().items():
            setattr(farmer.bank_details, field, value)
    db.commit()
    db.refresh(farmer)
    return farmer.bank_details


@router.post(
    "/{farmer_id}/bank-details/photo",
    response_model=BankDetailsRead,
    dependencies=[_field_or_office],
)
def upload_passbook_photo(
    farmer_id: int, file: UploadFile, db: Session = Depends(get_db)
):
    farmer = _get_farmer_or_404(farmer_id, db)
    if farmer.bank_details is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Add bank details before uploading the passbook photo",
        )
    farmer.bank_details.passbook_photo_url = save_upload(file, "passbooks")
    db.commit()
    db.refresh(farmer.bank_details)
    return farmer.bank_details
