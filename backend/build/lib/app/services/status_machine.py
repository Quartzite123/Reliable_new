"""
THE single place where season_registrations.status changes.

Routers NEVER set status directly — they call these functions, which
validate the transition and raise 409 on any illegal jump. This is the
backend gate enforcement demanded by CLAUDE.md ("Never let frontend
bypass a gate") and Business Rules R13, R17, R18, R23, R26.

Pipeline (PHASE_MAP.md Section 4):
  Registered -> Field QC Passed/Failed -> Lab Passed/Failed
  -> Under Contract -> Harvested (partial) -> Weighed
  -> Arrival QC Passed/Failed -> Packed -> Palletised -> Pre-Cooled

Failure states:
  - Field QC Failed  -> follow-up inspection allowed (new row, R17)
  - Lab Failed       -> terminal for the season (per current rules)
  - Arrival QC Failed-> terminal for now (DB has one arrival_qc per
                        harvest — see routers/arrival_qc.py note)
"""

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.core.enums import (
    ArrivalQCResult,
    FieldQCResult,
    LabResult,
    RegistrationStatus,
)
from app.models.plot import SeasonRegistration


def _conflict(msg: str) -> HTTPException:
    return HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=msg)


def require_status(reg: SeasonRegistration, *allowed: RegistrationStatus, action: str) -> None:
    if reg.status not in allowed:
        raise _conflict(
            f"Cannot {action}: registration is '{reg.status.value}', "
            f"requires {[s.value for s in allowed]}"
        )


# ---------------------------------------------------------------- Field QC
def can_record_field_qc(reg: SeasonRegistration) -> None:
    # First inspection (Registered) or follow-up after a fail (R17).
    require_status(
        reg,
        RegistrationStatus.REGISTERED,
        RegistrationStatus.FIELD_QC_FAILED,
        action="record Field QC",
    )


def apply_field_qc_result(reg: SeasonRegistration, result: FieldQCResult) -> None:
    reg.status = (
        RegistrationStatus.FIELD_QC_PASSED
        if result == FieldQCResult.PASS_
        else RegistrationStatus.FIELD_QC_FAILED
    )


# ---------------------------------------------------------------- Lab
def can_record_lab_sample(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.FIELD_QC_PASSED, action="record a lab sample")
    if reg.lab_sample is not None:
        raise _conflict("A lab sample already exists for this registration")


def apply_lab_result(reg: SeasonRegistration, result: LabResult) -> None:
    reg.status = (
        RegistrationStatus.LAB_PASSED
        if result == LabResult.PASS_
        else RegistrationStatus.LAB_FAILED
    )


# ---------------------------------------------------------------- Contract
def can_create_contract(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.LAB_PASSED, action="create a contract")
    if reg.contract is not None:
        raise _conflict("A contract already exists for this registration")
    farmer = reg.plot.farmer
    if farmer.bank_details is None:
        # Phase 1B derivation: a contract with nowhere to eventually pay is invalid.
        raise _conflict(
            "Farmer has no bank details on record — add bank details before creating a contract"
        )


def apply_contract_created(reg: SeasonRegistration) -> None:
    reg.status = RegistrationStatus.UNDER_CONTRACT


# ---------------------------------------------------------------- Harvest
def can_record_harvest(reg: SeasonRegistration) -> None:
    # Multiple rounds allowed (R26): first harvest from Under Contract,
    # later rounds while Harvested (partial). Also allowed after WEIGHED —
    # a new picking round can start after earlier trips were weighed.
    require_status(
        reg,
        RegistrationStatus.UNDER_CONTRACT,
        RegistrationStatus.HARVESTED_PARTIAL,
        RegistrationStatus.WEIGHED,
        action="record a harvest",
    )


def apply_harvest_recorded(reg: SeasonRegistration) -> None:
    reg.status = RegistrationStatus.HARVESTED_PARTIAL


# ---------------------------------------------------------------- Weighing
def can_record_weighing(reg: SeasonRegistration) -> None:
    require_status(
        reg,
        RegistrationStatus.HARVESTED_PARTIAL,
        RegistrationStatus.WEIGHED,
        action="record weighing",
    )


def apply_weighing_recorded(db: Session, reg: SeasonRegistration) -> None:
    """If every vehicle trip under this registration now has a weighing
    record, the registration advances to WEIGHED."""
    for harvest in reg.harvests:
        for trip in harvest.vehicle_trips:
            if trip.weighing_record is None:
                return  # something still unweighed — stay HARVESTED_PARTIAL
    reg.status = RegistrationStatus.WEIGHED


# ---------------------------------------------------------------- Arrival QC
def can_record_arrival_qc(reg: SeasonRegistration) -> None:
    require_status(reg, RegistrationStatus.WEIGHED, action="record Arrival QC")


def apply_arrival_qc_result(reg: SeasonRegistration, result: ArrivalQCResult) -> None:
    reg.status = (
        RegistrationStatus.ARRIVAL_QC_PASSED
        if result == ArrivalQCResult.PASS_
        else RegistrationStatus.ARRIVAL_QC_FAILED
    )


# ---------------------------------------------------------------- Packaging
def can_record_packaging(reg: SeasonRegistration) -> None:
    # First packing run from ARRIVAL_QC_PASSED; further runs while PACKED
    # (a harvest can split across customers/pack sizes — Phase 8 decision).
    require_status(
        reg,
        RegistrationStatus.ARRIVAL_QC_PASSED,
        RegistrationStatus.PACKED,
        action="record packaging",
    )


def apply_packaging_recorded(reg: SeasonRegistration) -> None:
    reg.status = RegistrationStatus.PACKED
