"""
Plot Registration & Field QC (Phase 2) + registration detail/queues.

POST  /plots                          — create plot under a farmer
PATCH /plots/{id}                     — edit (re-registration pre-fill edits)
GET   /plots                          — list, filter by farmer
POST  /plots/{id}/register            — season registration (unique per year, R12)
GET   /registrations                  — filterable queue (status / season)
GET   /registrations/{id}             — full pipeline detail for one plot+season
POST  /registrations/{id}/field-qc    — record inspection (gate: Registered or
                                        Field QC Failed for follow-ups, R17)
GET   /registrations/{id}/field-qc    — inspection history (failed rows kept, R16)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import RegistrationStatus, UserRole
from app.models.farmer import Farmer
from app.models.plot import FieldQC, Plot, SeasonRegistration
from app.models.user import User
from app.schemas.plot import (
    FieldQCCreate,
    FieldQCRead,
    PlotCreate,
    PlotRead,
    PlotUpdate,
    SeasonRegistrationCreate,
    SeasonRegistrationRead,
)
from app.services import status_machine

router = APIRouter()

_field_worker = Depends(require_role(UserRole.FIELD_WORKER))


# ---------------------------------------------------------------- Plots
@router.post(
    "/plots", response_model=PlotRead, status_code=status.HTTP_201_CREATED,
    dependencies=[_field_worker],
)
def create_plot(body: PlotCreate, db: Session = Depends(get_db)):
    farmer = db.get(Farmer, body.farmer_id)
    if farmer is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    clash = db.scalar(
        select(Plot).where(
            Plot.farmer_id == body.farmer_id, Plot.plot_number == body.plot_number
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This farmer already has a plot numbered '{body.plot_number}' (R5)",
        )
    plot = Plot(**body.model_dump())
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return plot


@router.patch("/plots/{plot_id}", response_model=PlotRead, dependencies=[_field_worker])
def update_plot(plot_id: int, body: PlotUpdate, db: Session = Depends(get_db)):
    plot = db.get(Plot, plot_id)
    if plot is None:
        raise HTTPException(status_code=404, detail="Plot not found")
    updates = body.model_dump(exclude_unset=True)
    new_number = updates.get("plot_number")
    if new_number and new_number != plot.plot_number:
        clash = db.scalar(
            select(Plot).where(
                Plot.farmer_id == plot.farmer_id, Plot.plot_number == new_number
            )
        )
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This farmer already has a plot numbered '{new_number}' (R5)",
            )
    for field, value in updates.items():
        setattr(plot, field, value)
    db.commit()
    db.refresh(plot)
    return plot


@router.get("/plots", response_model=list[PlotRead])
def list_plots(
    farmer_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Plot).order_by(Plot.farmer_id, Plot.plot_number)
    if farmer_id is not None:
        stmt = stmt.where(Plot.farmer_id == farmer_id)
    return list(db.scalars(stmt))


   @router.get("/plots/{plot_id}", response_model=PlotRead)
   def get_plot(
       plot_id: int,
       db: Session = Depends(get_db),
       _: User = Depends(get_current_user),
   ):
       plot = db.get(Plot, plot_id)
       if plot is None:
           raise HTTPException(status_code=404, detail="Plot not found")
       return plot

# ------------------------------------------------- Season Registration
@router.post(
    "/plots/{plot_id}/register",
    response_model=SeasonRegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
def register_plot_for_season(
    plot_id: int,
    body: SeasonRegistrationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FIELD_WORKER)),
):
    plot = db.get(Plot, plot_id)
    if plot is None:
        raise HTTPException(status_code=404, detail="Plot not found")
    clash = db.scalar(
        select(SeasonRegistration).where(
            SeasonRegistration.plot_id == plot_id,
            SeasonRegistration.season_year == body.season_year,
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Plot already registered for season {body.season_year} (R12)",
        )
    reg = SeasonRegistration(
        plot_id=plot_id,
        season_year=body.season_year,
        season_id=body.season_id,
        plot_variety_id=body.plot_variety_id,
        status=RegistrationStatus.REGISTERED,
        registered_by=user.id,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


@router.get("/registrations", response_model=list[SeasonRegistrationRead])
def list_registrations(
    status_filter: RegistrationStatus | None = Query(default=None, alias="status"),
    season_year: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(SeasonRegistration).order_by(SeasonRegistration.id.desc())
    if status_filter is not None:
        stmt = stmt.where(SeasonRegistration.status == status_filter)
    if season_year is not None:
        stmt = stmt.where(SeasonRegistration.season_year == season_year)
    return list(db.scalars(stmt))


def get_registration_or_404(reg_id: int, db: Session) -> SeasonRegistration:
    reg = db.get(SeasonRegistration, reg_id)
    if reg is None:
        raise HTTPException(status_code=404, detail="Season registration not found")
    return reg


@router.get("/registrations/{reg_id}", response_model=SeasonRegistrationRead)
def get_registration(
    reg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_registration_or_404(reg_id, db)


# ---------------------------------------------------------------- Field QC
@router.post(
    "/registrations/{reg_id}/field-qc",
    response_model=FieldQCRead,
    status_code=status.HTTP_201_CREATED,
)
def record_field_qc(
    reg_id: int,
    body: FieldQCCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FIELD_WORKER)),
):
    reg = get_registration_or_404(reg_id, db)
    status_machine.can_record_field_qc(reg)

    qc = FieldQC(
        season_registration_id=reg.id,
        inspected_by=user.id,
        **body.model_dump(),
    )
    db.add(qc)
    status_machine.apply_field_qc_result(reg, body.result)
    db.commit()
    db.refresh(qc)
    return qc


@router.get("/registrations/{reg_id}/field-qc", response_model=list[FieldQCRead])
def field_qc_history(
    reg_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    get_registration_or_404(reg_id, db)
    return list(
        db.scalars(
            select(FieldQC)
            .where(FieldQC.season_registration_id == reg_id)
            .order_by(FieldQC.created_at)
        )
    )
