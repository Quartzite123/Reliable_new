"""
plots, season_registrations, field_qc — PHASE_MAP.md Section 7.

plots is permanent (persists across seasons); season_registrations is the
seasonal join that everything downstream (field_qc, lab_samples, contracts,
harvests, ...) hangs off of; field_qc allows multiple rows per registration
to support the follow-up-after-failure rule (R17) — only the latest one
gates status progression, enforced at the service layer, not here.

Note: `variety` is modeled as a plain String, not a DB enum. PHASE_MAP.md's
prose calls it "enum," but no Variety enum was defined in app/core/enums.py
(the grape-variety list in PHASE_MAP.md Section 8 is reference/seed data
that can grow — e.g. "Other" is itself a valid value — not a fixed closed
set like Pass/Fail or the pack-size tiers).
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import FieldQCResult, FruitColour, OverallObservation, RegistrationStatus
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class Plot(Base):
    __tablename__ = "plots"
    __table_args__ = (
        UniqueConstraint("farmer_id", "plot_number", name="uq_plots_farmer_plot_number"),
    )

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    plot_number = Column(String, nullable=False)  # unique within farmer, R5 — see __table_args__
    # APEDA/NRC Grapes plot-level registration number (e.g. MH06081011112).
    # Assigned per plot, not per farmer. Each plot has its own unique number.
    mh_registration_number = Column(String, unique=True, nullable=True)
    # LEGACY (updated 2026-09-03, superseding the note this replaced — that
    # one said readers and the registration form still depended on this
    # column; neither is true anymore). The authoritative source for
    # variety is plot_varieties, one row per variety the plot carries, each
    # tied to its own season_registration via plot_variety_id. Nothing in
    # the app reads this column anymore (weighing.py and every frontend
    # join switched to plot_variety), and the plot registration form no
    # longer has a Variety field to write one from. It is not, however,
    # fully inert: `create_plot` still sets it (to NULL, via
    # `Plot(**body.model_dump())` on a PlotCreate that still declares the
    # field) on every new row, and old rows from before this switch still
    # carry whatever value was entered at the time. Kept only for that old
    # data and until a separate migration drops the column — do not read
    # from it in any new code, and do not add a value to it deliberately.
    variety = Column(String, nullable=True)  # see module docstring — no Variety enum exists
    area_acres = Column(Numeric, nullable=True)
    village = Column(String, nullable=True)
    taluka = Column(String, nullable=True)
    survey_no = Column(String, nullable=True)
    gps_lat = Column(Numeric, nullable=True)  # "GPS if available" — R6
    gps_long = Column(Numeric, nullable=True)
    pruning_date = Column(Date, nullable=True)
    approx_harvest_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    farmer = relationship("Farmer", back_populates="plots")
    plot_varieties = relationship("PlotVariety", back_populates="plot")
    season_registrations = relationship("SeasonRegistration", back_populates="plot")

    @property
    def variety_names(self) -> list[str]:
        """All varieties this plot carries, for plot-level display (title,
        list columns) where there's no specific registration in view to
        resolve a single variety from. Picked up automatically by any
        *Read schema declaring a `varieties` field (Pydantic reads it via
        from_attributes, same as User.phases -> UserRead.phases)."""
        return [pv.variety_name for pv in self.plot_varieties]


class SeasonRegistration(Base):
    __tablename__ = "season_registrations"
    __table_args__ = (
        # Was (plot_id, season_year) — moved 2026-09-03 (see alembic
        # 9d2f6a1c8b3e) so a plot with two varieties can carry two
        # registrations in the same season, one per variety. plot_id stays
        # on the row (denormalized, derivable via plot_variety.plot_id) but
        # no longer participates in the uniqueness guarantee.
        UniqueConstraint("plot_variety_id", "season_year", name="uq_season_registrations_plot_variety_season"),
    )

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False)
    season_year = Column(Integer, nullable=False)  # legacy — kept for backward compat
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=True)  # pending — not yet backfilled/required
    # Required as of 2026-09-03 (alembic 9d2f6a1c8b3e) — every registration
    # is now for a specific variety, including the single-variety case (one
    # plot_varieties row per plot at minimum). See plot_variety.py.
    plot_variety_id = Column(Integer, ForeignKey("plot_varieties.id"), nullable=False)
    status = Column(
        SAEnum(RegistrationStatus, name="registration_status", values_callable=_values), nullable=False
    )
    registered_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_at = Column(DateTime, default=func.now(), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    plot = relationship("Plot", back_populates="season_registrations")
    season = relationship("Season", back_populates="season_registrations")
    plot_variety = relationship("PlotVariety", back_populates="season_registrations")

    @property
    def variety_name(self) -> str | None:
        """The authoritative, registration-scoped variety — added 2026-09-03
        as the single source every reader (weighing, lab samples, packaging,
        harvests, arrival QC, contracts, palletisation, season registrations
        list) switches to, instead of each independently reading
        plots.variety (legacy — see that column's comment in this file).
        Picked up automatically by SeasonRegistrationRead.variety_name via
        Pydantic's from_attributes, same mechanism as User.phases."""
        return self.plot_variety.variety_name if self.plot_variety else None
    registered_by_user = relationship(
        "User", back_populates="season_registrations_registered", foreign_keys=[registered_by]
    )
    field_qc_records = relationship("FieldQC", back_populates="season_registration")
    lab_sample = relationship("LabSample", back_populates="season_registration", uselist=False)
    contract = relationship("Contract", back_populates="season_registration", uselist=False)
    harvests = relationship("Harvest", back_populates="season_registration")


class FieldQC(Base):
    __tablename__ = "field_qc"

    id = Column(Integer, primary_key=True, index=True)
    season_registration_id = Column(Integer, ForeignKey("season_registrations.id"), nullable=False)
    inspection_date = Column(Date, nullable=False)  # "date req"
    planned_sampling_date = Column(Date, nullable=True)
    tentative_harvest_date = Column(Date, nullable=True)
    fruit_colour = Column(
        SAEnum(FruitColour, name="fruit_colour", values_callable=_values), nullable=True
    )
    tss_percent = Column(Numeric, nullable=True)
    thrips_percent = Column(Numeric, nullable=True)
    bhuri_percent = Column(Numeric, nullable=True)
    black_spot_percent = Column(Numeric, nullable=True)
    cercospora_percent = Column(Numeric, nullable=True)
    overall_observation = Column(
        SAEnum(OverallObservation, name="overall_observation", values_callable=_values), nullable=True
    )
    exportable_fruit_percent = Column(Numeric, nullable=True)
    notes = Column(Text, nullable=True)  # free-form, R15
    result = Column(
        SAEnum(FieldQCResult, name="field_qc_result", values_callable=_values), nullable=False
    )
    inspected_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    season_registration = relationship("SeasonRegistration", back_populates="field_qc_records")
    inspected_by_user = relationship(
        "User", back_populates="field_qc_inspected", foreign_keys=[inspected_by]
    )
