"""
Plot Varieties — CRUD for per-plot variety registrations (R57).

A plot can hold multiple grape varieties; each variety runs its own
independent pipeline (season_registration → Field QC → Lab → Contract →
Harvest). These endpoints let workers manage the variety list for a plot.

All endpoints are scoped to plot_registration — variety management is
part of plot setup. Previously ungated (auth-only) entirely, including
the DELETE, which is destructive.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_phase
from app.core.enums import PhaseKey
from app.models.plot import Plot
from app.models.plot_variety import PlotVariety
from app.schemas.plot_variety import PlotVarietyCreate, PlotVarietyRead, PlotVarietyUpdate

router = APIRouter()

_plot_registration = Depends(require_phase(PhaseKey.PLOT_REGISTRATION))


@router.post(
    "/plots/{plot_id}/varieties",
    response_model=PlotVarietyRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_plot_registration],
)
def add_variety(
    plot_id: int,
    body: PlotVarietyCreate,
    db: Session = Depends(get_db),
):
    plot = db.get(Plot, plot_id)
    if plot is None:
        raise HTTPException(status_code=404, detail="Plot not found")

    # Check uniqueness within the plot
    existing = db.scalar(
        select(PlotVariety).where(
            PlotVariety.plot_id == plot_id,
            PlotVariety.variety_name == body.variety_name,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Variety '{body.variety_name}' already registered on this plot",
        )

    pv = PlotVariety(plot_id=plot_id, variety_name=body.variety_name, area_acres=body.area_acres)
    db.add(pv)
    db.commit()
    db.refresh(pv)
    return pv


@router.get("/plots/{plot_id}/varieties", response_model=list[PlotVarietyRead], dependencies=[_plot_registration])
def list_varieties(
    plot_id: int,
    db: Session = Depends(get_db),
):
    plot = db.get(Plot, plot_id)
    if plot is None:
        raise HTTPException(status_code=404, detail="Plot not found")
    return list(
        db.scalars(
            select(PlotVariety)
            .where(PlotVariety.plot_id == plot_id)
            .order_by(PlotVariety.variety_name)
        )
    )


@router.patch(
    "/plot-varieties/{variety_id}",
    response_model=PlotVarietyRead,
    dependencies=[_plot_registration],
)
def update_variety(
    variety_id: int,
    body: PlotVarietyUpdate,
    db: Session = Depends(get_db),
):
    """area_acres only — see PlotVarietyUpdate's docstring for why variety_name is deliberately not editable here."""
    pv = db.get(PlotVariety, variety_id)
    if pv is None:
        raise HTTPException(status_code=404, detail="Plot variety not found")
    pv.area_acres = body.area_acres
    db.commit()
    db.refresh(pv)
    return pv


@router.delete(
    "/plot-varieties/{variety_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[_plot_registration],
)
def remove_variety(
    variety_id: int,
    db: Session = Depends(get_db),
):
    pv = db.get(PlotVariety, variety_id)
    if pv is None:
        raise HTTPException(status_code=404, detail="Plot variety not found")

    # Don't allow removal if there are season_registrations linked to this variety
    if pv.season_registrations:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot remove variety with existing season registrations",
        )

    db.delete(pv)
    db.commit()
