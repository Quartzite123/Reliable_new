"""
Season Management — Phase 0, Admin-only.

CRUD for seasons. Only one season can be active at a time (R55).
Must exist before any farmer/plot registration can happen.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.models.season import Season
from app.models.user import User
from app.schemas.season import SeasonCreate, SeasonRead, SeasonUpdate

router = APIRouter()

_admin_only = Depends(require_role())


@router.post(
    "", response_model=SeasonRead,
    status_code=status.HTTP_201_CREATED, dependencies=[_admin_only],
)
def create_season(
    body: SeasonCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role()),
):
    # Check name uniqueness
    if db.scalar(select(Season).where(Season.name == body.name)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Season '{body.name}' already exists",
        )

    # If this season should be active, deactivate all others first (R55)
    if body.is_active:
        _deactivate_all(db)

    season = Season(**body.model_dump(), created_by=user.id)
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@router.get("", response_model=list[SeasonRead])
def list_seasons(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return list(db.scalars(select(Season).order_by(Season.start_date.desc())))


@router.get("/active", response_model=SeasonRead | None)
def get_active_season(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    season = db.scalar(select(Season).where(Season.is_active == True))  # noqa: E712
    if season is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active season",
        )
    return season


@router.get("/{season_id}", response_model=SeasonRead)
def get_season(
    season_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    season = db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.patch("/{season_id}", response_model=SeasonRead, dependencies=[_admin_only])
def update_season(
    season_id: int,
    body: SeasonUpdate,
    db: Session = Depends(get_db),
):
    season = db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")

    updates = body.model_dump(exclude_unset=True)

    # If activating, deactivate all others first (R55)
    if updates.get("is_active") is True:
        _deactivate_all(db)

    # Validate dates if both are being set
    new_start = updates.get("start_date", season.start_date)
    new_end = updates.get("end_date", season.end_date)
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must be after start_date",
        )

    # Name uniqueness
    if "name" in updates and updates["name"] != season.name:
        if db.scalar(select(Season).where(Season.name == updates["name"])) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Season '{updates['name']}' already exists",
            )

    for field, value in updates.items():
        setattr(season, field, value)

    db.commit()
    db.refresh(season)
    return season


def _deactivate_all(db: Session) -> None:
    """Set is_active = False on every season row."""
    active = db.scalars(select(Season).where(Season.is_active == True)).all()  # noqa: E712
    for s in active:
        s.is_active = False
