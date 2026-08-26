"""Schemas for packaging records (Phase 8).

Client sends the packing selection + measured quantities. The service:
  - validates the registration is ARRIVAL_QC_PASSED (or already PACKED)
  - generates the unique lot_id
  - snapshots rejection kg from the contract percent
  - stamps the GGN from company_settings
None of those four are accepted from the client."""

import datetime as dt
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import ComplianceType, PackSize
from app.schemas.common import ORMModel


class PackagingCreate(BaseModel):
    date: dt.date | None = None
    slip_no: str | None = None
    pack_size: PackSize
    compliance_type: ComplianceType
    customer_id: int
    total_weight_kg: Decimal = Field(gt=0)
    actual_rejection_kg: Decimal | None = Field(default=None, ge=0)
    num_boxes: int = Field(gt=0)
    num_pallets: int | None = Field(default=None, ge=0)


class PackagingRead(ORMModel):
    id: int
    harvest_id: int
    date: dt.date | None
    slip_no: str | None
    lot_id: str
    pack_size: PackSize
    compliance_type: ComplianceType
    customer_id: int
    total_weight_kg: Decimal
    rejection_contract_kg: Decimal | None
    net_weight_kg: Decimal | None
    actual_rejection_kg: Decimal | None
    actual_rejection_pct: Decimal | None
    num_boxes: int
    num_pallets: int | None
    ggn_number: str | None
    created_by: int
    created_at: datetime
