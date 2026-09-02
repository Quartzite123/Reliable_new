"""Schemas for farmers + bank_details (Phases 1A / 1B)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.enums import FarmerStatus
from app.schemas.common import ORMModel


class FarmerCreate(BaseModel):
    name: str = Field(min_length=1)
    address: str = Field(min_length=1)
    mobile: str = Field(min_length=5, max_length=20)
    ggn_number: str | None = None


class FarmerUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    mobile: str | None = None
    ggn_number: str | None = None
    status: FarmerStatus | None = None  # inactive = soft delete (R8)


class BankDetailsUpsert(BaseModel):
    account_holder_name: str = Field(min_length=1)
    bank_name: str = Field(min_length=1)
    account_number: str = Field(min_length=1)
    ifsc_code: str = Field(min_length=1)
    branch_name: str | None = None


class BankDetailsRead(ORMModel):
    id: int
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    branch_name: str | None
    passbook_photo_url: str | None


class PlotSummary(ORMModel):
    """Lightweight plot info shown on the farmer card / search results."""

    id: int
    plot_number: str
    # A plot can carry more than one variety (plot_varieties) — a single
    # `variety` value here would be arbitrary about which one to show.
    # Sourced from Plot.variety_names, same property PlotRead uses.
    variety_names: list[str] = []
    area_acres: Decimal | None
    village: str | None


class FarmerRead(ORMModel):
    id: int
    name: str
    address: str
    mobile: str
    ggn_number: str | None = None
    status: FarmerStatus
    created_at: datetime
    updated_at: datetime
    bank_details: BankDetailsRead | None = None
    plots: list[PlotSummary] = []


class FarmerSearchResult(ORMModel):
    """Search hit — enough for the worker to confirm the right person."""

    id: int
    name: str
    mobile: str
    address: str
    ggn_number: str | None = None
    status: FarmerStatus
    plots: list[PlotSummary] = []
