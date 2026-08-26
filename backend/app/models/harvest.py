"""
harvests, vehicle_trips — PHASE_MAP.md Section 7. Multiple harvests allowed
per season_registration (R26 — multiple picking rounds); multiple vehicle
trips per harvest (one picking event, several trucks).
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Harvest(Base):
    __tablename__ = "harvests"

    id = Column(Integer, primary_key=True, index=True)
    season_registration_id = Column(Integer, ForeignKey("season_registrations.id"), nullable=False)
    harvest_date = Column(Date, nullable=False)  # "date req"
    supervisor_name = Column(String, nullable=True)
    supervisor_contact = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    season_registration = relationship("SeasonRegistration", back_populates="harvests")
    created_by_user = relationship(
        "User", back_populates="harvests_created", foreign_keys=[created_by]
    )
    vehicle_trips = relationship("VehicleTrip", back_populates="harvest")
    arrival_qc = relationship("ArrivalQC", back_populates="harvest", uselist=False)
    packaging_records = relationship("PackagingRecord", back_populates="harvest")


class VehicleTrip(Base):
    __tablename__ = "vehicle_trips"

    id = Column(Integer, primary_key=True, index=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), nullable=False)
    vehicle_no = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    num_crates = Column(Integer, nullable=True)
    approx_weight_kg = Column(Numeric, nullable=True)  # field estimate — real weight in Weighing

    # --- Phase 6 weighing-time actuals (PHASE_MAP.md §6, weighing slip #937) ---
    # Nullable — filled at weighing time, not at harvest time. Harvest-time
    # estimates above (num_crates, approx_weight_kg) are never overwritten.
    crate_count_at_weighing = Column(Integer, nullable=True)  # actual crate count at packhouse arrival
    gross_weight_kg = Column(Numeric(8, 2), nullable=True)  # scale reading for this trip (full crates)
    tare_weight_kg = Column(Numeric(8, 2), nullable=True)  # calculated: crate_count_at_weighing × tare rate
    net_fruit_weight_kg = Column(Numeric(8, 2), nullable=True)  # calculated: gross_weight_kg − tare_weight_kg

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    harvest = relationship("Harvest", back_populates="vehicle_trips")
    weighing_record = relationship("WeighingRecord", back_populates="vehicle_trip", uselist=False)
