"""
Every enum used anywhere in the data model, defined once here, so models/
and schemas/ import from a single source of truth instead of redefining
strings ad hoc. Sourced from PHASE_MAP.md Section 7 (full data model) and
Section 4 (unified status flow).

All enums are `str, Enum` subclasses so they behave as plain strings for
JSON/Pydantic serialization and can be passed directly as SQLAlchemy Enum
values once model files are built.

Trailing underscores (`pass_`, `in_`) exist only where the natural name
collides with a Python keyword (`pass`, `in`).
"""

from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    FIELD_WORKER = "field_worker"
    LAB_WORKER = "lab_worker"
    OFFICE_WORKER = "office_worker"
    STOCK_MANAGER = "stock_manager"
    PACKAGING_SUPERVISOR = "packaging_supervisor"  # added 2026-08-23, matches frontend Role type


class FarmerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class RegistrationStatus(str, Enum):
    """
    season_registrations.status — the central state machine.
    Full flow: PHASE_MAP.md Section 4.

    Only covers Phases 1–11 (Registered through Pre-Cooled) since that's
    everything currently scoped. Finished Goods QC / Container Loaded /
    Invoiced / Export Documents Complete / Dispatched are explicitly
    (future) placeholders in PHASE_MAP.md — not added here until those
    phases are actually scoped (see PHASE_MAP.md Section 9, Open Question #13).
    """

    REGISTERED = "Registered"
    FIELD_QC_PASSED = "Field QC Passed"
    FIELD_QC_FAILED = "Field QC Failed"
    LAB_PASSED = "Lab Passed"
    LAB_FAILED = "Lab Failed"
    UNDER_CONTRACT = "Under Contract"
    HARVESTED_PARTIAL = "Harvested (partial)"
    WEIGHED = "Weighed"
    ARRIVAL_QC_PASSED = "Arrival QC Passed"
    ARRIVAL_QC_FAILED = "Arrival QC Failed"
    PACKED = "Packed"
    PALLETISED = "Palletised"
    PRE_COOLED = "Pre-Cooled"


class Crop(str, Enum):
    """
    plot_varieties.crop — added 2026-09-03, forward-compatibility only.

    Single value today because this system is grapes-only. The CEO has
    confirmed pomegranate and banana are coming once grapes are done, but
    their requirements (QC parameters, pack sizes, compliance types) are
    not known yet and are NOT built here — see PHASE_MAP.md for what's
    deliberately unbuilt and what's still unanswered. This exists so
    "grape" is a stated fact on every plot_varieties row instead of an
    implicit assumption baked into every query — without it, a future
    "Bhagwa" (pomegranate) row would sit in the same variety_name column as
    "Thompson Seedless" with nothing distinguishing them.
    """

    GRAPE = "Grape"


class FruitColour(str, Enum):
    GREEN = "Green"
    MILKY_GREEN = "Milky Green"
    YELLOW = "Yellow"


class OverallObservation(str, Enum):
    GOOD = "Good"
    VERY_GOOD = "Very Good"
    EXCELLENT = "Excellent"


class FieldQCResult(str, Enum):
    PASS_ = "Pass"
    FAIL = "Fail"


class LabResult(str, Enum):
    PASS_ = "Pass"
    FAIL = "Fail"


class ArrivalQCResult(str, Enum):
    PASS_ = "Pass"
    FAIL = "Fail"


class PackSize(str, Enum):
    FOUR_KG = "4 Kg"
    FOUR_POINT_FIVE_KG = "4.5 Kg"
    FIVE_KG = "5 Kg"


class ComplianceType(str, Enum):
    EU = "EU"
    NON_TESTING = "Non-Testing"


class MaterialType(str, Enum):
    BOX = "Box"
    LINER_BAG = "Liner Bag"
    PUNEET = "Puneet"
    POUCH = "Pouch"
    GRAPE_GUARD = "Grape Guard"
    ANGLE_BOARD = "Angle Board"
    PALLET = "Pallet"
    STRAPPING_ROLL = "Strapping Roll"
    CLIP = "Clip"
    STICKER = "Sticker"


class UnitOfMeasure(str, Enum):
    PIECES = "pieces"
    KG = "kg"
    ROLLS = "rolls"


class ScaleLevel(str, Enum):
    PER_BOX = "per_box"
    PER_CONTAINER = "per_container"


class MovementType(str, Enum):
    IN_ = "in"
    AUTO_OUT = "auto_out"
    ADJUSTMENT = "adjustment"


class PalletStatus(str, Enum):
    CREATED = "created"
    PRE_COOLING = "pre_cooling"
    DISPATCHED = "dispatched"


class PalletType(str, Enum):
    BIG = "Big"
    MINI = "Mini"


class POStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    COMPLETED = "completed"


class PhaseKey(str, Enum):
    """
    The phases a user can be individually assigned to via
    `user_phase_access` (added 2026-08-23). `users.role` is a display
    label only — actual screen access is phase-based. Values matched
    exactly to the frontend's `types/common.ts::PhaseKey`.

    USERS (added 2026-09-01) is the user-management phase, split out of
    the previous admin-does-everything model — see app/services/
    user_admin_guard.py for the actual security boundary between a USERS
    holder and an ADMIN holder; the phase gate alone isn't the whole
    story here. REPORTS_DOCUMENTS is a placeholder, same pattern as
    FINISHED_GOODS_QC — it gates the not-yet-built Reports and Export
    Documents modules (CLAUDE.md §13) and gates nothing today.
    """

    FARMER_REGISTRATION = "farmer_registration"
    PLOT_REGISTRATION = "plot_registration"
    FIELD_QC = "field_qc"
    LAB_SAMPLING = "lab_sampling"
    FARMER_CONTRACT = "farmer_contract"
    HARVESTING = "harvesting"
    WEIGHING = "weighing"
    ARRIVAL_QC = "arrival_qc"
    PACKAGING = "packaging"
    INVENTORY_MANAGEMENT = "inventory_management"
    PALLETISATION = "palletisation"
    PRE_COOLING = "pre_cooling"
    FINISHED_GOODS_QC = "finished_goods_qc"
    ADMIN = "admin"
    USERS = "users"
    REPORTS_DOCUMENTS = "reports_documents"


__all__ = [
    "UserRole",
    "FarmerStatus",
    "RegistrationStatus",
    "Crop",
    "FruitColour",
    "OverallObservation",
    "FieldQCResult",
    "LabResult",
    "ArrivalQCResult",
    "PackSize",
    "ComplianceType",
    "MaterialType",
    "UnitOfMeasure",
    "ScaleLevel",
    "MovementType",
    "PalletStatus",
    "PalletType",
    "POStatus",
    "PhaseKey",
]
