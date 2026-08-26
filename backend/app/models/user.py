"""
users — PHASE_MAP.md Section 7, "Core identity & seasonal chain".

Referenced by nearly every other table via a created_by / inspected_by /
entered_by / registered_by / updated_by audit FK (individual accountability
is a hard requirement — R54). Those back-populated collections are defined
here, one per table that FKs to users.id, so `user.contracts_created` etc.
works for audit-trail lookups (R30).
"""

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.enums import UserRole
from app.db.base import Base


def _values(enum_cls):
    """Persist the enum's .value (e.g. "field_worker") in Postgres, not its .name."""
    return [member.value for member in enum_cls]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole, name="user_role", values_callable=_values), nullable=False)
    active = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # --- login/session activity bookkeeping (backs the admin User Activity view) ---
    last_login_at = Column(DateTime, nullable=True)
    last_logout_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    failed_login_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_failed_login_at = Column(DateTime, nullable=True)

    # --- audit-trail back-references (R30, R54) ---
    season_registrations_registered = relationship(
        "SeasonRegistration", back_populates="registered_by_user", foreign_keys="SeasonRegistration.registered_by"
    )
    field_qc_inspected = relationship(
        "FieldQC", back_populates="inspected_by_user", foreign_keys="FieldQC.inspected_by"
    )
    lab_samples_entered = relationship(
        "LabSample", back_populates="entered_by_user", foreign_keys="LabSample.entered_by"
    )
    contracts_created = relationship(
        "Contract", back_populates="created_by_user", foreign_keys="Contract.created_by"
    )
    harvests_created = relationship(
        "Harvest", back_populates="created_by_user", foreign_keys="Harvest.created_by"
    )
    weighing_records_created = relationship(
        "WeighingRecord", back_populates="created_by_user", foreign_keys="WeighingRecord.created_by"
    )
    arrival_qc_inspected = relationship(
        "ArrivalQC", back_populates="inspected_by_user", foreign_keys="ArrivalQC.inspected_by"
    )
    packaging_records_created = relationship(
        "PackagingRecord", back_populates="created_by_user", foreign_keys="PackagingRecord.created_by"
    )
    item_master_materials_created = relationship(
        "ItemMasterMaterial", back_populates="created_by_user", foreign_keys="ItemMasterMaterial.created_by"
    )
    stock_movements_created = relationship(
        "StockMovement", back_populates="created_by_user", foreign_keys="StockMovement.created_by"
    )
    pallets_created = relationship(
        "Pallet", back_populates="created_by_user", foreign_keys="Pallet.created_by"
    )
    pre_cooling_records_created = relationship(
        "PreCoolingRecord", back_populates="created_by_user", foreign_keys="PreCoolingRecord.created_by"
    )
    purchase_orders_created = relationship(
        "PurchaseOrder", back_populates="created_by_user", foreign_keys="PurchaseOrder.created_by"
    )
    company_settings_updated = relationship(
        "CompanySettings", back_populates="updated_by_user", foreign_keys="CompanySettings.updated_by"
    )
    seasons_created = relationship(
        "Season", back_populates="created_by_user", foreign_keys="Season.created_by"
    )
    phase_access = relationship(
        "UserPhaseAccess", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def phases(self) -> list:
        """
        Flat list of assigned PhaseKey values — the actual access-control
        mechanism (`users.role` is a display label only). Matches the
        frontend's `User.phases: PhaseKey[]` exactly (added 2026-08-23).
        """
        return [pa.phase_key for pa in self.phase_access]
