"""
Imports every SQLAlchemy model so Base.metadata (and Alembic's
autogenerate, via alembic/env.py) can discover all tables.

One import per app/models/*.py file — see PHASE_MAP.md Section 7 and
README.md's models/ -> table mapping for the full list.
"""

from app.db.base import Base, SessionLocal, engine, get_db  # noqa: F401

from app.models.user import User  # noqa: F401
from app.models.user_phase_access import UserPhaseAccess  # noqa: F401
from app.models.audit_event import AuditEvent  # noqa: F401
from app.models.season import Season  # noqa: F401
from app.models.farmer import Farmer, BankDetails  # noqa: F401
from app.models.plot import Plot, SeasonRegistration, FieldQC  # noqa: F401
from app.models.plot_variety import PlotVariety  # noqa: F401
from app.models.lab import LabSample  # noqa: F401
from app.models.contract import Contract  # noqa: F401
from app.models.harvest import Harvest, VehicleTrip  # noqa: F401
from app.models.weighing import WeighingRecord  # noqa: F401
from app.models.arrival_qc import ArrivalQC  # noqa: F401
from app.models.packaging import PackagingRecord  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.inventory import (  # noqa: F401
    ItemMasterMaterial,
    ItemMasterProduct,
    BOMEntry,
    StockMovement,
)
from app.models.palletisation import Pallet, PalletisationLot  # noqa: F401
from app.models.pre_cooling import PreCoolingRecord  # noqa: F401
from app.models.purchase_order import PurchaseOrder, POLineItem  # noqa: F401
from app.models.company_settings import CompanySettings  # noqa: F401
