"""
Season Management — Phase 0, Admin-only writes.

Endpoints and behavior matched to the frontend's `features/seasons`
module (see BACKEND_CHANGELOG.md):
  - GET    /seasons          -> list all, newest start_date first
  - GET    /seasons/current  -> the active season, or most recent by
                                 start_date if none is active, or null
  - POST   /seasons          -> create (rejects overlapping date ranges)
  - PUT    /seasons/{id}     -> full update (rejects overlapping ranges,
                                 excluding itself)

Only one season may have status='active' at a time (R55) — enforced here
by flipping every other season to 'closed' whenever a new one is created.

Reads are scoped to the admin phase — only SeasonsPage reads them today;
plot registration doesn't yet pull the active season live (CLAUDE.md §7,
season_registrations.season_id FK still pending). Writes are now on the
same admin phase gate too (Step 3 conversion, 2026-09-01), replacing
require_role() (no-args = admin-only) — role is no longer checked
anywhere in this file.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.season import Season
from app.models.user import User
from app.schemas.season import SeasonCreate, SeasonRead, SeasonUpdate
from app.services.audit import record_audit_event

router = APIRouter()

_admin_phase = Depends(require_phase(PhaseKey.ADMIN))

_OVERLAP_DETAIL = "A season already exists that overlaps this period."


def _overlaps(start_a, end_a, start_b, end_b) -> bool:
    return start_a <= end_b and start_b <= end_a


def _check_overlap(db: Session, start_date, end_date, exclude_id: int | None = None) -> None:
    stmt = select(Season)
    if exclude_id is not None:
        stmt = stmt.where(Season.id != exclude_id)
    for existing in db.scalars(stmt):
        if _overlaps(existing.start_date, existing.end_date, start_date, end_date):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_OVERLAP_DETAIL)


def _deactivate_all(db: Session, exclude_id: int | None = None) -> None:
    stmt = select(Season).where(Season.status == "active")
    if exclude_id is not None:
        stmt = stmt.where(Season.id != exclude_id)
    for s in db.scalars(stmt):
        s.status = "closed"


@router.post(
    "", response_model=SeasonRead,
    status_code=status.HTTP_201_CREATED, dependencies=[_admin_phase],
)
def create_season(
    body: SeasonCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_phase(PhaseKey.ADMIN)),
):
    _check_overlap(db, body.start_date, body.end_date)

    # A newly created season becomes the active one (matches the "Start
    # New Season" flow) — deactivate any other active season first (R55).
    _deactivate_all(db)

    season = Season(
        year=body.year,
        start_date=body.start_date,
        end_date=body.end_date,
        notes=body.notes,
        status="active",
        created_by=user.id,
    )
    db.add(season)
    db.flush()

    record_audit_event(
        db, user,
        action="Season created", module="Seasons", record_ref=str(season.year),
    )

    db.commit()
    db.refresh(season)
    return season


@router.get("", response_model=list[SeasonRead], dependencies=[_admin_phase])
def list_seasons(db: Session = Depends(get_db)):
    return list(db.scalars(select(Season).order_by(Season.start_date.desc())))


@router.get("/current", response_model=SeasonRead | None, dependencies=[_admin_phase])
def get_current_season(db: Session = Depends(get_db)):
    active = db.scalar(select(Season).where(Season.status == "active"))
    if active is not None:
        return active
    # Fallback: most recent season by start_date, if any exist at all.
    return db.scalar(select(Season).order_by(Season.start_date.desc()).limit(1))


@router.get("/{season_id}", response_model=SeasonRead, dependencies=[_admin_phase])
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.put("/{season_id}", response_model=SeasonRead, dependencies=[_admin_phase])
def update_season(
    season_id: int,
    body: SeasonUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_phase(PhaseKey.ADMIN)),
):
    season = db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")

    _check_overlap(db, body.start_date, body.end_date, exclude_id=season_id)

    season.year = body.year
    season.start_date = body.start_date
    season.end_date = body.end_date
    season.notes = body.notes

    record_audit_event(
        db, admin,
        action="Season edited", module="Seasons", record_ref=str(season.year),
    )

    db.commit()
    db.refresh(season)
    return season
