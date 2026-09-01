"""
weighing_records — PHASE_MAP.md Section 7. One per vehicle trip (Discovery 5:
"Weighing | per Vehicle Trip | each truck weighed separately" — kept as-is;
see the Phase 6 slip-fields addendum note below for why).

rejection_pct is the fixed rate actually charged (app/core/constants.py
FARMER_REJECTION_PCT — founder-confirmed, not read from the contract).
actual_rejection_pct is the operator's observed figure — recorded for
reference only, never charged; it does not affect rejection_kg. This
supersedes an earlier design where rejection_pct snapshotted the
contract's (then-editable) rejection_percent — see Business_Rules.md R28.

Phase 6 addendum (weighing slip #937): the slip carries several extra
identifying fields plus a tare/gross/net breakdown. The physical slip can
span multiple vehicle trips, but this table stays one-record-per-trip —
restructuring to one-record-per-harvest would break the vehicle_trip_id
unique FK, `VehicleTrip.weighing_record`, and status_machine.py's
apply_weighing_recorded() (which checks per-trip weighing completeness).
If one slip covers two trips, the operator submits weighing twice — the
shared slip fields (slip_serial_no, load_id, etc.) simply appear on both
resulting records.
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class WeighingRecord(Base):
    __tablename__ = "weighing_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_trip_id = Column(Integer, ForeignKey("vehicle_trips.id"), unique=True, nullable=False)
    date = Column(Date, nullable=True)
    slip_no = Column(String, nullable=True)  # weighbridge slip number
    supervisor_name = Column(String, nullable=True)
    num_crates = Column(Integer, nullable=True)
    total_weight_kg = Column(Numeric, nullable=False)  # post-tare gross weight ("Gross Weight" on the slip)
    rejection_pct = Column(Numeric, nullable=True)  # fixed rate actually charged (FARMER_REJECTION_PCT)
    actual_rejection_pct = Column(Numeric(5, 2), nullable=True)  # operator-entered; observed only, never charged
    rejection_kg = Column(Numeric, nullable=True)  # calculated: total_weight_kg × FARMER_REJECTION_PCT / 100
    net_weight_kg = Column(Numeric, nullable=True)  # calculated: total_weight_kg − rejection_kg
    slip_photo_url = Column(String, nullable=True)  # file upload via device camera

    # --- Phase 6 slip-detail fields (weighing slip #937) ---
    slip_serial_no = Column(String, nullable=True)  # physical slip number printed on the form, e.g. "937"
    load_id = Column(String, nullable=True)
    harvester_no = Column(String, nullable=True)
    no_crt_reci = Column(String, nullable=True)  # crate receipt number
    knitting = Column(String, nullable=True)  # meaning TBD — CEO to clarify; stored verbatim for now
    produce_type = Column(String, nullable=True, default="Grapes")  # "Grapes" or "Pomo" checkbox on the slip
    average_size = Column(String, nullable=True)
    average_sugar = Column(Numeric(5, 2), nullable=True)  # TSS at arrival
    village_name = Column(String, nullable=True)
    contact_no = Column(String, nullable=True)
    crate_tare_weight_kg = Column(Numeric(4, 2), nullable=True)  # tare rate used for this record, stored for audit

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    vehicle_trip = relationship("VehicleTrip", back_populates="weighing_record")
    created_by_user = relationship(
        "User", back_populates="weighing_records_created", foreign_keys=[created_by]
    )
