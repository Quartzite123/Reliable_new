"""Schemas for weighing records (Phase 6).

rejection_pct / rejection_kg / net_weight_kg are NEVER accepted from the
client — the service snapshots the pct from the contract and computes the
rest (CLAUDE.md: never hardcode 7%, never trust frontend math). Same now
applies to total_weight_kg, tare_weight_kg, and net_fruit_weight_kg — the
client submits the raw scale reading (gross_weight_kg) and crate count;
the server derives everything else (weighing slip #937 addendum).

crate_mismatch is a response-only convenience: True when the weighed crate
count differs from the harvest trip's crate count — frontend shows the
small red inline warning (does NOT block saving, per Phase 6 decision).

Kept one record per vehicle trip (see models/weighing.py docstring for why
this diverges from a since-superseded harvest-level design) — there is no
`trip_weights` batch list; each call weighs exactly the one trip in the URL.
"""

import datetime as dt
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class WeighingCreate(BaseModel):
    date: dt.date | None = None
    slip_no: str | None = None  # weighbridge slip number
    supervisor_name: str | None = None

    # Slip #937 identifying fields.
    slip_serial_no: str | None = None  # physical slip number printed on the form, e.g. "937"
    load_id: str | None = None
    harvester_no: str | None = None
    no_crt_reci: str | None = None
    knitting: str | None = None
    produce_type: str = "Grapes"
    average_size: str | None = None
    average_sugar: Decimal | None = None
    village_name: str | None = None
    contact_no: str | None = None

    # Raw weighbridge inputs — tare/gross/net and total_weight_kg are all
    # derived server-side from these, never accepted directly.
    crate_count_at_weighing: int = Field(ge=0)
    gross_weight_kg: Decimal = Field(gt=0)

    # Operator-entered actual rejection % — defaults to the contract's value
    # when omitted. The contract value itself is never accepted from the
    # client (CLAUDE.md: never hardcode/trust frontend for the rejection %).
    actual_rejection_pct: Decimal | None = None


class WeighingRead(ORMModel):
    id: int
    vehicle_trip_id: int
    date: dt.date | None
    slip_no: str | None
    supervisor_name: str | None
    num_crates: int | None
    total_weight_kg: Decimal
    rejection_pct: Decimal | None  # fixed rate actually charged (FARMER_REJECTION_PCT) — not the contract's, since 2026-08-30
    actual_rejection_pct: Decimal | None  # operator-entered; observed only, never charged
    rejection_kg: Decimal | None  # calculated: total_weight_kg * FARMER_REJECTION_PCT / 100 — no MIN(), no contract comparison
    net_weight_kg: Decimal | None
    slip_photo_url: str | None

    slip_serial_no: str | None
    load_id: str | None
    harvester_no: str | None
    no_crt_reci: str | None
    knitting: str | None
    produce_type: str | None
    average_size: str | None
    average_sugar: Decimal | None
    village_name: str | None
    contact_no: str | None
    crate_tare_weight_kg: Decimal | None

    # Per-trip breakdown, for slip regeneration — sourced from the linked
    # vehicle_trip, not stored redundantly on this table.
    crate_count_at_weighing: int | None = None
    gross_weight_kg: Decimal | None = None
    tare_weight_kg: Decimal | None = None
    net_fruit_weight_kg: Decimal | None = None

    created_by: int
    created_at: datetime
    crate_mismatch: bool = False
    crate_mismatch_message: str | None = None


class PendingTripRead(ORMModel):
    """An un-weighed vehicle trip, with enough context to pick the right one."""

    id: int
    harvest_id: int
    vehicle_no: str | None
    driver_name: str | None
    num_crates: int | None
    approx_weight_kg: Decimal | None
    farmer_name: str
    variety: str | None
    harvest_date: dt.date
